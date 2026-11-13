/**
 * NetCity v2.0 - Level End Modals
 * Single Responsibility: Renders Victory (Level Won) and Failure (Level Over) modal dialogs,
 * stars calculation, reward pill badges, rewind triggers, and next level transitions.
 */

import { ALL_LEVELS } from '../../../../../packages/content/src/levels.js';
import {
  CHAPTER_FINALE_IDS,
  formatJunoLine,
  getJunoWinReaction,
  getJunoOverReaction,
  getJunoChapterCloseLine,
  getJunoEndingCards
} from '../../../../../packages/content/src/juno-text.js';
import { renderJunoInlineCard, escapeHtml } from '../juno-dialog.js';

export function showLevelWonModal(ui) {
  const isFirstWin = ui.completedLevels.size === 0 && !ui.completedLevels.has(ui.currentLevelId);
  const playerName = (ui.stateManager && ui.stateManager.playerName) || 'Apprentice';
  const vars = { name: playerName };

  ui.completedLevels.add(ui.currentLevelId);
  ui._saveCompletedLevels();

  // Reset simulation speed to 1x upon level completion
  if (ui.gameLoop && typeof ui.gameLoop.setSpeed === 'function') {
    ui.gameLoop.setSpeed(1);
  }
  ui.gameSpeed = 1;
  if (ui.btnSpeed) {
    ui.btnSpeed.textContent = '1×';
    ui.btnSpeed.classList.remove('nc-speed-active');
  }

  const starResult = ui.sim && typeof ui.sim.evaluateStars === 'function'
    ? ui.sim.evaluateStars(ui.levelDef && ui.levelDef.stars)
    : { starsEarned: 3, missingStarKind: null };
  const starsEarned = starResult.starsEarned;
  const starsDisplay = '⭐'.repeat(starsEarned) + '☆'.repeat(3 - starsEarned);
  const wonAfterRewind = Boolean(ui.sim && ui.sim.rewindsUsed > 0);
  const isDetectiveSolved = ui.currentLevelId === '7.5' && Boolean(ui.sim && ui.sim.detectiveCaseNum);
  const isChapterFinale = CHAPTER_FINALE_IDS.has(ui.currentLevelId);
  const isGameFinale = ui.currentLevelId === '7.6';

  const junoLines = [];
  const winLines = getJunoWinReaction({
    isFirstWin,
    starsEarned,
    missingStarKind: starResult.missingStarKind,
    wonAfterRewind,
    levelId: ui.currentLevelId,
    isDetectiveSolved
  }, vars);
  if (Array.isArray(winLines)) {
    junoLines.push(...winLines);
  } else if (winLines) {
    junoLines.push(winLines);
  }

  if (isChapterFinale && !isGameFinale) {
    const closeLine = getJunoChapterCloseLine(ui.levelDef.chapter, vars);
    if (closeLine && !junoLines.includes(closeLine)) junoLines.push(closeLine);
    if (ui.stateManager && !ui.stateManager.hasSeenMoment('chapter_finished')) {
      ui.stateManager.markMomentSeen('chapter_finished');
      junoLines.push(formatJunoLine('juno.moment.chapter_finished', vars));
    }
  }

  ui.modalEl.style.display = 'flex';
  if (ui && typeof ui._pauseForModal === 'function') {
    ui._pauseForModal();
  }
  const coinsEarned = ui.sim.coins;
  ui.modalEl.innerHTML = `
    <div class="nc-card nc-level-complete-card">
      <h2 class="nc-card-title">Level Complete! 🎉</h2>
      <div style="color:var(--nc-cyan); font-size:0.95rem; font-weight:700; margin-top:-4px;">${ui.levelDef.id} — ${ui.levelDef.title}</div>
      
      <div class="nc-stars-row" style="font-size:2.2rem; margin:10px 0;">
        ${starsDisplay}
      </div>

      ${renderJunoInlineCard(junoLines, { badge: 'CHIEF JUNO', variant: 'win', compact: true })}

      <div class="nc-reward-pills">
        <div class="nc-reward-badge" style="color:#ffd166; border-color:rgba(255, 209, 102, 0.4);">
          <span>⭐</span> +${starsEarned} Star${starsEarned === 1 ? '' : 's'}
        </div>
        <div class="nc-reward-badge" style="color:#10b981; border-color:rgba(16, 185, 129, 0.4);">
          <span>🪙</span> +${coinsEarned} Coins
        </div>
        <div class="nc-reward-badge" style="color:#38bdf8; border-color:rgba(56, 189, 248, 0.4);">
          <span>🔮</span> +250 XP
        </div>
      </div>

      <!-- 1. Mission Criteria Checklist (Moved above lesson learned) -->
      <div class="nc-criteria-card" style="margin-top:4px; margin-bottom:10px; background:rgba(16, 185, 129, 0.08); border:1px solid rgba(16, 185, 129, 0.3); border-radius:12px; padding:12px 16px; text-align:left;">
        <div style="color:#34d399; font-size:0.82rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px;">🎯 Mission Criteria Met</div>
        <div class="nc-takeaway-item" style="display:flex; gap:8px; align-items:center; margin-bottom:5px; font-size:0.88rem; color:#f1f5f9;">
          <span style="color:#10b981; font-weight:bold;">✔</span>
          <span>All required building delivery quotas fulfilled</span>
        </div>
        <div class="nc-takeaway-item" style="display:flex; gap:8px; align-items:center; font-size:0.88rem; color:#f1f5f9;">
          <span style="color:#10b981; font-weight:bold;">✔</span>
          <span>Cabling range, topology & bandwidth limits satisfied</span>
        </div>
      </div>

      <!-- 2. Educational Lesson / What You Learned (Bit keeps technical insight separate) -->
      <div class="nc-takeaways-card" style="text-align:left;">
        <div class="nc-takeaways-title">💡 What You Learned</div>
        <p style="color:#f1f5f9; font-size:0.92rem; margin:0; line-height:1.45;">${ui.levelDef.learningMoment || 'Campus network successfully architected!'}</p>
      </div>

      <div class="nc-card-actions" style="margin-top:16px;">
        <button class="nc-btn nc-btn-primary" id="nc-card-next">${isGameFinale ? 'City Finale Ceremony &rarr;' : 'Continue to Next Level &rarr;'}</button>
        <button class="nc-btn nc-btn-secondary" id="nc-card-retry">Play Again</button>
        <button class="nc-btn nc-btn-secondary" id="nc-card-levels">Select Level</button>
      </div>
    </div>
  `;

  ui.modalEl.querySelector('#nc-card-next').onclick = () => {
    if (isGameFinale) {
      showEndingCeremonyModal(ui);
      return;
    }
    ui._closeModal();
    const idx = ALL_LEVELS.findIndex(l => l.id === ui.currentLevelId);
    const nextId = idx < ALL_LEVELS.length - 1 ? ALL_LEVELS[idx + 1].id : ALL_LEVELS[0].id;
    ui._loadLevel(nextId, ui._randomSeed());
    ui._setScreen('game');
  };

  ui.modalEl.querySelector('#nc-card-retry').onclick = () => {
    ui._closeModal();
    ui._loadLevel(ui.currentLevelId, ui.currentSeed);
    ui._setScreen('game');
  };

  ui.modalEl.querySelector('#nc-card-levels').onclick = () => {
    ui._closeModal();
    ui._campaignView = 'chapters';
    ui._selectedLevelId = null;
    ui._userExplicitlySelectedLevel = false;
    ui._setScreen('campaign');
    ui._renderCampaignScreen();
  };
}

