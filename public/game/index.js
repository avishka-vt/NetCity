import { LEVELS } from './levels.js';
import { BrowserHostAdapter } from './host.js';
import { GameUI } from './ui.js';

export { BrowserHostAdapter } from './host.js';
export { GameUI } from './ui.js';
export { Simulation } from './sim.js';
export { generateLevel } from './generate.js';
export { LEVELS, CABLE_TYPES, REFUSAL_MESSAGES } from './levels.js';

/**
 * Determines the starting level:
 * "Play continues from the first unfinished unlocked level. If every level is finished, Play opens level 1.4."
 */
export function getStartingLevel(host) {
  const progress = (host && typeof host.loadProgress === 'function') ? host.loadProgress() : { levels: {} };
  const levelsProgress = (progress && progress.levels) || {};

  for (let i = 0; i < LEVELS.length; i++) {
    const lvl = LEVELS[i];
    const prevUnlocked = i === 0 || (levelsProgress[LEVELS[i - 1].id] && levelsProgress[LEVELS[i - 1].id].stars >= 1);
    if (!prevUnlocked) break;

    const p = levelsProgress[lvl.id];
    if (!p || p.stars < 1) {
      return lvl.id;
    }
  }

  return '1.4';
}

/**
 * Mounts the game inside any element.
 * @param {HTMLElement} container
 * @param {object} [host]
 * @param {object} [options]
 * @returns {object} handle with destroy() and getUI()
 */
export function mountGame(container, host = new BrowserHostAdapter(), options = {}) {
  const initialLevel = options.initialLevel || getStartingLevel(host);
  const ui = new GameUI(container, host, { ...options, initialLevel });

  return {
    destroy: () => ui.destroy(),
    getUI: () => ui
  };
}

/**
 * Opens full-window game, locking page scrolling and restoring the page when player exits.
 * @param {object} [host]
 * @param {object} [options]
 * @returns {object} handle with destroy()
 */
export function openGame(host = new BrowserHostAdapter(), options = {}) {
  const prevOverflow = document.body ? document.body.style.overflow : '';
  if (document.body) {
    document.body.style.overflow = 'hidden';
  }

  const overlay = document.createElement('div');
  overlay.className = 'nc-fullwindow-overlay';
  document.body.appendChild(overlay);

  let gameHandle = null;

  const cleanup = () => {
    if (gameHandle) {
      gameHandle.destroy();
      gameHandle = null;
    }
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    if (document.body) {
      document.body.style.overflow = prevOverflow;
    }
    if (typeof options.onExit === 'function') {
      options.onExit();
    }
    if (host && typeof host.onExit === 'function') {
      host.onExit();
    }
  };

  gameHandle = mountGame(overlay, host, {
    ...options,
    onExit: cleanup
  });

  return {
    destroy: cleanup,
    getUI: () => (gameHandle ? gameHandle.getUI() : null)
  };
}

/**
 * Shows the two-option launcher pop-up over the host page.
 * Options: Play and How to Play.
 * @param {object} [host]
 * @returns {object} handle with close()
 */
export function openLauncher(host = new BrowserHostAdapter()) {
  const launcherOverlay = document.createElement('div');
  launcherOverlay.className = 'nc-modal-overlay';
  launcherOverlay.style.zIndex = '999998';

  const slides = [
    'Every building needs a cable to the server.',
    'Drag from a building to the server.',
    'Copper is cheap but short, fiber goes far but costs three times as much.',
    'Stay inside the budget to earn three stars.'
  ];

  let currentSlideIndex = 0;
  let isViewingHowToPlay = false;

  const renderContent = () => {
    if (!isViewingHowToPlay) {
      launcherOverlay.innerHTML = `
        <div class="nc-launcher-modal">
          <button class="nc-launcher-close" id="nc-close-launcher" title="Close">✕</button>
          <h1 class="nc-launcher-title">🌐 NetCity</h1>
          <p class="nc-launcher-desc">
            Build the city's computer network. Connect buildings to the server, choose the right cables, and stay within budget!
          </p>
          <div class="nc-launcher-actions">
            <button class="nc-launcher-btn-play" id="nc-btn-play-now">Play</button>
            <button class="nc-launcher-btn-how" id="nc-btn-how-to-play">How to Play</button>
          </div>
        </div>
      `;

      launcherOverlay.querySelector('#nc-btn-play-now').onclick = () => {
        close();
        openGame(host);
      };

      launcherOverlay.querySelector('#nc-btn-how-to-play').onclick = () => {
        isViewingHowToPlay = true;
        currentSlideIndex = 0;
        renderContent();
      };

      launcherOverlay.querySelector('#nc-close-launcher').onclick = () => {
        close();
      };
    } else {
      const dotsHtml = slides.map((_, i) => `<div class="nc-dot ${i === currentSlideIndex ? 'nc-dot-active' : ''}"></div>`).join('');

      launcherOverlay.innerHTML = `
        <div class="nc-launcher-modal">
          <button class="nc-launcher-close" id="nc-close-launcher" title="Close">✕</button>
          <h2 class="nc-launcher-title">How to Play</h2>
          <div class="nc-slide-container">
            <div class="nc-slide-text">${slides[currentSlideIndex]}</div>
          </div>
          <div class="nc-slide-nav">
            <button class="nc-btn nc-btn-secondary" id="nc-slide-prev" ${currentSlideIndex === 0 ? 'disabled style="opacity:0.3"' : ''}>Back</button>
            <div class="nc-slide-dots">${dotsHtml}</div>
            <button class="nc-btn nc-btn-secondary" id="nc-slide-next">${currentSlideIndex === slides.length - 1 ? 'Start' : 'Next'}</button>
          </div>
          <div class="nc-launcher-actions" style="margin-top: 10px;">
            <button class="nc-launcher-btn-play" id="nc-btn-play-now">Play</button>
          </div>
        </div>
      `;

      launcherOverlay.querySelector('#nc-close-launcher').onclick = () => {
        close();
      };

      const prevBtn = launcherOverlay.querySelector('#nc-slide-prev');
      if (prevBtn) {
        prevBtn.onclick = () => {
          if (currentSlideIndex > 0) {
            currentSlideIndex--;
            renderContent();
          }
        };
      }

      const nextBtn = launcherOverlay.querySelector('#nc-slide-next');
      if (nextBtn) {
        nextBtn.onclick = () => {
          if (currentSlideIndex < slides.length - 1) {
            currentSlideIndex++;
            renderContent();
          } else {
            close();
            openGame(host);
          }
        };
      }

      launcherOverlay.querySelector('#nc-btn-play-now').onclick = () => {
        close();
        openGame(host);
      };
    }
  };

  const close = () => {
    if (launcherOverlay.parentNode) {
      launcherOverlay.parentNode.removeChild(launcherOverlay);
    }
  };

  renderContent();
  document.body.appendChild(launcherOverlay);

  return { close };
}
