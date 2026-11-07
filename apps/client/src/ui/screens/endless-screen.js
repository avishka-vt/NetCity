/**
 * NetCity v2.0 - Endless Screen
 * Single Responsibility: Renders the Endless Mode Portal,
 * Unlocked tier indicators, seed generator, high scores leaderboard, and game launcher.
 */

import { getUnlockedTier, getEndlessSetup } from '../../../../../packages/content/src/endless-config.js';

export const ENDLESS_TIERS = {
  1: {
    name: 'Village',
    promise: 'Simple direct cables. Lay your network\'s first foundations.',
    unlockCondition: 'Unlocked by default.'
  },
  2: {
    name: 'Town',
    promise: 'Local switches and hubs. Fast forwarding across growing neighborhoods.',
    unlockCondition: 'Complete Chapter 2 (Connect the Whole School) in Campaign.'
  },
  3: {
    name: 'Suburbs',
    promise: 'Inter-network routers. Connecting distant zones across town.',
    unlockCondition: 'Complete Chapter 3 (Bridge Across the River) in Campaign.'
  },
  4: {
    name: 'City',
    promise: 'DHCP leases, DNS resolution & web servers. Network automation at scale.',
    unlockCondition: 'Complete Chapter 4 (Make Packets Find Their Way) in Campaign.'
  },
  5: {
    name: 'Metro District',
    promise: 'VLAN color zones & static routes. Clean corporate isolation.',
    unlockCondition: 'Complete Chapter 5 (Organise the City Zones) in Campaign.'
  },
  6: {
    name: 'Metropolis',
    promise: 'Firewalls, VPN tunnels & encrypted links. High-stress security defense.',
    unlockCondition: 'Complete Chapter 6 (Guard the City Gates) in Campaign.'
  },
  7: {
    name: 'Megalopolis',
    promise: 'Load balancers & UPS power resilience. The ultimate test of network survival.',
    unlockCondition: 'Complete Chapter 7 (Build the Unstoppable Metropolis) in Campaign.'
  }
};

export class EndlessScreen {
  constructor(ui) {
    this.ui = ui;
    this._customSeed = this._generateSeed();
  }