/**
 * 5-card Ending Sequence (juno.end.1..5) + Mayor Mira's Chief Network Engineer award card.
 */
export function showEndingCeremonyModal(ui, cardIdx = 0) {
  const playerName = (ui.stateManager && ui.stateManager.playerName) || 'Apprentice';
  const endingCards = getJunoEndingCards({ name: playerName });
  const totalSteps = endingCards.length + 1; // 5 Juno cards + 1 Mayor Mira title card
  const isMayorCard = cardIdx >= endingCards.length;

  ui.modalEl.style.display = 'flex';
  if (ui && typeof ui._pauseForModal === 'function') {
    ui._pauseForModal();
  }

  if (!isMayorCard) {
    const line = endingCards[cardIdx];
    ui.modalEl.innerHTML = `
      <div class="nc-card nc-ending-card">
        <div class="nc-ending-step">GRAND FINALE · CARD ${cardIdx + 1} OF ${endingCards.length}</div>
        ${renderJunoInlineCard(line, { badge: 'CHIEF JUNO', variant: 'finale' })}
        <div class="nc-card-actions" style="margin-top:16px; justify-content:space-between;">
          <button class="nc-btn nc-btn-secondary" id="nc-end-skip">Skip</button>
          <button class="nc-btn nc-btn-primary" id="nc-end-next">Next &rarr;</button>
        </div>
      </div>
    `;
    ui.modalEl.querySelector('#nc-end-next').onclick = () => {
      showEndingCeremonyModal(ui, cardIdx + 1);
    };
    ui.modalEl.querySelector('#nc-end-skip').onclick = () => {
      showEndingCeremonyModal(ui, totalSteps - 1);
    };
    return;
  }

  ui.modalEl.innerHTML = `
    <div class="nc-card nc-ending-card nc-mayor-title-card">
      <div class="nc-ending-step">CITY HALL COMMENDATION</div>
      <div class="nc-mayor-seal">🏙️</div>
      <h2 class="nc-card-title" style="color:#ffd166;">Chief Network Engineer</h2>
      <div class="nc-mayor-speaker">MAYOR MIRA</div>
      <p class="nc-mayor-quote">
        "${escapeHtml(playerName)}, on behalf of every district in NetCity, it is my honor to name you our new Chief Network Engineer."
      </p>
      <div class="nc-card-actions" style="margin-top:16px; justify-content:center;">
        <button class="nc-btn nc-btn-primary" id="nc-end-view-city">View City</button>
        <button class="nc-btn nc-btn-secondary" id="nc-end-campaign">Back to Campaign</button>
      </div>
    </div>
  `;

  ui.modalEl.querySelector('#nc-end-view-city').onclick = () => {
    ui._closeModal();
    if (ui.sim) ui.sim.paused = true;
  };
  ui.modalEl.querySelector('#nc-end-campaign').onclick = () => {
    ui._closeModal();
    ui._campaignView = 'chapters';
    ui._setScreen('campaign');
    ui._renderCampaignScreen();
  };
}

