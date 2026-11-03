import { WIRE_CATALOG, REFUSAL_MESSAGES } from '../../../packages/content/src/wires.js';
import { ALL_LEVELS, getLevelById } from '../../../packages/content/src/levels.js';
import { DEVICE_CATALOG } from '../../../packages/content/src/devices.js';
import { NetCitySimulation } from '../../../packages/sim/src/sim.js';
import { bfsPath } from '../../../packages/sim/src/pathfinding.js';
import { createStreamRng } from '../../../packages/sim/src/prng.js';
import { AssetManager } from './assets.js';

export class NetCityClientUI {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;

    this.currentLevelId = options.initialLevel || '1.1';
    this.currentSeed = options.initialSeed || this._randomSeed();
    this.activeTool = 'twisted_pair';
    this.dockTab = 'cables'; // 'cables' | 'devices'
    this.gameSpeed = 1; // 1 | 2 | 3

    // Move / Pickup tool state
    this.heldItem = null;
    this.cursorSquare = null;
    this.cursorPos = { x: 0, y: 0 };

    this.sim = null;
    this.levelDef = null;

    // Camera & adaptive view (Section 9.1 & 15.5)
    this.camera = { x: 0, y: 0, zoom: 1.0 };
    this.baseSquareSize = 40;
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };

    // Drag wire state
    this.isDragging = false;
    this.dragBuildingId = null;
    this.dragPath = [];
    this.dragValidity = { valid: true, message: '' };

    this.rafId = null;
    this.lastTime = 0;
    this.tickAccumulator = 0;
    this.collisionBursts = [];
    this.isDestroyed = false;
    this._listeners = [];

    this.completedLevels = this._loadCompletedLevels();
    this._campaignView = 'chapters';
    this._currentViewingCh = 1;
    this._learnTopic = 'mac_ip';
    this.currentScreen = 'campaign';

    this.assets = new AssetManager();
    this.assets.preloadAll();

    this._initDOM();
    this._loadLevel(this.currentLevelId, this.currentSeed);
    this._bindEvents();
    this._startLoop();

    // Default entry screen: Fullscreen Campaign / Chapter Selection Page
    if (!this.options.initialLevel && !this.options.testMode) {
      this._setScreen('campaign');
      this._renderCampaignScreen();
    } else {
      this._setScreen('game');
    }
  }

  _loadCompletedLevels() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('netcity_completed_levels');
        if (raw) return new Set(JSON.parse(raw));
      }
    } catch (e) {}
    return new Set();
  }

  _saveCompletedLevels() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('netcity_completed_levels', JSON.stringify([...this.completedLevels]));
      }
    } catch (e) {}
  }

  _setScreen(name) {
    this.currentScreen = name;

    if (this.screenCampaignEl) {
      this.screenCampaignEl.style.display = name === 'campaign' ? 'flex' : 'none';
    }
    if (this.screenLearnEl) {
      this.screenLearnEl.style.display = name === 'learn' ? 'flex' : 'none';
    }
    if (this.screenGameEl) {
      this.screenGameEl.style.display = name === 'game' ? 'flex' : 'none';
    }

    if (name === 'game') {
      this._updateCanvasSize();
      this._fitCamera();
    }
  }

  _randomSeed() {
    return Math.random().toString(36).substring(2, 8);
  }

  _addListener(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this._listeners.push({ target, type, fn, opts });
  }

  _removeAllListeners() {
    for (const { target, type, fn, opts } of this._listeners) {
      target.removeEventListener(type, fn, opts);
    }
    this._listeners = [];
  }

  _drawRoundRect(ctx, x, y, w, h, r) {
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.beginPath();
      ctx.rect(x, y, w, h);
    }
  }

  _initDOM() {
    this.container.innerHTML = `
      <div class="nc-game-root">
        <!-- 1. Fullscreen Campaign Screen -->
        <div class="nc-screen nc-screen-campaign" id="nc-screen-campaign" style="display:none;"></div>

        <!-- 2. Fullscreen Learn Page -->
        <div class="nc-screen nc-screen-learn" id="nc-screen-learn" style="display:none;"></div>

        <!-- 3. Fullscreen Gameplay Screen -->
        <div class="nc-screen nc-screen-game" id="nc-screen-game">
          <header class="nc-topbar">
          <div class="nc-topbar-left">
            <button class="nc-action-btn nc-btn-back" id="nc-btn-levels" title="Level Select">←</button>
            <div class="nc-brand">
              <span class="nc-brand-icon">⬡</span>
              <span class="nc-brand-text">NetCity</span>
            </div>
            <div class="nc-topbar-info">
              <span class="nc-topbar-title" id="nc-title"></span>
              <div class="nc-topbar-goal" id="nc-goal-display"></div>
            </div>
          </div>

          <div class="nc-topbar-right">
            <div class="nc-hud-pill nc-hud-deliveries" id="nc-deliveries-container" title="Packets Delivered">
              <span class="nc-pill-icon">📍</span>
              <span class="nc-pill-val" id="nc-deliveries-display">0</span>
            </div>
            <div class="nc-hud-pill nc-hud-coins" title="Available Coins">
              <span class="nc-pill-icon">🟡</span>
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
            <button class="nc-action-btn nc-btn-speed" id="nc-btn-speed" title="Simulation Speed (1x / 2x / 3x)">1×</button>
            <button class="nc-action-btn nc-btn-pause" id="nc-btn-pause" title="Shortcut: Space">Pause</button>
            <button class="nc-action-btn nc-btn-tutorial" id="nc-btn-tutorial" title="Networking Field Manual & Concept Guide">📖 Guide</button>
            <button class="nc-action-btn" id="nc-btn-diagnostics" title="Bit's Diagnostic Toolkit (Test & Trace)">🔍 Trace</button>
            <button class="nc-action-btn" id="nc-btn-reset" title="Reset Level">🔄</button>
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

          <!-- Mini Motorways Floating Bottom Dock -->
          <div class="nc-bottom-dock">
            <div class="nc-hint-pill" id="nc-hint-bar">
              <span class="nc-hint-icon">💡</span>
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
          </div>
        </main>
        </div>
      </div>
    `;

    this.screenCampaignEl = this.container.querySelector('#nc-screen-campaign');
    this.screenLearnEl = this.container.querySelector('#nc-screen-learn');
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

    this.dragSourceType = 'building';
    this.dragSourceId = null;

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
    const availW = this.canvas.width;
    const availH = this.canvas.height;

    // Adaptive scaling (Section 9.1)
    const sz = Math.floor(Math.min(availW / this.sim.width, availH / this.sim.height));
    this.baseSquareSize = Math.max(12, sz);
    this.camera.zoom = 1.0;

    // Center grid
    const totalW = this.sim.width * this.baseSquareSize;
    const totalH = this.sim.height * this.baseSquareSize;
    this.camera.x = Math.floor((availW - totalW) / 2);
    this.camera.y = Math.floor((availH - totalH) / 2);
  }

  _loadLevel(levelId, seed) {
    this.currentLevelId = levelId;
    this.currentSeed = seed;
    this.levelDef = getLevelById(levelId) || ALL_LEVELS[0];

    // Build procedural map data conforming to levelDef
    const w = this.levelDef.grid.w;
    const h = this.levelDef.grid.h;
    let serverSquare = Math.floor(h / 2) * w + (w > 32 ? 6 : Math.floor(w / 2));
    if (this.levelDef.river && Array.isArray(this.levelDef.river)) {
      serverSquare = Math.floor(h / 2) * w + Math.floor((this.levelDef.river[1] + 1 + w) / 2);
    }
    const used = new Set();

    let servers = null;
    if (Array.isArray(this.levelDef.servers) && this.levelDef.servers.length > 0) {
      const centerX = Math.floor(w / 2);
      const centerY = Math.floor(h / 2);
      servers = this.levelDef.servers.map(s => {
        const offX = s.offset ? s.offset[0] : 0;
        const offY = s.offset ? s.offset[1] : 0;
        const sq = (centerY + offY) * w + (centerX + offX);
        used.add(sq);
        return {
          id: s.id,
          type: s.type,
          name: s.name,
          icon: s.icon,
          color: s.color,
          mac: s.mac,
          square: sq
        };
      });
      serverSquare = servers[0].square;
    } else {
      used.add(serverSquare);
    }

    // Seeded RNGs for reproducible map layout (Bug H fix)
    const mapRng = createStreamRng(seed, 'map');
    const wallRng = createStreamRng(seed, 'walls');

    // Buildings placement with 4-neighbor approach capacity enforcement (Section 4.1 & 7.8)
    const buildings = [];
    let requiredTargetingServer = 0;
    const hasConcentrators = (this.levelDef.devicesAllowed || []).some(d => ['cabinet', 'hub', 'switch', 'access_point', 'router'].includes(d));
    const maxDeviceCapacity = hasConcentrators ? 999 : 4;

    // Start buildings
    for (const b of this.levelDef.start) {
      const sq = this._findValidSquare(w, h, serverSquare, b.range, used, mapRng, b.side, this.levelDef.river);
      used.add(sq);
      const isReq = b.required !== false && requiredTargetingServer < maxDeviceCapacity;
      if (isReq) requiredTargetingServer++;

      buildings.push({
        id: b.id,
        name: b.name || undefined,
        type: b.type,
        square: sq,
        required: isReq,
        targetServerId: b.targetServerId || null,
        targetHostname: b.targetHostname || b.domain || null,
        targetPort: b.targetPort || b.port || null,
        zone: b.zone || undefined,
        isRogue: Boolean(b.isRogue),
        ip: b.ip !== undefined ? b.ip : undefined,
        subnet: b.subnet || undefined,
        defaultGateway: b.defaultGateway !== undefined ? b.defaultGateway : undefined,
        side: b.side || undefined,
        mac: b.mac || null,
        opensAtTick: 0,
        quota: b.type === 'classroom' ? 3 : 2,
        firstTimerTicks: this.levelDef.firstTimerTicks,
        cycleTimerTicks: this.levelDef.cycleTimerTicks,
        deadlineTicks: this.levelDef.deadlineTicks,
        requestIntervalTicks: b.type === 'classroom' ? 40 : 60
      });
    }

    // Spawn buildings
    let nextId = buildings.length + 1;
    for (const s of this.levelDef.spawns) {
      const sq = this._findValidSquare(w, h, serverSquare, s.range, used, mapRng, s.side, this.levelDef.river);
      used.add(sq);
      const isReq = s.required !== false && requiredTargetingServer < maxDeviceCapacity;
      if (isReq) requiredTargetingServer++;

      buildings.push({
        id: nextId++,
        name: s.name || undefined,
        type: s.type,
        square: sq,
        required: isReq,
        targetServerId: s.targetServerId || null,
        targetHostname: s.targetHostname || s.domain || null,
        targetPort: s.targetPort || s.port || null,
        zone: s.zone || undefined,
        isRogue: Boolean(s.isRogue),
        ip: s.ip !== undefined ? s.ip : undefined,
        subnet: s.subnet || undefined,
        defaultGateway: s.defaultGateway !== undefined ? s.defaultGateway : undefined,
        side: s.side || undefined,
        mac: s.mac || null,
        opensAtTick: s.tick,
        quota: s.type === 'classroom' ? 3 : 2,
        firstTimerTicks: this.levelDef.firstTimerTicks,
        cycleTimerTicks: this.levelDef.cycleTimerTicks,
        deadlineTicks: this.levelDef.deadlineTicks,
        requestIntervalTicks: s.type === 'classroom' ? 40 : 60
      });
    }

    // Wall generation (Bug N fix) — seeded rectangular obstacle blocks
    const walls = [];
    const wallCount = this.levelDef.walls || 0;
    const serverX = serverSquare % w;
    const serverY = Math.floor(serverSquare / w);

    for (let block = 0; block < wallCount; block++) {
      // Try up to 40 times to place a non-overlapping wall block
      for (let attempt = 0; attempt < 40; attempt++) {
        const bw = 1 + Math.floor(wallRng() * 3); // width 1-3
        const bh = 1 + Math.floor(wallRng() * 2); // height 1-2
        const bx = Math.floor(wallRng() * (w - bw));
        const by = Math.floor(wallRng() * (h - bh));

        // Collect squares this block would occupy
        const candidates = [];
        let conflicts = false;
        for (let dy = 0; dy < bh && !conflicts; dy++) {
          for (let dx = 0; dx < bw && !conflicts; dx++) {
            const sq = (by + dy) * w + (bx + dx);
            // Reject if overlaps server, any placed entity, or is adjacent (Chebyshev ≤ 1) to server, or in river
            const cx = sq % w;
            const cy = Math.floor(sq / w);
            if (
              used.has(sq) ||
              walls.includes(sq) ||
              (this.levelDef.river && cx >= this.levelDef.river[0] && cx <= this.levelDef.river[1]) ||
              (Math.abs(cx - serverX) <= 1 && Math.abs(cy - serverY) <= 1)
            ) {
              conflicts = true;
            } else {
              candidates.push(sq);
            }
          }
        }

        if (!conflicts && candidates.length > 0) {
          for (const sq of candidates) walls.push(sq);
          break;
        }
      }
    }

    const mapData = {
      level: this.levelDef.id,
      chapter: this.levelDef.chapter || 1,
      concept: this.levelDef.concept || null,
      river: this.levelDef.river || null,
      seed,
      width: w,
      height: h,
      server: serverSquare,
      servers: servers || undefined,
      walls,
      noisySquares: this.levelDef.noisySquares || [],
      snoopSquares: this.levelDef.snoopSquares || [],
      startingCoins: this.levelDef.coins,
      buildings,
      wiresAllowed: this.levelDef.wiresAllowed,
      devicesAllowed: this.levelDef.devicesAllowed || ['server'],
      events: this.levelDef.events || [],
      goal: this.levelDef.goal,
      targetTicks: this.levelDef.targetTicks,
      minHappiness: this.levelDef.minHappiness
    };

    this.sim = new NetCitySimulation(mapData);
    if (this.btnPause) {
      this.btnPause.textContent = 'Pause';
      this.btnPause.style.backgroundColor = '';
    }
    this.titleEl.textContent = this.levelDef.title;
    this.titleEl.title = this.levelDef.title;
    if (this.goalEl) {
      if (this.levelDef.id === '1.2') {
        this.goalEl.innerHTML = `<span class="nc-goal-tag">🎯 Goal:</span> Connect 2 Classrooms (10m copper limit) <span class="nc-goal-note">| 1 Far Laptop (optional demo)</span>`;
      } else if (this.levelDef.goal === 'keep_happy') {
        const sec = Math.round((this.levelDef.targetTicks || 3600) / 60);
        this.goalEl.innerHTML = `<span class="nc-goal-tag">🏙️ Goal:</span> Maintain Happiness &ge; ${this.levelDef.minHappiness || 80}% for ${sec}s`;
      } else if (this.levelDef.goal === 'connect_all') {
        const reqCount = this.levelDef.start.filter(b => b.required !== false).length;
        this.goalEl.innerHTML = `<span class="nc-goal-tag">🎯 Goal:</span> Connect all ${reqCount > 0 ? reqCount : 'all'} buildings & meet quota`;
      } else if (this.levelDef.goal && this.levelDef.goal.startsWith('survive')) {
        const sec = Math.round((this.levelDef.targetTicks || 3600) / 60);
        this.goalEl.innerHTML = `<span class="nc-goal-tag">🛡️ Goal:</span> Survive ${sec}s without any building failing`;
      } else {
        this.goalEl.innerHTML = `<span class="nc-goal-tag">🎯 Goal:</span> ${this.levelDef.goal || 'Connect campus'}`;
      }
    }
    this._setHint(this.levelDef.hint);
    this._updateToolButtons();
    this._updateCoinsDisplay();
    this._updateCanvasSize();
    this._closeModal();
  }

  _findValidSquare(w, h, serverSq, range, used, rng = Math.random.bind(Math), side = null, river = null) {
    const sx = serverSq % w;
    const sy = Math.floor(serverSq / w);
    const minD = (range && range[0]) !== undefined ? range[0] : 2;
    const maxD = (range && range[1]) !== undefined ? range[1] : 12;

    let minX = 0;
    let maxX = w - 1;
    let anchorX = sx;
    let anchorY = sy;

    if (river && Array.isArray(river)) {
      if (side === 'left') {
        minX = 1;
        maxX = Math.max(1, river[0] - 1);
        anchorX = Math.floor(river[0] / 2);
        anchorY = Math.floor(h / 2);
      } else if (side === 'right') {
        minX = Math.min(w - 2, river[1] + 1);
        maxX = w - 2;
        anchorX = Math.floor((river[1] + 1 + w) / 2);
        anchorY = Math.floor(h / 2);
      }
    }

    for (let r = 0; r < 300; r++) {
      const x = minX + Math.floor(rng() * (maxX - minX + 1));
      const y = Math.floor(rng() * h);
      const sq = y * w + x;
      if (river && x >= river[0] && x <= river[1]) continue;
      const d = Math.abs(x - anchorX) + Math.abs(y - anchorY);
      if (!used.has(sq) && d >= minD && d <= maxD && Math.max(Math.abs(x - anchorX), Math.abs(y - anchorY)) >= 2) {
        return sq;
      }
    }
    // Fallback safe square
    for (let y = 1; y < h - 1; y++) {
      for (let x = minX; x <= maxX; x++) {
        const sq = y * w + x;
        if (river && x >= river[0] && x <= river[1]) continue;
        if (!used.has(sq)) return sq;
      }
    }
    return (Math.min(sy + minD, h - 1)) * w + minX;
  }

  _updateToolButtons() {
    const isDeviceTool = Boolean(this.deviceBtns[this.activeTool]);
    if (isDeviceTool && this.dockTab !== 'devices') {
      this.dockTab = 'devices';
    } else if (['twisted_pair', 'coaxial', 'multimode_fiber', 'single_mode_fiber'].includes(this.activeTool) && this.dockTab !== 'cables') {
      this.dockTab = 'cables';
    }

    const catCablesBtn = this.container.querySelector('#nc-cat-cables');
    const catDevicesBtn = this.container.querySelector('#nc-cat-devices');
    const dockCables = this.container.querySelector('#nc-dock-cables');
    const dockDevices = this.container.querySelector('#nc-dock-devices');

    if (catCablesBtn && catDevicesBtn && dockCables && dockDevices) {
      const isCables = this.dockTab === 'cables';
      catCablesBtn.classList.toggle('nc-dock-cat-active', isCables);
      catDevicesBtn.classList.toggle('nc-dock-cat-active', !isCables);
      dockCables.style.display = isCables ? 'flex' : 'none';
      dockDevices.style.display = isCables ? 'none' : 'flex';
    }

    const allowedWires = this.levelDef.wiresAllowed || [];
    for (const [key, btn] of Object.entries(this.wireBtns)) {
      const isAllowed = allowedWires.includes(key);
      btn.style.display = isAllowed ? 'inline-flex' : 'none';
      btn.className = `nc-tool-btn ${this.activeTool === key ? `nc-active-${key}` : ''}`;
    }

    const allowedDevices = this.levelDef.devicesAllowed || [];
    for (const [key, btn] of Object.entries(this.deviceBtns)) {
      const isAllowed = allowedDevices.includes(key);
      btn.style.display = isAllowed ? 'inline-flex' : 'none';
      btn.className = `nc-tool-btn ${this.activeTool === key ? `nc-active-${key}` : ''}`;
    }

    if (this.pickupBtn) {
      const hasDevices = (this.levelDef.devicesAllowed || []).some(d => d !== 'server');
      this.pickupBtn.style.display = hasDevices ? 'inline-flex' : 'none';
      this.pickupBtn.className = `nc-tool-btn ${this.activeTool === 'pickup' ? 'nc-active-pickup' : ''}`;
    }
  }

  _updateCoinsDisplay() {
    if (!this.coinsEl || !this.sim) return;
    this.coinsEl.textContent = `${this.sim.coins}`;

    const delEl = this.container.querySelector('#nc-deliveries-display');
    if (delEl) {
      const totalDelivered = this.sim.buildings.reduce((sum, b) => sum + (b.deliveredTotal || 0), 0);
      delEl.textContent = `${totalDelivered}`;
    }

    const happyContainer = this.container.querySelector('#nc-happiness-container');
    const happyDisplay = this.container.querySelector('#nc-happiness-display');
    if (happyContainer && happyDisplay) {
      if (this.levelDef && this.levelDef.goal === 'keep_happy') {
        happyContainer.style.display = 'inline-flex';
        const h = this.sim.happinessMeter !== undefined ? this.sim.happinessMeter : 100;
        happyDisplay.textContent = `${h}%`;
        happyDisplay.style.color = h >= 80 ? '#10b981' : (h >= 50 ? '#f59e0b' : '#ef4444');
      } else {
        happyContainer.style.display = 'none';
      }
    }
  }

  _setHint(text, isAlert = false) {
    if (!this.hintBarEl) return;
    const txt = this.hintBarEl.querySelector('#nc-hint-text');
    if (txt) txt.textContent = text;
    else this.hintBarEl.textContent = text;
    this.hintBarEl.classList.toggle('nc-hint-alert', isAlert);
  }

  _bindEvents() {
    // Tool buttons
    for (const [key, btn] of Object.entries(this.wireBtns)) {
      this._addListener(btn, 'click', () => {
        if (this.levelDef.wiresAllowed.includes(key)) {
          this.activeTool = key;
          this._updateToolButtons();
        }
      });
    }

    // Device buttons
    for (const [key, btn] of Object.entries(this.deviceBtns)) {
      this._addListener(btn, 'click', () => {
        if (this.levelDef.devicesAllowed && this.levelDef.devicesAllowed.includes(key)) {
          this.activeTool = key;
          this._updateToolButtons();
        }
      });
    }

    // Pickup / Move button
    if (this.pickupBtn) {
      this._addListener(this.pickupBtn, 'click', () => {
        this.activeTool = 'pickup';
        this._updateToolButtons();
        this._setHint('Move tool selected: Click an existing device to pick it up and relocate it.');
      });
    }

    // Mini Motorways Segmented Category Switch (Cables vs Devices)
    const catCables = this.container.querySelector('#nc-cat-cables');
    if (catCables) {
      this._addListener(catCables, 'click', () => {
        this.dockTab = 'cables';
        const allowedWires = this.levelDef.wiresAllowed || [];
        if (!allowedWires.includes(this.activeTool)) {
          this.activeTool = allowedWires[0] || 'twisted_pair';
        }
        this._updateToolButtons();
      });
    }

    const catDevices = this.container.querySelector('#nc-cat-devices');
    if (catDevices) {
      this._addListener(catDevices, 'click', () => {
        this.dockTab = 'devices';
        const allowedDevs = (this.levelDef.devicesAllowed || []).filter(d => d !== 'server');
        if (!allowedDevs.includes(this.activeTool)) {
          this.activeTool = allowedDevs[0] || 'switch';
        }
        this._updateToolButtons();
      });
    }

    // Mini Motorways Simulation Speed Toggle (1x -> 2x -> 4x)
    const btnSpeed = this.container.querySelector('#nc-btn-speed');
    if (btnSpeed) {
      this._addListener(btnSpeed, 'click', () => {
        const speeds = [1, 2, 4];
        const nextIdx = (speeds.indexOf(this.gameSpeed || 1) + 1) % speeds.length;
        this.gameSpeed = speeds[nextIdx];
        btnSpeed.textContent = `${this.gameSpeed}×`;
        btnSpeed.classList.toggle('nc-speed-active', this.gameSpeed > 1);
        if (typeof btnSpeed.blur === 'function') btnSpeed.blur();
      });
    }

    // Tutorial / Guide button
    if (this.btnTutorial) {
      this._addListener(this.btnTutorial, 'click', () => {
        this._showTutorialModal();
      });
    }

    // Diagnostics button
    if (this.btnDiagnostics) {
      this._addListener(this.btnDiagnostics, 'click', () => {
        this._showDiagnosticsModal();
      });
    }

    // Pause button
    this._addListener(this.btnPause, 'click', () => {
      if (this.sim) {
        this.sim.paused = !this.sim.paused;
        this.btnPause.textContent = this.sim.paused ? 'Resume' : 'Pause';
        this.btnPause.style.backgroundColor = this.sim.paused ? '#b91c1c' : '';
        if (typeof this.btnPause.blur === 'function') this.btnPause.blur();
      }
    });

    // Reset button
    this._addListener(this.container.querySelector('#nc-btn-reset'), 'click', () => {
      this._loadLevel(this.currentLevelId, this.currentSeed);
    });

    // Levels button
    this._addListener(this.container.querySelector('#nc-btn-levels'), 'click', () => {
      this._showLevelsModal();
    });

    // Zoom buttons
    this._addListener(this.container.querySelector('#nc-btn-zoom-in'), 'click', () => {
      this.camera.zoom = Math.min(2.5, this.camera.zoom * 1.25);
    });
    this._addListener(this.container.querySelector('#nc-btn-zoom-out'), 'click', () => {
      this.camera.zoom = Math.max(0.5, this.camera.zoom / 1.25);
    });
    this._addListener(this.container.querySelector('#nc-btn-fit'), 'click', () => {
      this._fitCamera();
    });

    // Keyboard shortcuts: 1, 2, 3, 4, Space
    this._addListener(window, 'keydown', (e) => {
      if (e.key === '1' && this.levelDef.wiresAllowed.includes('twisted_pair')) {
        this.activeTool = 'twisted_pair';
        this._updateToolButtons();
      } else if (e.key === '2' && this.levelDef.wiresAllowed.includes('coaxial')) {
        this.activeTool = 'coaxial';
        this._updateToolButtons();
      } else if (e.key === '3' && this.levelDef.wiresAllowed.includes('multimode_fiber')) {
        this.activeTool = 'multimode_fiber';
        this._updateToolButtons();
      } else if (e.key === '4' && this.levelDef.wiresAllowed.includes('single_mode_fiber')) {
        this.activeTool = 'single_mode_fiber';
        this._updateToolButtons();
      } else if (e.key === '5' && this.levelDef.devicesAllowed && this.levelDef.devicesAllowed.includes('access_point')) {
        this.activeTool = 'access_point';
        this._updateToolButtons();
      } else if (e.key === '6' && this.levelDef.devicesAllowed && this.levelDef.devicesAllowed.includes('cabinet')) {
        this.activeTool = 'cabinet';
        this._updateToolButtons();
      } else if (e.key === '7' && this.levelDef.devicesAllowed && this.levelDef.devicesAllowed.includes('hub')) {
        this.activeTool = 'hub';
        this._updateToolButtons();
      } else if (e.key === '8' && this.levelDef.devicesAllowed && this.levelDef.devicesAllowed.includes('switch')) {
        this.activeTool = 'switch';
        this._updateToolButtons();
      } else if (e.key === '9' && this.levelDef.devicesAllowed && this.levelDef.devicesAllowed.includes('router')) {
        this.activeTool = 'router';
        this._updateToolButtons();
      } else if ((e.key === 'm' || e.key === 'M' || e.key === '0') && this.pickupBtn && this.pickupBtn.style.display !== 'none') {
        this.activeTool = 'pickup';
        this._updateToolButtons();
        this._setHint('Move tool selected: Click an existing device to pick it up and relocate it.');
      } else if (e.key === 'Escape') {
        if (this.heldItem) {
          const orig = this.heldItem.originalSquare;
          this.sim.placeDevice(this.heldItem.type, orig);
          this.heldItem = null;
          const defaultWire = (this.levelDef.wiresAllowed && this.levelDef.wiresAllowed[0]) || 'twisted_pair';
          this.activeTool = defaultWire;
          this._updateToolButtons();
          this._updateCoinsDisplay();
          this._setHint('Canceled moving.');
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        if (document.activeElement === this.btnPause) return;
        this.btnPause.click();
      }
    });

    this._addListener(window, 'resize', () => this._updateCanvasSize());
    if (typeof ResizeObserver !== 'undefined' && this.canvasWrapper) {
      this._resizeObserver = new ResizeObserver(() => {
        this._updateCanvasSize();
      });
      this._resizeObserver.observe(this.canvasWrapper);
    }

    // Pointer Events: mouse & touch pan + wire drawing
    const getGridPos = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const sz = this.baseSquareSize * this.camera.zoom;
      const x = Math.floor((clientX - rect.left - this.camera.x) / sz);
      const y = Math.floor((clientY - rect.top - this.camera.y) / sz);
      return { x, y, square: y * this.sim.width + x };
    };

    const onPointerDown = (e) => {
      if (e.button !== 0 || !this.sim) return;
      const { x, y, square } = getGridPos(e.clientX, e.clientY);

      // 0. If holding an item with the Move tool, place it at the clicked square
      if (this.heldItem) {
        const canPlace = (
          x >= 0 && x < this.sim.width && y >= 0 && y < this.sim.height &&
          square !== this.sim.server &&
          !this.sim.walls.has(square) &&
          !(this.sim.riverSquares && this.sim.riverSquares.has(square)) &&
          !this.sim.getBuildingAt(square) &&
          !this.sim.getDeviceAt(square) &&
          !this.sim.occupiedSquares.has(square)
        );

        if (canPlace) {
          const res = this.sim.placeDevice(this.heldItem.type, square);
          if (res.success) {
            this._updateCoinsDisplay();
            const defaultWire = (this.levelDef.wiresAllowed && this.levelDef.wiresAllowed[0]) || 'twisted_pair';
            this.activeTool = defaultWire;
            this._updateToolButtons();
            this._setHint(`Placed ${this.heldItem.name}! Cable tool selected — drag from device to server to connect.`);
            this.heldItem = null;
            return;
          } else {
            this._setHint(res.message, true);
            return;
          }
        } else {
          this._setHint('Cannot place here: square is occupied or blocked.', true);
          return;
        }
      }

      // 0.5. If Move / Pickup tool is selected, click on an existing device to pick it up
      if (this.activeTool === 'pickup') {
        const device = this.sim.getDeviceAt(square);
        if (device) {
          const type = device.type;
          const devName = DEVICE_CATALOG[type]?.name || 'Device';
          const cost = device.cost;
          const origSq = device.square;
          this.sim.removeDevice(device.id);
          this.heldItem = {
            type,
            name: devName,
            cost,
            originalSquare: origSq
          };
          this._updateCoinsDisplay();
          this._setHint(`Moving ${devName}. Move cursor to position and click to place (right-click to cancel).`);
          return;
        } else {
          this._setHint('Move Tool: Click on an existing device (AP, Cabinet, Hub, Switch, Router, Server) to pick it up.', true);
          return;
        }
      }

      // 1. Device placement mode (AP, Cabinet, Hub, Switch, Router, DHCP, DNS, Web, Email)
      // When any device tool is selected, NO click and drag to draw cables is allowed at all.
      const isDeviceTool = Boolean(this.deviceBtns[this.activeTool]);
      if (isDeviceTool) {
        const canPlace = (
          x >= 0 && x < this.sim.width && y >= 0 && y < this.sim.height &&
          square !== this.sim.server &&
          !this.sim.walls.has(square) &&
          !(this.sim.riverSquares && this.sim.riverSquares.has(square)) &&
          !this.sim.getBuildingAt(square) &&
          !this.sim.getDeviceAt(square) &&
          !this.sim.occupiedSquares.has(square)
        );

        if (!canPlace) {
          this._setHint(`${DEVICE_CATALOG[this.activeTool]?.name || 'Device'} is selected. Click an empty square to place it, or select a cable tool to connect wires.`, true);
          return;
        }

        const res = this.sim.placeDevice(this.activeTool, square);
        if (res.success) {
          this._updateCoinsDisplay();
          const defaultWire = (this.levelDef.wiresAllowed && this.levelDef.wiresAllowed[0]) || 'twisted_pair';
          this.activeTool = defaultWire;
          this._updateToolButtons();
          this._setHint(`Placed ${DEVICE_CATALOG[res.device.type]?.name || 'Device'}! Cable tool selected — drag from device to server to connect.`);
          return;
        } else {
          this._setHint(res.message, true);
          return;
        }
      }

      // 2. Tapping or dragging from an existing device (wire interaction)
      const device = this.sim.getDeviceAt(square);
      if (device) {
        const isWireTool = ['twisted_pair', 'coaxial', 'multimode_fiber', 'single_mode_fiber'].includes(this.activeTool);
        if (isWireTool) {
          // Start dragging wire from device
          this.isDragging = true;
          this.dragSourceType = 'device';
          this.dragSourceId = device.id;
          this.dragPath = [square];
          this._checkDragValidity();
          return;
        } else {
          // Open inspector for device
          if (device.type === 'switch') this._showSwitchNotebook(device);
          else if (device.type === 'router') this._showRouterInspector(device);
          else if (device.type === 'dhcp_server') this._showDhcpInspector(device);
          else if (device.type === 'dns_server') this._showDnsInspector(device);
          else if (device.type === 'web_server') this._showWebServerInspector(device);
          else if (device.type === 'email_server') this._showEmailServerInspector(device);
          else this._showDeviceInspector(device);
          return;
        }
      }

      // 3. Building interaction
      const building = this.sim.getBuildingAt(square);
      if (building) {
        if (building.state === 'construction') {
          this._setHint('This site is under construction! Wires cannot connect until it opens.', true);
          return;
        }

        if (building.type === 'phone' || building.type === 'tablet') {
          this._showBuildingInspector(building);
          this._setHint('Phones and tablets connect wirelessly! Place an Access Point nearby instead of dragging a wire.', true);
          return;
        }

        const isWireTool = ['twisted_pair', 'coaxial', 'multimode_fiber', 'single_mode_fiber'].includes(this.activeTool);
        if (!isWireTool) {
          this._showBuildingInspector(building);
          return;
        }

        // Start drawing wire (tapping without dragging opens inspector on pointerup)
        this.isDragging = true;
        this.dragSourceType = 'building';
        this.dragSourceId = building.id;
        this.dragBuildingId = building.id;
        this.dragPath = [square];
        this._checkDragValidity();
        return;
      }

      // 3.5 Server interaction
      if (this.sim.isServer(square)) {
        const srv = (this.sim.servers && this.sim.servers.find(s => s.square === square)) || {
          square: this.sim.server,
          name: 'Server',
          icon: '🖥️',
          mac: '00:FE',
          ip: '192.168.2.50',
          portsOpen: [80]
        };
        this._showServerInspector(srv);
        return;
      }

      // 3.6 Wire interaction (tap on a wire to inspect and disconnect that single wire)
      if (this.sim.occupiedSquares && this.sim.occupiedSquares.has(square)) {
        const wireId = this.sim.occupiedSquares.get(square);
        const wire = this.sim.wires.get(wireId);
        if (wire) {
          this._showWireInspector(wire);
          return;
        }
      }

      // 4. Start camera panning
      this.isPanning = true;
      this.panStart = { x: e.clientX - this.camera.x, y: e.clientY - this.camera.y };
    };

    const onPointerMove = (e) => {
      const { x, y, square } = getGridPos(e.clientX, e.clientY);
      this.cursorSquare = (x >= 0 && x < this.sim.width && y >= 0 && y < this.sim.height) ? square : null;
      this.cursorPos = { x: e.clientX, y: e.clientY };

      if (this.isPanning) {
        this.camera.x = e.clientX - this.panStart.x;
        this.camera.y = e.clientY - this.panStart.y;
        return;
      }

      if (!this.isDragging || !this.sim) return;
      if (x < 0 || x >= this.sim.width || y < 0 || y >= this.sim.height) return;

      const path = this.dragPath;
      const lastSq = path[path.length - 1];
      if (square === lastSq) return;

      // Backtracking: dragging back removes step
      if (path.length > 1 && square === path[path.length - 2]) {
        path.pop();
        this._checkDragValidity();
        return;
      }

      // Adjacent cardinal step
      const lx = lastSq % this.sim.width;
      const ly = Math.floor(lastSq / this.sim.width);
      if (Math.abs(x - lx) + Math.abs(y - ly) === 1) {
        if (!path.includes(square)) {
          path.push(square);
          this._checkDragValidity();
        }
      }
    };

    const onPointerUp = (e) => {
      if (this.isPanning) {
        this.isPanning = false;
        return;
      }

      if (!this.isDragging || !this.sim) return;
      this.isDragging = false;
      this.tooltipEl.style.display = 'none';

      const lastSq = this.dragPath[this.dragPath.length - 1];
      const destBuilding = this.sim.getBuildingAt(lastSq);
      if (destBuilding && destBuilding.state === 'construction') {
        this._setHint('This site is under construction! Wires cannot connect until it opens.', true);
        this.dragPath = [];
        this.dragBuildingId = null;
        this.dragSourceId = null;
        this.dragSourceType = 'building';
        return;
      }

      if (this.dragPath.length === 1 && this.dragSourceType === 'device') {
        const clickedDev = this.sim.getDevice(this.dragSourceId);
        if (clickedDev) {
          if (clickedDev.type === 'switch') this._showSwitchNotebook(clickedDev);
          else if (clickedDev.type === 'router') this._showRouterInspector(clickedDev);
          else if (clickedDev.type === 'dhcp_server') this._showDhcpInspector(clickedDev);
          else if (clickedDev.type === 'dns_server') this._showDnsInspector(clickedDev);
          else if (clickedDev.type === 'web_server') this._showWebServerInspector(clickedDev);
          else if (clickedDev.type === 'email_server') this._showEmailServerInspector(clickedDev);
          else this._showDeviceInspector(clickedDev);
        }
        this.dragPath = [];
        this.dragBuildingId = null;
        this.dragSourceId = null;
        this.dragSourceType = 'building';
        return;
      }

      if (this.dragPath.length === 1 && this.dragSourceType === 'building') {
        const clickedB = this.sim.getBuilding(this.dragBuildingId);
        if (clickedB) {
          this._showBuildingInspector(clickedB);
        }
        this.dragPath = [];
        this.dragBuildingId = null;
        this.dragSourceId = null;
        this.dragSourceType = 'building';
        return;
      }

      const isServer = this.sim.isServer(lastSq);
      const isDevice = (this.sim.getDeviceAt(lastSq) !== null);

      if (isServer || isDevice) {
        const sourceId = this.dragSourceType === 'device' ? this.dragSourceId : this.dragBuildingId;
        const wireType = this._getActiveWireType();
        const res = this.sim.connectWire(sourceId, this.dragPath, wireType, this.dragSourceType || 'building');
        if (res.success) {
          this._updateCoinsDisplay();
          this._setHint(this.levelDef.hint);
        } else {
          this._setHint(res.message, true);
        }
      } else {
        this._setHint(REFUSAL_MESSAGES.releasedAwayFromDestination, true);
      }

      this.dragPath = [];
      this.dragBuildingId = null;
      this.dragSourceId = null;
      this.dragSourceType = 'building';
    };

    this._addListener(this.canvas, 'pointerdown', onPointerDown);
    this._addListener(window, 'pointermove', onPointerMove);
    this._addListener(window, 'pointerup', onPointerUp);
    this._addListener(this.canvas, 'contextmenu', (e) => {
      e.preventDefault();
      if (this.heldItem) {
        const orig = this.heldItem.originalSquare;
        this.sim.placeDevice(this.heldItem.type, orig);
        this._setHint(`Canceled moving ${this.heldItem.name}.`);
        this.heldItem = null;
        const defaultWire = (this.levelDef.wiresAllowed && this.levelDef.wiresAllowed[0]) || 'twisted_pair';
        this.activeTool = defaultWire;
        this._updateToolButtons();
        this._updateCoinsDisplay();
      }
    });
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
    this.lastTime = performance.now();
    this.tickAccumulator = 0;

    const frame = (time) => {
      if (this.isDestroyed) return;

      const dt = time - this.lastTime;
      this.lastTime = time;

      if (this.sim && this.sim.status === 'playing' && !this.sim.paused) {
        this.tickAccumulator += dt * (this.gameSpeed || 1);
        while (this.tickAccumulator >= 50) {
          const events = this.sim.tick();
          this.tickAccumulator -= 50;

          for (const ev of events) {
            if (ev.type === 'BonusAwarded') {
              this._updateCoinsDisplay();
            }
            if (ev.type === 'Collision' && ev.square !== null && ev.square !== undefined) {
              this.collisionBursts.push({ square: ev.square, age: 0 });
            }
          }

          if (this.sim.status === 'level_over') {
            this._showLevelOverModal();
            break;
          }
          if (this.sim.status === 'won') {
            this._showLevelWonModal();
            break;
          }
        }
      }

      this._render();
      this.rafId = requestAnimationFrame(frame);
    };

    this.rafId = requestAnimationFrame(frame);
  }

  _render() {
    if (!this.ctx || !this.sim) return;
    try {
      const ctx = this.ctx;
      const sz = this.baseSquareSize * this.camera.zoom;

      ctx.fillStyle = '#070e17';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      ctx.save();
      ctx.translate(this.camera.x, this.camera.y);

    // 1. Grid Background
    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(0, 0, this.sim.width * sz, this.sim.height * sz);

    // Subtle grid lines
    ctx.strokeStyle = '#152438';
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.sim.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * sz, 0);
      ctx.lineTo(x * sz, this.sim.height * sz);
      ctx.stroke();
    }
    for (let y = 0; y <= this.sim.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * sz);
      ctx.lineTo(this.sim.width * sz, y * sz);
      ctx.stroke();
    }

    // 1.5. Noisy squares (visual hint — faint red overlay)
    if (this.sim.noisySquares.size > 0) {
      ctx.fillStyle = 'rgba(239,68,68,0.10)';
      for (const sq of this.sim.noisySquares) {
        const nx = (sq % this.sim.width) * sz;
        const ny = Math.floor(sq / this.sim.width) * sz;
        ctx.fillRect(nx, ny, sz, sz);
      }
    }

    // 1.7. Walls (solid obstacle blocks)
    ctx.fillStyle = '#334155';
    for (const sq of this.sim.walls) {
      const wx = (sq % this.sim.width) * sz;
      const wy = Math.floor(sq / this.sim.width) * sz;
      ctx.fillRect(wx + 1, wy + 1, sz - 2, sz - 2);
    }

    // 1.8. River (Chapter 3: Two Islands)
    if (this.sim.riverSquares && this.sim.riverSquares.size > 0) {
      for (const sq of this.sim.riverSquares) {
        const rx = (sq % this.sim.width) * sz;
        const ry = Math.floor(sq / this.sim.width) * sz;
        ctx.fillStyle = '#061d33';
        ctx.fillRect(rx, ry, sz, sz);
        ctx.fillStyle = '#0f3c5f';
        ctx.fillRect(rx + 2, ry + Math.floor(sz * 0.45), sz - 4, Math.max(1, Math.floor(sz * 0.08)));
      }
    }

    // 1.9. Bridges (Mini Motorways style bridge decks over river)
    if (this.sim.riverSquares && this.sim.riverSquares.size > 0) {
      const bridgeSquares = new Set();
      for (const wire of this.sim.wires.values()) {
        for (const sq of wire.path) {
          if (this.sim.riverSquares.has(sq)) bridgeSquares.add(sq);
        }
      }
      if (this.isDragging && this.dragPath) {
        for (const sq of this.dragPath) {
          if (this.sim.riverSquares.has(sq)) bridgeSquares.add(sq);
        }
      }

      for (const bsq of bridgeSquares) {
        const bx = (bsq % this.sim.width) * sz;
        const by = Math.floor(bsq / this.sim.width) * sz;
        // Concrete/steel bridge deck
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(bx, by + Math.floor(sz * 0.15), sz, Math.floor(sz * 0.7));
        // Bridge guardrails (clean matte slate)
        ctx.fillStyle = '#475569';
        ctx.fillRect(bx, by + Math.floor(sz * 0.15), sz, Math.max(1, Math.floor(sz * 0.05)));
        ctx.fillRect(bx, by + Math.floor(sz * 0.82), sz, Math.max(1, Math.floor(sz * 0.05)));
        // Bridge supports / piers
        ctx.fillStyle = '#334155';
        ctx.fillRect(bx + 2, by + Math.floor(sz * 0.22), Math.max(2, Math.floor(sz * 0.08)), Math.floor(sz * 0.56));
        ctx.fillRect(bx + sz - Math.max(2, Math.floor(sz * 0.08)) - 2, by + Math.floor(sz * 0.22), Math.max(2, Math.floor(sz * 0.08)), Math.floor(sz * 0.56));
      }
    }

    // 1.85. Snoop Squares (Chapter 6: Eavesdropper)
    if (this.sim.snoopSquares && this.sim.snoopSquares.size > 0) {
      for (const sq of this.sim.snoopSquares) {
        const sx = (sq % this.sim.width) * sz;
        const sy = Math.floor(sq / this.sim.width) * sz;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.fillRect(sx, sy, sz, sz);
        ctx.font = `${Math.floor(sz * 0.6)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🕵️', sx + sz / 2, sy + sz / 2);
      }
    }

    // 2. Connected Wires
    for (const wire of this.sim.wires.values()) {
      const spec = WIRE_CATALOG[wire.wireType];
      this._drawWirePath(ctx, wire.path, spec.color, sz, wire.isFaded);
      if (wire.encrypted && wire.path.length >= 2) {
        const midIdx = Math.floor(wire.path.length / 2);
        const midSq = wire.path[midIdx];
        const mx = (midSq % this.sim.width) * sz + sz / 2;
        const my = Math.floor(midSq / this.sim.width) * sz + sz / 2;
        ctx.font = `${Math.floor(sz * 0.4)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔒', mx, my);
      }
    }

    // 3. Drag Preview Wire
    if (this.isDragging && this.dragPath.length > 1) {
      const activeWire = this._getActiveWireType();
      const wireSpec = WIRE_CATALOG[activeWire] || WIRE_CATALOG.twisted_pair;
      const color = !this.dragValidity.valid ? '#ff5d73' : wireSpec.color;
      this._drawWirePath(ctx, this.dragPath, color, sz, this.dragValidity.isFaded);
    }

    // 4. In-flight Packets (crisp pulse dots, zero canvas blur/glow)
    for (const pkt of this.sim.inFlightPackets) {
      const progress = Math.min(1, (this.sim.tickNumber - pkt.startTick) / pkt.travelTicks);
      const pos = this._getPathPoint(pkt.path, progress, sz);

      ctx.save();
      const pColor = pkt.kind === 'reply' ? '#ffd166' : (pkt.color || '#38bdf8');

      // Subtle wake line
      if (progress > 0.05) {
        const tailPos = this._getPathPoint(pkt.path, progress - 0.04, sz);
        ctx.strokeStyle = pColor;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = Math.max(1.5, sz * 0.08);
        ctx.beginPath();
        ctx.moveTo(tailPos.x, tailPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }

      ctx.globalAlpha = 1.0;
      ctx.fillStyle = pColor;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, Math.max(3.5, sz * 0.16), 0, Math.PI * 2);
      ctx.fill();

      // Clean white center dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, Math.max(1.5, sz * 0.07), 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 5. Servers (NO BOXES - clean icon directly on canvas)
    const serversToRender = this.sim.servers || [{ square: this.sim.server, color: '#2ec4b6', icon: '🖥️', name: 'Server' }];
    const showMac = Boolean(this.levelDef && (this.levelDef.concept === 'mac_learning' || (this.levelDef.chapter >= 2 && parseFloat(this.levelDef.id) >= 2.4)));
    for (const srv of serversToRender) {
      const sx = (srv.square % this.sim.width) * sz;
      const sy = Math.floor(srv.square / this.sim.width) * sz;

      const srvDrawn = this.assets ? this.assets.drawServer(ctx, srv.type || 'server', sx + sz / 2, sy + sz / 2 - (showMac && srv.mac ? sz * 0.12 : 0), sz) : false;
      if (!srvDrawn) {
        ctx.font = `${Math.floor(sz * 0.70)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(srv.icon || '🖥️', sx + sz / 2, sy + sz / 2 - (showMac && srv.mac ? sz * 0.12 : 0));
      }

      if (showMac && srv.mac) {
        ctx.font = `bold ${Math.max(9, Math.floor(sz * 0.22))}px monospace`;
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(srv.mac, sx + sz / 2, sy + sz - 2);
      }
    }

    // 5.5 Hardware Devices (NO BOXES - clean icon directly on canvas)
    for (const dev of this.sim.devices.values()) {
      const dx = (dev.square % this.sim.width) * sz;
      const dy = Math.floor(dev.square / this.sim.width) * sz;

      // AP Wireless Coverage Circle
      if (dev.type === 'access_point') {
        ctx.save();
        ctx.fillStyle = 'rgba(6, 214, 160, 0.06)';
        ctx.strokeStyle = 'rgba(6, 214, 160, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(dx + sz / 2, dy + sz / 2, 6 * sz, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      const spec = DEVICE_CATALOG[dev.type] || { color: '#3a86ff', icon: '📦' };
      const isMultiPort = ['switch', 'hub', 'router', 'cabinet'].includes(dev.type);

      // Device Icon (directly on grid, no box frame, crisp asset)
      const devDrawn = this.assets ? this.assets.drawDevice(ctx, dev.type, dx + sz / 2, dy + (isMultiPort ? sz * 0.44 : sz / 2), sz) : false;
      if (!devDrawn) {
        ctx.font = `${Math.floor(sz * 0.70)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(spec.icon, dx + sz / 2, dy + (isMultiPort ? sz * 0.44 : sz / 2));
      }

      // Multi-Port LED Indicators (The 4-Port Rule visual representation)
      if (isMultiPort) {
        const portCount = 4;
        const usedPorts = Math.min(portCount, (dev.connectedWires || []).length);
        const ledR = Math.max(1.5, sz * 0.04);
        const startX = dx + sz / 2 - ((portCount - 1) * ledR * 2.5) / 2;
        const ledY = dy + sz - ledR * 2.2;
        for (let p = 0; p < portCount; p++) {
          ctx.fillStyle = p < usedPorts ? '#10b981' : '#334155';
          ctx.beginPath();
          ctx.arc(startX + p * ledR * 2.5, ledY, ledR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 6. Buildings & Timers (NO BOXES - clean icon directly on canvas)
    for (const b of this.sim.buildings) {
      const bx = (b.square % this.sim.width) * sz;
      const by = Math.floor(b.square / this.sim.width) * sz;

      if (b.state === 'construction') {
        const constDrawn = this.assets ? this.assets.drawBuilding(ctx, 'construction', bx + sz / 2, by + sz / 2, sz) : false;
        if (!constDrawn) {
          ctx.font = `${Math.floor(sz * 0.65)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🚧', bx + sz / 2, by + sz / 2);
        }
        continue;
      }

      // Building Icon (crisp asset with vector fallback)
      const bldgDrawn = this.assets ? this.assets.drawBuilding(ctx, b.type, bx + sz / 2, by + (showMac && b.mac ? sz * 0.40 : sz * 0.46), sz) : false;
      if (!bldgDrawn) {
        let icon = '🏫';
        if (b.state === 'gave_up') {
          icon = '🏚️';
        } else if (b.type === 'laptop') {
          icon = '💻';
        } else if (b.type === 'phone' || b.type === 'tablet') {
          icon = '📱';
        } else if (b.type === 'sports_ground') {
          icon = '⚽';
        } else if (b.type === 'home') {
          icon = '🏠';
        } else if (b.type === 'library') {
          icon = '📚';
        }

        ctx.font = `${Math.floor(sz * 0.52)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, bx + sz / 2, by + (showMac && b.mac ? sz * 0.40 : sz * 0.46));
      }

      // Mini Motorways Destination Pin Badge
      if (b.state === 'open') {
        ctx.font = `${Math.floor(sz * 0.32)}px sans-serif`;
        const destIcon = b.targetType === 'web' ? '🌐' : (b.targetType === 'db' ? '🗄️' : '📍');
        ctx.fillText(destIcon, bx + sz * 0.20, by + sz * 0.20);
      }

      // Subnet visual indicator dot (Section 5.3)
      if (this.levelDef && this.levelDef.chapter >= 3 && b.subnet && b.state === 'open') {
        const dotColor = b.subnet.includes('192.168.1') ? '#38bdf8' : (b.subnet.includes('192.168.2') ? '#10b981' : '#a78bfa');
        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(bx + sz * 0.82, by + sz * 0.82, Math.max(3, sz * 0.12), 0, Math.PI * 2);
        ctx.fill();
      }

      // VLAN Zone visual indicator badge (Chapter 5)
      if (b.zone && b.state === 'open') {
        const zoneColors = { blue: '#38bdf8', green: '#10b981', orange: '#f59e0b', red: '#ef4444' };
        ctx.fillStyle = zoneColors[b.zone] || '#38bdf8';
        ctx.beginPath();
        ctx.arc(bx + sz * 0.82, by + sz * 0.18, Math.max(3, sz * 0.12), 0, Math.PI * 2);
        ctx.fill();
      }

      // IP Address label in Chapter 3 IP levels
      if (this.levelDef && this.levelDef.chapter >= 3 && b.state === 'open' && (this.levelDef.concept === 'ip_addresses' || this.levelDef.concept === 'duplicate_ip' || this.levelDef.concept === 'default_gateway')) {
        ctx.font = `bold ${Math.max(8, Math.floor(sz * 0.20))}px monospace`;
        ctx.fillStyle = b.ip ? '#38bdf8' : '#ef4444';
        const displayIp = b.ip ? (sz < 36 ? `.${b.ip.split('.').pop()}` : b.ip) : 'NO IP';
        ctx.fillText(displayIp, bx + sz / 2, by + sz * 0.86);
      }

      // Wireless connection status badge for mobile clients
      if ((b.type === 'phone' || b.type === 'tablet') && b.state === 'open') {
        const cov = this.sim.getWirelessCoverage(b.id);
        if (cov && cov.connected) {
          ctx.font = `${Math.floor(sz * 0.35)}px sans-serif`;
          ctx.fillText('📶', bx + sz * 0.80, by + sz * 0.20);
        }
      }

      // MAC Address Tag in Level 2.4+
      if (b.mac && showMac && b.state === 'open') {
        ctx.font = `bold ${Math.max(8, Math.floor(sz * 0.22))}px monospace`;
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(b.mac, bx + sz / 2, by + sz * 0.84);
      }

      // Countdown Timer Ring (Section 3.3)
      if (b.state === 'open') {
        const totalTimer = b.timerPhase === 'first' ? b.firstTimerTicks : b.cycleTimerTicks;
        const frac = Math.max(0, Math.min(1, b.timerTicksLeft / totalTimer));

        let ringColor = '#10b981'; // green (> 50%)
        if (frac < 0.25) ringColor = '#ef4444'; // red (< 25%)
        else if (frac < 0.5) ringColor = '#f59e0b'; // amber (25-50%)

        ctx.strokeStyle = ringColor;
        ctx.lineWidth = Math.max(2, sz * 0.08);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(bx + sz / 2, by + sz / 2, sz * 0.44, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
        ctx.stroke();

        // Quota dots underneath (Section 3.3)
        const dotRadius = Math.max(2, sz * 0.05);
        const startDotX = bx + sz / 2 - ((b.quota - 1) * dotRadius * 2.5) / 2;
        for (let q = 0; q < b.quota; q++) {
          ctx.fillStyle = q < b.fulfilledInCycle ? '#2ec4b6' : '#334155';
          ctx.beginPath();
          ctx.arc(startDotX + q * dotRadius * 2.5, by + sz - dotRadius * 2, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 7. Device Placement or Move Preview (Follows cursor)
    const isDeviceTool = Boolean(this.deviceBtns[this.activeTool]);
    const previewType = this.heldItem ? this.heldItem.type : (isDeviceTool ? this.activeTool : null);

    if (previewType && this.cursorSquare !== null) {
      const hx = (this.cursorSquare % this.sim.width) * sz;
      const hy = Math.floor(this.cursorSquare / this.sim.width) * sz;

      const canPlace = (
        this.cursorSquare >= 0 && this.cursorSquare < this.sim.width * this.sim.height &&
        this.cursorSquare !== this.sim.server &&
        !this.sim.walls.has(this.cursorSquare) &&
        !(this.sim.riverSquares && this.sim.riverSquares.has(this.cursorSquare)) &&
        !this.sim.getBuildingAt(this.cursorSquare) &&
        !this.sim.getDeviceAt(this.cursorSquare) &&
        !this.sim.occupiedSquares.has(this.cursorSquare)
      );

      ctx.save();
      // Draw AP wireless range preview floating with cursor
      if (previewType === 'access_point') {
        ctx.fillStyle = canPlace ? 'rgba(6, 214, 160, 0.14)' : 'rgba(239, 68, 68, 0.14)';
        ctx.strokeStyle = canPlace ? 'rgba(6, 214, 160, 0.75)' : 'rgba(239, 68, 68, 0.75)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(hx + sz / 2, hy + sz / 2, 6 * sz, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Draw target tile outline
      ctx.strokeStyle = canPlace ? '#06d6a0' : '#ef4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(hx + 2, hy + 2, sz - 4, sz - 4);

      // Draw device floating preview
      const spec = DEVICE_CATALOG[previewType] || { color: '#3a86ff', icon: '📦' };
      ctx.fillStyle = spec.color;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(hx + 3, hy + 3, sz - 6, sz - 6);
      ctx.font = `${Math.floor(sz * 0.55)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(spec.icon, hx + sz / 2, hy + sz / 2);
      ctx.restore();
    }

    // 8. Visual Hub Collision Bursts ("💥")
    if (this.collisionBursts && this.collisionBursts.length > 0) {
      for (let i = this.collisionBursts.length - 1; i >= 0; i--) {
        const burst = this.collisionBursts[i];
        burst.age++;
        if (burst.age > 24) {
          this.collisionBursts.splice(i, 1);
          continue;
        }

        const bx = (burst.square % this.sim.width) * sz + sz / 2;
        const by = Math.floor(burst.square / this.sim.width) * sz + sz / 2;
        const progress = burst.age / 24;
        const radius = sz * (0.3 + progress * 0.7);
        const alpha = Math.max(0, 1 - progress);

        ctx.save();
        ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(bx, by, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.font = `${Math.floor(sz * 0.75)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💥', bx, by);
        ctx.restore();
      }
    }

    ctx.restore();
    } catch (err) {
      console.error('Render error:', err);
    }
  }

  _drawWirePath(ctx, path, color, sz, isFaded = false) {
    if (path.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Soft Drop Shadow (Mini Motorways depth)
    if (!isFaded) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.lineWidth = Math.max(5, sz * 0.24);
      ctx.beginPath();
      for (let i = 0; i < path.length; i++) {
        const sq = path[i];
        const cx = (sq % this.sim.width) * sz + sz / 2;
        const cy = Math.floor(sq / this.sim.width) * sz + sz / 2 + 2;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    // 2. Main Cable Ribbon Body
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(3, sz * 0.18);
    if (isFaded) {
      ctx.setLineDash([sz * 0.2, sz * 0.15]); // Red dashed beyond limit
    } else {
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
      const sq = path[i];
      const cx = (sq % this.sim.width) * sz + sz / 2;
      const cy = Math.floor(sq / this.sim.width) * sz + sz / 2;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    ctx.restore();
  }

  _getPathPoint(path, progress, sz) {
    const totalSegs = path.length - 1;
    const idx = Math.min(Math.floor(progress * totalSegs), totalSegs - 1);
    const t = (progress * totalSegs) - idx;

    const a = path[idx];
    const b = path[idx + 1];

    const ax = (a % this.sim.width) * sz + sz / 2;
    const ay = Math.floor(a / this.sim.width) * sz + sz / 2;
    const bx = (b % this.sim.width) * sz + sz / 2;
    const by = Math.floor(b / this.sim.width) * sz + sz / 2;

    return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t };
  }

  _showLevelWonModal() {
    this.completedLevels.add(this.currentLevelId);
    this._saveCompletedLevels();

    this.modalEl.style.display = 'flex';
    const coinsEarned = this.sim.coins;
    this.modalEl.innerHTML = `
      <div class="nc-card nc-level-complete-card">
        <h2 class="nc-card-title">Level Complete! 🎉</h2>
        <div style="color:var(--nc-cyan); font-size:0.95rem; font-weight:700; margin-top:-4px;">${this.levelDef.id} — ${this.levelDef.title}</div>
        
        <div class="nc-stars-row" style="font-size:2.2rem; margin:10px 0;">
          ⭐⭐⭐
        </div>

        <div class="nc-reward-pills">
          <div class="nc-reward-badge" style="color:#ffd166; border-color:rgba(255, 209, 102, 0.4);">
            <span>⭐</span> +3 Stars
          </div>
          <div class="nc-reward-badge" style="color:#10b981; border-color:rgba(16, 185, 129, 0.4);">
            <span>🪙</span> +${coinsEarned} Coins
          </div>
          <div class="nc-reward-badge" style="color:#38bdf8; border-color:rgba(56, 189, 248, 0.4);">
            <span>🔮</span> +250 XP
          </div>
        </div>

        <div class="nc-takeaways-card">
          <div class="nc-takeaways-title">💡 What You Learned</div>
          <p style="color:#f1f5f9; font-size:0.92rem; margin:0 0 8px 0; line-height:1.4;">${this.levelDef.learningMoment || 'Campus network successfully architected!'}</p>
          <div class="nc-takeaway-item">
            <span style="color:#10b981;">✔</span>
            <span>All active building quotas fulfilled without timeout</span>
          </div>
          <div class="nc-takeaway-item">
            <span style="color:#10b981;">✔</span>
            <span>Physical cabling & topology constraints verified</span>
          </div>
        </div>

        <div class="nc-card-actions" style="margin-top:16px;">
          <button class="nc-btn nc-btn-primary" id="nc-card-next">Continue to Next Level &rarr;</button>
          <button class="nc-btn nc-btn-secondary" id="nc-card-retry">Play Again</button>
          <button class="nc-btn nc-btn-secondary" id="nc-card-levels">Select Level</button>
        </div>
      </div>
    `;

    this.modalEl.querySelector('#nc-card-next').onclick = () => {
      this._closeModal();
      const idx = ALL_LEVELS.findIndex(l => l.id === this.currentLevelId);
      const nextId = idx < ALL_LEVELS.length - 1 ? ALL_LEVELS[idx + 1].id : ALL_LEVELS[0].id;
      this._loadLevel(nextId, this._randomSeed());
      this._setScreen('game');
    };

    this.modalEl.querySelector('#nc-card-retry').onclick = () => {
      this._closeModal();
      this._loadLevel(this.currentLevelId, this.currentSeed);
      this._setScreen('game');
    };

    this.modalEl.querySelector('#nc-card-levels').onclick = () => {
      this._closeModal();
      this._campaignView = 'chapters';
      this._setScreen('campaign');
      this._renderCampaignScreen();
    };
  }

  _showLevelOverModal() {
    this.modalEl.style.display = 'flex';
    this.modalEl.innerHTML = `
      <div class="nc-card nc-card-fail">
        <h2 class="nc-card-title nc-fail">Level Over</h2>
        <p style="color:#e0e6ed; font-size:1rem;">A required building's timer ran out before its quota was fulfilled.</p>
        <div class="nc-card-actions">
          <button class="nc-btn nc-btn-rewind" id="nc-card-rewind">Rewind (30s)</button>
          <button class="nc-btn nc-btn-secondary" id="nc-card-retry">Retry</button>
          <button class="nc-btn nc-btn-secondary" id="nc-card-levels">Levels</button>
        </div>
      </div>
    `;

    this.modalEl.querySelector('#nc-card-rewind').onclick = () => {
      if (this.sim.rewind()) {
        this._closeModal();
        this._updateCoinsDisplay();
      }
    };

    this.modalEl.querySelector('#nc-card-retry').onclick = () => {
      this._closeModal();
      this._loadLevel(this.currentLevelId, this.currentSeed);
      this._setScreen('game');
    };

    this.modalEl.querySelector('#nc-card-levels').onclick = () => {
      this._closeModal();
      this._campaignView = 'chapters';
      this._setScreen('campaign');
      this._renderCampaignScreen();
    };
  }

  _getChaptersData() {
    return [
      {
        num: 1,
        title: 'The Basics',
        subtitle: 'Physical Network & Wires',
        description: 'Learn the fundamentals of physical cabling. Drag twisted pair wires, bridge distances, eliminate clutter with cabinets, and maintain the 4-port capacity rule.',
        icon: '🏫',
        levels: ALL_LEVELS.filter(l => l.chapter === 1 || l.id.startsWith('1.'))
      },
      {
        num: 2,
        title: 'IP Addresses',
        subtitle: 'Hubs, Switches & MAC',
        description: 'Discover packet collisions inside unmanaged Hubs. Upgrade to intelligent Switches that inspect MAC headers and build hardware forwarding tables.',
        icon: '📦',
        levels: ALL_LEVELS.filter(l => l.chapter === 2 || l.id.startsWith('2.'))
      },
      {
        num: 3,
        title: 'Switches & VLANs',
        subtitle: 'Routers & Two Islands',
        description: 'Traverse rivers between isolated subnets with Routers. Configure device IP addresses and default gateways to reach remote servers.',
        icon: '🌉',
        levels: ALL_LEVELS.filter(l => l.chapter === 3 || l.id.startsWith('3.'))
      },
      {
        num: 4,
        title: 'Routing',
        subtitle: 'Network Services',
        description: 'Automate manual configuration! Deploy DHCP servers for dynamic lease assignment and DNS servers to resolve human-readable domain names.',
        icon: '🧭',
        levels: ALL_LEVELS.filter(l => l.chapter === 4 || l.id.startsWith('4.'))
      },
      {
        num: 5,
        title: 'Security',
        subtitle: 'Organise the City',
        description: 'Partition shared switches into isolated VLAN color zones. Open precise inter-zone router doors and direct traffic with static and dynamic routes.',
        icon: '🛡️',
        levels: ALL_LEVELS.filter(l => l.chapter === 5 || l.id.startsWith('5.'))
      },
      {
        num: 6,
        title: 'WAN & Internet',
        subtitle: 'Guard the Gates',
        description: 'Defend your perimeter! Place Stateful Firewalls to block rogue attackers, enable packet encryption against eavesdroppers, use NAT, and tunnel with VPNs.',
        icon: '🌐',
        levels: ALL_LEVELS.filter(l => l.chapter === 6 || l.id.startsWith('6.'))
      },
      {
        num: 7,
        title: 'Finale',
        subtitle: 'Resilience & NetCity',
        description: 'Engineer fault-tolerant topologies with redundant links, prevent packet storms with Loop Guard, balance high server traffic, and run the NetCity metropolis.',
        icon: '⚡',
        levels: ALL_LEVELS.filter(l => l.chapter === 7 || l.id.startsWith('7.'))
      }
    ];
  }

  _renderCampaignScreen() {
    if (!this.screenCampaignEl) return;

    if (this._campaignView === 'chapter_levels') {
      this._renderChapterLevelsView();
      return;
    }

    const chapters = this._getChaptersData();

    // Determine active chapter (first uncompleted chapter, or chapter 1)
    let activeChNum = 1;
    for (const ch of chapters) {
      const completedInCh = ch.levels.filter(l => this.completedLevels && this.completedLevels.has(l.id)).length;
      if (completedInCh < ch.levels.length) {
        activeChNum = ch.num;
        break;
      }
    }

    let chaptersHtml = '';
    for (const ch of chapters) {
      const completedInCh = ch.levels.filter(l => this.completedLevels && this.completedLevels.has(l.id)).length;
      const totalInCh = ch.levels.length;
      const isCompleted = completedInCh === totalInCh && totalInCh > 0;
      const isActive = ch.num === activeChNum && !isCompleted;
      const isLocked = ch.num > activeChNum && !isCompleted;

      let bottomHtml = '';
      if (isCompleted) {
        bottomHtml = `
          <div class="nc-chapter-card-bottom">
            <div class="nc-chapter-pill-completed">
              <span class="nc-check-circle">✔</span>
              <span>${completedInCh}/${totalInCh}</span>
              <span class="nc-check-circle">✔</span>
            </div>
          </div>
        `;
      } else if (isActive) {
        bottomHtml = `
          <div class="nc-chapter-card-bottom active-state">
            <div class="nc-chapter-progress-pill">
              <span>${completedInCh}/${totalInCh}</span>
              <span class="nc-chevron">›</span>
            </div>
            <button class="nc-btn-continue" data-ch="${ch.num}">Continue</button>
          </div>
        `;
      } else {
        bottomHtml = `
          <div class="nc-chapter-card-bottom">
            <div class="nc-chapter-pill-locked">
              <span>🔒</span>
              <span>Locked</span>
            </div>
          </div>
        `;
      }

      const cardClasses = [
        'nc-chapter-card',
        isActive ? 'nc-chapter-active' : '',
        isCompleted ? 'nc-chapter-completed' : '',
        isLocked ? 'nc-chapter-locked' : ''
      ].filter(Boolean).join(' ');

      chaptersHtml += `
        <div class="${cardClasses}" data-ch="${ch.num}">
          <div class="nc-chapter-card-top">
            <div class="nc-chapter-num">Chapter ${ch.num}</div>
            <div class="nc-chapter-name">${ch.title}</div>
          </div>
          <div class="nc-chapter-asset-stage">
            <img src="./assets/images/chapters/ch${ch.num}.png" alt="${ch.title}" class="nc-chapter-3d-img" onerror="this.src='./assets/images/chapters/ch${ch.num}.svg';" />
          </div>
          ${bottomHtml}
        </div>
      `;
    }

    this.screenCampaignEl.innerHTML = `
      <header class="nc-app-nav">
        <div class="nc-app-nav-left">
          <div class="nc-app-brand">
            <div class="nc-app-brand-bars">
              <span class="nc-bar bar-1"></span>
              <span class="nc-bar bar-2"></span>
              <span class="nc-bar bar-3"></span>
            </div>
            <span class="nc-app-brand-title">NetCity</span>
          </div>
          <nav class="nc-app-nav-tabs">
            <button class="nc-app-nav-tab active" id="nc-tab-play">
              <span class="nc-play-icon">▶</span> Play
            </button>
            <button class="nc-app-nav-tab" id="nc-tab-learn">Learn</button>
          </nav>
        </div>
        <div class="nc-app-nav-right"></div>
      </header>

      <div class="nc-campaign-scrollable">
        <div class="nc-campaign-content-inner">
          <div class="nc-campaign-header">
            <div class="nc-campaign-title-area">
              <h1 class="nc-campaign-heading">Campaign<span class="nc-sparkle">✨</span></h1>
              <p class="nc-campaign-subheading">7 chapters • 44 levels • Learn one concept at a time</p>
            </div>
          </div>

          <div class="nc-chapters-carousel-container">
            <div class="nc-chapters-carousel">
              ${chaptersHtml}
            </div>
          </div>
        </div>
      </div>
    `;

    // Event listeners
    const tabLearn = this.screenCampaignEl.querySelector('#nc-tab-learn');
    if (tabLearn) {
      tabLearn.onclick = () => {
        this._setScreen('learn');
        this._renderLearnScreen();
      };
    }

    this.screenCampaignEl.querySelectorAll('.nc-chapter-card, .nc-btn-continue').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        const card = el.closest('.nc-chapter-card') || el;
        const chNum = parseInt(card.getAttribute('data-ch'), 10);
        if (chNum) {
          this._campaignView = 'chapter_levels';
          this._currentViewingCh = chNum;
          this._renderCampaignScreen();
        }
      };
    });
  }

  _renderChapterLevelsView() {
    if (!this.screenCampaignEl) return;

    const chapters = this._getChaptersData();
    const ch = chapters.find(c => c.num === this._currentViewingCh) || chapters[0];

    let levelsHtml = '';
    for (const lvl of ch.levels) {
      const isCompleted = this.completedLevels && this.completedLevels.has(lvl.id);
      const isCurrentLevel = lvl.id === this.currentLevelId;
      levelsHtml += `
        <div class="nc-level-card ${isCompleted ? 'nc-level-card-done' : ''}" data-id="${lvl.id}">
          <div class="nc-level-card-left">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="nc-level-id-tag">LEVEL ${lvl.id}</span>
              ${isCompleted ? '<span style="color:#ffd166; font-size:0.85rem;">⭐⭐⭐</span>' : ''}
            </div>
            <div class="nc-level-name">${lvl.title}</div>
            <p class="nc-level-moment">${lvl.learningMoment || ''}</p>
          </div>
          <button class="nc-level-play-btn" data-id="${lvl.id}">
            ${isCurrentLevel ? '▶ Current' : isCompleted ? 'Replay' : 'Play'}
          </button>
        </div>
      `;
    }

    this.screenCampaignEl.innerHTML = `
      <header class="nc-app-nav">
        <div class="nc-app-nav-left">
          <div class="nc-app-brand">
            <div class="nc-app-brand-bars">
              <span class="nc-bar bar-1"></span>
              <span class="nc-bar bar-2"></span>
              <span class="nc-bar bar-3"></span>
            </div>
            <span class="nc-app-brand-title">NetCity</span>
          </div>
          <nav class="nc-app-nav-tabs">
            <button class="nc-app-nav-tab active" id="nc-tab-play">
              <span class="nc-play-icon">▶</span> Play
            </button>
            <button class="nc-app-nav-tab" id="nc-tab-learn">Learn</button>
          </nav>
        </div>
        <div class="nc-app-nav-right"></div>
      </header>

      <div class="nc-campaign-scrollable">
        <div class="nc-campaign-content-inner">
          <div class="nc-chapter-levels-header">
            <button class="nc-btn-back-chapters" id="nc-btn-back-chapters">
              <span>←</span> All Chapters
            </button>
            <div style="display:flex; align-items:center; gap:20px; flex-wrap:wrap;">
              <div class="nc-chapter-graphic-well" style="width:78px; height:78px; margin-bottom:0; flex-shrink:0;">
                <img src="./assets/images/chapters/ch${ch.num}.png" alt="Chapter ${ch.num}" class="nc-chapter-img" style="width:58px; height:58px;" onerror="this.src='./assets/images/chapters/ch${ch.num}.svg';" />
              </div>
              <div class="nc-chapter-banner-info">
                <span class="nc-chapter-pill">CHAPTER ${ch.num} • ${ch.levels.length} LEVELS</span>
                <h2 class="nc-chapter-banner-title">${ch.title} &mdash; <span style="font-weight:400; color:#94a3b8; font-size:1.25rem;">${ch.subtitle}</span></h2>
                <p class="nc-chapter-banner-desc">${ch.description}</p>
              </div>
            </div>
          </div>

          <div class="nc-levels-grid">
            ${levelsHtml}
          </div>
        </div>
      </div>
    `;

    // Events
    const tabLearn = this.screenCampaignEl.querySelector('#nc-tab-learn');
    if (tabLearn) {
      tabLearn.onclick = () => {
        this._setScreen('learn');
        this._renderLearnScreen();
      };
    }

    const backBtn = this.screenCampaignEl.querySelector('#nc-btn-back-chapters');
    if (backBtn) {
      backBtn.onclick = () => {
        this._campaignView = 'chapters';
        this._renderCampaignScreen();
      };
    }

    this.screenCampaignEl.querySelectorAll('.nc-level-card, .nc-level-play-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (id) {
          this._loadLevel(id, this._randomSeed());
          this._setScreen('game');
        }
      };
    });
  }

  _renderLearnScreen(topic = null) {
    if (!this.screenLearnEl) return;
    if (topic) this._learnTopic = topic;
    const active = this._learnTopic || 'mac_ip';

    let contentHtml = '';
    if (active === 'mac_ip') {
      contentHtml = `
        <div class="nc-learn-header">
          <div class="nc-learn-topic-tag">LAYER 2 & LAYER 3 ADDRESSING</div>
          <h1 class="nc-learn-topic-title">MAC vs IP Addresses</h1>
          <p class="nc-learn-lead">Every packet on a network needs to know both who you are locally (MAC) and where you live logically (IP). Here is why both addresses are essential.</p>
        </div>

        <div class="nc-learn-callout">
          <strong style="color: #38bdf8; font-size: 1.05rem;">The Postal Analogy</strong><br>
          Think of a <strong>MAC Address</strong> as a person's permanent social security number or fingerprint (who they are). Think of an <strong>IP Address</strong> as their mailing street address and apartment number (where they are currently living).
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
          <div class="nc-learn-card">
            <h3 style="color: #ffd166; margin: 0 0 8px 0; display:flex; align-items:center; gap:8px;">
              <span>🏷️</span> MAC Address (Layer 2)
            </h3>
            <p style="color: #cbd5e1; font-size: 0.9rem; line-height: 1.5; margin-bottom: 12px;">
              A 48-bit unique hardware identifier burned directly into the Network Interface Card (NIC) at the factory.
            </p>
            <ul style="color: #94a3b8; font-size: 0.86rem; padding-left: 20px; line-height: 1.6; margin: 0;">
              <li><strong>Format:</strong> Hexadecimal string, e.g. <code style="color:#ffd166;">00:A1:C2</code>.</li>
              <li><strong>Scope:</strong> Local physical link only (never crosses a router).</li>
              <li><strong>Forwarding:</strong> Switches inspect the destination MAC address to decide which physical port to send a frame through.</li>
            </ul>
          </div>

          <div class="nc-learn-card">
            <h3 style="color: #06d6a0; margin: 0 0 8px 0; display:flex; align-items:center; gap:8px;">
              <span>📫</span> IP Address (Layer 3)
            </h3>
            <p style="color: #cbd5e1; font-size: 0.9rem; line-height: 1.5; margin-bottom: 12px;">
              A 32-bit logical address assigned to a device so it can be located across multiple interconnected networks.
            </p>
            <ul style="color: #94a3b8; font-size: 0.86rem; padding-left: 20px; line-height: 1.6; margin: 0;">
              <li><strong>Format:</strong> Dotted decimal, e.g. <code style="color:#06d6a0;">192.168.1.10</code>.</li>
              <li><strong>Subnets:</strong> Hierarchical network part + host part.</li>
              <li><strong>Default Gateway:</strong> The local IP address of the router used to exit your local subnet and reach distant networks.</li>
            </ul>
          </div>
        </div>

        <div class="nc-learn-card">
          <h3 style="color: #38bdf8; margin: 0 0 10px 0;">Why can't we route the internet with MAC addresses alone?</h3>
          <p style="color: #94a3b8; font-size: 0.88rem; line-height: 1.6; margin: 0;">
            MAC addresses are completely flat and random based on manufacturer serial numbers. If the internet used MAC addresses, every single router on Earth would need a routing table containing billions of hardware IDs! IP addresses solve this with <strong>hierarchical subnets</strong>: routers only need to know how to route to a subnet block (like postal zip codes).
          </p>
        </div>
      `;
    } else if (active === 'ports_wiring') {
      contentHtml = `
        <div class="nc-learn-header">
          <div class="nc-learn-topic-tag">PHYSICAL INFRASTRUCTURE</div>
          <h1 class="nc-learn-topic-title">The 4-Port Rule & Cable Management</h1>
          <p class="nc-learn-lead">Every concentrator device in NetCity has physical capacity limits, just like real-world hardware patch panels.</p>
        </div>

        <div class="nc-learn-callout" style="border-color: #f59e0b; background: rgba(245, 158, 11, 0.08);">
          <strong style="color: #f59e0b; font-size: 1.05rem;">The 4-Port Capacity Law</strong><br>
          Network Switches, Hubs, Street Cabinets, Routers, and Servers all feature <strong>strictly 4 physical ports</strong>. No more than 4 cables can ever be connected simultaneously to a single device.
        </div>

        <div class="nc-learn-card" style="margin-bottom: 18px;">
          <h3 style="color: #38bdf8; margin: 0 0 8px 0;">How to connect more than 4 devices (Switch Cascading)</h3>
          <p style="color: #cbd5e1; font-size: 0.88rem; line-height: 1.5; margin-bottom: 12px;">
            If your campus server has 10 computers that need access, you cannot plug them directly into the 4-port server. Instead, daisy-chain switches:
          </p>
          <ol style="color: #94a3b8; font-size: 0.86rem; padding-left: 20px; line-height: 1.6; margin: 0;">
            <li>Run 1 cable from Port 1 of Switch A to the Server (Uplink).</li>
            <li>Connect computers to Ports 2, 3, and 4 of Switch A.</li>
            <li>Need more capacity? Connect Port 4 of Switch A to Port 1 of Switch B!</li>
            <li>Switches automatically forward frames across the cascade without configuration.</li>
          </ol>
        </div>

        <div class="nc-learn-card">
          <h3 style="color: #ef4444; margin: 0 0 8px 0;">Removing a Single Wire (No Total Teardown)</h3>
          <p style="color: #94a3b8; font-size: 0.88rem; line-height: 1.5;">
            In NetCity, you never need to delete or move a switch just to replace one wire. Simply:
          </p>
          <ul style="color: #94a3b8; font-size: 0.86rem; padding-left: 20px; line-height: 1.6; margin: 0;">
            <li><strong>Click any device:</strong> Open its port manager panel and click <code>[ Disconnect ]</code> on the specific port.</li>
            <li><strong>Click any cable line:</strong> Click directly on a cable square to inspect and disconnect just that single wire.</li>
            <li><strong>100% Coin Refund:</strong> Cable cost is immediately refunded back to your wallet!</li>
          </ul>
        </div>
      `;
    } else if (active === 'win_conditions') {
      contentHtml = `
        <div class="nc-learn-header">
          <div class="nc-learn-topic-tag">GAMEPLAY & EVALUATION</div>
          <h1 class="nc-learn-topic-title">Level Goals, Quotas & Timers</h1>
          <p class="nc-learn-lead">Understand how levels evaluate your network designs and what triggers victory or sudden failure.</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
          <div class="nc-learn-card">
            <h3 style="color: #38bdf8; margin: 0 0 8px 0;">🎯 Connect All (connect_all)</h3>
            <p style="color: #94a3b8; font-size: 0.88rem; line-height: 1.5; margin: 0;">
              The standard architectural objective. Every required building (laptop, classroom, clinic) that opens must have its quota fulfilled (e.g. 2/2 or 3/3 requests successfully completed) for at least one full cycle. Once all active required buildings are satisfied, you immediately win the level!
            </p>
          </div>

          <div class="nc-learn-card">
            <h3 style="color: #f59e0b; margin: 0 0 8px 0;">⏱️ Survive (survive_XXXX)</h3>
            <p style="color: #94a3b8; font-size: 0.88rem; line-height: 1.5; margin: 0;">
              The endurance objective. The simulation runs continuously as traffic grows and unexpected events (cable cuts, server loads) occur. Keep every required building's timer alive until the simulation reaches the target tick count (e.g. 3,000 ticks).
            </p>
          </div>
        </div>

        <div class="nc-learn-card">
          <h3 style="color: #10b981; margin: 0 0 8px 0;">Building Radial Timers & Sudden Failure</h3>
          <p style="color: #94a3b8; font-size: 0.88rem; line-height: 1.5; margin-bottom: 10px;">
            Every open building displays a circular timer ring showing how much time remains before it expects network service:
          </p>
          <ul style="color: #94a3b8; font-size: 0.86rem; padding-left: 20px; line-height: 1.6; margin: 0;">
            <li><span style="color:#10b981; font-weight:700;">Green:</span> More than 50% time remaining. Network healthy.</li>
            <li><span style="color:#f59e0b; font-weight:700;">Amber:</span> Between 25% and 50% time remaining. Attention needed.</li>
            <li><span style="color:#ef4444; font-weight:700;">Pulsing Red:</span> Less than 25% remaining. Imminent timeout!</li>
            <li><strong>Sudden Failure:</strong> If any <em>required</em> building's timer hits zero, the level ends. You can hit <strong>Rewind (30s)</strong> to undo and re-wire before failure!</li>
          </ul>
        </div>
      `;
    } else if (active === 'hardware') {
      contentHtml = `
        <div class="nc-learn-header">
          <div class="nc-learn-topic-tag">HARDWARE CATALOG</div>
          <h1 class="nc-learn-topic-title">Concentrators, Servers & Services</h1>
          <p class="nc-learn-lead">Reference guide to every physical appliance and specialized server in NetCity.</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <div class="nc-learn-card">
            <strong style="color: #ffd166; font-size: 1rem;">📦 Ethernet Switch ($12)</strong>
            <p style="color: #94a3b8; font-size: 0.85rem; margin: 6px 0 0 0; line-height: 1.4;">Layer 2 intelligent concentrator. 4 ports. Learns MAC addresses to forward packets directly without collision.</p>
          </div>
          <div class="nc-learn-card">
            <strong style="color: #ef4444; font-size: 1rem;">⚠️ Unmanaged Hub ($6)</strong>
            <p style="color: #94a3b8; font-size: 0.85rem; margin: 6px 0 0 0; line-height: 1.4;">Layer 1 repeating box. Blasts incoming packets out to all other ports simultaneously, causing collisions under heavy load.</p>
          </div>
          <div class="nc-learn-card">
            <strong style="color: #06d6a0; font-size: 1rem;">🌉 Router ($25)</strong>
            <p style="color: #94a3b8; font-size: 0.85rem; margin: 6px 0 0 0; line-height: 1.4;">Layer 3 gateway. Connects different IP subnets across rivers and borders. Inspects destination IP addresses to route packets.</p>
          </div>
          <div class="nc-learn-card">
            <strong style="color: #38bdf8; font-size: 1rem;">📡 Wireless Access Point ($8)</strong>
            <p style="color: #94a3b8; font-size: 0.85rem; margin: 6px 0 0 0; line-height: 1.4;">Provides Wi-Fi coverage within a 6-tile radius. Connects mobile tablets and laptops to a wired switch uplink.</p>
          </div>
          <div class="nc-learn-card">
            <strong style="color: #f4a261; font-size: 1rem;">📋 DHCP Server ($15)</strong>
            <p style="color: #94a3b8; font-size: 0.85rem; margin: 6px 0 0 0; line-height: 1.4;">Automatically leases IP addresses, subnet masks, and default gateways to newly arriving campus client computers.</p>
          </div>
          <div class="nc-learn-card">
            <strong style="color: #9b5de5; font-size: 1rem;">📖 DNS Server ($15)</strong>
            <p style="color: #94a3b8; font-size: 0.85rem; margin: 6px 0 0 0; line-height: 1.4;">Translates domain names (e.g. <code>campus.lib</code>) into numeric IP addresses (e.g. <code>192.168.2.10</code>).</p>
          </div>
        </div>
      `;
    } else if (active === 'security_vlans') {
      contentHtml = `
        <div class="nc-learn-header">
          <div class="nc-learn-topic-tag">CHAPTER 5 & 6 SECURITY</div>
          <h1 class="nc-learn-topic-title">VLAN Color Zones & Firewalls</h1>
          <p class="nc-learn-lead">Isolate departmental traffic, prevent rogue snooping, and filter unwanted packets with policy firewalls.</p>
        </div>

        <div class="nc-learn-card" style="margin-bottom: 16px;">
          <h3 style="color: #38bdf8; margin: 0 0 8px 0;">🎨 VLANs (Virtual Local Area Networks)</h3>
          <p style="color: #94a3b8; font-size: 0.88rem; line-height: 1.5; margin-bottom: 10px;">
            A VLAN partitions a physical switch into distinct virtual domains (e.g. Students in Blue, Teachers in Green, Guests in Yellow). Traffic cannot cross between colors on the switch without passing through a router door with an explicit Allow Rule.
          </p>
        </div>

        <div class="nc-learn-card">
          <h3 style="color: #ef4444; margin: 0 0 8px 0;">🛡️ Stateful Firewalls & Access Lists</h3>
          <p style="color: #94a3b8; font-size: 0.88rem; line-height: 1.5; margin-bottom: 10px;">
            A firewall inspects packet headers (source IP, destination IP, port) and compares them against security cards:
          </p>
          <ul style="color: #94a3b8; font-size: 0.86rem; padding-left: 20px; line-height: 1.6; margin: 0;">
            <li><strong>Allow Rules:</strong> Permit approved traffic (e.g. Student laptops to Library Web Server on Port 80).</li>
            <li><strong>Block Rules:</strong> Drop malicious flood packets and rogue scanning devices before they reach critical grade servers.</li>
          </ul>
        </div>
      `;
    } else if (active === 'resilience') {
      contentHtml = `
        <div class="nc-learn-header">
          <div class="nc-learn-topic-tag">CHAPTER 7 FAULT TOLERANCE</div>
          <h1 class="nc-learn-topic-title">Resilience, Loops & Load Balancing</h1>
          <p class="nc-learn-lead">Design networks that survive fiber cuts and hardware crashes without drowning in broadcast storms.</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="nc-learn-card">
            <h3 style="color: #06d6a0; margin: 0 0 8px 0;">🔄 Loop Guard (Spanning Tree)</h3>
            <p style="color: #94a3b8; font-size: 0.88rem; line-height: 1.5; margin: 0;">
              Redundant cables create loops. If two switches are connected with multiple wires, packets cycle endlessly in a packet storm! Loop Guard detects cycles and temporarily puts backup links on standby until the main link is cut.
            </p>
          </div>

          <div class="nc-learn-card">
            <h3 style="color: #38bdf8; margin: 0 0 8px 0;">⚖️ Server Load Balancer</h3>
            <p style="color: #94a3b8; font-size: 0.88rem; line-height: 1.5; margin: 0;">
              When hundreds of clients request exam results, a single server crashes from queue overflow. Place a Load Balancer at the entrance to distribute incoming requests across redundant server pools.
            </p>
          </div>
        </div>
      `;
    }

    const topics = [
      { id: 'mac_ip', icon: '🏷️', label: 'MAC vs IP' },
      { id: 'ports_wiring', icon: '🔌', label: '4-Port Rule & Cables' },
      { id: 'win_conditions', icon: '🎯', label: 'Goals & Quotas' },
      { id: 'hardware', icon: '🌐', label: 'Hardware & Servers' },
      { id: 'security_vlans', icon: '🛡️', label: 'Security & VLANs' },
      { id: 'resilience', icon: '⚡', label: 'Resilience & Loops' }
    ];

    let navButtonsHtml = '';
    for (const t of topics) {
      const isActive = t.id === active;
      navButtonsHtml += `
        <button class="nc-learn-nav-btn ${isActive ? 'active' : ''}" data-topic="${t.id}">
          <span style="font-size:1.1rem;">${t.icon}</span>
          <span>${t.label}</span>
        </button>
      `;
    }

    this.screenLearnEl.innerHTML = `
      <header class="nc-app-nav">
        <div class="nc-app-nav-left">
          <div class="nc-app-brand">
            <div class="nc-app-brand-bars">
              <span class="nc-bar bar-1"></span>
              <span class="nc-bar bar-2"></span>
              <span class="nc-bar bar-3"></span>
            </div>
            <span class="nc-app-brand-title">NetCity</span>
          </div>
          <nav class="nc-app-nav-tabs">
            <button class="nc-app-nav-tab" id="nc-learn-nav-play">
              <span class="nc-play-icon">▶</span> Play
            </button>
            <button class="nc-app-nav-tab active" id="nc-learn-nav-learn">Learn</button>
          </nav>
        </div>
        <div class="nc-app-nav-right"></div>
      </header>

      <div class="nc-learn-container">
        <aside class="nc-learn-sidebar">
          <div style="font-size:0.75rem; font-weight:800; color:#64748b; letter-spacing:0.08em; margin-bottom:12px; padding-left:4px;">
            FIELD MANUAL TOPICS
          </div>
          <nav class="nc-learn-nav-list">
            ${navButtonsHtml}
          </nav>

          <div style="margin-top:auto; padding-top:24px;">
            <button class="nc-btn nc-btn-primary" id="nc-learn-back-play" style="width:100%; display:flex; align-items:center; justify-content:center; gap:8px;">
              <span>← Back to Play</span>
            </button>
          </div>
        </aside>

        <main class="nc-learn-article-pane">
          ${contentHtml}
        </main>
      </div>
    `;

    // Events
    const navPlay = this.screenLearnEl.querySelector('#nc-learn-nav-play');
    if (navPlay) {
      navPlay.onclick = () => {
        this._setScreen('campaign');
        this._renderCampaignScreen();
      };
    }

    const backPlay = this.screenLearnEl.querySelector('#nc-learn-back-play');
    if (backPlay) {
      backPlay.onclick = () => {
        this._setScreen('campaign');
        this._renderCampaignScreen();
      };
    }

    this.screenLearnEl.querySelectorAll('.nc-learn-nav-btn').forEach(btn => {
      btn.onclick = () => {
        const tId = btn.getAttribute('data-topic');
        if (tId) this._renderLearnScreen(tId);
      };
    });
  }

  _showLevelsModal(selectedChNum = null) {
    this._closeModal();
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


  _showWireInspector(wire) {
    if (!wire || !this.modalEl) return;
    this.modalEl.style.display = 'flex';

    let fromLabel = 'Building';
    if (wire.buildingId) {
      const b = this.sim.getBuilding(wire.buildingId);
      fromLabel = b ? (b.name || `${b.type.charAt(0).toUpperCase() + b.type.slice(1)} #${b.id}`) : 'Building';
    } else if (wire.deviceId) {
      const d = this.sim.getDevice(wire.deviceId);
      fromLabel = d ? (DEVICE_CATALOG[d.type]?.name || 'Device') : 'Device';
    }

    let toLabel = 'Server';
    if (wire.targetDeviceId) {
      const d = this.sim.getDevice(wire.targetDeviceId);
      toLabel = d ? (DEVICE_CATALOG[d.type]?.name || 'Device') : 'Device';
    } else {
      const srv = this.sim.getServerAt(wire.path[wire.path.length - 1]);
      toLabel = srv ? (srv.name || 'Server') : 'Server';
    }

    const spec = WIRE_CATALOG[wire.wireType];

    this.modalEl.innerHTML = `
      <div class="nc-card" style="max-width:380px; text-align:left;">
        <h2 class="nc-card-title" style="margin-bottom:8px; color:${spec?.color || '#38bdf8'}; display:flex; align-items:center; gap:8px;">
          <span>🧵</span> Cable Inspector
        </h2>
        <div style="background:#0d1b2a; border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:0.82rem;">
          <div style="margin-bottom:6px;">Type: <strong style="color:${spec?.color || '#ffd166'};">${spec?.name || wire.wireType}</strong></div>
          <div style="margin-bottom:6px;">Route: <strong style="color:#ffffff;">${fromLabel} &rarr; ${toLabel}</strong></div>
          <div style="margin-bottom:6px;">Length: <strong style="color:#38bdf8;">${wire.length} squares (${wire.length * 10}m)</strong></div>
          <div style="margin-bottom:6px;">Encryption: <strong style="color:${wire.encrypted ? '#10b981' : '#94a3b8'};">${wire.encrypted ? '🔒 Active (Scrambled, +2 latency)' : 'None (Plaintext)'}</strong></div>
          <div>Refund Value: <strong style="color:#ffd166;">$${wire.cost} coins</strong></div>
        </div>
        <div class="nc-card-actions" style="justify-content:space-between; gap:6px;">
          <button class="nc-btn nc-btn-secondary" id="nc-btn-toggle-encrypt" style="padding:6px 12px; font-size:0.8rem;">${wire.encrypted ? '🔓 Decrypt' : '🔒 Encrypt'}</button>
          <button class="nc-btn nc-btn-danger" id="nc-btn-disconnect-wire" style="padding:6px 12px; font-size:0.8rem;">Disconnect (+$${wire.cost})</button>
          <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
        </div>
      </div>
    `;

    this.modalEl.querySelector('#nc-btn-toggle-encrypt').onclick = () => {
      this.sim.setWireEncrypted(wire.id, !wire.encrypted);
      this._showWireInspector(wire);
      this._setHint(wire.encrypted ? 'Link encrypted! Snoop sees scrambled symbols.' : 'Link encryption disabled.');
    };

    this.modalEl.querySelector('#nc-btn-disconnect-wire').onclick = () => {
      this.sim.removeWireById(wire.id);
      this._updateCoinsDisplay();
      this._setHint(`Disconnected ${spec?.name || 'wire'}. Refunded $${wire.cost} coins.`);
      this._closeModal();
    };
    this.modalEl.querySelector('#nc-modal-close').onclick = () => this._closeModal();
  }

  _getDeviceConnections(device) {
    if (!device || !this.sim) return [];
    const conns = [];
    const isSrv = device.type === 'server' || this.sim.isServer(device.square);

    if (isSrv) {
      for (const wire of this.sim.wires.values()) {
        if (wire.path[wire.path.length - 1] === device.square) {
          let peerName = 'Connected Link';
          let peerIcon = '🔗';
          if (wire.buildingId) {
            const b = this.sim.getBuilding(wire.buildingId);
            if (b) {
              peerName = b.name || `${b.type.charAt(0).toUpperCase() + b.type.slice(1)} #${b.id}`;
              peerIcon = b.type === 'classroom' ? '🏫' : (b.type === 'laptop' ? '💻' : '🏢');
            }
          } else if (wire.deviceId) {
            const d = this.sim.getDevice(wire.deviceId);
            if (d) {
              const spec = DEVICE_CATALOG[d.type];
              peerName = spec?.name || `Device #${d.id}`;
              peerIcon = spec?.icon || '📦';
            }
          }
          conns.push({
            wireId: wire.id,
            direction: 'downstream',
            peerName,
            peerIcon,
            wireType: wire.wireType,
            length: wire.length,
            cost: wire.cost
          });
        }
      }
      return conns;
    }

    if (device.wireIds) {
      for (const wId of device.wireIds) {
        const wire = this.sim.wires.get(wId);
        if (!wire) continue;
        let peerName = 'Connected Link';
        let peerIcon = '🔗';
        if (wire.buildingId) {
          const b = this.sim.getBuilding(wire.buildingId);
          if (b) {
            peerName = b.name || `${b.type.charAt(0).toUpperCase() + b.type.slice(1)} #${b.id}`;
            peerIcon = b.type === 'classroom' ? '🏫' : (b.type === 'laptop' ? '💻' : '🏢');
          }
        } else if (wire.deviceId) {
          const d = this.sim.getDevice(wire.deviceId);
          if (d) {
            const spec = DEVICE_CATALOG[d.type];
            peerName = spec?.name || `Device #${d.id}`;
            peerIcon = spec?.icon || '📦';
          }
        }
        conns.push({
          wireId: wire.id,
          direction: 'downstream',
          peerName,
          peerIcon,
          wireType: wire.wireType,
          length: wire.length,
          cost: wire.cost
        });
      }
    }

    const outgoingIds = new Set();
    if (device.uplinkWireId) outgoingIds.add(device.uplinkWireId);
    if (device.outgoingWireIds) {
      for (const id of device.outgoingWireIds) outgoingIds.add(id);
    }

    for (const wId of outgoingIds) {
      const wire = this.sim.wires.get(wId);
      if (!wire) continue;
      let peerName = 'Central Server';
      let peerIcon = '🖥️';
      if (wire.targetDeviceId) {
        const d = this.sim.getDevice(wire.targetDeviceId);
        if (d) {
          const spec = DEVICE_CATALOG[d.type];
          peerName = spec?.name || `Device #${d.id}`;
          peerIcon = spec?.icon || '📦';
        }
      } else {
        const srv = this.sim.getServerAt(wire.path[wire.path.length - 1]);
        if (srv) {
          peerName = srv.name || 'Server';
          peerIcon = srv.icon || '🖥️';
        }
      }
      conns.push({
        wireId: wire.id,
        direction: 'uplink',
        peerName,
        peerIcon,
        wireType: wire.wireType,
        length: wire.length,
        cost: wire.cost
      });
    }

    return conns;
  }

  _renderDevicePortsHtml(device) {
    const conns = this._getDeviceConnections(device);
    const maxPorts = device.ports || 4;
    let portsHtml = '';

    for (let i = 0; i < maxPorts; i++) {
      if (i < conns.length) {
        const c = conns[i];
        let zoneSelector = '';
        if (device.type === 'switch') {
          const currentZone = device.portZones ? (device.portZones.get(c.wireId) || '') : '';
          zoneSelector = `
            <select class="nc-port-zone-select" data-wire-id="${c.wireId}" style="background:#0d1b2a; color:#fff; border:1px solid #415a77; border-radius:4px; font-size:0.75rem; padding:2px 4px; margin-right:6px;">
              <option value="" ${currentZone === '' ? 'selected' : ''}>Zone: None</option>
              <option value="blue" ${currentZone === 'blue' ? 'selected' : ''} style="color:#38bdf8;">Zone: Blue</option>
              <option value="green" ${currentZone === 'green' ? 'selected' : ''} style="color:#10b981;">Zone: Green</option>
              <option value="orange" ${currentZone === 'orange' ? 'selected' : ''} style="color:#f59e0b;">Zone: Orange</option>
            </select>
          `;
        }

        portsHtml += `
          <div style="display:flex; justify-content:space-between; align-items:center; background:#1b263b; padding:6px 10px; border-radius:6px; margin-bottom:6px; font-size:0.8rem; border-left:3px solid #38bdf8;">
            <div>
              <strong style="color:#38bdf8;">Port ${i + 1}:</strong> <span>${c.peerIcon} ${c.peerName}</span>
              <div style="font-size:0.72rem; color:#94a3b8;">${WIRE_CATALOG[c.wireType]?.name || c.wireType} &middot; ${c.length}m &middot; $${c.cost}</div>
            </div>
            <div style="display:flex; align-items:center;">
              ${zoneSelector}
              <button class="nc-btn nc-btn-danger nc-btn-disconnect-single" data-wire-id="${c.wireId}" style="padding:4px 8px; font-size:0.75rem;">Disconnect (+$${c.cost})</button>
            </div>
          </div>
        `;
      } else {
        portsHtml += `
          <div style="display:flex; justify-content:space-between; align-items:center; background:#0d1b2a; padding:6px 10px; border-radius:6px; margin-bottom:6px; font-size:0.8rem; border:1px dashed #334155;">
            <span style="color:#64748b;"><strong style="color:#94a3b8;">Port ${i + 1}:</strong> <em>Available / Empty</em></span>
          </div>
        `;
      }
    }

    return `
      <div style="margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <strong style="font-size:0.82rem; color:#e2e8f0;">Physical Ports (${conns.length}/${maxPorts} in use):</strong>
        </div>
        ${portsHtml}
      </div>
    `;
  }

  _bindDisconnectButtons(device) {
    this.modalEl.querySelectorAll('.nc-btn-disconnect-single').forEach(btn => {
      btn.onclick = () => {
        const wireId = parseInt(btn.dataset.wireId, 10);
        this.sim.removeWireById(wireId);
        this._updateCoinsDisplay();
        this._setHint('Disconnected cable. Cost refunded.');
        this._reopenCurrentDeviceInspector(device);
      };
    });

    this.modalEl.querySelectorAll('.nc-port-zone-select').forEach(sel => {
      sel.onchange = (e) => {
        const wireId = parseInt(sel.dataset.wireId, 10);
        this.sim.setSwitchPortZone(device.id, wireId, e.target.value || null);
        this._setHint(`Set switch port zone to ${e.target.value || 'None'}`);
      };
    });
  }

  _reopenCurrentDeviceInspector(device) {
    if (!device) return;
    if (device.type === 'switch') this._showSwitchNotebook(device);
    else if (device.type === 'router') this._showRouterInspector(device);
    else if (device.type === 'firewall') this._showFirewallInspector(device);
    else if (device.type === 'vpn_gateway') this._showVpnInspector(device);
    else if (device.type === 'load_balancer') this._showLoadBalancerInspector(device);
    else if (device.type === 'backup_power') this._showBackupPowerInspector(device);
    else if (device.type === 'dhcp_server') this._showDhcpInspector(device);
    else if (device.type === 'dns_server') this._showDnsInspector(device);
    else if (device.type === 'web_server') this._showWebServerInspector(device);
    else if (device.type === 'email_server') this._showEmailServerInspector(device);
    else if (device.type === 'server' || (device.square && this.sim.isServer(device.square))) this._showServerInspector(device);
    else this._showDeviceInspector(device);
  }

  _showSwitchNotebook(device) {
    if (!device || device.type !== 'switch' || !this.modalEl) return;
    this.modalEl.style.display = 'flex';

    let rowsHtml = '';
    if (device.macTable && device.macTable.size > 0) {
      let portIdx = 1;
      for (const [mac, entry] of device.macTable.entries()) {
        rowsHtml += `
          <tr style="border-bottom:1px solid #334155;">
            <td style="padding:6px 10px; font-weight:600; color:#38bdf8;">Port ${portIdx++}</td>
            <td style="padding:6px 10px; color:#ffffff;">${entry.deviceName || 'Device'}</td>
            <td style="padding:6px 10px; font-family:monospace; color:#ffd166; font-weight:bold;">${mac}</td>
          </tr>
        `;
      }
    } else {
      rowsHtml = `
        <tr>
          <td colspan="3" style="text-align:center; padding:16px; color:#94a3b8; font-style:italic;">
            The notebook is empty!<br>As computers send packets, the Switch learns their MAC addresses.
          </td>
        </tr>
      `;
    }

    this.modalEl.innerHTML = `
      <div class="nc-card" style="max-width:440px; text-align:left;">
        <h2 class="nc-card-title" style="margin-bottom:6px; color:#38bdf8;">📦 Switch Inspector ("The Notebook")</h2>
        <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:12px; line-height:1.4;">
          The switch learns which device MAC lives on which port by watching packets arrive. Then it delivers directly without collisions!
        </p>

        <!-- 4-Port Physical Panel with Individual Disconnect & VLAN Zones -->
        ${this._renderDevicePortsHtml(device)}

        <div style="background:#0d1b2a; border-radius:6px; padding:8px 12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong style="color:#e2e8f0; font-size:0.82rem;">Loop Guard (Spanning Tree)</strong>
            <div style="font-size:0.72rem; color:#94a3b8;">Blocks redundant loops to prevent broadcast packet storms.</div>
          </div>
          <input type="checkbox" id="nc-toggle-loop-guard" ${device.loopGuardActive ? 'checked' : ''} style="transform:scale(1.2); cursor:pointer;" />
        </div>

        <h4 style="margin:0 0 6px 0; color:#cbd5e1; font-size:0.82rem;">Switch MAC Address Table ("The Notebook")</h4>
        <table style="width:100%; border-collapse:collapse; font-size:0.8rem; margin-bottom:14px; background:#0d1b2a; border-radius:6px; overflow:hidden;">
          <thead>
            <tr style="border-bottom:1px solid #415a77; color:#2ec4b6; text-align:left; background:#1b263b;">
              <th style="padding:6px 8px;">Port</th>
              <th style="padding:6px 8px;">Device</th>
              <th style="padding:6px 8px;">MAC Address</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="nc-card-actions" style="justify-content:space-between;">
          <button class="nc-btn nc-btn-secondary" id="nc-switch-forget" style="background:#b45309; color:#fff;">Forget (Clear Table)</button>
          <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
        </div>
      </div>
    `;

    this._bindDisconnectButtons(device);

    const loopGuardToggle = this.modalEl.querySelector('#nc-toggle-loop-guard');
    if (loopGuardToggle) {
      loopGuardToggle.onchange = (e) => {
        this.sim.setSwitchLoopGuard(device.id, e.target.checked);
        this._setHint(`Loop Guard ${e.target.checked ? 'Enabled' : 'Disabled'}.`);
      };
    }

    const forgetBtn = this.modalEl.querySelector('#nc-switch-forget');
    if (forgetBtn) {
      forgetBtn.onclick = () => {
        if (device.macTable) device.macTable.clear();
        this._showSwitchNotebook(device);
        this._setHint('Switch MAC table cleared (Forget).');
      };
    }

    this.modalEl.querySelector('#nc-modal-close').onclick = () => this._closeModal();
  }

  _showBuildingInspector(b) {
    if (!b || !this.modalEl) return;
    this.modalEl.style.display = 'flex';

    const ch = (this.levelDef && this.levelDef.chapter) || 1;
    const isIpLevel = ch >= 3;
    const hasWire = Boolean(b.wireId);
    const wire = hasWire ? this.sim.wires.get(b.wireId) : null;
    const wireTypeLabel = wire ? (WIRE_CATALOG[wire.wireType]?.name || wire.wireType) : 'None';
    const wireCost = wire ? wire.cost : 0;

    let icon = '🏫';
    if (b.type === 'laptop') icon = '💻';
    else if (b.type === 'phone' || b.type === 'tablet') icon = '📱';
    else if (b.type === 'home') icon = '🏠';
    else if (b.type === 'library') icon = '📚';
    else if (b.type === 'sports_ground') icon = '⚽';

    let ipSection = '';
    if (isIpLevel) {
      ipSection = `
        <div style="background:#0d1b2a; border:1px solid #415a77; border-radius:6px; padding:12px; margin-bottom:12px;">
          <h4 style="margin:0 0 8px 0; color:#38bdf8; font-size:0.88rem;">🌐 Network Configuration</h4>
          <div style="margin-bottom:8px;">
            <label style="display:block; font-size:0.75rem; color:#94a3b8; margin-bottom:3px;">IP Address:</label>
            <input type="text" id="nc-input-ip" class="nc-input" value="${b.ip || ''}" placeholder="e.g. 192.168.1.10" />
          </div>
          <div style="margin-bottom:8px;">
            <label style="display:block; font-size:0.75rem; color:#94a3b8; margin-bottom:3px;">Subnet Mask / Range:</label>
            <div style="font-family:monospace; color:#e2e8f0; font-size:0.85rem; padding:4px 0;">${b.subnet || '192.168.1.0/24'}</div>
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; color:#94a3b8; margin-bottom:3px;">Default Gateway:</label>
            <input type="text" id="nc-input-gw" class="nc-input" value="${b.defaultGateway || ''}" placeholder="e.g. 192.168.1.1" />
          </div>
        </div>
      `;
    }

    let wireSection = '';
    if (hasWire) {
      wireSection = `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#0d1b2a; border:1px solid #415a77; border-radius:6px; padding:10px 12px; margin-bottom:12px;">
          <div>
            <div style="color:#ffffff; font-weight:600; font-size:0.85rem;">Connected Cable</div>
            <div style="color:#94a3b8; font-size:0.75rem;">${wireTypeLabel} (${wire ? wire.path.length - 1 : 0} squares)</div>
          </div>
          <button class="nc-btn nc-btn-danger" id="nc-btn-disconnect" style="padding:6px 12px; font-size:0.8rem;">Disconnect (+$${wireCost})</button>
        </div>
      `;
    }

    this.modalEl.innerHTML = `
      <div class="nc-card" style="max-width:440px; text-align:left;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
          <span style="font-size:1.8rem;">${icon}</span>
          <div>
            <h2 class="nc-card-title" style="font-size:1.2rem; color:#ffffff;">${b.name || `${b.type.toUpperCase()} #${b.id}`}</h2>
            <div style="font-size:0.78rem; color:#94a3b8;">MAC: <code style="color:#ffd166;">${b.mac || '00:00'}</code> • State: <strong style="color:${b.state === 'open' ? '#10b981' : '#f59e0b'};">${b.state}</strong></div>
          </div>
        </div>

        <div style="background:#0d1b2a; border-radius:6px; padding:8px 12px; margin-bottom:12px; font-size:0.8rem; color:#cbd5e1; display:flex; justify-content:space-between;">
          <span>Target: <strong style="color:#38bdf8;">${b.targetHostname || (b.targetPort ? `Port ${b.targetPort}` : b.targetName || 'Server')}</strong></span>
          <span>Quota: <strong style="color:#2ec4b6;">${b.fulfilledInCycle} / ${b.quota}</strong></span>
        </div>

        ${ipSection}
        ${wireSection}

        <div class="nc-card-actions" style="margin-top:4px;">
          ${isIpLevel ? '<button class="nc-btn nc-btn-primary" id="nc-btn-save-ip">Save Config</button>' : ''}
          <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
        </div>
      </div>
    `;

    if (isIpLevel) {
      const saveBtn = this.modalEl.querySelector('#nc-btn-save-ip');
      if (saveBtn) {
        saveBtn.onclick = () => {
          const ipVal = this.modalEl.querySelector('#nc-input-ip')?.value?.trim() || null;
          const gwVal = this.modalEl.querySelector('#nc-input-gw')?.value?.trim() || null;
          this.sim.setBuildingIp(b.id, ipVal, gwVal);
          this._setHint(`Saved settings for ${b.name || 'Building ' + b.id}: IP=${ipVal || 'None'}, Gateway=${gwVal || 'None'}`);
          this._closeModal();
        };
      }
    }

    const disBtn = this.modalEl.querySelector('#nc-btn-disconnect');
    if (disBtn) {
      disBtn.onclick = () => {
        this.sim.removeWire(b.id);
        this._updateCoinsDisplay();
        this._setHint(`Disconnected wire from ${b.name || 'Building ' + b.id}. Coins refunded.`);
        this._closeModal();
      };
    }

    this.modalEl.querySelector('#nc-modal-close').onclick = () => this._closeModal();
  }

  _showRouterInspector(device) {
    if (!device || !this.modalEl) return;
    this.modalEl.style.display = 'flex';

    const hasWire = Boolean(device.uplinkWireId);
    const wire = hasWire ? this.sim.wires.get(device.uplinkWireId) : null;
    const wireCost = wire ? wire.cost : 0;

    let staticRoutesRows = '';
    if (device.staticRoutes && device.staticRoutes.size > 0) {
      for (const [subnet, nextHop] of device.staticRoutes.entries()) {
        staticRoutesRows += `
          <tr style="border-bottom:1px solid #334155;">
            <td style="padding:5px 8px; font-family:monospace; color:#ffd166;">${subnet}</td>
            <td style="padding:5px 8px; font-family:monospace; color:#38bdf8;">Hop: ${nextHop}</td>
            <td style="padding:5px 8px; color:#34d399;">Static</td>
          </tr>
        `;
      }
    }

    let allowRulesRows = '';
    if (device.allowRules && device.allowRules.length > 0) {
      for (const r of device.allowRules) {
        allowRulesRows += `
          <tr style="border-bottom:1px solid #334155;">
            <td style="padding:5px 8px; font-weight:bold; color:#10b981;">ALLOW</td>
            <td style="padding:5px 8px; color:#38bdf8;">Zone: ${r.fromZone || 'ANY'}</td>
            <td style="padding:5px 8px; color:#ffd166;">Target: ${r.toServerId || r.toZone}</td>
          </tr>
        `;
      }
    }

    this.modalEl.innerHTML = `
      <div class="nc-card" style="max-width:500px; text-align:left;">
        <h2 class="nc-card-title" style="margin-bottom:6px; color:#e63946; display:flex; align-items:center; gap:8px;">
          <span>🧭</span> Router Inspector
        </h2>
        <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:12px; line-height:1.4;">
          The Router connects different networks (subnets) together and routes packets across borders using IP addresses.
        </p>

        <div style="background:#0d1b2a; border-radius:6px; padding:8px 12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong style="color:#e2e8f0; font-size:0.82rem;">Dynamic Routing (RIP Gossip)</strong>
            <div style="font-size:0.72rem; color:#94a3b8;">Exchanges maps every 100 ticks and automatically recalculates alternate paths.</div>
          </div>
          <input type="checkbox" id="nc-toggle-dynamic-routing" ${device.dynamicRouting ? 'checked' : ''} style="transform:scale(1.2); cursor:pointer;" />
        </div>

        <div style="background:#0d1b2a; border-radius:6px; padding:8px 12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong style="color:#e2e8f0; font-size:0.82rem;">Network Address Translation (NAT)</strong>
            <div style="font-size:0.72rem; color:#94a3b8;">Translates private internal IPs (192.168.x.x) into a shared public IP.</div>
          </div>
          <input type="checkbox" id="nc-toggle-nat" ${device.natEnabled ? 'checked' : ''} style="transform:scale(1.2); cursor:pointer;" />
        </div>

        <h4 style="margin:0 0 6px 0; color:#cbd5e1; font-size:0.85rem;">Routing Table</h4>
        <table style="width:100%; border-collapse:collapse; font-size:0.78rem; margin-bottom:10px; background:#0d1b2a; border-radius:6px; overflow:hidden;">
          <thead>
            <tr style="border-bottom:1px solid #415a77; color:#38bdf8; text-align:left; background:#1b263b;">
              <th style="padding:6px 8px;">Destination</th>
              <th style="padding:6px 8px;">Gateway</th>
              <th style="padding:6px 8px;">Type</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #334155;">
              <td style="padding:5px 8px; font-family:monospace; color:#ffd166;">192.168.1.0/24</td>
              <td style="padding:5px 8px; font-family:monospace;">Direct</td>
              <td style="padding:5px 8px; color:#34d399;">Connected</td>
            </tr>
            <tr style="border-bottom:1px solid #334155;">
              <td style="padding:5px 8px; font-family:monospace; color:#ffd166;">192.168.2.0/24</td>
              <td style="padding:5px 8px; font-family:monospace;">Direct</td>
              <td style="padding:5px 8px; color:#34d399;">Connected</td>
            </tr>
            ${staticRoutesRows}
          </tbody>
        </table>

        <!-- Add Static Route Card -->
        <div style="background:#0d1b2a; border-radius:6px; padding:8px 10px; margin-bottom:12px; display:flex; gap:6px; align-items:center;">
          <input type="text" id="nc-input-static-subnet" placeholder="Subnet (e.g. 192.168.30.0/24)" style="flex:1; background:#1b263b; color:#fff; border:1px solid #415a77; border-radius:4px; padding:4px 6px; font-size:0.75rem;" />
          <button class="nc-btn nc-btn-primary" id="nc-btn-add-static-route" style="padding:4px 8px; font-size:0.75rem;">Add Route</button>
        </div>

        ${allowRulesRows ? `
          <h4 style="margin:0 0 6px 0; color:#cbd5e1; font-size:0.85rem;">Inter-VLAN Permission Rules</h4>
          <table style="width:100%; border-collapse:collapse; font-size:0.78rem; margin-bottom:12px; background:#0d1b2a; border-radius:6px; overflow:hidden;">
            <tbody>${allowRulesRows}</tbody>
          </table>
        ` : ''}

        <div style="background:#0d1b2a; border-radius:6px; padding:8px 12px; font-size:0.78rem; color:#94a3b8; margin-bottom:12px;">
          Max Ports: 4 • Status: Active & Forwarding
        </div>

        <!-- 4-Port Physical Panel with Individual Disconnect -->
        ${this._renderDevicePortsHtml(device)}

        <div class="nc-card-actions" style="justify-content:space-between;">
          ${hasWire ? `<button class="nc-btn nc-btn-danger" id="nc-btn-disconnect" style="padding:6px 12px; font-size:0.8rem;">Disconnect Uplink (+$${wireCost})</button>` : '<span></span>'}
          <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
        </div>
      </div>
    `;

    this._bindDisconnectButtons(device);

    const dynToggle = this.modalEl.querySelector('#nc-toggle-dynamic-routing');
    if (dynToggle) {
      dynToggle.onchange = (e) => {
        this.sim.setRouterDynamicRouting(device.id, e.target.checked);
        this._setHint(`Dynamic Routing (RIP Gossip) ${e.target.checked ? 'Enabled' : 'Disabled'}.`);
      };
    }

    const natToggle = this.modalEl.querySelector('#nc-toggle-nat');
    if (natToggle) {
      natToggle.onchange = (e) => {
        this.sim.setRouterNat(device.id, e.target.checked);
        this._setHint(`NAT Translation ${e.target.checked ? 'Enabled' : 'Disabled'}.`);
      };
    }

    const addRouteBtn = this.modalEl.querySelector('#nc-btn-add-static-route');
    if (addRouteBtn) {
      addRouteBtn.onclick = () => {
        const sub = this.modalEl.querySelector('#nc-input-static-subnet')?.value?.trim() || '192.168.30.0/24';
        this.sim.setRouterStaticRoute(device.id, sub, device.square);
        this._showRouterInspector(device);
        this._setHint(`Added static route to ${sub}`);
      };
    }

    if (hasWire) {
      this.modalEl.querySelector('#nc-btn-disconnect').onclick = () => {
        this.sim.removeWireById(device.uplinkWireId);
        this._updateCoinsDisplay();
        this._setHint('Disconnected uplink wire from router.');
        this._closeModal();
      };
    }
    this.modalEl.querySelector('#nc-modal-close').onclick = () => this._closeModal();
  }

  _showFirewallInspector(device) {
    if (!device || !this.modalEl) return;
    this.modalEl.style.display = 'flex';

    let rulesHtml = '';
    if (device.rules && device.rules.length > 0) {
      for (const r of device.rules) {
        rulesHtml += `
          <tr style="border-bottom:1px solid #334155;">
            <td style="padding:5px 8px; font-weight:bold; color:${r.action === 'block' ? '#ef4444' : '#10b981'};">${r.action.toUpperCase()}</td>
            <td style="padding:5px 8px; font-family:monospace; color:#ffd166;">${r.sourceIp || 'ANY'}</td>
            <td style="padding:5px 8px; color:#38bdf8;">${r.port ? `Port ${r.port}` : 'ANY'}</td>
            <td style="padding:5px 8px;"><button class="nc-btn nc-btn-danger nc-btn-del-rule" data-rule-id="${r.id}" style="padding:2px 6px; font-size:0.7rem;">Delete</button></td>
          </tr>
        `;
      }
    } else {
      rulesHtml = `
        <tr>
          <td colspan="4" style="text-align:center; padding:12px; color:#94a3b8; font-style:italic;">
            No rules configured. Default policy: Allow normal traffic.
          </td>
        </tr>
      `;
    }

    this.modalEl.innerHTML = `
      <div class="nc-card" style="max-width:500px; text-align:left;">
        <h2 class="nc-card-title" style="margin-bottom:6px; color:#ef4444; display:flex; align-items:center; gap:8px;">
          <span>🛡️</span> Firewall Inspector ("The Bouncer")
        </h2>
        <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:12px; line-height:1.4;">
          The Firewall checks incoming packets against rule cards. Block rogue devices or traffic floods by sender IP or port!
        </p>

        <h4 style="margin:0 0 6px 0; color:#cbd5e1; font-size:0.85rem;">Access Control List (Rule Cards)</h4>
        <table style="width:100%; border-collapse:collapse; font-size:0.78rem; margin-bottom:12px; background:#0d1b2a; border-radius:6px; overflow:hidden;">
          <thead>
            <tr style="border-bottom:1px solid #415a77; color:#38bdf8; text-align:left; background:#1b263b;">
              <th style="padding:6px 8px;">Action</th>
              <th style="padding:6px 8px;">Source IP</th>
              <th style="padding:6px 8px;">Port</th>
              <th style="padding:6px 8px;"></th>
            </tr>
          </thead>
          <tbody>
            ${rulesHtml}
          </tbody>
        </table>

        <div style="background:#0d1b2a; border-radius:6px; padding:10px; margin-bottom:12px; display:flex; gap:8px; align-items:center;">
          <select id="nc-fw-action" style="background:#1b263b; color:#fff; border:1px solid #415a77; border-radius:4px; padding:4px 6px; font-size:0.78rem;">
            <option value="block">BLOCK</option>
            <option value="allow">ALLOW</option>
          </select>
          <input type="text" id="nc-fw-ip" placeholder="Source IP (e.g. 10.99.99.99)" style="flex:1; background:#1b263b; color:#fff; border:1px solid #415a77; border-radius:4px; padding:4px 6px; font-size:0.78rem;" />
          <button class="nc-btn nc-btn-primary" id="nc-fw-add-btn" style="padding:4px 10px; font-size:0.78rem;">Add Rule</button>
        </div>

        ${this._renderDevicePortsHtml(device)}

        <div class="nc-card-actions">
          <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
        </div>
      </div>
    `;

    this._bindDisconnectButtons(device);

    this.modalEl.querySelectorAll('.nc-btn-del-rule').forEach(btn => {
      btn.onclick = () => {
        const rId = parseInt(btn.dataset.ruleId, 10);
        this.sim.removeFirewallRule(device.id, rId);
        this._showFirewallInspector(device);
      };
    });

    const addBtn = this.modalEl.querySelector('#nc-fw-add-btn');
    if (addBtn) {
      addBtn.onclick = () => {
        const action = this.modalEl.querySelector('#nc-fw-action')?.value || 'block';
        const ip = this.modalEl.querySelector('#nc-fw-ip')?.value?.trim() || null;
        this.sim.addFirewallRule(device.id, { action, sourceIp: ip });
        this._showFirewallInspector(device);
        this._setHint(`Added firewall rule: ${action.toUpperCase()} ${ip || 'ALL'}`);
      };
    }

    this.modalEl.querySelector('#nc-modal-close').onclick = () => this._closeModal();
  }

  _showVpnInspector(device) {
    if (!device || !this.modalEl) return;
    this.modalEl.style.display = 'flex';

    this.modalEl.innerHTML = `
      <div class="nc-card" style="max-width:440px; text-align:left;">
        <h2 class="nc-card-title" style="margin-bottom:6px; color:#5a189a; display:flex; align-items:center; gap:8px;">
          <span>🔒</span> VPN Gateway Inspector
        </h2>
        <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:12px; line-height:1.4;">
          The VPN Gateway encapsulates network traffic inside an encrypted tunnel across untrusted public networks. Eavesdroppers (Snoop) cannot inspect payload data.
        </p>

        <div style="background:#0d1b2a; border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:0.8rem;">
          <div style="margin-bottom:6px;">Tunnel Status: <strong style="color:#10b981;">Active & Encrypted (AES-256)</strong></div>
          <div style="margin-bottom:6px;">Encapsulation: <strong style="color:#38bdf8;">IPsec / WireGuard Tunnel</strong></div>
          <div>Payload Protection: <strong style="color:#ffd166;">Snoop-proof</strong></div>
        </div>

        ${this._renderDevicePortsHtml(device)}

        <div class="nc-card-actions">
          <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
        </div>
      </div>
    `;

    this._bindDisconnectButtons(device);
    this.modalEl.querySelector('#nc-modal-close').onclick = () => this._closeModal();
  }

  _showLoadBalancerInspector(device) {
    if (!device || !this.modalEl) return;
    this.modalEl.style.display = 'flex';

    let backendsHtml = '';
    const servers = this.sim.servers || [];
    for (const s of servers) {
      const isCrashed = this.sim.crashedServers && this.sim.crashedServers.has(s.id);
      backendsHtml += `
        <tr style="border-bottom:1px solid #334155;">
          <td style="padding:6px 10px; color:#ffffff;">${s.name}</td>
          <td style="padding:6px 10px; font-family:monospace; color:#ffd166;">${s.ip}</td>
          <td style="padding:6px 10px; font-weight:bold; color:${isCrashed ? '#ef4444' : '#10b981'};">${isCrashed ? 'CRASHED' : 'HEALTHY'}</td>
        </tr>
      `;
    }

    this.modalEl.innerHTML = `
      <div class="nc-card" style="max-width:480px; text-align:left;">
        <h2 class="nc-card-title" style="margin-bottom:6px; color:#0077b6; display:flex; align-items:center; gap:8px;">
          <span>⚖️</span> Load Balancer Inspector
        </h2>
        <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:12px; line-height:1.4;">
          The Hardware Load Balancer distributes incoming web requests evenly across server backends. If a server crashes, traffic automatically fails over to healthy nodes!
        </p>

        <div style="background:#0d1b2a; border-radius:6px; padding:8px 12px; margin-bottom:10px; font-size:0.8rem; display:flex; justify-content:space-between;">
          <span>Strategy: <strong style="color:#38bdf8;">Round-Robin</strong></span>
          <span>Health Check: <strong style="color:#10b981;">Active Probe (TCP/80)</strong></span>
        </div>

        <h4 style="margin:0 0 6px 0; color:#cbd5e1; font-size:0.85rem;">Backend Server Cluster</h4>
        <table style="width:100%; border-collapse:collapse; font-size:0.78rem; margin-bottom:12px; background:#0d1b2a; border-radius:6px; overflow:hidden;">
          <thead>
            <tr style="border-bottom:1px solid #415a77; color:#38bdf8; text-align:left; background:#1b263b;">
              <th style="padding:6px 8px;">Node Name</th>
              <th style="padding:6px 8px;">IP Address</th>
              <th style="padding:6px 8px;">Health Status</th>
            </tr>
          </thead>
          <tbody>
            ${backendsHtml}
          </tbody>
        </table>

        ${this._renderDevicePortsHtml(device)}

        <div class="nc-card-actions">
          <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
        </div>
      </div>
    `;

    this._bindDisconnectButtons(device);
    this.modalEl.querySelector('#nc-modal-close').onclick = () => this._closeModal();
  }

  _showBackupPowerInspector(device) {
    if (!device || !this.modalEl) return;
    this.modalEl.style.display = 'flex';

    this.modalEl.innerHTML = `
      <div class="nc-card" style="max-width:440px; text-align:left;">
        <h2 class="nc-card-title" style="margin-bottom:6px; color:#ffb703; display:flex; align-items:center; gap:8px;">
          <span>🔋</span> Backup Power UPS Inspector
        </h2>
        <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:12px; line-height:1.4;">
          The Uninterruptible Power Supply (UPS) provides emergency battery backup during municipal power cuts, preventing switches and routers from going dark.
        </p>

        <div style="background:#0d1b2a; border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:0.8rem;">
          <div style="margin-bottom:6px;">Battery State: <strong style="color:#10b981;">100% Charged</strong></div>
          <div style="margin-bottom:6px;">Runtime: <strong style="color:#ffd166;">3,600 ticks</strong></div>
          <div>Inverter Status: <strong style="color:#38bdf8;">Online & Ready</strong></div>
        </div>

        ${this._renderDevicePortsHtml(device)}

        <div class="nc-card-actions">
          <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
        </div>
      </div>
    `;

    this._bindDisconnectButtons(device);
    this.modalEl.querySelector('#nc-modal-close').onclick = () => this._closeModal();
  }

  _showDiagnosticsModal() {
    if (!this.modalEl) return;
    this.modalEl.style.display = 'flex';

    let buildingOptions = '';
    for (const b of this.sim.buildings) {
      buildingOptions += `<option value="${b.square}">[#${b.id}] ${b.name || b.type} (${b.ip || 'No IP'})</option>`;
    }

    let serverOptions = '';
    for (const s of (this.sim.servers || [])) {
      serverOptions += `<option value="${s.square}">${s.name} (${s.ip})</option>`;
    }

    this.modalEl.innerHTML = `
      <div class="nc-card" style="max-width:540px; text-align:left;">
        <h2 class="nc-card-title" style="margin-bottom:6px; color:#38bdf8; display:flex; align-items:center; gap:8px;">
          <span>🔍</span> Network Detective: Test & Trace
        </h2>
        <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:12px; line-height:1.4;">
          Troubleshooting is a method, not a guess. Follow Bit's checklist step-by-step from device outward to isolate faults!
        </p>

        <!-- Bit's Diagnostic Checklist -->
        <div style="background:#0d1b2a; border:1px solid #415a77; border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:0.8rem;">
          <h4 style="margin:0 0 6px 0; color:#cbd5e1; font-size:0.82rem;">Bit's Troubleshooting Checklist:</h4>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; color:#94a3b8; font-size:0.75rem;">
            <div>1. 🔌 Is physical cable connected?</div>
            <div>2. 🌐 Is IP address configured?</div>
            <div>3. 🧭 Is default gateway correct?</div>
            <div>4. 📖 Is DNS name resolving?</div>
            <div>5. 🚪 Is target service port open?</div>
            <div>6. 🛡️ Is zone/firewall permitted?</div>
          </div>
        </div>

        <div style="display:flex; gap:10px; margin-bottom:12px;">
          <div style="flex:1;">
            <label style="display:block; font-size:0.75rem; color:#94a3b8; margin-bottom:3px;">From Device:</label>
            <select id="nc-diag-from" style="width:100%; background:#1b263b; color:#fff; border:1px solid #415a77; border-radius:4px; padding:6px; font-size:0.78rem;">
              ${buildingOptions}
            </select>
          </div>
          <div style="flex:1;">
            <label style="display:block; font-size:0.75rem; color:#94a3b8; margin-bottom:3px;">To Server:</label>
            <select id="nc-diag-to" style="width:100%; background:#1b263b; color:#fff; border:1px solid #415a77; border-radius:4px; padding:6px; font-size:0.78rem;">
              ${serverOptions}
            </select>
          </div>
        </div>

        <div class="nc-card-actions" style="justify-content:flex-start; margin-bottom:12px; gap:8px;">
          <button class="nc-btn nc-btn-primary" id="nc-btn-run-ping">Send Test Message (Ping)</button>
          <button class="nc-btn nc-btn-secondary" id="nc-btn-run-trace">Packet Trace (Hop-by-Hop)</button>
        </div>

        <div id="nc-diag-results" style="background:#09121d; border-radius:6px; padding:10px; min-height:80px; font-family:monospace; font-size:0.78rem; color:#e2e8f0; max-height:160px; overflow-y:auto;">
          Select source and destination, then click Send Test Message or Packet Trace.
        </div>

        <div class="nc-card-actions" style="margin-top:12px;">
          <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
        </div>
      </div>
    `;

    const fromSel = this.modalEl.querySelector('#nc-diag-from');
    const toSel = this.modalEl.querySelector('#nc-diag-to');
    const resultsBox = this.modalEl.querySelector('#nc-diag-results');

    this.modalEl.querySelector('#nc-btn-run-ping').onclick = () => {
      const fromSq = parseInt(fromSel.value, 10);
      const toSq = parseInt(toSel.value, 10);
      const res = this.sim.testMessage(fromSq, toSq);
      if (res.success) {
        resultsBox.innerHTML = `
          <div style="color:#10b981; font-weight:bold; margin-bottom:4px;">✅ PING SUCCESSFUL (0% packet loss)</div>
          <div style="color:#94a3b8;">Path: ${res.hops.join(' &rarr; ')}</div>
          <div style="color:#38bdf8;">Round-trip transit confirmed. All diagnostic checks passed!</div>
        `;
      } else {
        resultsBox.innerHTML = `
          <div style="color:#ef4444; font-weight:bold; margin-bottom:4px;">❌ PING FAILED</div>
          <div style="color:#ffd166;">Diagnosis: <strong>${res.failureReason}</strong></div>
          <div style="color:#94a3b8;">Packet stopped at square ${res.hops[res.hops.length - 1] || fromSq}.</div>
          <div style="color:#cbd5e1; margin-top:4px;">Recommendation: Check ${res.failureReason === 'no_wire' ? 'physical cable' : (res.failureReason === 'no_gateway' ? 'default gateway' : (res.failureReason === 'wrong_zone' ? 'port zone VLAN alignment' : 'network configuration'))}.</div>
        `;
      }
    };

    this.modalEl.querySelector('#nc-btn-run-trace').onclick = () => {
      const fromSq = parseInt(fromSel.value, 10);
      const toSq = parseInt(toSel.value, 10);
      const res = this.sim.traceRoute(fromSq, toSq);
      let traceHtml = `<div style="font-weight:bold; margin-bottom:6px; color:#38bdf8;">Hop-by-Hop Packet Trace:</div>`;
      if (res.detailedHops) {
        res.detailedHops.forEach((h, idx) => {
          traceHtml += `<div>Hop ${idx + 1}: Square ${h.square} [${h.type.toUpperCase()}: ${h.name}] &middot; <span style="color:#10b981;">OK</span></div>`;
        });
      }
      if (!res.success) {
        traceHtml += `<div style="color:#ef4444; font-weight:bold; margin-top:4px;">&times; Dropped at hop: ${res.failureReason}</div>`;
      } else {
        traceHtml += `<div style="color:#10b981; font-weight:bold; margin-top:4px;">&check; Trace complete (Destination reached).</div>`;
      }
      resultsBox.innerHTML = traceHtml;
    };

    this.modalEl.querySelector('#nc-modal-close').onclick = () => this._closeModal();
  }

  _showDhcpInspector(device) {
    if (!device || !this.modalEl) return;
    this.modalEl.style.display = 'flex';

    let leasesRows = '';
    if (device.leases && device.leases.size > 0) {
      for (const [mac, ip] of device.leases.entries()) {
        leasesRows += `
          <tr style="border-bottom:1px solid #334155;">
            <td style="padding:5px 8px; font-family:monospace; color:#ffd166;">${mac}</td>
            <td style="padding:5px 8px; font-family:monospace; color:#34d399;">${ip}</td>
            <td style="padding:5px 8px; color:#94a3b8;">Active</td>
          </tr>
        `;
      }
    } else {
      leasesRows = `
        <tr>
          <td colspan="3" style="text-align:center; padding:12px; color:#94a3b8; font-style:italic;">
            No active leases yet. As computers connect, DHCP assigns them IPs automatically!
          </td>
        </tr>
      `;
    }

    const hasWire = Boolean(device.uplinkWireId);
    const wire = hasWire ? this.sim.wires.get(device.uplinkWireId) : null;
    const wireCost = wire ? wire.cost : 0;

    this.modalEl.innerHTML = `
      <div class="nc-card" style="max-width:480px; text-align:left;">
        <h2 class="nc-card-title" style="margin-bottom:6px; color:#10b981; display:flex; align-items:center; gap:8px;">
          <span>📋</span> DHCP Server Inspector
        </h2>
        <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:12px; line-height:1.4;">
          The DHCP server automatically hands out IP addresses and default gateways to computers as they open!
        </p>

        <div style="background:#0d1b2a; border-radius:6px; padding:8px 12px; margin-bottom:10px; font-size:0.8rem; display:flex; justify-content:space-between;">
          <span>IP Pool: <strong style="color:#38bdf8;">192.168.1.100 - .200</strong></span>
          <span>Gateway: <strong style="color:#ffd166;">192.168.1.1</strong></span>
        </div>

        <h4 style="margin:0 0 6px 0; color:#cbd5e1; font-size:0.85rem;">Active Leases Table</h4>
        <table style="width:100%; border-collapse:collapse; font-size:0.78rem; margin-bottom:12px; background:#0d1b2a; border-radius:6px; overflow:hidden;">
          <thead>
            <tr style="border-bottom:1px solid #415a77; color:#38bdf8; text-align:left; background:#1b263b;">
              <th style="padding:6px 8px;">Client MAC</th>
              <th style="padding:6px 8px;">Leased IP</th>
              <th style="padding:6px 8px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${leasesRows}
          </tbody>
        </table>

        <!-- 4-Port Physical Panel with Individual Disconnect -->
        ${this._renderDevicePortsHtml(device)}

        <div class="nc-card-actions" style="justify-content:space-between;">
          ${hasWire ? `<button class="nc-btn nc-btn-danger" id="nc-btn-disconnect" style="padding:6px 12px; font-size:0.8rem;">Disconnect Uplink (+$${wireCost})</button>` : '<span></span>'}
          <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
        </div>
      </div>
    `;

    this._bindDisconnectButtons(device);

    if (hasWire) {
      this.modalEl.querySelector('#nc-btn-disconnect').onclick = () => {
        this.sim.removeWireById(device.uplinkWireId);
        this._updateCoinsDisplay();
        this._setHint('Disconnected uplink wire from DHCP server.');
        this._closeModal();
      };
    }
    this.modalEl.querySelector('#nc-modal-close').onclick = () => this._closeModal();
  }

  _showDnsInspector(device) {
    if (!device || !this.modalEl) return;
    this.modalEl.style.display = 'flex';

    const hasWire = Boolean(device.uplinkWireId);
    const wire = hasWire ? this.sim.wires.get(device.uplinkWireId) : null;
    const wireCost = wire ? wire.cost : 0;

    this.modalEl.innerHTML = `
      <div class="nc-card" style="max-width:480px; text-align:left;">
        <h2 class="nc-card-title" style="margin-bottom:6px; color:#8b5cf6; display:flex; align-items:center; gap:8px;">
          <span>📖</span> DNS Server Inspector
        </h2>
        <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:12px; line-height:1.4;">
          The Domain Name System translates human-friendly names (e.g. <code>school.net</code>) into numerical IP addresses.
        </p>

        <h4 style="margin:0 0 6px 0; color:#cbd5e1; font-size:0.85rem;">Zone Records Table</h4>
        <table style="width:100%; border-collapse:collapse; font-size:0.78rem; margin-bottom:12px; background:#0d1b2a; border-radius:6px; overflow:hidden;">
          <thead>
            <tr style="border-bottom:1px solid #415a77; color:#a78bfa; text-align:left; background:#1b263b;">
              <th style="padding:6px 8px;">Domain Name</th>
              <th style="padding:6px 8px;">Type</th>
              <th style="padding:6px 8px;">Target IP</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #334155;">
              <td style="padding:5px 8px; font-weight:600; color:#ffffff;">school.net</td>
              <td style="padding:5px 8px; color:#38bdf8;">A</td>
              <td style="padding:5px 8px; font-family:monospace; color:#ffd166;">192.168.2.50</td>
            </tr>
            <tr style="border-bottom:1px solid #334155;">
              <td style="padding:5px 8px; font-weight:600; color:#ffffff;">mail.school.net</td>
              <td style="padding:5px 8px; color:#38bdf8;">MX</td>
              <td style="padding:5px 8px; font-family:monospace; color:#ffd166;">192.168.2.55</td>
            </tr>
            <tr>
              <td style="padding:5px 8px; font-weight:600; color:#ffffff;">web.town</td>
              <td style="padding:5px 8px; color:#38bdf8;">A</td>
              <td style="padding:5px 8px; font-family:monospace; color:#ffd166;">192.168.2.60</td>
            </tr>
          </tbody>
        </table>

        <!-- 4-Port Physical Panel with Individual Disconnect -->
        ${this._renderDevicePortsHtml(device)}

        <div class="nc-card-actions" style="justify-content:space-between;">
          ${hasWire ? `<button class="nc-btn nc-btn-danger" id="nc-btn-disconnect" style="padding:6px 12px; font-size:0.8rem;">Disconnect Uplink (+$${wireCost})</button>` : '<span></span>'}
          <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
        </div>
      </div>
    `;

    this._bindDisconnectButtons(device);

    if (hasWire) {
      this.modalEl.querySelector('#nc-btn-disconnect').onclick = () => {
        this.sim.removeWireById(device.uplinkWireId);
        this._updateCoinsDisplay();
        this._setHint('Disconnected uplink wire from DNS server.');
        this._closeModal();
      };
    }
    this.modalEl.querySelector('#nc-modal-close').onclick = () => this._closeModal();
  }

  _showWebServerInspector(device) {
    if (!device || !this.modalEl) return;
    this.modalEl.style.display = 'flex';

    const hasWire = Boolean(device.uplinkWireId);
    const wire = hasWire ? this.sim.wires.get(device.uplinkWireId) : null;
    const wireCost = wire ? wire.cost : 0;

    this.modalEl.innerHTML = `
      <div class="nc-card" style="max-width:440px; text-align:left;">
        <h2 class="nc-card-title" style="margin-bottom:6px; color:#0284c7; display:flex; align-items:center; gap:8px;">
          <span>🌐</span> Web Server Inspector
        </h2>
        <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:12px; line-height:1.4;">
          Hosts web pages and serves HTTP requests. Generates reply packets back to requesting clients!
        </p>

        <div style="background:#0d1b2a; border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:0.8rem;">
          <div style="margin-bottom:6px;">Hostname: <strong style="color:#38bdf8;">school.net</strong></div>
          <div style="margin-bottom:6px;">IP Address: <code style="color:#ffd166;">192.168.2.50</code></div>
          <div>Open Ports: <span style="background:#1e293b; color:#34d399; padding:2px 6px; border-radius:4px; font-family:monospace;">Port 80 (HTTP)</span></div>
        </div>

        <!-- 4-Port Physical Panel with Individual Disconnect -->
        ${this._renderDevicePortsHtml(device)}

        <div class="nc-card-actions" style="justify-content:space-between;">
          ${hasWire ? `<button class="nc-btn nc-btn-danger" id="nc-btn-disconnect" style="padding:6px 12px; font-size:0.8rem;">Disconnect Uplink (+$${wireCost})</button>` : '<span></span>'}
          <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
        </div>
      </div>
    `;

    this._bindDisconnectButtons(device);

    if (hasWire) {
      this.modalEl.querySelector('#nc-btn-disconnect').onclick = () => {
        this.sim.removeWireById(device.uplinkWireId);
        this._updateCoinsDisplay();
        this._setHint('Disconnected uplink wire from Web server.');
        this._closeModal();
      };
    }
    this.modalEl.querySelector('#nc-modal-close').onclick = () => this._closeModal();
  }

  _showEmailServerInspector(device) {
    if (!device || !this.modalEl) return;
    this.modalEl.style.display = 'flex';

    const hasWire = Boolean(device.uplinkWireId);
    const wire = hasWire ? this.sim.wires.get(device.uplinkWireId) : null;
    const wireCost = wire ? wire.cost : 0;

    this.modalEl.innerHTML = `
      <div class="nc-card" style="max-width:440px; text-align:left;">
        <h2 class="nc-card-title" style="margin-bottom:6px; color:#f59e0b; display:flex; align-items:center; gap:8px;">
          <span>✉️</span> Email Server Inspector
        </h2>
        <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:12px; line-height:1.4;">
          Store-and-forward depot for electronic messages between school branches.
        </p>

        <div style="background:#0d1b2a; border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:0.8rem;">
          <div style="margin-bottom:6px;">Hostname: <strong style="color:#38bdf8;">mail.school.net</strong></div>
          <div style="margin-bottom:6px;">IP Address: <code style="color:#ffd166;">192.168.2.55</code></div>
          <div>Open Ports: <span style="background:#1e293b; color:#34d399; padding:2px 6px; border-radius:4px; font-family:monospace;">Port 25 (SMTP)</span></div>
        </div>

        <!-- 4-Port Physical Panel with Individual Disconnect -->
        ${this._renderDevicePortsHtml(device)}

        <div class="nc-card-actions" style="justify-content:space-between;">
          ${hasWire ? `<button class="nc-btn nc-btn-danger" id="nc-btn-disconnect" style="padding:6px 12px; font-size:0.8rem;">Disconnect Uplink (+$${wireCost})</button>` : '<span></span>'}
          <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
        </div>
      </div>
    `;

    this._bindDisconnectButtons(device);

    if (hasWire) {
      this.modalEl.querySelector('#nc-btn-disconnect').onclick = () => {
        this.sim.removeWireById(device.uplinkWireId);
        this._updateCoinsDisplay();
        this._setHint('Disconnected uplink wire from Email server.');
        this._closeModal();
      };
    }
    this.modalEl.querySelector('#nc-modal-close').onclick = () => this._closeModal();
  }

  _showDeviceInspector(device) {
    if (!device || !this.modalEl) return;
    this.modalEl.style.display = 'flex';

    const spec = DEVICE_CATALOG[device.type] || { name: 'Device', icon: '📦' };
    const hasWire = Boolean(device.uplinkWireId);
    const wire = hasWire ? this.sim.wires.get(device.uplinkWireId) : null;
    const wireCost = wire ? wire.cost : 0;

    this.modalEl.innerHTML = `
      <div class="nc-card" style="max-width:440px; text-align:left;">
        <h2 class="nc-card-title" style="margin-bottom:6px; color:#38bdf8; display:flex; align-items:center; gap:8px;">
          <span>${spec.icon}</span> ${spec.name} Inspector
        </h2>
        <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:12px; line-height:1.4;">
          ${spec.concept || 'Network distribution hardware.'}
        </p>

        <div style="background:#0d1b2a; border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:0.8rem;">
          <div style="margin-bottom:6px;">Type: <strong style="color:#ffffff;">${spec.name}</strong></div>
          <div style="margin-bottom:6px;">Capacity: <strong style="color:#38bdf8;">${device.ports || 4} ports</strong></div>
          <div>Uplink Status: <strong style="color:${hasWire ? '#10b981' : '#f59e0b'};">${hasWire ? 'Connected' : 'Unwired'}</strong></div>
        </div>

        <!-- 4-Port Physical Panel with Individual Disconnect -->
        ${this._renderDevicePortsHtml(device)}

        <div class="nc-card-actions" style="justify-content:space-between;">
          ${hasWire ? `<button class="nc-btn nc-btn-danger" id="nc-btn-disconnect" style="padding:6px 12px; font-size:0.8rem;">Disconnect Uplink (+$${wireCost})</button>` : '<span></span>'}
          <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
        </div>
      </div>
    `;

    this._bindDisconnectButtons(device);

    if (hasWire) {
      this.modalEl.querySelector('#nc-btn-disconnect').onclick = () => {
        this.sim.removeWireById(device.uplinkWireId);
        this._updateCoinsDisplay();
        this._setHint(`Disconnected uplink wire from ${spec.name}.`);
        this._closeModal();
      };
    }
    this.modalEl.querySelector('#nc-modal-close').onclick = () => this._closeModal();
  }

  _showServerInspector(server) {
    if (!server || !this.modalEl) return;
    this.modalEl.style.display = 'flex';

    this.modalEl.innerHTML = `
      <div class="nc-card" style="max-width:440px; text-align:left;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
          <span style="font-size:1.8rem;">${server.icon || '🖥️'}</span>
          <div>
            <h2 class="nc-card-title" style="font-size:1.2rem; color:${server.color || '#2ec4b6'};">${server.name || 'Central Server'}</h2>
            <div style="font-size:0.78rem; color:#94a3b8;">MAC: <code style="color:#ffd166;">${server.mac || '00:FE'}</code></div>
          </div>
        </div>

        <div style="background:#0d1b2a; border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:0.8rem;">
          <div style="margin-bottom:6px;">Hostname: <strong style="color:#38bdf8;">${server.hostname || 'server.school.net'}</strong></div>
          <div style="margin-bottom:6px;">IP Address: <code style="color:#ffd166;">${server.ip || '192.168.2.50'}</code></div>
          <div>Open Services: <span style="background:#1e293b; color:#34d399; padding:2px 6px; border-radius:4px; font-family:monospace;">Ports: ${(server.portsOpen || [80]).join(', ')}</span></div>
        </div>

        <!-- 4-Port Physical Panel for Central Server -->
        ${this._renderDevicePortsHtml(server)}

        <div class="nc-card-actions">
          <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
        </div>
      </div>
    `;

    this._bindDisconnectButtons(server);

    this.modalEl.querySelector('#nc-modal-close').onclick = () => this._closeModal();
  }

  _closeModal() {
    if (this.modalEl) {
      this.modalEl.style.display = 'none';
      this.modalEl.innerHTML = '';
    }
  }

  destroy() {
    this.isDestroyed = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    this._removeAllListeners();
    if (this.container) this.container.innerHTML = '';
  }
}
