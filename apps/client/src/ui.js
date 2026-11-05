/**
 * NetCity v2.0 - Standalone Web Game UI Facade
 * 
 * Architectural Role: High-level Orchestrator & Facade
 * Coordinates dedicated single-responsibility subsystems:
 * - Core Game Loop: GameLoop, LevelLoader, StateManager
 * - Rendering: Camera, DrawUtils, CanvasRenderer
 * - Input & Entities: PathBuilder, InteractionController
 * - UI & Screens: HUDController, DockController, CampaignScreen, LearnScreen
 * - Modals & Inspectors: ModalManager, LevelEndModals, DiagnosticsModal, HardwareInspectors
 */

import { WIRE_CATALOG, REFUSAL_MESSAGES } from '../../../packages/content/src/wires.js';
import { ALL_LEVELS, getLevelById } from '../../../packages/content/src/levels.js';
import { DEVICE_CATALOG } from '../../../packages/content/src/devices.js';
import { NetCitySimulation } from '../../../packages/sim/src/sim.js';
import { bfsPath } from '../../../packages/sim/src/pathfinding.js';
import { createStreamRng } from '../../../packages/sim/src/prng.js';
import { AssetManager } from './assets.js';

// Modular Subsystems
import { StateManager } from './core/state-manager.js';
import { findValidSquare, generateLevelMap } from './core/level-loader.js';
import { GameLoop } from './core/game-loop.js';
import { Camera } from './rendering/camera.js';
import { drawRoundRect, drawWirePath, getPathPoint } from './rendering/draw-utils.js';
import { CanvasRenderer } from './rendering/canvas-renderer.js';
import { PathBuilder } from './input/path-builder.js';
import { InteractionController } from './input/interaction-controller.js';
import { HUDController } from './ui/hud-controller.js';
import { DockController } from './ui/dock-controller.js';
import { CampaignScreen, getChaptersData } from './ui/screens/campaign-screen.js';
import { LearnScreen } from './ui/screens/learn-screen.js';
import { EndlessScreen } from './ui/screens/endless-screen.js';
import { getUnlockedTier, getEndlessSetup } from '../../../packages/content/src/endless-config.js';
import { ModalManager } from './ui/modals/modal-manager.js';
import { showLevelWonModal, showLevelOverModal } from './ui/modals/level-end-modal.js';
import { showLevelBriefingModal } from './ui/modals/briefing-modal.js';
import { showDiagnosticsModal } from './ui/modals/diagnostics-modal.js';
import {
  getDeviceConnections,
  renderDevicePortsHtml,
  bindDisconnectButtons,
  reopenCurrentDeviceInspector,
  showSwitchNotebook,
  showBuildingInspector,
  showRouterInspector,
  showFirewallInspector,
  showVpnInspector,
  showLoadBalancerInspector,
  showBackupPowerInspector,
  showDhcpInspector,
  showDnsInspector,
  showWebServerInspector,
  showEmailServerInspector,
  showDeviceInspector,
  showServerInspector,
  showWireInspector
} from './ui/modals/inspectors.js';

export class NetCityClientUI {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;

    this.currentLevelId = options.initialLevel || '1.1';
    this.currentSeed = options.initialSeed || this._randomSeed();
    this.activeTool = 'twisted_pair';
    this.dockTab = 'cables'; // 'cables' | 'devices'
    this.gameSpeed = 1; // 1 | 2 | 4

    // Move / Pickup tool state
    this.heldItem = null;
    this.cursorSquare = null;
    this.cursorPos = { x: 0, y: 0 };

    this.sim = null;
    this.levelDef = null;

    // Subsystem Instantiation
    this.stateManager = new StateManager();
    this.completedLevels = this.stateManager.completedLevels;
    this._campaignView = this.stateManager.campaignView;
    this._currentViewingCh = this.stateManager.currentViewingCh;
    this._learnTopic = this.stateManager.learnTopic;
    this.currentScreen = this.stateManager.currentScreen;
    this.lastScreenBeforeLearn = null;

    this.camera = new Camera();
    this.baseSquareSize = this.camera.baseSquareSize;
    this.isPanning = false;
    this.panStart = this.camera.panStart;

