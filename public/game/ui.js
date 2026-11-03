import { LEVELS, CABLE_TYPES, REFUSAL_MESSAGES, getLevelById } from './levels.js';
import { generateLevel, GRID_WIDTH, GRID_HEIGHT } from './generate.js';
import { Simulation } from './sim.js';

export class GameUI {
  constructor(container, host, options = {}) {
    this.container = container;
    this.host = host;
    this.options = options;

    this.currentLevel = options.initialLevel || '1.1';
    this.currentSeed = options.initialSeed || this._randomSeed();
    this.activeTool = 'copper';

    this.sim = null;
    this.mapData = null;

    // Drag state
    this.isDragging = false;
    this.dragBuildingId = null;
    this.dragPath = [];
    this.dragValidity = { valid: true, message: '' };
    this.dragMousePos = { x: 0, y: 0 };
    this.isClickCandidate = false;

    // Canvas & sizing
    this.squareSize = 40;
    this.canvasWidth = GRID_WIDTH * this.squareSize;
    this.canvasHeight = GRID_HEIGHT * this.squareSize;

    // Simulation loop & timers
    this.rafId = null;
    this.lastTime = 0;
    this.tickAccumulator = 0;
    this.winTimeoutId = null;
    this.hintTimeoutId = null;
    this.isDestroyed = false;

    // Event listener tracking for leak-free cleanup
    this._listeners = [];

    this._initDOM();
    this._loadLevel(this.currentLevel, this.currentSeed);
    this._bindEvents();
    this._startLoop();
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

  _initDOM() {
    this.container.innerHTML = `
      <div class="nc-game-root">
        <header class="nc-topbar">
          <div class="nc-topbar-left">
            <span class="nc-topbar-title" id="nc-title"></span>
            <div class="nc-topbar-budget">
              <span class="nc-budget-label">Money:</span>
              <span class="nc-budget-value" id="nc-budget-display">0 / 0</span>
            </div>
          </div>
          <div class="nc-topbar-center">
            <button class="nc-tool-btn nc-active-copper" id="nc-btn-copper" title="Shortcut: 1">
              <span class="nc-tool-swatch" style="background:#e8903a;"></span>
              Copper ($1)
            </button>
            <button class="nc-tool-btn" id="nc-btn-fiber" title="Shortcut: 2">
              <span class="nc-tool-swatch" style="background:#4cc9f0;"></span>
              Fiber ($3)
            </button>
          </div>
          <div class="nc-topbar-right">
            <button class="nc-action-btn" id="nc-btn-reset">Reset</button>
            <button class="nc-action-btn" id="nc-btn-new-layout">New layout</button>
            <button class="nc-action-btn" id="nc-btn-levels">Levels</button>
            <button class="nc-action-btn nc-exit-btn" id="nc-btn-exit" title="Shortcut: Escape">Exit</button>
          </div>
        </header>

        <main class="nc-canvas-wrapper" id="nc-canvas-wrapper">
          <canvas class="nc-canvas" id="nc-canvas"></canvas>
          <div class="nc-drag-tooltip" id="nc-drag-tooltip" style="display: none;"></div>
          <div class="nc-modal-overlay" id="nc-modal-container" style="display: none;"></div>
        </main>

        <footer class="nc-hint-bar" id="nc-hint-bar"></footer>
      </div>
    `;

    this.canvasWrapper = this.container.querySelector('#nc-canvas-wrapper');
    this.canvas = this.container.querySelector('#nc-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.titleEl = this.container.querySelector('#nc-title');
    this.budgetEl = this.container.querySelector('#nc-budget-display');
    this.hintBarEl = this.container.querySelector('#nc-hint-bar');
    this.tooltipEl = this.container.querySelector('#nc-drag-tooltip');
    this.modalEl = this.container.querySelector('#nc-modal-container');

    this.btnCopper = this.container.querySelector('#nc-btn-copper');
    this.btnFiber = this.container.querySelector('#nc-btn-fiber');
    this.btnReset = this.container.querySelector('#nc-btn-reset');
    this.btnNewLayout = this.container.querySelector('#nc-btn-new-layout');
    this.btnLevels = this.container.querySelector('#nc-btn-levels');
    this.btnExit = this.container.querySelector('#nc-btn-exit');

    this._updateCanvasSize();
  }

  _updateCanvasSize() {
    if (!this.canvasWrapper) return;
    const availW = this.canvasWrapper.clientWidth || 800;
    const availH = this.canvasWrapper.clientHeight || 500;

    // Largest whole number square size fitting the available window/container
    this.squareSize = Math.max(16, Math.floor(Math.min((availW - 16) / GRID_WIDTH, (availH - 16) / GRID_HEIGHT)));
    this.canvasWidth = GRID_WIDTH * this.squareSize;
    this.canvasHeight = GRID_HEIGHT * this.squareSize;

    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    this.canvas.style.width = `${this.canvasWidth}px`;
    this.canvas.style.height = `${this.canvasHeight}px`;
  }

  _loadLevel(levelId, seed) {
    if (this.winTimeoutId) {
      clearTimeout(this.winTimeoutId);
      this.winTimeoutId = null;
    }
    this._closeModal();

    this.currentLevel = levelId;
    this.currentSeed = seed;

    const levelDef = getLevelById(levelId);
    this.mapData = generateLevel(levelId, seed);
    this.sim = new Simulation(this.mapData);

    // Active tool defaults to copper, fiber disabled if not allowed
    this.activeTool = 'copper';
    this.btnFiber.disabled = !this.mapData.cablesAllowed.includes('fiber');
    this._updateToolButtons();

    this.titleEl.textContent = levelDef.title;
    this._setHint(levelDef.hint);
    this._updateBudgetDisplay();
  }

  _updateToolButtons() {
    this.btnCopper.classList.toggle('nc-active-copper', this.activeTool === 'copper');
    this.btnFiber.classList.toggle('nc-active-fiber', this.activeTool === 'fiber');
  }

  _setHint(text, isAlert = false) {
    if (!this.hintBarEl) return;
    this.hintBarEl.textContent = text;
    this.hintBarEl.classList.toggle('nc-hint-alert', isAlert);

    if (this.hintTimeoutId) {
      clearTimeout(this.hintTimeoutId);
      this.hintTimeoutId = null;
    }

    if (isAlert) {
      this.hintTimeoutId = setTimeout(() => {
        if (!this.isDestroyed) {
          const levelDef = getLevelById(this.currentLevel);
          this._setHint(levelDef ? levelDef.hint : '', false);
        }
      }, 3000);
    }
  }

  _updateBudgetDisplay() {
    if (!this.budgetEl || !this.sim) return;
    this.budgetEl.textContent = `${this.sim.moneySpent} / ${this.sim.mapData.budget}`;
  }

  _bindEvents() {
    // Tool buttons
    this._addListener(this.btnCopper, 'click', () => {
      this.activeTool = 'copper';
      this._updateToolButtons();
    });

    this._addListener(this.btnFiber, 'click', () => {
      if (this.mapData && this.mapData.cablesAllowed.includes('fiber')) {
        this.activeTool = 'fiber';
        this._updateToolButtons();
      }
    });

    // Reset button
    this._addListener(this.btnReset, 'click', () => {
      if (this.sim) {
        this.sim.reset();
        this._updateBudgetDisplay();
        const levelDef = getLevelById(this.currentLevel);
        this._setHint(levelDef.hint);
        this._closeModal();
      }
    });

    // New layout button
    this._addListener(this.btnNewLayout, 'click', () => {
      this._loadLevel(this.currentLevel, this._randomSeed());
    });

    // Levels button
    this._addListener(this.btnLevels, 'click', () => {
      this._showLevelSelectModal();
    });

    // Exit button
    this._addListener(this.btnExit, 'click', () => {
      this._handleExit();
    });

    // Keyboard shortcuts: 1, 2, Escape
    const onKeyDown = (e) => {
      if (e.key === '1') {
        this.activeTool = 'copper';
        this._updateToolButtons();
      } else if (e.key === '2') {
        if (this.mapData && this.mapData.cablesAllowed.includes('fiber')) {
          this.activeTool = 'fiber';
          this._updateToolButtons();
        }
      } else if (e.key === 'Escape') {
        if (this.modalEl && this.modalEl.style.display !== 'none') {
          this._closeModal();
        } else {
          this._handleExit();
        }
      }
    };
    this._addListener(window, 'keydown', onKeyDown);

    // Resize event
    const onResize = () => {
      this._updateCanvasSize();
    };
    this._addListener(window, 'resize', onResize);

    // Canvas Pointer events
    const getGridPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / this.squareSize);
      const y = Math.floor((e.clientY - rect.top) / this.squareSize);
      return { x, y, square: y * GRID_WIDTH + x };
    };

    const onPointerDown = (e) => {
      if (e.button !== 0 || !this.sim) return;
      const { x, y, square } = getGridPos(e);
      if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return;

      const building = this.sim.getBuildingAt(square);
      if (building) {
        if (building.cable) {
          // Tapping a connected building removes its cable and refunds the cost
          this.sim.removeCable(building.id);
          this._updateBudgetDisplay();
          return;
        }

        // Start dragging new cable
        this.isDragging = true;
        this.dragBuildingId = building.id;
        this.dragPath = [square];
        this.dragValidity = { valid: true, message: '' };
        this._updateDragTooltip(e.clientX, e.clientY);
      }
    };

    const onPointerMove = (e) => {
      if (!this.isDragging || !this.sim) return;
      const { x, y, square } = getGridPos(e);
      this._updateDragTooltip(e.clientX, e.clientY);

      if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return;

      const path = this.dragPath;
      const lastSquare = path[path.length - 1];

      if (square === lastSquare) return;

      // Check if backtracking (dragged back over previous square)
      if (path.length > 1 && square === path[path.length - 2]) {
        path.pop();
        this._checkDragValidity();
        return;
      }

      // Cable cannot continue past the server
      if (lastSquare === this.sim.server) {
        return;
      }

      // Must be adjacent (up, down, left, right)
      const lx = lastSquare % GRID_WIDTH;
      const ly = Math.floor(lastSquare / GRID_WIDTH);
      const dx = Math.abs(x - lx);
      const dy = Math.abs(y - ly);
      if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
        // Cannot enter a square it already uses
        if (path.includes(square)) return;

        // Cannot pass through walls or other buildings (except target server)
        if (square !== this.sim.server) {
          if (this.sim.walls.has(square) || this.sim.buildings.some(b => b.square === square)) {
            this._setHint(REFUSAL_MESSAGES.wallOrBuilding, true);
            return;
          }
        }

        path.push(square);
        this._checkDragValidity();
      }
    };