  _generateSeed() {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let s = 'endless-';
    for (let i = 0; i < 6; i++) {
      s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s;
  }

  render() {
    const ui = this.ui;
    if (!ui.screenEndlessEl) return;

    const maxTier = getUnlockedTier(ui.completedLevels);
    // Default selected tier = highest unlocked, but user may change it
    if (this._selectedTier === undefined) {
      this._selectedTier = maxTier;
    }
    const highScores = ui.stateManager ? ui.stateManager.loadEndlessHighScores() : [];

    let scoresHtml = '';
    if (highScores.length === 0) {
      scoresHtml = `
        <div class="nc-endless-empty">
          No Endless runs recorded yet.<br>Launch your first run to set a personal best!
        </div>
      `;
    } else {
      let rows = '';
      highScores.forEach((h, idx) => {
        const medal = idx === 0 ? '🥇 ' : (idx === 1 ? '🥈 ' : (idx === 2 ? '🥉 ' : `#${idx + 1} `));
        rows += `
          <tr>
            <td style="font-weight: 800; color: #ffffff;">${medal}</td>
            <td style="font-weight: 800; color: var(--color-cyan); font-family: var(--font-mono);">${h.score.toLocaleString()}</td>
            <td>${Math.floor(h.secondsSurvived / 60)}m ${h.secondsSurvived % 60}s</td>
            <td>${h.buildingsServed}</td>
            <td style="color: var(--color-emerald); font-weight: 700;">${h.averageHappiness}%</td>
            <td><code style="font-size: 0.78rem; color: var(--color-text-secondary);">${h.seed}</code></td>
          </tr>
        `;
      });

      scoresHtml = `
        <table class="nc-endless-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Score</th>
              <th>Survived</th>
              <th>Buildings</th>
              <th>Happiness</th>
              <th>Seed</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;
    }

    // Build tier selection pills HTML
    let tierPillsHtml = '';
    for (let t = 1; t <= 7; t++) {
      const tierInfo = ENDLESS_TIERS[t];
      const unlocked = t <= maxTier;
      const selected = t === this._selectedTier;
      const icon = unlocked ? '' : '🔒 ';
      const classes = [
        'nc-tier-pill',
        selected ? 'nc-tier-selected' : '',
        !unlocked ? 'nc-tier-locked' : ''
      ].filter(Boolean).join(' ');

      const titleAttr = unlocked 
        ? `${tierInfo.name}: ${tierInfo.promise}` 
        : `🔒 ${tierInfo.name} • ${tierInfo.unlockCondition}`;

      tierPillsHtml += `
        <button
          class="${classes}"
          data-tier="${t}"
          title="${titleAttr}"
        >${icon}${tierInfo.name}</button>
      `;
    }

    const currentTier = ENDLESS_TIERS[this._selectedTier] || ENDLESS_TIERS[1];
    const isSelectedUnlocked = this._selectedTier <= maxTier;

    ui.screenEndlessEl.innerHTML = `
      <header class="nc-app-nav">
        <div class="nc-app-nav-left">
          <div class="nc-app-brand" id="nc-endless-nav-brand">
            <div class="nc-app-brand-bars">
              <span class="nc-bar bar-1"></span>
              <span class="nc-bar bar-2"></span>
              <span class="nc-bar bar-3"></span>
            </div>
            <span class="nc-app-brand-title">NetCity</span>
          </div>
          <nav class="nc-app-nav-tabs">
            <button class="nc-app-nav-tab" id="nc-endless-tab-play">
              <span class="nc-play-icon">▶</span> Play
            </button>
            <button class="nc-app-nav-tab active" id="nc-endless-tab-endless">
              <span style="font-size:1.1rem; line-height:1;">♾️</span> Endless
            </button>
            <button class="nc-app-nav-tab" id="nc-endless-tab-learn">Learn</button>
          </nav>
        </div>
        <div class="nc-app-nav-right">
          <div class="nc-user-profile-icon" title="Player Profile">
            <span class="nc-avatar-glyph">👤</span>
          </div>
        </div>
      </header>

      <!-- Atmospheric Dusk Landscape Backdrop (same as campaign) -->
      <div class="nc-campaign-backdrop" aria-hidden="true">
        <div class="nc-sky-stars"></div>
        <div class="nc-cityscape-layer">
          <svg class="nc-cityscape-svg" viewBox="0 0 1600 360" preserveAspectRatio="none">
            <defs>
              <linearGradient id="ncHillsFarEndless" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#0e2a56" stop-opacity="0.8"/>
                <stop offset="100%" stop-color="#061633" stop-opacity="0.95"/>
              </linearGradient>
              <linearGradient id="ncHillsNearEndless" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#0a1f3d"/>
                <stop offset="100%" stop-color="#030b18"/>
              </linearGradient>
            </defs>
            <!-- Distant Cityscape Silhouette & Spire Towers -->
            <path d="M 0,220 L 120,220 L 120,180 L 160,180 L 160,140 L 190,140 L 190,220 L 260,220 L 260,160 L 300,160 L 300,220 L 420,220 L 420,130 L 450,130 L 450,110 L 460,90 L 462,90 L 464,110 L 490,110 L 490,220 L 600,220 L 600,150 L 650,150 L 650,220 L 780,220 L 780,120 L 820,120 L 820,220 L 960,220 L 960,140 L 1020,140 L 1020,220 L 1150,220 L 1150,110 L 1190,110 L 1190,220 L 1320,220 L 1320,160 L 1380,160 L 1380,220 L 1600,220 L 1600,360 L 0,360 Z" fill="#091b38" opacity="0.45" />
            
            <!-- Glowing Skyline Windows -->
            <rect x="135" y="190" width="12" height="6" rx="2" fill="#00f0ff" opacity="0.75" />
            <rect x="170" y="150" width="10" height="6" rx="2" fill="#ffd166" opacity="0.8" />
            <rect x="275" y="175" width="12" height="6" rx="2" fill="#00f0ff" opacity="0.75" />
            <rect x="435" y="145" width="14" height="6" rx="2" fill="#ffd166" opacity="0.85" />
            <rect x="470" y="130" width="12" height="6" rx="2" fill="#00f0ff" opacity="0.75" />
            <rect x="620" y="165" width="14" height="6" rx="2" fill="#ffd166" opacity="0.85" />
            <rect x="795" y="135" width="14" height="6" rx="2" fill="#00f0ff" opacity="0.75" />
            <rect x="980" y="155" width="16" height="6" rx="2" fill="#ffd166" opacity="0.85" />
            <rect x="1165" y="125" width="14" height="6" rx="2" fill="#00f0ff" opacity="0.75" />
            <rect x="1340" y="175" width="14" height="6" rx="2" fill="#ffd166" opacity="0.8" />

            <!-- Rolling Hills Far Layer -->
            <path d="M 0,260 Q 220,180 500,240 T 1100,220 T 1600,250 L 1600,360 L 0,360 Z" fill="url(#ncHillsFarEndless)" />
            
            <!-- Rolling Hills Foreground Layer & River Valley -->
            <path d="M 0,290 Q 300,230 750,280 T 1600,270 L 1600,360 L 0,360 Z" fill="url(#ncHillsNearEndless)" />
          </svg>
        </div>
      </div>

      <div class="nc-endless-scrollable nc-campaign-scrollable">
        <div class="nc-campaign-content-inner" style="max-width: 1200px;">
          <div class="nc-chapter-levels-header" style="border:none; padding-bottom: 0;">
            <div class="nc-chapter-banner-info">
              <span class="nc-chapter-pill">INFINITE NETWORK SIMULATION</span>
              <h1 class="nc-chapter-banner-title" style="font-size: 1.6rem; margin: 4px 0 2px 0;">Endless Metropolis</h1>
              <p class="nc-chapter-banner-desc" style="font-size: 0.88rem; margin: 0; line-height: 1.4;">
                Your city never stops growing. How long can you keep it connected?
              </p>
            </div>
          </div>

          <div class="nc-endless-layout">
            <!-- Left Card: Launch & Setup -->
            <div class="nc-endless-card">
              <!-- Tier selection -->
              <div class="nc-tier-section">
                <span class="nc-tier-section-tag">
                  SELECT DIFFICULTY TIER
                </span>
                <div id="nc-tier-pills" class="nc-tier-pills-wrap">
                  ${tierPillsHtml}
                </div>
                <div id="nc-tier-desc" class="nc-tier-info-area">
                  <div class="nc-tier-promise-row">
                    <strong class="nc-tier-name-label">${currentTier.name}:</strong>
                    <span class="nc-tier-promise-text">${currentTier.promise}</span>
                  </div>
                  ${!isSelectedUnlocked ? `
                    <div class="nc-tier-unlock-banner">
                      <span>🔒</span>
                      <span><strong>Unlock Condition:</strong> ${currentTier.unlockCondition}</span>
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Summary line & Collapsible Details -->
              <div class="nc-endless-summary-card">
                <div class="nc-endless-summary-text">
                  Starts small. One missed deadline ends the run.
                </div>
                <details class="nc-endless-details-accordion">
                  <summary class="nc-endless-details-toggle">Details ▾</summary>
                  <div class="nc-endless-specs-grid" style="margin-top: var(--space-3);">
                    <div>🗺️ <strong>Map:</strong> 32 &times; 18 Squares</div>
                    <div>🪙 <strong>Starting Budget:</strong> 80 Coins</div>
                    <div>🏢 <strong>Initial Start:</strong> 3 Buildings</div>
                    <div>⚡ <strong>Fail Rule:</strong> 1 Timer Zero = Game Over</div>
                  </div>
                </details>
              </div>

              <!-- Seed input & roll -->
              <div class="nc-endless-seed-group">
                <label class="nc-endless-seed-label">Run Seed (Determines Map & Procedural Generation):</label>
                <div class="nc-endless-seed-row">
                  <input type="text" id="nc-endless-seed-input" class="nc-endless-seed-input" value="${this._customSeed}" />
                  <button id="nc-btn-roll-seed" class="nc-btn-back-chapters" style="align-self: center; padding: 6px 14px; min-height: 36px; font-size: 0.84rem;" title="Generate new seed">
                    🎲 New
                  </button>
                </div>
              </div>

              ${isSelectedUnlocked ? `
                <button class="nc-level-play-btn nc-btn-continue-level" id="nc-btn-start-endless" style="padding: 12px 24px; font-size: 0.98rem; border-radius: 12px; width: 100%; box-sizing: border-box; margin-top: 6px;">
                  Start Endless Run ▶
                </button>
              ` : `
                <button class="nc-level-play-btn nc-btn-continue-level" id="nc-btn-start-endless" style="padding: 12px 24px; font-size: 0.95rem; border-radius: 12px; width: 100%; box-sizing: border-box; margin-top: 6px; opacity: 0.65; cursor: not-allowed;" disabled>
                  🔒 Locked — ${currentTier.unlockCondition}
                </button>
              `}
            </div>

            <!-- Right Card: Scoring & Personal Bests -->
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div class="nc-endless-card">
                <div class="nc-endless-card-header">
                  <h3 class="nc-endless-card-title">
                    <span>🏆</span> Personal Best Leaderboard
                  </h3>
                </div>
                ${scoresHtml}
              </div>

              <div class="nc-formula-box">
                <span class="nc-formula-tag">
                  SCORING FORMULA
                </span>
                <div class="nc-formula-text">
                  <strong>Score</strong> = <span style="color:var(--color-cyan); font-weight:700;">Seconds Survived</span> + (<span style="color:var(--color-emerald); font-weight:700;">5 &times; Buildings Served</span>) + <span style="color:var(--color-amber); font-weight:700;">Average Citizen Happiness</span>.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Event handlers
    const navPlay = ui.screenEndlessEl.querySelector('#nc-endless-tab-play');
    const navBrand = ui.screenEndlessEl.querySelector('#nc-endless-nav-brand');
    if (navPlay) {
      navPlay.onclick = () => {
        ui._setScreen('campaign');
        ui._renderCampaignScreen();
      };
    }
    if (navBrand) {
      navBrand.onclick = () => {
        ui._setScreen('campaign');
        ui._renderCampaignScreen();
      };
    }

    const navLearn = ui.screenEndlessEl.querySelector('#nc-endless-tab-learn');
    if (navLearn) {
      navLearn.onclick = () => {
        ui._setScreen('learn');
        ui._renderLearnScreen();
      };
    }

    const rollBtn = ui.screenEndlessEl.querySelector('#nc-btn-roll-seed');
    const seedInput = ui.screenEndlessEl.querySelector('#nc-endless-seed-input');
    if (rollBtn && seedInput) {
      rollBtn.onclick = () => {
        this._customSeed = this._generateSeed();
        seedInput.value = this._customSeed;
      };
    }

    // Tier pill click handlers
    const tierPillsContainer = ui.screenEndlessEl.querySelector('#nc-tier-pills');
    if (tierPillsContainer) {
      tierPillsContainer.querySelectorAll('.nc-tier-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          const t = parseInt(pill.dataset.tier, 10);
          if (t >= 1 && t <= 7) {
            this._selectedTier = t;
            this.render();
          }
        });
      });
    }

    const startBtn = ui.screenEndlessEl.querySelector('#nc-btn-start-endless');
    if (startBtn && seedInput && isSelectedUnlocked) {
      startBtn.onclick = () => {
        const seed = seedInput.value.trim() || this._generateSeed();
        ui._startEndlessRun(seed, this._selectedTier);
      };
    }
  }
}
