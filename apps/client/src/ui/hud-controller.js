/**
 * NetCity v2.0 - HUD Controller
 * Single Responsibility: Updates game topbar and status metrics:
 * Coins balance, packets delivered count, stars earned, citizen happiness meter,
 * level title, goal description, speed status, and hint banner alerts.
 */

export class HUDController {
  constructor(elements = {}) {
    this.titleEl = elements.titleEl;
    this.goalEl = elements.goalEl;
    this.coinsEl = elements.coinsEl;
    this.deliveriesEl = elements.deliveriesEl;
    this.starsEl = elements.starsEl;
    this.happinessContainer = elements.happinessContainer;
    this.happinessDisplay = elements.happinessDisplay;
    this.hintBarEl = elements.hintBarEl;
    this.btnSpeed = elements.btnSpeed;
    this.btnPause = elements.btnPause;
  }

  /**
   * Update level header title and goal banner
   */
  updateLevelHeader(levelDef) {
    if (this.titleEl && levelDef) {
      if (levelDef.isEndless) {
        this.titleEl.textContent = 'Endless Metropolis';
        this.titleEl.title = 'Endless Mode — Tier ' + (levelDef.tier || 1);
      } else {
        this.titleEl.textContent = levelDef.title || '';
        this.titleEl.title = levelDef.title || '';
      }
    }

    if (this.starsEl) {
      const starsPill = this.starsEl.closest('#nc-stars-container') || this.starsEl.parentElement;
      if (starsPill) {
        starsPill.style.display = (levelDef && levelDef.isEndless) ? 'none' : '';
      }
    }

    if (this.goalEl && levelDef) {
      if (levelDef.isEndless) {
        this.goalEl.innerHTML = `<span class="nc-goal-tag">♾️ Endless Mode:</span> Survive as the city expands! Keep all timers alive.`;
      } else if (levelDef.objective) {
        this.goalEl.innerHTML = `<span class="nc-goal-tag">🎯 Goal:</span> ${levelDef.objective}`;
      } else if (levelDef.id === '1.2') {
        this.goalEl.innerHTML = `<span class="nc-goal-tag">🎯 Goal:</span> Connect Classroom & distant Laptop (within 10m copper reach!) & meet quotas`;
      } else if (levelDef.goal === 'keep_happy') {
        const sec = Math.round((levelDef.targetTicks || 3600) / 60);
        this.goalEl.innerHTML = `<span class="nc-goal-tag">🏙️ Goal:</span> Maintain Happiness &ge; ${levelDef.minHappiness || 80}% for ${sec}s`;
      } else if (levelDef.goal === 'connect_all') {
        const reqStart = (levelDef.start || []).filter(b => b.required !== false).length;
        const reqSpawns = (levelDef.spawns || []).filter(b => b.required !== false).length;
        const totalReq = reqStart + reqSpawns;
        this.goalEl.innerHTML = `<span class="nc-goal-tag">🎯 Goal:</span> Connect all ${totalReq > 0 ? totalReq : 'campus'} buildings & meet delivery quotas`;
      } else if (levelDef.goal && levelDef.goal.startsWith('survive')) {
        const sec = Math.round((levelDef.targetTicks || 3600) / 60);
        this.goalEl.innerHTML = `<span class="nc-goal-tag">🛡️ Goal:</span> Survive ${sec}s without any building failing`;
      } else {
        this.goalEl.innerHTML = `<span class="nc-goal-tag">🎯 Goal:</span> ${levelDef.goal || 'Connect campus'}`;
      }
    }
  }

  /**
   * Update real-time metrics (coins, deliveries, happiness)
   */
  updateMetrics(sim, levelDef) {
    if (!sim) return;

    if (this.coinsEl) {
      this.coinsEl.textContent = `${sim.coins}`;
    }

    if (sim.isEndless) {
      if (this.deliveriesEl && sim.getEndlessScore) {
        const scoreData = sim.getEndlessScore();
        this.deliveriesEl.textContent = `${scoreData.totalScore.toLocaleString()} pts`;
      }
      if (this.happinessContainer && this.happinessDisplay) {
        this.happinessContainer.style.display = 'inline-flex';
        const h = sim.happinessMeter !== undefined ? Math.round(sim.happinessMeter) : 100;
        this.happinessDisplay.textContent = `${h}%`;
        this.happinessDisplay.style.color = h >= 80 ? '#10b981' : (h >= 50 ? '#f59e0b' : '#ef4444');
      }
      return;
    }

    if (this.deliveriesEl) {
      const totalDelivered = sim.buildings.reduce((sum, b) => sum + (b.deliveredTotal || 0), 0);
      this.deliveriesEl.textContent = `${totalDelivered}`;
    }

    if (this.happinessContainer && this.happinessDisplay) {
      if (levelDef && levelDef.goal === 'keep_happy') {
        this.happinessContainer.style.display = 'inline-flex';
        const h = sim.happinessMeter !== undefined ? sim.happinessMeter : 100;
        this.happinessDisplay.textContent = `${h}%`;
        this.happinessDisplay.style.color = h >= 80 ? '#10b981' : (h >= 50 ? '#f59e0b' : '#ef4444');
      } else {
        this.happinessContainer.style.display = 'none';
      }
    }
  }

  /**
   * Set hint or error alert banner
   */
  setHint(text, isAlert = false) {
    if (!this.hintBarEl) return;
    const txt = this.hintBarEl.querySelector('#nc-hint-text');
    if (txt) {
      txt.textContent = text || '';
    } else {
      this.hintBarEl.textContent = text || '';
    }
    const hasText = Boolean(text && String(text).trim());
    this.hintBarEl.style.display = hasText ? 'inline-flex' : 'none';
    this.hintBarEl.classList.toggle('nc-hint-alert', isAlert);
  }
}
