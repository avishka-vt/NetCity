/**
 * NetCity v2.0 - Core Game Loop
 * Single Responsibility: Drives the requestAnimationFrame execution cycle,
 * manages simulation fixed-timestep tick accumulation (50ms), game speed multipliers,
 * and coordinates simulation event notifications.
 */

export class GameLoop {
  constructor(options = {}) {
    this.simProvider = options.getSim || (() => null);
    this.onTick = options.onTick || (() => {});
    this.onRender = options.onRender || (() => {});
    this.onWin = options.onWin || (() => {});
    this.onLevelOver = options.onLevelOver || (() => {});
    this.onBonus = options.onBonus || (() => {});

    this.gameSpeed = options.initialSpeed || 1; // 1 | 2 | 4
    this.rafId = null;
    this.lastTime = 0;
    this.tickAccumulator = 0;
    this.isRunning = false;
    this.isDestroyed = false;

    this.collisionBursts = [];
  }

  /**
   * Start the animation and simulation cycle
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    this.tickAccumulator = 0;

    const frame = (time) => {
      if (this.isDestroyed || !this.isRunning) return;

      const dt = time - this.lastTime;
      this.lastTime = time;

      const sim = this.simProvider();
      if (sim && sim.status === 'playing' && !sim.paused) {
        this.tickAccumulator += dt * (this.gameSpeed || 1);
        while (this.tickAccumulator >= 50) {
          const events = sim.tick();
          this.tickAccumulator -= 50;

          for (const ev of events) {
            if (ev.type === 'BonusAwarded') {
              this.onBonus(ev);
            }
            if (ev.type === 'Collision' && ev.square !== null && ev.square !== undefined) {
              this.collisionBursts.push({ square: ev.square, age: 0 });
            }
          }

          this.onTick(events, sim);

          if (sim.status === 'level_over') {
            this.onLevelOver(sim);
            break;
          }
          if (sim.status === 'won') {
            this.onWin(sim);
            break;
          }
        }
      }

      // Age collision bursts
      for (let i = this.collisionBursts.length - 1; i >= 0; i--) {
        this.collisionBursts[i].age++;
        if (this.collisionBursts[i].age > 20) {
          this.collisionBursts.splice(i, 1);
        }
      }

      this.onRender();

      if (typeof requestAnimationFrame === 'function') {
        this.rafId = requestAnimationFrame(frame);
      }
    };

    if (typeof requestAnimationFrame === 'function') {
      this.rafId = requestAnimationFrame(frame);
    }
  }

  /**
   * Stop or pause loop
   */
  stop() {
    this.isRunning = false;
    if (this.rafId && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Set simulation speed multiplier (1, 2, or 4)
   * @param {number} speed
   */
  setSpeed(speed) {
    this.gameSpeed = speed;
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.isDestroyed = true;
    this.stop();
    this.collisionBursts = [];
  }
}
