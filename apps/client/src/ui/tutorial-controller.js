/**
 * Chief Juno Interactive Tutorial Controller (Section 6)
 * Guides new players through the 9-step Level 1.1 onboarding script with
 * screen/canvas highlights, exact Chief Juno lines, and auto-advance triggers.
 */
import { JUNO_TUTORIAL_STEPS, formatJunoLine } from '../../../../packages/content/src/juno-text.js';

export class TutorialController {
  constructor(ui) {
    this.ui = ui;
    this.active = false;
    this.stepIndex = 0;
    this._highlightEl = null;
  }

  get currentStep() {
    return this.active ? (JUNO_TUTORIAL_STEPS[this.stepIndex] || null) : null;
  }

  start(startIndex = 0) {
    this.active = true;
    if (this.ui) {
      if (typeof this.ui._closeModal === 'function') {
        this.ui._closeModal();
      }
      if (this.ui.sim) {
        this.ui.sim.timersPaused = true;
        this.ui.sim.modalOpen = false;
      }
    }
    this.stepIndex = Math.max(0, Math.min(JUNO_TUTORIAL_STEPS.length - 1, startIndex));
    this._ensureHighlightEl();
    this._renderCurrentStep();
  }

  stop() {
    this.active = false;
    if (this.ui && this.ui.sim) {
      this.ui.sim.timersPaused = false;
      this.ui.sim.modalOpen = false;
      this.ui.sim.dropsCount = 0;
      this.ui.sim.collisionsCount = 0;
      this.ui.sim.recentDrops = [];
      this.ui.sim.lowestTimerRatio = 1.0;
      for (const b of this.ui.sim.buildings) {
        if (b.state === 'open') {
          b.timerTicksLeft = b.firstTimerTicks || b.cycleTimerTicks || 800;
          b.warning = false;
        }
      }
    }
    if (this._highlightEl) {
      this._highlightEl.style.display = 'none';
    }
    if (this.ui && this.ui.junoComms) {
      this.ui.junoComms.hide();
    }
  }

  next() {
    if (!this.active) return;
    if (this.stepIndex + 1 >= JUNO_TUTORIAL_STEPS.length) {
      this.stop();
      return;
    }
    this.stepIndex++;
    this._renderCurrentStep();
  }

  /**
   * Called by UI & sim loop on interactive events so steps 3, 4, 5, 6, 8 advance naturally.
   */
  handleEvent(eventName) {
    if (!this.active) return;
    const step = this.currentStep;
    if (!step) return;

    const triggerMap = {
      'juno.tut.3': 'wire_tool_selected',
      'juno.tut.4': 'wire_connected',
      'juno.tut.5': 'packet_in_flight',
      'juno.tut.6': 'coin_earned',
      'juno.tut.8': 'undo_clicked'
    };

    if (triggerMap[step.key] === eventName) {
      this.next();
    }
  }

  _ensureHighlightEl() {
    if (this._highlightEl || !this.ui || !this.ui.canvasWrapperEl) return;
    const doc = this.ui.canvasWrapperEl.ownerDocument || document;
    const el = doc.createElement('div');
    el.id = 'nc-tut-highlight';
    el.className = 'nc-tut-highlight';
    el.style.display = 'none';
    this.ui.canvasWrapperEl.appendChild(el);
    this._highlightEl = el;
  }

