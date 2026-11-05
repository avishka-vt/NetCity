/**
 * NetCity v2.0 - Endless Screen
 * Single Responsibility: Renders the Endless Mode Portal,
 * Unlocked tier indicators, seed generator, high scores leaderboard, and game launcher.
 */

import { getUnlockedTier, getEndlessSetup } from '../../../../../packages/content/src/endless-config.js';

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
    if (this._selectedTier === undefined || this._selectedTier > maxTier) {
      this._selectedTier = maxTier;
    }
    const highScores = ui.stateManager ? ui.stateManager.loadEndlessHighScores() : [];

    const tierDescriptions = {
      1: 'Chapter 1: The Basics — Twisted Pair, Coaxial, Fiber & Wireless',
      2: 'Chapter 2: Switches & Hubs — MAC Address Learning & Computer Labs',
      3: 'Chapter 3: Routers & Subnets — Inter-Network Routing, Homes & Libraries',
      4: 'Chapter 4: Services — DHCP Dynamic Leases, DNS Resolution & Web Servers',
      5: 'Chapter 5: Organisation — VLAN Color Zones, Static Routes & RIP Gossip',
      6: 'Chapter 6: Protection — Stateful Firewalls, VPN Tunnels & Encrypted Links',
      7: 'Chapter 7: Resilience — Server Balancing, Loop Guard & Backup Power UPS'
    };

    let scoresHtml = '';
    if (highScores.length === 0) {
      scoresHtml = `
        <div style="padding: 24px; text-align: center; color: #8fa2be; font-size: 0.88rem;">
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
            <td style="font-weight: 800; color: #00d2ff; font-family: var(--font-mono);">${h.score.toLocaleString()}</td>
            <td>${Math.floor(h.secondsSurvived / 60)}m ${h.secondsSurvived % 60}s</td>
            <td>${h.buildingsServed}</td>
            <td style="color: #10b981; font-weight: 700;">${h.averageHappiness}%</td>
            <td><code style="font-size: 0.76rem; color: #8fa2be;">${h.seed}</code></td>
          </tr>
        `;
      });

      scoresHtml = `
        <table class="nc-endless-table" style="width: 100%; border-collapse: collapse; font-size: 0.84rem; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #8fa2be;">
              <th style="padding: 8px 10px;">Rank</th>
              <th style="padding: 8px 10px;">Score</th>
              <th style="padding: 8px 10px;">Survived</th>
              <th style="padding: 8px 10px;">Buildings</th>
              <th style="padding: 8px 10px;">Happiness</th>
              <th style="padding: 8px 10px;">Seed</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;
    }

    // Build tier selection pills HTML
    const tierLabels = {
      1: 'Tier 1 — Basics',
      2: 'Tier 2 — Switches',
      3: 'Tier 3 — Routers',
      4: 'Tier 4 — Services',
      5: 'Tier 5 — VLANs',
      6: 'Tier 6 — Security',
      7: 'Tier 7 — Resilience'
    };
    let tierPillsHtml = '';
    for (let t = 1; t <= 7; t++) {
      const unlocked = t <= maxTier;
      const selected = t === this._selectedTier;
      const style = selected
        ? 'background: rgba(0,210,255,0.18); border: 2px solid #00d2ff; color: #00d2ff; cursor: pointer;'
        : unlocked
          ? 'background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.15); color: #cbd5e1; cursor: pointer;'
          : 'background: rgba(255,255,255,0.02); border: 2px solid rgba(255,255,255,0.06); color: #4a5568; cursor: not-allowed; opacity: 0.5;';
      const icon = unlocked ? '' : '🔒 ';
      tierPillsHtml += `
        <button
          class="nc-tier-pill"
          data-tier="${t}"
          ${!unlocked ? 'disabled' : ''}
          style="padding: 8px 14px; border-radius: 10px; font-size: 0.82rem; font-weight: 700; font-family: var(--font-mono); ${style} transition: all 0.15s;"
        >${icon}${tierLabels[t] || `Tier ${t}`}</button>
      `;
    }

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
        <div class="nc-app-nav-right"></div>
      </header>

      <div class="nc-campaign-scrollable">
        <div class="nc-campaign-content-inner" style="max-width: 1200px;">
          <div class="nc-chapter-levels-header" style="border:none; padding-bottom: 0;">
            <div class="nc-chapter-banner-info">
              <span class="nc-chapter-pill">INFINITE NETWORK SIMULATION &bull; SECTION 6.1</span>
              <h1 class="nc-chapter-banner-title" style="font-size: 2.2rem;">Endless Metropolis</h1>
              <p class="nc-chapter-banner-desc">
                A procedurally generated city that grows without end. Buildings pop up faster over time, demand surges, and random events strike. Every building is required&mdash;if any timer expires, the run ends!
              </p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 12px;">
            <!-- Left Card: Launch & Setup -->
            <div class="nc-level-card" style="flex-direction: column; align-items: stretch; padding: 24px; gap: 18px; min-height: auto; cursor: default;">

              <!-- Tier selection -->
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <span style="font-size: 0.74rem; font-weight: 800; color: #00d2ff; text-transform: uppercase; font-family: var(--font-mono);">
                  SELECT DIFFICULTY TIER
                </span>
                <div id="nc-tier-pills" style="display: flex; flex-wrap: wrap; gap: 8px;">
                  ${tierPillsHtml}
                </div>
                <p id="nc-tier-desc" style="margin: 0; font-size: 0.82rem; color: #8fa2be; line-height: 1.45; min-height: 2.6em;">
                  ${tierDescriptions[this._selectedTier] || tierDescriptions[1]}
                </p>
              </div>

              <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 14px; font-size: 0.82rem; color: #cbd5e1; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>🗺️ <strong>Map:</strong> 32 &times; 18 Squares</div>
                <div>🪙 <strong>Starting Budget:</strong> 80 Coins</div>
                <div>🏢 <strong>Initial Start:</strong> 3 Buildings</div>
                <div>⚡ <strong>Fail Rule:</strong> 1 Timer Zero = Game Over</div>
              </div>

              <!-- Seed input & roll -->
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <label style="font-size: 0.78rem; font-weight: 700; color: #8fa2be;">Run Seed (Determines Map & Procedural Generation):</label>
                <div style="display: flex; gap: 8px;">
                  <input type="text" id="nc-endless-seed-input" value="${this._customSeed}" style="flex: 1; background: #060e22; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 10px; color: #00d2ff; padding: 8px 14px; font-family: var(--font-mono); font-size: 0.88rem; font-weight: 700;" />
                  <button id="nc-btn-roll-seed" class="nc-btn-back-chapters" style="padding: 6px 14px; align-self: center;" title="Generate new seed">
                    🎲 New
                  </button>
                </div>
              </div>

              <button class="nc-level-play-btn nc-btn-continue-level" id="nc-btn-start-endless" style="padding: 14px 28px; font-size: 1.05rem; border-radius: 14px; width: 100%; box-sizing: border-box; margin-top: 6px;">
                Start Endless Run ▶
              </button>
            </div>

            <!-- Right Card: Scoring & Personal Bests -->
            <div style="display: flex; flex-direction: column; gap: 18px;">
              <div class="nc-level-card" style="flex-direction: column; align-items: stretch; padding: 20px 24px; gap: 12px; min-height: auto; cursor: default;">
                <h3 style="margin: 0; color: #ffffff; font-size: 1.05rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                  <span>🏆</span> Personal Best Leaderboard
                </h3>
                ${scoresHtml}
              </div>

              <div class="nc-level-card" style="flex-direction: column; align-items: stretch; padding: 18px 24px; gap: 10px; min-height: auto; cursor: default; background: rgba(8, 20, 48, 0.6);">
                <span style="font-size: 0.74rem; font-weight: 800; color: #ffd166; text-transform: uppercase;">
                  SCORING FORMULA (§6.1)
                </span>
                <div style="font-size: 0.84rem; color: #8fa2be; line-height: 1.5;">
                  <strong>Score</strong> = <span style="color:#00d2ff;">Seconds Survived</span> + (<span style="color:#10b981;">5 &times; Buildings Served</span>) + <span style="color:#ffd166;">Average Citizen Happiness</span>.
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
    const tierDescEl = ui.screenEndlessEl.querySelector('#nc-tier-desc');
    if (tierPillsContainer) {
      tierPillsContainer.querySelectorAll('.nc-tier-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          const t = parseInt(pill.dataset.tier, 10);
          if (!pill.disabled && t <= maxTier) {
            this._selectedTier = t;
            // Update visual state of all pills
            tierPillsContainer.querySelectorAll('.nc-tier-pill').forEach(p => {
              const pt = parseInt(p.dataset.tier, 10);
              const isSelected = pt === t;
              const isUnlocked = pt <= maxTier;
              p.style.background = isSelected
                ? 'rgba(0,210,255,0.18)'
                : isUnlocked ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)';
              p.style.borderColor = isSelected
                ? '#00d2ff'
                : isUnlocked ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)';
              p.style.color = isSelected
                ? '#00d2ff'
                : isUnlocked ? '#cbd5e1' : '#4a5568';
            });
            if (tierDescEl) {
              tierDescEl.textContent = tierDescriptions[t] || tierDescriptions[1];
            }
          }
        });
      });
    }

    const startBtn = ui.screenEndlessEl.querySelector('#nc-btn-start-endless');
    if (startBtn && seedInput) {
      startBtn.onclick = () => {
        const seed = seedInput.value.trim() || this._generateSeed();
        ui._startEndlessRun(seed, this._selectedTier);
      };
    }
  }
}