export function showLevelOverModal(ui) {
  if (ui.sim && ui.sim.isEndless) {
    showEndlessOverModal(ui);
    return;
  }

  const playerName = (ui.stateManager && ui.stateManager.playerName) || 'Apprentice';
  const buildingName = (ui.sim && ui.sim.failingBuilding && (ui.sim.failingBuilding.name || ui.sim.failingBuilding.label || ui.sim.failingBuilding.type)) || 'that building';
  const cause = (ui.sim && ui.sim.failCause) || 'any';

  const junoOverLines = [];
  if (ui.stateManager && !ui.stateManager.hasSeenMoment('first_level_over')) {
    ui.stateManager.markMomentSeen('first_level_over');
    junoOverLines.push(formatJunoLine('juno.moment.first_level_over', { name: playerName }));
  }
  junoOverLines.push(getJunoOverReaction(cause, { name: playerName, building: buildingName }));
  junoOverLines.push(formatJunoLine('juno.over.offer_rewind', { name: playerName }));
  junoOverLines.push(formatJunoLine('juno.over.offer_retry', { name: playerName }));

  ui.modalEl.style.display = 'flex';
  if (ui && typeof ui._pauseForModal === 'function') {
    ui._pauseForModal();
  }
  ui.modalEl.innerHTML = `
    <div class="nc-card nc-card-fail">
      <h2 class="nc-card-title nc-fail">Level Over</h2>
      ${renderJunoInlineCard(junoOverLines, { badge: 'CHIEF JUNO · DEBRIEF', variant: 'fail', compact: true })}
      <div class="nc-card-actions">
        <button class="nc-btn nc-btn-rewind" id="nc-card-rewind">Rewind (10s)</button>
        <button class="nc-btn nc-btn-secondary" id="nc-card-retry">Retry</button>
        <button class="nc-btn nc-btn-secondary" id="nc-card-levels">Levels</button>
      </div>
    </div>
  `;

  ui.modalEl.querySelector('#nc-card-rewind').onclick = () => {
    if (ui.sim.rewind(10)) {
      ui._closeModal();
      if (ui.stateManager && !ui.stateManager.hasSeenMoment('first_rewind') && ui.junoComms) {
        ui.stateManager.markMomentSeen('first_rewind');
        ui.junoComms.show(formatJunoLine('juno.moment.first_rewind', { name: playerName }), { badge: 'CHIEF JUNO', variant: 'info' });
      }
      ui._updateCoinsDisplay();
      if (ui.renderer && ui.camera) ui.renderer.render(ui.sim, ui.camera);
      if (ui.hud) ui.hud.update(ui.sim);
    }
  };

  ui.modalEl.querySelector('#nc-card-retry').onclick = () => {
    ui._closeModal();
    ui._loadLevel(ui.currentLevelId, ui.currentSeed);
    ui._setScreen('game');
  };

  ui.modalEl.querySelector('#nc-card-levels').onclick = () => {
    ui._closeModal();
    ui._campaignView = 'chapters';
    ui._selectedLevelId = null;
    ui._userExplicitlySelectedLevel = false;
    ui._setScreen('campaign');
    ui._renderCampaignScreen();
  };
}

