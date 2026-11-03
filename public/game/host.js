export const DEFAULT_STORAGE_KEY = 'netcity.progress.v1';

export class BrowserHostAdapter {
  constructor(options = {}) {
    this.user = options.user || { id: 'guest', displayName: 'Guest' };
    this.storageKey = options.storageKey || DEFAULT_STORAGE_KEY;
    this._onExitCallback = options.onExit || null;
    this._memoryFallback = null;
  }

  loadProgress() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(this.storageKey);
        if (!raw) return { levels: {} };
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' && parsed.levels ? parsed : { levels: {} };
      }
    } catch (e) {
      // LocalStorage access denied or unavailable
    }

    if (this._memoryFallback) {
      return JSON.parse(JSON.stringify(this._memoryFallback));
    }
    return { levels: {} };
  }

  saveProgress(progress) {
    const data = progress && typeof progress === 'object' && progress.levels ? progress : { levels: {} };
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
      }
    } catch (e) {
      // LocalStorage quota or unavailable
    }
    this._memoryFallback = JSON.parse(JSON.stringify(data));
  }

  recordLevelComplete(levelId, stars, cost) {
    const progress = this.loadProgress();
    if (!progress.levels) {
      progress.levels = {};
    }

    const current = progress.levels[levelId];
    if (!current) {
      progress.levels[levelId] = {
        stars,
        bestCost: cost
      };
    } else {
      progress.levels[levelId] = {
        stars: Math.max(current.stars, stars),
        bestCost: Math.min(current.bestCost, cost)
      };
    }

    this.saveProgress(progress);
    return progress;
  }

  onExit() {
    if (typeof this._onExitCallback === 'function') {
      this._onExitCallback();
    }
  }
}