    this.pathBuilder = new PathBuilder(() => this.sim);
    this.isDragging = false;
    this.dragBuildingId = null;
    this.dragSourceId = null;
    this.dragSourceType = 'building';
    this.dragPath = [];
    this.dragValidity = { valid: true, message: '', isFaded: false };

    this.collisionBursts = [];
    this.isDestroyed = false;
    this._listeners = [];

    this.assets = new AssetManager();
    this.assets.preloadAll();

    this.campaignScreen = new CampaignScreen(this);
    this.learnScreen = new LearnScreen(this);
    this.endlessScreen = new EndlessScreen(this);

    this._initDOM();
    this._loadLevel(this.currentLevelId, this.currentSeed);

    this.interaction = new InteractionController(this);
    this._bindEvents();

    this.gameLoop = new GameLoop({
      getSim: () => this.sim,
      initialSpeed: this.gameSpeed,
      onTick: (events, sim) => {
        // Synchronize collision bursts for rendering
        this.collisionBursts = this.gameLoop.collisionBursts;
        if (sim && sim.tickNumber % 10 === 0) {
          this._updateCoinsDisplay();
        }
      },
      onBonus: (ev) => {
        this._updateCoinsDisplay();
      },
      onWin: (sim) => {
        this._updateCoinsDisplay();
        this._showLevelWonModal();
      },
      onLevelOver: (sim) => {
        this._updateCoinsDisplay();
        this._showLevelOverModal();
      },
      onRender: () => {
        this._render();
      }
    });

    this._startLoop();