export function showEndlessOverModal(ui) {
  const scoreData = ui.sim && ui.sim.getEndlessScore ? ui.sim.getEndlessScore() : {
    secondsSurvived: 0,
    buildingsServed: 0,
    averageHappiness: 100,
    totalScore: 0
  };

  let saveResult = { isNewHighScore: false, rank: null };
  if (ui.stateManager && ui.stateManager.saveEndlessScore) {
    saveResult = ui.stateManager.saveEndlessScore({
      score: scoreData.totalScore,
      secondsSurvived: scoreData.secondsSurvived,
      buildingsServed: scoreData.buildingsServed,
      averageHappiness: scoreData.averageHappiness,
      seed: ui.currentSeed
    });
  }

  const mins = Math.floor(scoreData.secondsSurvived / 60);
  const secs = scoreData.secondsSurvived % 60;

  ui.modalEl.style.display = 'flex';
  if (ui && typeof ui._pauseForModal === 'function') {
    ui._pauseForModal();
  }
  ui.modalEl.innerHTML = `
    <div class="nc-card nc-card-fail" style="max-width: 480px; text-align: center; gap: 16px;">
      <div>
        <div style="font-size: 0.76rem; font-weight: 800; color: #ef4444; text-transform: uppercase; letter-spacing: 0.6px; font-family: var(--font-mono);">
          ENDLESS RUN CONCLUDED
        </div>
        <h2 class="nc-card-title nc-fail" style="margin: 4px 0 0 0; font-size: 1.8rem;">Metropolis Overwhelmed</h2>
      </div>

      ${saveResult.isNewHighScore ? `
        <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.05)); border: 1px solid #f59e0b; border-radius: 12px; padding: 10px 14px; color: #ffd166; font-weight: 800; font-size: 0.95rem;">
          ✨ NEW PERSONAL BEST! ✨
        </div>
      ` : ''}

      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 10px;">
          <span style="font-size: 0.88rem; color: #8fa2be;">Final Score</span>
          <span style="font-size: 1.8rem; font-weight: 900; color: #00d2ff; font-family: var(--font-mono);">${scoreData.totalScore.toLocaleString()}</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.82rem; text-align: left; color: #cbd5e1;">
          <div>⏱️ <strong>Survived:</strong> ${mins}m ${secs}s</div>
          <div>🏢 <strong>Served:</strong> ${scoreData.buildingsServed} buildings</div>
          <div>😊 <strong>Happiness:</strong> ${scoreData.averageHappiness}%</div>
          <div>🎲 <strong>Seed:</strong> <code style="color:#8fa2be;">${ui.currentSeed}</code></div>
        </div>
      </div>

      <div class="nc-card-actions" style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
        <div style="display: flex; gap: 8px; width: 100%;">
          <button class="nc-btn nc-btn-primary" id="nc-endless-play-again" style="flex: 1;">Play Again</button>
          <button class="nc-btn nc-btn-secondary" id="nc-endless-retry-seed" style="flex: 1;">Retry Seed</button>
        </div>
        <div style="display: flex; gap: 8px; width: 100%;">
          <button class="nc-btn nc-btn-secondary" id="nc-endless-to-portal" style="flex: 1;">Endless Portal</button>
          <button class="nc-btn nc-btn-secondary" id="nc-endless-to-campaign" style="flex: 1;">Campaign</button>
        </div>
      </div>
    </div>
  `;

  ui.modalEl.querySelector('#nc-endless-play-again').onclick = () => {
    ui._closeModal();
    ui._startEndlessRun();
  };

  ui.modalEl.querySelector('#nc-endless-retry-seed').onclick = () => {
    ui._closeModal();
    ui._startEndlessRun(ui.currentSeed);
  };

  ui.modalEl.querySelector('#nc-endless-to-portal').onclick = () => {
    ui._closeModal();
    ui._setScreen('endless');
    ui._renderEndlessScreen();
  };

  ui.modalEl.querySelector('#nc-endless-to-campaign').onclick = () => {
    ui._closeModal();
    ui._campaignView = 'chapters';
    ui._setScreen('campaign');
    ui._renderCampaignScreen();
  };
}