    const onPointerUp = (e) => {
      if (!this.isDragging || !this.sim) return;
      this.isDragging = false;
      this.tooltipEl.style.display = 'none';

      const path = this.dragPath;
      const lastSquare = path[path.length - 1];

      if (lastSquare === this.sim.server) {
        const result = this.sim.connectCable(this.dragBuildingId, path, this.activeTool);
        if (result.success) {
          this._updateBudgetDisplay();
          const levelDef = getLevelById(this.currentLevel);
          this._setHint(levelDef.hint);
        } else {
          this._setHint(result.message, true);
        }
      } else {
        this._setHint(REFUSAL_MESSAGES.releasedAwayFromServer, true);
      }

      this.dragPath = [];
      this.dragBuildingId = null;
    };

    this._addListener(this.canvas, 'pointerdown', onPointerDown);
    this._addListener(window, 'pointermove', onPointerMove);
    this._addListener(window, 'pointerup', onPointerUp);
    this._addListener(this.canvas, 'contextmenu', (e) => e.preventDefault());
  }

  _checkDragValidity() {
    if (!this.sim || this.dragPath.length < 1) return;
    const cableConfig = CABLE_TYPES[this.activeTool];
    const length = this.dragPath.length - 1;
    const cost = length * cableConfig.costPerSquare;

    const remainingBudget = this.sim.mapData.budget - this.sim.moneySpent;

    let valid = true;
    let message = '';

    if (length > cableConfig.maxLength) {
      valid = false;
      message = this.activeTool === 'copper' ? REFUSAL_MESSAGES.copperLonger : REFUSAL_MESSAGES.fiberLonger;
    } else if (cost > remainingBudget) {
      valid = false;
      message = REFUSAL_MESSAGES.notEnoughBudget;
    }

    this.dragValidity = { valid, message, length, cost, max: cableConfig.maxLength, remainingBudget };
  }

  _updateDragTooltip(clientX, clientY) {
    if (!this.isDragging || !this.tooltipEl) return;
    const rect = this.canvasWrapper.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    this.tooltipEl.style.display = 'block';
    this.tooltipEl.style.left = `${x}px`;
    this.tooltipEl.style.top = `${y}px`;

    const { valid, message, length, cost, max, remainingBudget } = this.dragValidity;
    const toolName = CABLE_TYPES[this.activeTool].name;

    if (!valid) {
      this.tooltipEl.className = 'nc-drag-tooltip nc-invalid';
      this.tooltipEl.textContent = message;
    } else {
      this.tooltipEl.className = 'nc-drag-tooltip';
      this.tooltipEl.textContent = `${toolName} | Len: ${length || 0}/${max || 10} | Cost: $${cost || 0} (Left: $${remainingBudget !== undefined ? remainingBudget : ''})`;
    }
  }

  _startLoop() {
    this.lastTime = performance.now();
    this.tickAccumulator = 0;

    const frame = (time) => {
      if (this.isDestroyed) return;

      const dt = time - this.lastTime;
      this.lastTime = time;

      // Run simulation at 20 ticks per second (50ms per tick)
      if (this.sim && !this.sim.isWon) {
        this.tickAccumulator += dt;
        while (this.tickAccumulator >= 50) {
          this.sim.tick();
          this.tickAccumulator -= 50;
          if (this.sim.isWon) {
            this._handleWin();
            break;
          }
        }
      }

      this._render();
      this.rafId = requestAnimationFrame(frame);
    };

    this.rafId = requestAnimationFrame(frame);
  }

  _handleWin() {
    this._updateBudgetDisplay();

    // Record progress with host adapter
    this.host.recordLevelComplete(this.currentLevel, this.sim.stars, this.sim.moneySpent);

    // Show level complete card about one second later (section 12.2)
    this.winTimeoutId = setTimeout(() => {
      if (!this.isDestroyed && this.sim && this.sim.isWon) {
        this._showLevelCompleteModal();
      }
    }, 1000);
  }

  _render() {
    if (!this.ctx || !this.sim) return;
    const ctx = this.ctx;
    const sz = this.squareSize;

    // 1. Background
    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Subtle grid lines
    ctx.strokeStyle = '#152438';
    ctx.lineWidth = 1;
    for (let x = 0; x <= GRID_WIDTH; x++) {
      ctx.beginPath();
      ctx.moveTo(x * sz, 0);
      ctx.lineTo(x * sz, this.canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= GRID_HEIGHT; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * sz);
      ctx.lineTo(this.canvasWidth, y * sz);
      ctx.stroke();
    }

    // 2. Walls (#3b4d63)
    ctx.fillStyle = '#3b4d63';
    for (const wallSq of this.sim.walls) {
      const wx = (wallSq % GRID_WIDTH) * sz;
      const wy = Math.floor(wallSq / GRID_WIDTH) * sz;
      ctx.fillRect(wx + 1, wy + 1, sz - 2, sz - 2);
    }

    // 3. Connected cables
    for (const b of this.sim.buildings) {
      if (b.cable && b.cable.path) {
        this._drawCablePath(ctx, b.cable.path, b.cable.cableType === 'fiber' ? '#4cc9f0' : '#e8903a', sz);
      }
    }

    // 4. Dragging cable preview
    if (this.isDragging && this.dragPath.length > 1) {
      let previewColor = this.activeTool === 'fiber' ? '#4cc9f0' : '#e8903a';
      if (!this.dragValidity.valid) {
        previewColor = '#ff5d73'; // refusal red
      }
      this._drawCablePath(ctx, this.dragPath, previewColor, sz, true);
    }

    // 5. In-flight messages (small white dots traveling along cable from building to server)
    for (const msg of this.sim.inFlightMessages) {
      const progress = (this.sim.tickNumber - msg.startTick) / Math.max(1, msg.arrivalTick - msg.startTick);
      const clamped = Math.max(0, Math.min(1, progress));
      const pos = this._getPathPoint(msg.path, clamped, sz);

      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, Math.max(3, sz * 0.12), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 6. Server (#2ec4b6 with 🖥️)
    const sx = (this.sim.server % GRID_WIDTH) * sz;
    const sy = Math.floor(this.sim.server / GRID_WIDTH) * sz;
    ctx.fillStyle = '#2ec4b6';
    ctx.fillRect(sx + 2, sy + 2, sz - 4, sz - 4);
    ctx.font = `${Math.floor(sz * 0.65)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🖥️', sx + sz / 2, sy + sz / 2);

    // 7. Buildings (🏠 emoji)
    for (const b of this.sim.buildings) {
      const bx = (b.square % GRID_WIDTH) * sz;
      const by = Math.floor(b.square / GRID_WIDTH) * sz;

      ctx.font = `${Math.floor(sz * 0.7)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏠', bx + sz / 2, by + sz / 2);

      // Warning marker if building has no cable and sent lost messages
      if (b.warning) {
        ctx.font = `${Math.floor(sz * 0.4)}px sans-serif`;
        ctx.fillText('⚠️', bx + sz - 6, by + 8);
      }
    }
  }

  _drawCablePath(ctx, path, color, sz, isDashed = false) {
    if (path.length < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(3, Math.floor(sz * 0.18));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (isDashed) {
      ctx.setLineDash([sz * 0.2, sz * 0.15]);
    }

    ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
      const sq = path[i];
      const cx = (sq % GRID_WIDTH) * sz + sz / 2;
      const cy = Math.floor(sq / GRID_WIDTH) * sz + sz / 2;
      if (i === 0) {
        ctx.moveTo(cx, cy);
      } else {
        ctx.lineTo(cx, cy);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  _getPathPoint(path, progress, sz) {
    if (path.length === 1) {
      const sq = path[0];
      return { x: (sq % GRID_WIDTH) * sz + sz / 2, y: Math.floor(sq / GRID_WIDTH) * sz + sz / 2 };
    }

    const totalSegments = path.length - 1;
    const segIndex = Math.min(Math.floor(progress * totalSegments), totalSegments - 1);
    const segT = (progress * totalSegments) - segIndex;

    const sqA = path[segIndex];
    const sqB = path[segIndex + 1];

    const ax = (sqA % GRID_WIDTH) * sz + sz / 2;
    const ay = Math.floor(sqA / GRID_WIDTH) * sz + sz / 2;
    const bx = (sqB % GRID_WIDTH) * sz + sz / 2;
    const by = Math.floor(sqB / GRID_WIDTH) * sz + sz / 2;

    return {
      x: ax + (bx - ax) * segT,
      y: ay + (by - ay) * segT
    };
  }

  _showLevelCompleteModal() {
    const levelDef = getLevelById(this.currentLevel);
    const starsStr = '⭐'.repeat(this.sim.stars);

    this.modalEl.style.display = 'flex';
    this.modalEl.innerHTML = `
      <div class="nc-card">
        <h2 class="nc-card-title">Level Complete!</h2>
        <div class="nc-card-stars">${starsStr}</div>
        <div class="nc-card-stat">Cost: $${this.sim.moneySpent} &nbsp;|&nbsp; Par: $${this.mapData.par}</div>
        <div class="nc-card-sentence">${levelDef.winSentence}</div>
        <div class="nc-card-actions">
          <button class="nc-btn nc-btn-primary" id="nc-card-next">Next level</button>
          <button class="nc-btn nc-btn-secondary" id="nc-card-again">Play again</button>
          <button class="nc-btn nc-btn-secondary" id="nc-card-levels">Levels</button>
        </div>
      </div>
    `;

    const nextBtn = this.modalEl.querySelector('#nc-card-next');
    const againBtn = this.modalEl.querySelector('#nc-card-again');
    const levelsBtn = this.modalEl.querySelector('#nc-card-levels');

    nextBtn.onclick = () => {
      const nextLevel = this._getNextLevelId(this.currentLevel);
      this._loadLevel(nextLevel, this._randomSeed());
    };

    againBtn.onclick = () => {
      this.sim.reset();
      this._updateBudgetDisplay();
      this._setHint(levelDef.hint);
      this._closeModal();
    };

    levelsBtn.onclick = () => {
      this._showLevelSelectModal();
    };
  }

  _getNextLevelId(currentId) {
    const idx = LEVELS.findIndex(l => l.id === currentId);
    if (idx >= 0 && idx < LEVELS.length - 1) {
      return LEVELS[idx + 1].id;
    }
    return LEVELS[LEVELS.length - 1].id;
  }

  _showLevelSelectModal() {
    const progress = this.host.loadProgress() || { levels: {} };
    const levelsProgress = progress.levels || {};

    let gridHtml = '';
    for (let i = 0; i < LEVELS.length; i++) {
      const lvl = LEVELS[i];
      // A level is unlocked when previous level finished with at least 1 star (1.1 always unlocked)
      let isUnlocked = false;
      if (i === 0) {
        isUnlocked = true;
      } else {
        const prevId = LEVELS[i - 1].id;
        isUnlocked = !!(levelsProgress[prevId] && levelsProgress[prevId].stars >= 1);
      }

      const p = levelsProgress[lvl.id];
      const starsDisplay = p && p.stars ? '⭐'.repeat(p.stars) : (isUnlocked ? 'Not completed' : '🔒 Locked');

      gridHtml += `
        <div class="nc-level-card ${isUnlocked ? '' : 'nc-level-locked'}" data-level-id="${lvl.id}">
          <div class="nc-level-card-id">${lvl.id}</div>
          <div class="nc-level-card-name">${lvl.title.replace(lvl.id + ' ', '')}</div>
          <div class="nc-level-card-stars">${starsDisplay}</div>
        </div>
      `;
    }

    this.modalEl.style.display = 'flex';
    this.modalEl.innerHTML = `
      <div class="nc-card" style="max-width: 520px;">
        <h2 class="nc-card-title">Select Level</h2>
        <div class="nc-levels-grid">${gridHtml}</div>
        <div class="nc-card-actions">
          <button class="nc-btn nc-btn-secondary" id="nc-select-close">Close</button>
        </div>
      </div>
    `;

    const cards = this.modalEl.querySelectorAll('.nc-level-card:not(.nc-level-locked)');
    cards.forEach(card => {
      card.onclick = () => {
        const lvlId = card.getAttribute('data-level-id');
        this._loadLevel(lvlId, this._randomSeed());
      };
    });

    const closeBtn = this.modalEl.querySelector('#nc-select-close');
    closeBtn.onclick = () => this._closeModal();
  }

  _closeModal() {
    if (this.modalEl) {
      this.modalEl.style.display = 'none';
      this.modalEl.innerHTML = '';
    }
  }

  _handleExit() {
    if (typeof this.options.onExit === 'function') {
      this.options.onExit();
    } else {
      this.host.onExit();
    }
  }

  destroy() {
    this.isDestroyed = true;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.winTimeoutId) {
      clearTimeout(this.winTimeoutId);
      this.winTimeoutId = null;
    }
    if (this.hintTimeoutId) {
      clearTimeout(this.hintTimeoutId);
      this.hintTimeoutId = null;
    }
    this._removeAllListeners();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