  _renderCurrentStep() {
    const step = this.currentStep;
    if (!step || !this.ui || !this.ui.junoComms) return;

    const playerName = (this.ui.stateManager && this.ui.stateManager.playerName) || 'Apprentice';
    const text = formatJunoLine(step.key, { name: playerName });
    const isLast = this.stepIndex >= JUNO_TUTORIAL_STEPS.length - 1;
    const dots = JUNO_TUTORIAL_STEPS.map((_, i) => `<span class="nc-tut-dot${i === this.stepIndex ? ' active' : ''}">●</span>`).join('');

    const controlsHtml = `
      <span class="nc-tut-progress">${dots}</span>
      <div class="nc-tut-btns">
        ${!isLast ? '<button type="button" id="nc-tut-skip" class="nc-tut-btn nc-tut-skip">Skip</button>' : ''}
        <button type="button" id="nc-tut-next" class="nc-tut-btn nc-tut-next">${isLast ? 'Got it!' : 'Next'}</button>
      </div>
    `;

    this.ui.junoComms.show(text, {
      badge: 'CHIEF JUNO · TRAINING',
      variant: 'tutorial',
      durationMs: 0,
      dismissible: false,
      controlsHtml
    });

    const commsEl = this.ui.junoComms.rootEl;
    if (commsEl) {
      const nextBtn = commsEl.querySelector('#nc-tut-next');
      const skipBtn = commsEl.querySelector('#nc-tut-skip');
      if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
          if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
          this.next();
        });
      }
      if (skipBtn) {
        skipBtn.addEventListener('click', (e) => {
          if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
          this.stop();
        });
      }
    }

    this._positionHighlight(step.highlight);
  }

  _positionHighlight(targetName) {
    this._ensureHighlightEl();
    if (!this._highlightEl) return;

    this._clearDomHighlights();
    if (!targetName || targetName === 'nothing') {
      this._highlightEl.style.display = 'none';
      return;
    }

    // DOM-based targets
    const domTargets = {
      wire_tray: '#nc-btn-wire',
      coin_counter: '#nc-hud-coins',
      undo_button: '#nc-btn-undo'
    };

    const selector = domTargets[targetName];
    if (selector && this.ui && this.ui.container && typeof this.ui.container.querySelector === 'function') {
      const targetEl = this.ui.container.querySelector(selector);
      if (targetEl) {
        if (targetEl.classList && typeof targetEl.classList.add === 'function') {
          targetEl.classList.add('nc-tut-dom-pulse');
        }
        if (typeof targetEl.getBoundingClientRect === 'function' && this.ui.canvasWrapperEl && typeof this.ui.canvasWrapperEl.getBoundingClientRect === 'function') {
          const tRect = targetEl.getBoundingClientRect();
          const wRect = this.ui.canvasWrapperEl.getBoundingClientRect();
          if (tRect.width > 0 && wRect.width > 0) {
            this._highlightEl.style.left = `${Math.round(tRect.left - wRect.left - 6)}px`;
            this._highlightEl.style.top = `${Math.round(tRect.top - wRect.top - 6)}px`;
            this._highlightEl.style.width = `${Math.round(tRect.width + 12)}px`;
            this._highlightEl.style.height = `${Math.round(tRect.height + 12)}px`;
            this._highlightEl.style.display = 'block';
            return;
          }
        }
        this._highlightEl.style.display = 'none';
        return;
      }
    }

    // Canvas-world targets (server, laptop, laptop_to_server, packet, timer_ring)
    const sim = this.ui.sim;
    const cam = this.ui.camera;
    if (sim && cam && this.ui.canvas) {
      const sqSize = (cam.baseSquareSize || 40) * (cam.zoom || 1);
      const gridToScreen = (gx, gy) => ({
        x: (cam.x || 0) + (gx + 0.5) * sqSize,
        y: (cam.y || 0) + (gy + 0.5) * sqSize
      });

      let sq = null;
      if (targetName === 'server') {
        sq = sim.server;
      } else if ((targetName === 'laptop' || targetName === 'timer_ring') && sim.buildings.length > 0) {
        sq = sim.buildings[0].square;
      } else if (targetName === 'laptop_to_server' && sim.buildings.length > 0) {
        const b = sim.buildings[0];
        const bx = b.square % sim.width;
        const by = Math.floor(b.square / sim.width);
        const sx = sim.server % sim.width;
        const sy = Math.floor(sim.server / sim.width);
        const p1 = gridToScreen(bx, by);
        const p2 = gridToScreen(sx, sy);
        const minX = Math.min(p1.x, p2.x) - 34;
        const minY = Math.min(p1.y, p2.y) - 34;
        const maxX = Math.max(p1.x, p2.x) + 34;
        const maxY = Math.max(p1.y, p2.y) + 34;
        this._highlightEl.style.left = `${Math.round(minX)}px`;
        this._highlightEl.style.top = `${Math.round(minY)}px`;
        this._highlightEl.style.width = `${Math.round(maxX - minX)}px`;
        this._highlightEl.style.height = `${Math.round(maxY - minY)}px`;
        this._highlightEl.style.display = 'block';
        return;
      } else if (targetName === 'packet' && sim.inFlightPackets && sim.inFlightPackets.length > 0) {
        const pkt = sim.inFlightPackets[0];
        sq = pkt.path[Math.floor(pkt.path.length / 2)];
      }

      if (sq !== null && sq !== undefined) {
        const gx = sq % sim.width;
        const gy = Math.floor(sq / sim.width);
        const pt = gridToScreen(gx, gy);
        const radius = targetName === 'packet' ? Math.max(24, sqSize * 0.65) : Math.max(32, sqSize * 0.9);
        this._highlightEl.style.left = `${Math.round(pt.x - radius)}px`;
        this._highlightEl.style.top = `${Math.round(pt.y - radius)}px`;
        this._highlightEl.style.width = `${Math.round(radius * 2)}px`;
        this._highlightEl.style.height = `${Math.round(radius * 2)}px`;
        this._highlightEl.style.display = 'block';
        return;
      }
    }

    this._highlightEl.style.display = 'none';
  }

  _clearDomHighlights() {
    if (!this.ui || !this.ui.container || typeof this.ui.container.querySelectorAll !== 'function') return;
    const prev = this.ui.container.querySelectorAll('.nc-tut-dom-pulse');
    prev.forEach(node => {
      if (node.classList && typeof node.classList.remove === 'function') {
        node.classList.remove('nc-tut-dom-pulse');
      }
    });
  }

  destroy() {
    this.stop();
    this._clearDomHighlights();
    if (this._highlightEl && this._highlightEl.parentNode) {
      this._highlightEl.parentNode.removeChild(this._highlightEl);
    }
    this._highlightEl = null;
  }
}
