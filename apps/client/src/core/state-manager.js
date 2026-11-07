/**
 * NetCity v2.0 - State Manager
 * Single Responsibility: Manages user progression, completed levels persistence,
 * and high-level screen navigation state.
 */

const STORAGE_KEY = 'netcity_completed_levels';
const ENDLESS_STORAGE_KEY = 'netcity.endless.best';

export class StateManager {
  constructor() {
    this.completedLevels = this.loadCompletedLevels();
    this.currentScreen = 'campaign'; // 'campaign' | 'endless' | 'learn' | 'game'
    this.campaignView = 'chapters';   // 'chapters' | 'levels'
    this.currentViewingCh = 1;
    this.learnTopic = 'mac_ip';
  }

  /**
   * Load personal best Endless runs from localStorage (Section 6.1)
   * @returns {Array<{ score: number, secondsSurvived: number, buildingsServed: number, averageHappiness: number, seed: string, date: string }>}
   */
  loadEndlessHighScores() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(ENDLESS_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {}
    return [];
  }

  /**
   * Save an Endless mode run and return rank/personal best status
   * @param {{ score: number, secondsSurvived: number, buildingsServed: number, averageHappiness: number, seed: string }} runData
   * @returns {{ isNewHighScore: boolean, rank: number|null, top5: Array }}
   */
  saveEndlessScore(runData) {
    try {
      const scores = this.loadEndlessHighScores();
      scores.push({
        score: runData.score,
        secondsSurvived: runData.secondsSurvived,
        buildingsServed: runData.buildingsServed,
        averageHappiness: runData.averageHappiness,
        seed: runData.seed,
        date: new Date().toLocaleDateString()
      });
      scores.sort((a, b) => b.score - a.score);
      const top5 = scores.slice(0, 5);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(ENDLESS_STORAGE_KEY, JSON.stringify(top5));
      }
      const rank = top5.findIndex(s => s.seed === runData.seed && s.score === runData.score) + 1;
      return { isNewHighScore: rank === 1, rank: rank > 0 ? rank : null, top5 };
    } catch (e) {
      return { isNewHighScore: false, rank: null, top5: [] };
    }
  }

  /**
   * Load completed level IDs from persistent storage (localStorage)
   * @returns {Set<string>}
   */
  loadCompletedLevels() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return new Set(JSON.parse(raw));
      }
    } catch (e) {
      // Storage access blocked or unavailable
    }
    return new Set();
  }

  /**
   * Persist completed level IDs to localStorage
   */
  saveCompletedLevels() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.completedLevels]));
      }
    } catch (e) {
      // Storage access blocked or quota exceeded
    }
  }

  /**
   * Check if a specific level has been completed
   * @param {string} levelId
   * @returns {boolean}
   */
  isLevelCompleted(levelId) {
    return this.completedLevels.has(levelId);
  }

  /**
   * Mark a level as completed and persist
   * @param {string} levelId
   */
  completeLevel(levelId) {
    this.completedLevels.add(levelId);
    this.saveCompletedLevels();
  }

  /**
   * Reset all user progression back to a brand new game state
   */
  resetProgress() {
    this.completedLevels.clear();
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {}
  }
}