    // Default entry screen: Fullscreen Campaign / Chapter Selection Page
    if (!this.options.initialLevel && !this.options.testMode) {
      this._setScreen('campaign');
      this._renderCampaignScreen();
    } else {
      this._setScreen('game');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Persistence & Screen Management
  // ─────────────────────────────────────────────────────────────────────────────

  _loadCompletedLevels() {
    return this.stateManager.loadCompletedLevels();
  }

  _saveCompletedLevels() {
    this.stateManager.completedLevels = this.completedLevels;
    this.stateManager.saveCompletedLevels();
  }

  _setScreen(name) {
    if (name === 'learn' && this.currentScreen !== 'learn') {
      this.lastScreenBeforeLearn = {
        screen: this.currentScreen,
        campaignView: this._campaignView,
        currentViewingCh: this._currentViewingCh,
        levelId: this.currentLevelId,
        wasPaused: Boolean(this.sim && this.sim.paused)
      };
      if (this.currentScreen === 'game' && this.sim) {
        this.sim.paused = true;
      }
    }

    this.currentScreen = name;
    this.stateManager.currentScreen = name;

    if (this.screenCampaignEl) {
      this.screenCampaignEl.style.display = name === 'campaign' ? 'flex' : 'none';
    }
    if (this.screenLearnEl) {
      this.screenLearnEl.style.display = name === 'learn' ? 'flex' : 'none';
    }
    if (this.screenEndlessEl) {
      this.screenEndlessEl.style.display = name === 'endless' ? 'flex' : 'none';
    }
    if (this.screenGameEl) {
      this.screenGameEl.style.display = name === 'game' ? 'flex' : 'none';
    }

    if (name === 'game') {
      this._updateCanvasSize();
      this._fitCamera();
    }
  }

  _returnFromLearn() {
    const last = this.lastScreenBeforeLearn || { screen: 'campaign', campaignView: 'chapters', currentViewingCh: 1 };

    if (last.screen === 'game') {
      this._setScreen('game');
      if (this.sim && !last.wasPaused) {
        this.sim.paused = false;
        if (this.btnPause) {
          this.btnPause.textContent = 'Pause';
          this.btnPause.style.backgroundColor = '';
        }
      }
      return;
    }

    if (last.screen === 'endless') {
      this._setScreen('endless');
      this._renderEndlessScreen();
      return;
    }

    if (last.screen === 'campaign') {
      this._campaignView = last.campaignView || 'chapters';
      this._currentViewingCh = last.currentViewingCh || 1;
      this._setScreen('campaign');
      this._renderCampaignScreen();
      return;
    }

    this._setScreen('campaign');
    this._renderCampaignScreen();
  }

  _randomSeed() {
    return Math.random().toString(36).substring(2, 8);
  }

  _renderEndlessScreen() {
    if (this.endlessScreen) {
      this.endlessScreen.render();
    }
  }

  _startEndlessRun(seed = 'endless-' + Math.random().toString(36).substring(2, 8), tier = null) {
    const unlockedTier = getUnlockedTier(this.completedLevels);
    // Use selected tier if valid (1 ≤ tier ≤ unlocked), else fall back to max unlocked
    const resolvedTier = (tier && tier >= 1 && tier <= unlockedTier) ? tier : unlockedTier;
    const setup = getEndlessSetup(resolvedTier);
    setup.seed = seed;
    this._campaignView = null;
    this._loadLevel('endless', seed, setup);
    this._setScreen('game');
  }

  _addListener(target, type, fn, opts) {
    this.interaction.addListener(target, type, fn, opts);
    this._listeners = this.interaction.listeners;
  }

  _removeAllListeners() {
    this.interaction.removeAllListeners();
    this._listeners = [];
  }

  _drawRoundRect(ctx, x, y, w, h, r) {
    drawRoundRect(ctx, x, y, w, h, r);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DOM Initialization & Layout
  // ─────────────────────────────────────────────────────────────────────────────

  _initDOM() {
    this.container.innerHTML = `
      <div class="nc-game-root">
        <!-- 1. Fullscreen Campaign Screen -->
        <div class="nc-screen nc-screen-campaign" id="nc-screen-campaign" style="display:none;"></div>

        <!-- 2. Fullscreen Learn Page -->
        <div class="nc-screen nc-screen-learn" id="nc-screen-learn" style="display:none;"></div>

        <!-- 3. Fullscreen Endless Mode Screen -->
        <div class="nc-screen nc-screen-endless" id="nc-screen-endless" style="display:none;"></div>

        <!-- 4. Fullscreen Gameplay Screen -->
        <div class="nc-screen nc-screen-game" id="nc-screen-game">
          <header class="nc-topbar">
          <div class="nc-topbar-left">
            <button class="nc-action-btn nc-btn-back" id="nc-btn-levels" title="Level Select">←</button>
            <div class="nc-brand">
              <span class="nc-brand-icon">⬡</span>
              <span class="nc-brand-text">NetCity</span>
            </div>
            <div class="nc-topbar-divider"></div>
            <div class="nc-topbar-info">
              <span class="nc-topbar-title" id="nc-title"></span>
              <div class="nc-topbar-goal" id="nc-goal-display"></div>
            </div>
          </div>

          <div class="nc-topbar-right">
            <div class="nc-topbar-metrics">
              <div class="nc-hud-pill nc-hud-deliveries" id="nc-deliveries-container" title="Packets Delivered">
                <span class="nc-pill-icon">📍</span>
                <span class="nc-pill-val" id="nc-deliveries-display">0</span>
              </div>
              <div class="nc-hud-pill nc-hud-coins" title="Available Coins">
                <span class="nc-pill-icon">🪙</span>
                <span class="nc-coins-value" id="nc-coins-display">0</span>
              </div>
              <div class="nc-hud-pill nc-hud-stars" id="nc-stars-container" title="Stars Earned">
                <span class="nc-pill-icon">⭐</span>
                <span class="nc-pill-val" id="nc-stars-display">3/3</span>
              </div>
              <div class="nc-hud-pill nc-hud-happiness" id="nc-happiness-container" style="display:none;" title="Citizen Happiness">
                <span class="nc-pill-icon">😊</span>
                <span class="nc-coins-value" id="nc-happiness-display" style="color:#10b981; font-weight:bold;">100%</span>
              </div>
              <button class="nc-action-btn nc-btn-speed" id="nc-btn-speed" title="Simulation Speed (1x / 2x / 4x)">1×</button>
            </div>
            <button class="nc-action-btn nc-btn-pause" id="nc-btn-pause" title="Shortcut: Space">Pause</button>
            <button class="nc-action-btn nc-btn-tutorial" id="nc-btn-tutorial" title="Networking Field Manual & Concept Guide">Guide</button>
            <button class="nc-action-btn" id="nc-btn-diagnostics" title="Bit's Diagnostic Toolkit (Test & Trace)">🔍 Trace</button>
            <button class="nc-action-btn nc-btn-reset-round" id="nc-btn-reset" title="Reset Level">🔄</button>
          </div>
        </header>

        <main class="nc-canvas-wrapper" id="nc-canvas-wrapper">
          <canvas class="nc-canvas" id="nc-canvas"></canvas>
          <div class="nc-zoom-controls">
            <button class="nc-zoom-btn" id="nc-btn-zoom-in" title="Zoom in">+</button>
            <button class="nc-zoom-btn" id="nc-btn-zoom-out" title="Zoom out">-</button>
            <button class="nc-zoom-btn" id="nc-btn-fit" title="Fit to window" style="font-size:0.8rem;">Fit</button>
          </div>
          <div class="nc-drag-tooltip" id="nc-drag-tooltip" style="display: none;"></div>
          <div class="nc-modal-overlay" id="nc-modal-container" style="display: none;"></div>
        </main>

        <!-- Dedicated Bottom Dock Toolbar (outside canvas so map cannot be generated/rendered underneath) -->
        <footer class="nc-bottom-dock" id="nc-bottom-dock">
          <div class="nc-hint-pill" id="nc-hint-bar" style="display: none;">
            <span class="nc-hint-icon">🔍</span>
            <span class="nc-hint-text" id="nc-hint-text"></span>
          </div>
          <div class="nc-dock-card">
            <div class="nc-dock-category-switch">
              <button class="nc-dock-cat-btn nc-dock-cat-active" id="nc-cat-cables">🔌 Cables</button>
              <button class="nc-dock-cat-btn" id="nc-cat-devices">🖲️ Devices</button>
            </div>
            <div class="nc-dock-tools">
              <div class="nc-dock-group" id="nc-dock-cables" style="display:flex; gap:6px;">
                <button class="nc-tool-btn nc-active-twisted_pair" id="nc-btn-twisted_pair" title="Shortcut: 1">
                  <span class="nc-tool-swatch" style="background:#e8903a;"></span>
                  <span>Twisted Pair</span>
                  <span class="nc-cost-badge">$1</span>
                </button>
                <button class="nc-tool-btn" id="nc-btn-coaxial" title="Shortcut: 2">
                  <span class="nc-tool-swatch" style="background:#b08968;"></span>
                  <span>Coaxial</span>
                  <span class="nc-cost-badge">$2</span>
                </button>
                <button class="nc-tool-btn" id="nc-btn-multimode_fiber" title="Shortcut: 3">
                  <span class="nc-tool-swatch" style="background:#4cc9f0;"></span>
                  <span>Multimode</span>
                  <span class="nc-cost-badge">$3</span>
                </button>
                <button class="nc-tool-btn" id="nc-btn-single_mode_fiber" title="Shortcut: 4">
                  <span class="nc-tool-swatch" style="background:#9d8cff;"></span>
                  <span>Single-Mode</span>
                  <span class="nc-cost-badge">$5</span>
                </button>
              </div>

              <div class="nc-dock-group" id="nc-dock-devices" style="display:none; gap:6px;">
                <button class="nc-tool-btn" id="nc-btn-switch" title="Shortcut: 8">
                  <span>📦</span> Switch <span class="nc-cost-badge">$10</span>
                </button>
                <button class="nc-tool-btn" id="nc-btn-router" title="Shortcut: 9">
                  <span>🧭</span> Router <span class="nc-cost-badge">$20</span>
                </button>
                <button class="nc-tool-btn" id="nc-btn-firewall" title="Firewall">
                  <span>🛡️</span> Firewall <span class="nc-cost-badge">$25</span>
                </button>
                <button class="nc-tool-btn" id="nc-btn-access_point" title="Shortcut: 5">
                  <span>📡</span> AP <span class="nc-cost-badge">$8</span>
                </button>
                <button class="nc-tool-btn" id="nc-btn-hub" title="Shortcut: 7">
                  <span>🔀</span> Hub <span class="nc-cost-badge">$4</span>
                </button>
                <button class="nc-tool-btn" id="nc-btn-cabinet" title="Shortcut: 6">
                  <span>🗄️</span> Cabinet <span class="nc-cost-badge">$2</span>
                </button>
                <button class="nc-tool-btn" id="nc-btn-vpn_gateway" title="VPN Gateway">
                  <span>🔒</span> VPN <span class="nc-cost-badge">$30</span>
                </button>
                <button class="nc-tool-btn" id="nc-btn-load_balancer" title="Load Balancer">
                  <span>⚖️</span> Balancer <span class="nc-cost-badge">$30</span>
                </button>
                <button class="nc-tool-btn" id="nc-btn-backup_power" title="Backup Power">
                  <span>🔋</span> Power <span class="nc-cost-badge">$15</span>
                </button>
                <button class="nc-tool-btn" id="nc-btn-dhcp_server" title="DHCP Server">
                  <span>📋</span> DHCP <span class="nc-cost-badge">$15</span>
                </button>
                <button class="nc-tool-btn" id="nc-btn-dns_server" title="DNS Server">
                  <span>📖</span> DNS <span class="nc-cost-badge">$15</span>
                </button>
                <button class="nc-tool-btn" id="nc-btn-web_server" title="Web Server">
                  <span>🌐</span> Web <span class="nc-cost-badge">$20</span>
                </button>
                <button class="nc-tool-btn" id="nc-btn-email_server" title="Email Server">
                  <span>✉️</span> Mail <span class="nc-cost-badge">$20</span>
                </button>
              </div>

              <button class="nc-tool-btn" id="nc-btn-pickup" title="Move / Relocate (Shortcut: M)">
                <span>✋</span> Move
              </button>
            </div>
          </div>
        </footer>
        </div>
      </div>
    `;

    this.screenCampaignEl = this.container.querySelector('#nc-screen-campaign');
    this.screenLearnEl = this.container.querySelector('#nc-screen-learn');
    this.screenEndlessEl = this.container.querySelector('#nc-screen-endless');
    this.screenGameEl = this.container.querySelector('#nc-screen-game');

    this.canvasWrapper = this.container.querySelector('#nc-canvas-wrapper');
    this.canvas = this.container.querySelector('#nc-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.titleEl = this.container.querySelector('#nc-title');
    this.coinsEl = this.container.querySelector('#nc-coins-display');
    this.goalEl = this.container.querySelector('#nc-goal-display');
    this.hintBarEl = this.container.querySelector('#nc-hint-bar');
    this.tooltipEl = this.container.querySelector('#nc-drag-tooltip');
    this.modalEl = this.container.querySelector('#nc-modal-container');
    this.btnSpeed = this.container.querySelector('#nc-btn-speed');
    this.btnPause = this.container.querySelector('#nc-btn-pause');
    this.btnTutorial = this.container.querySelector('#nc-btn-tutorial');
    this.btnDiagnostics = this.container.querySelector('#nc-btn-diagnostics');

    this.wireBtns = {
      twisted_pair: this.container.querySelector('#nc-btn-twisted_pair'),
      coaxial: this.container.querySelector('#nc-btn-coaxial'),
      multimode_fiber: this.container.querySelector('#nc-btn-multimode_fiber'),
      single_mode_fiber: this.container.querySelector('#nc-btn-single_mode_fiber')
    };

    this.deviceBtns = {
      access_point: this.container.querySelector('#nc-btn-access_point'),
      cabinet: this.container.querySelector('#nc-btn-cabinet'),
      hub: this.container.querySelector('#nc-btn-hub'),
      switch: this.container.querySelector('#nc-btn-switch'),
      router: this.container.querySelector('#nc-btn-router'),
      firewall: this.container.querySelector('#nc-btn-firewall'),
      vpn_gateway: this.container.querySelector('#nc-btn-vpn_gateway'),
      load_balancer: this.container.querySelector('#nc-btn-load_balancer'),
      backup_power: this.container.querySelector('#nc-btn-backup_power'),
      dhcp_server: this.container.querySelector('#nc-btn-dhcp_server'),
      dns_server: this.container.querySelector('#nc-btn-dns_server'),
      web_server: this.container.querySelector('#nc-btn-web_server'),
      email_server: this.container.querySelector('#nc-btn-email_server')
    };

    this.pickupBtn = this.container.querySelector('#nc-btn-pickup');

    // Subsystem Controllers Binding
    this.canvasRenderer = new CanvasRenderer(this.canvas, this.ctx, this.assets);
    this.modalManager = new ModalManager(this.modalEl);

    this.hudController = new HUDController({
      titleEl: this.titleEl,
      goalEl: this.goalEl,
      coinsEl: this.coinsEl,
      deliveriesEl: this.container.querySelector('#nc-deliveries-display'),
      starsEl: this.container.querySelector('#nc-stars-display'),
      happinessContainer: this.container.querySelector('#nc-happiness-container'),
      happinessDisplay: this.container.querySelector('#nc-happiness-display'),
      hintBarEl: this.hintBarEl,
      btnSpeed: this.container.querySelector('#nc-btn-speed'),
      btnPause: this.btnPause
    });

    this.dockController = new DockController(this.container, this.wireBtns, this.deviceBtns, this.pickupBtn);

    this._updateCanvasSize();
  }

  _updateCanvasSize() {
    if (!this.canvasWrapper) return;
    const rect = this.canvasWrapper.getBoundingClientRect();
    const w = Math.floor(rect.width) || this.canvasWrapper.clientWidth || 800;
    const h = Math.floor(rect.height) || this.canvasWrapper.clientHeight || 500;

    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;
    }

    this._fitCamera();
  }

  _fitCamera() {
    if (!this.sim || !this.canvas) return;
    this.camera.fit(this.canvas.width, this.canvas.height, this.sim.width, this.sim.height, {
      top: 76,
      bottom: 96,
      left: 28,
      right: 28
    });
    this.baseSquareSize = this.camera.baseSquareSize;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Level Loading & Procedural Map Generation
  // ─────────────────────────────────────────────────────────────────────────────

  _loadLevel(levelId, seed, customDef = null) {
    this.currentLevelId = levelId;
    this.currentSeed = seed;

    // Reset simulation speed to 1x on level load
    if (this.gameLoop && typeof this.gameLoop.setSpeed === 'function') {
      this.gameLoop.setSpeed(1);
    }
    this.gameSpeed = 1;
    if (this.btnSpeed) {
      this.btnSpeed.textContent = '1×';
      this.btnSpeed.classList.remove('nc-speed-active');
    }

    const { levelDef, mapData } = generateLevelMap(levelId, seed, customDef);
    this.levelDef = levelDef;
    this.sim = new NetCitySimulation(mapData);

    this.hudController.updateLevelHeader(this.levelDef);
    this._updateToolButtons();
    this._updateCoinsDisplay();
    this._updateCanvasSize();
    this._closeModal();

    // Auto-pause simulation at start so student can read the objective and lesson briefing
    if (!this.sim.isEndless) {
      this.sim.paused = true;
      if (this.btnPause) {
        this.btnPause.textContent = 'Resume';
        this.btnPause.style.backgroundColor = 'var(--nc-green)';
      }
      showLevelBriefingModal(this, this.levelDef);
    } else {
      if (this.btnPause) {
        this.btnPause.textContent = 'Pause';
        this.btnPause.style.backgroundColor = '';
      }
      this._setHint(this.levelDef.hint);
    }
  }

  _findValidSquare(w, h, serverSq, range, used, rng = Math.random.bind(Math), side = null, river = null) {
    return findValidSquare(w, h, serverSq, range, used, rng, side, river);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UI & HUD State Synchronization
  // ─────────────────────────────────────────────────────────────────────────────

  _updateToolButtons() {
    this.dockTab = this.dockController.updateToolButtons(this.activeTool, this.dockTab, this.levelDef) || this.dockTab;
  }

  _updateCoinsDisplay() {
    this.hudController.updateMetrics(this.sim, this.levelDef);
  }

  _setHint(text, isAlert = false) {
    this.hudController.setHint(text, isAlert);
  }

  _bindEvents() {
    this.interaction.bindEvents();
    this._listeners = this.interaction.listeners;
  }

  _checkDragValidity() {
    if (!this.sim || this.dragPath.length < 1) return;
    const sourceId = this.dragSourceType === 'device' ? this.dragSourceId : this.dragBuildingId;
    const wireType = this._getActiveWireType();
    const res = this.sim.validateWire(sourceId, this.dragPath, wireType, this.dragSourceType || 'building');
    this.dragValidity = res;
  }

  _getActiveWireType() {
    if (['twisted_pair', 'coaxial', 'multimode_fiber', 'single_mode_fiber'].includes(this.activeTool)) {
      return this.activeTool;
    }
    return (this.levelDef.wiresAllowed && this.levelDef.wiresAllowed[0]) || 'twisted_pair';
  }

  _startLoop() {
    if (this.gameLoop) {
      this.gameLoop.start();
      this.rafId = this.gameLoop.rafId;
    }
  }

  _render() {
    if (!this.canvasRenderer || !this.sim) return;

    this.canvasRenderer.render({
      sim: this.sim,
      camera: this.camera,
      levelDef: this.levelDef,
      isDragging: this.isDragging,
      dragPath: this.dragPath,
      dragValidity: this.dragValidity,
      activeWireType: this._getActiveWireType(),
      collisionBursts: this.collisionBursts,
      cursorSquare: this.cursorSquare,
      heldItem: this.heldItem,
      activeTool: this.activeTool,
      deviceBtns: this.deviceBtns
    });
  }

  _drawWirePath(ctx, path, color, sz, isFaded = false) {
    drawWirePath(ctx, path, color, sz, isFaded, this.sim ? this.sim.width : 24);
  }

  _getPathPoint(path, progress, sz) {
    return getPathPoint(path, progress, sz, this.sim ? this.sim.width : 24);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Campaign & Learn Screens
  // ─────────────────────────────────────────────────────────────────────────────

  _getChaptersData() {
    return getChaptersData();
  }

  _renderCampaignScreen() {
    this.campaignScreen.render();
  }

  _renderChapterLevelsView() {
    this.campaignScreen.renderChapterLevelsView();
  }

  _renderLearnScreen(topic = null) {
    this.learnScreen.render(topic);
  }

  _showLevelsModal(selectedChNum = null) {
    this._closeModal();
    if (this.sim && this.sim.isEndless) {
      this._setScreen('endless');
      this._renderEndlessScreen();
      return;
    }
    if (selectedChNum) {
      this._campaignView = 'chapter_levels';
      this._currentViewingCh = selectedChNum;
    } else {
      this._campaignView = 'chapters';
    }
    this._setScreen('campaign');
    this._renderCampaignScreen();
  }

  _showTutorialModal(topic = 'mac_ip') {
    this._closeModal();
    this._setScreen('learn');
    this._renderLearnScreen(topic);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Modal Dialogs & Inspectors
  // ─────────────────────────────────────────────────────────────────────────────

  _showLevelWonModal() {
    showLevelWonModal(this);
  }

  _showLevelOverModal() {
    showLevelOverModal(this);
  }

  _showWireInspector(wire) {
    showWireInspector(this, wire);
  }

  _getDeviceConnections(device) {
    return getDeviceConnections(this, device);
  }

  _renderDevicePortsHtml(device) {
    return renderDevicePortsHtml(this, device);
  }

  _bindDisconnectButtons(device) {
    bindDisconnectButtons(this, device);
  }

  _reopenCurrentDeviceInspector(device) {
    reopenCurrentDeviceInspector(this, device);
  }

  _showSwitchNotebook(device) {
    showSwitchNotebook(this, device);
  }

  _showBuildingInspector(b) {
    showBuildingInspector(this, b);
  }

  _showRouterInspector(device) {
    showRouterInspector(this, device);
  }

  _showFirewallInspector(device) {
    showFirewallInspector(this, device);
  }

  _showVpnInspector(device) {
    showVpnInspector(this, device);
  }

  _showLoadBalancerInspector(device) {
    showLoadBalancerInspector(this, device);
  }

  _showBackupPowerInspector(device) {
    showBackupPowerInspector(this, device);
  }

  _showDiagnosticsModal() {
    showDiagnosticsModal(this);
  }

  _showDhcpInspector(device) {
    showDhcpInspector(this, device);
  }

  _showDnsInspector(device) {
    showDnsInspector(this, device);
  }

  _showWebServerInspector(device) {
    showWebServerInspector(this, device);
  }

  _showEmailServerInspector(device) {
    showEmailServerInspector(this, device);
  }

  _showDeviceInspector(device) {
    reopenCurrentDeviceInspector(this, device);
  }

  _showServerInspector(server) {
    showServerInspector(this, server);
  }

  _closeModal() {
    this.modalManager.close();
  }

  destroy() {
    this.isDestroyed = true;
    if (this.gameLoop) {
      this.gameLoop.destroy();
    }
    if (this.interaction) {
      this.interaction.removeAllListeners();
    }
    this._removeAllListeners();
    if (this.container) this.container.innerHTML = '';
  }
}
