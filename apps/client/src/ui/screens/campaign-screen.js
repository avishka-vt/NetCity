/**
 * NetCity v2.0 - Campaign Screen
 * Single Responsibility: Renders the Fullscreen Campaign portal,
 * horizontal scrollable chapter carousel, chapter status badges (completed, active, locked),
 * and the chapter level selection drawer.
 */

import { ALL_LEVELS } from '../../../../../packages/content/src/levels.js';

/**
 * Return structured chapter definitions and their associated levels.
 */
export function getChaptersData() {
  return [
    {
      num: 1,
      title: 'The Basics',
      subtitle: 'Physical Network & Wires',
      description: 'Learn the fundamentals of physical cabling. Drag twisted pair wires, bridge distances, eliminate clutter with cabinets, and maintain the 4-port capacity rule.',
      icon: '🏫',
      levels: ALL_LEVELS.filter(l => l.chapter === 1 || l.id.startsWith('1.'))
    },
    {
      num: 2,
      title: 'IP Addresses',
      subtitle: 'Hubs, Switches & MAC',
      description: 'Discover packet collisions inside unmanaged Hubs. Upgrade to intelligent Switches that inspect MAC headers and build hardware forwarding tables.',
      icon: '📦',
      levels: ALL_LEVELS.filter(l => l.chapter === 2 || l.id.startsWith('2.'))
    },
    {
      num: 3,
      title: 'Switches & VLANs',
      subtitle: 'Routers & Two Islands',
      description: 'Traverse rivers between isolated subnets with Routers. Configure device IP addresses and default gateways to reach remote servers.',
      icon: '🌉',
      levels: ALL_LEVELS.filter(l => l.chapter === 3 || l.id.startsWith('3.'))
    },
    {
      num: 4,
      title: 'Routing',
      subtitle: 'Network Services',
      description: 'Automate manual configuration! Deploy DHCP servers for dynamic lease assignment and DNS servers to resolve human-readable domain names.',
      icon: '🧭',
      levels: ALL_LEVELS.filter(l => l.chapter === 4 || l.id.startsWith('4.'))
    },
    {
      num: 5,
      title: 'Security',
      subtitle: 'Organise the City',
      description: 'Partition shared switches into isolated VLAN color zones. Open precise inter-zone router doors and direct traffic with static and dynamic routes.',
      icon: '🛡️',
      levels: ALL_LEVELS.filter(l => l.chapter === 5 || l.id.startsWith('5.'))
    },
    {
      num: 6,
      title: 'WAN & Internet',
      subtitle: 'Guard the Gates',
      description: 'Defend your perimeter! Place Stateful Firewalls to block rogue attackers, enable packet encryption against eavesdroppers, use NAT, and tunnel with VPNs.',
      icon: '🌐',
      levels: ALL_LEVELS.filter(l => l.chapter === 6 || l.id.startsWith('6.'))
    },
    {
      num: 7,
      title: 'Finale',
      subtitle: 'Resilience & NetCity',
      description: 'Engineer fault-tolerant topologies with redundant links, prevent packet storms with Loop Guard, balance high server traffic, and run the NetCity metropolis.',
      icon: '⚡',
      levels: ALL_LEVELS.filter(l => l.chapter === 7 || l.id.startsWith('7.'))
    }
  ];
}

export class CampaignScreen {
  constructor(ui) {
    this.ui = ui;
  }

  render() {
    const ui = this.ui;
    if (!ui.screenCampaignEl) return;

    if (ui._campaignView === 'chapter_levels') {
      this.renderChapterLevelsView();
      return;
    }

    const chapters = getChaptersData();

    // Determine active chapter (first uncompleted chapter, or chapter 1)
    let activeChNum = 1;
    for (const ch of chapters) {
      const completedInCh = ch.levels.filter(l => ui.completedLevels && ui.completedLevels.has(l.id)).length;
      if (completedInCh < ch.levels.length) {
        activeChNum = ch.num;
        break;
      }
    }

    let chaptersHtml = '';
    for (const ch of chapters) {
      const completedInCh = ch.levels.filter(l => ui.completedLevels && ui.completedLevels.has(l.id)).length;
      const totalInCh = ch.levels.length;
      const isCompleted = completedInCh === totalInCh && totalInCh > 0;
      const isActive = ch.num === activeChNum && !isCompleted;
      const isLocked = ch.num > activeChNum && !isCompleted;

      let bottomHtml = '';
      if (isCompleted) {
        bottomHtml = `
          <div class="nc-chapter-card-bottom">
            <div class="nc-chapter-pill-completed">
              <span class="nc-check-circle">✔</span>
              <span>${completedInCh}/${totalInCh}</span>
              <span class="nc-check-circle">✔</span>
            </div>
          </div>
        `;
      } else if (isActive) {
        bottomHtml = `
          <div class="nc-chapter-card-bottom active-state">
            <div class="nc-chapter-progress-pill">
              <span>${completedInCh}/${totalInCh}</span>
              <span class="nc-chevron">›</span>
            </div>
            <button class="nc-btn-continue" data-ch="${ch.num}">Continue</button>
          </div>
        `;
      } else {
        bottomHtml = `
          <div class="nc-chapter-card-bottom">
            <div class="nc-chapter-pill-locked">
              <span>🔒</span>
              <span>Locked</span>
            </div>
          </div>
        `;
      }

      const cardClasses = [
        'nc-chapter-card',
        isActive ? 'nc-chapter-active' : '',
        isCompleted ? 'nc-chapter-completed' : '',
        isLocked ? 'nc-chapter-locked' : ''
      ].filter(Boolean).join(' ');

      chaptersHtml += `
        <div class="${cardClasses}" data-ch="${ch.num}">
          <div class="nc-chapter-card-top">
            <div class="nc-chapter-num">Chapter ${ch.num}</div>
            <div class="nc-chapter-name">${ch.title}</div>
          </div>
          <div class="nc-chapter-asset-stage">
            <img src="./assets/images/chapters/ch${ch.num}.png" alt="${ch.title}" class="nc-chapter-3d-img" onerror="this.src='./assets/images/chapters/ch${ch.num}.svg';" />
          </div>
          ${bottomHtml}
        </div>
      `;
    }

    ui.screenCampaignEl.innerHTML = `
      <header class="nc-app-nav">
        <div class="nc-app-nav-left">
          <div class="nc-app-brand">
            <div class="nc-app-brand-bars">
              <span class="nc-bar bar-1"></span>
              <span class="nc-bar bar-2"></span>
              <span class="nc-bar bar-3"></span>
            </div>
            <span class="nc-app-brand-title">NetCity</span>
          </div>
          <nav class="nc-app-nav-tabs">
            <button class="nc-app-nav-tab active" id="nc-tab-play">
              <span class="nc-play-icon">▶</span> Play
            </button>
            <button class="nc-app-nav-tab" id="nc-tab-endless">
              <span style="font-size:1.1rem; line-height:1;">♾️</span> Endless
            </button>
            <button class="nc-app-nav-tab" id="nc-tab-learn">Learn</button>
          </nav>
        </div>
        <div class="nc-app-nav-right"></div>
      </header>

      <div class="nc-campaign-scrollable">
        <div class="nc-campaign-content-inner">
          <div class="nc-campaign-header">
            <div class="nc-campaign-title-area">
              <h1 class="nc-campaign-heading">Campaign<span class="nc-sparkle">✨</span></h1>
              <p class="nc-campaign-subheading">7 chapters • 44 levels • Learn one concept at a time</p>
            </div>
          </div>

          <div class="nc-chapters-carousel-container">
            <div class="nc-chapters-carousel">
              ${chaptersHtml}
            </div>
          </div>
        </div>
      </div>
    `;

    const tabLearn = ui.screenCampaignEl.querySelector('#nc-tab-learn');
    if (tabLearn) {
      tabLearn.onclick = () => {
        ui._setScreen('learn');
        ui._renderLearnScreen();
      };
    }

    const tabEndless = ui.screenCampaignEl.querySelector('#nc-tab-endless');
    if (tabEndless) {
      tabEndless.onclick = () => {
        ui._setScreen('endless');
        ui._renderEndlessScreen();
      };
    }

    ui.screenCampaignEl.querySelectorAll('.nc-chapter-card, .nc-btn-continue').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        const card = el.closest('.nc-chapter-card') || el;
        const chNum = parseInt(card.getAttribute('data-ch'), 10);
        if (chNum) {
          ui._campaignView = 'chapter_levels';
          ui._currentViewingCh = chNum;
          ui._renderCampaignScreen();
        }
      };
    });
  }

  renderChapterLevelsView() {
    const ui = this.ui;
    if (!ui.screenCampaignEl) return;

    const chapters = getChaptersData();
    const ch = chapters.find(c => c.num === ui._currentViewingCh) || chapters[0];

    // Determine the active (current or first uncompleted) level in this chapter
    const firstUncompleted = ch.levels.find(l => !ui.completedLevels || !ui.completedLevels.has(l.id));
    const activeLevelId = firstUncompleted ? firstUncompleted.id : (ch.levels[0]?.id || '1.1');

    let levelsHtml = '';
    for (const lvl of ch.levels) {
      const isCompleted = ui.completedLevels && ui.completedLevels.has(lvl.id);
      const isActive = lvl.id === activeLevelId;

      let btnText = 'Play';
      if (isActive) {
        btnText = 'Continue';
      } else if (isCompleted) {
        btnText = 'Play';
      }

      const cardClasses = [
        'nc-level-card',
        isActive ? 'nc-level-card-active' : '',
        isCompleted ? 'nc-level-card-done' : ''
      ].filter(Boolean).join(' ');

      levelsHtml += `
        <div class="${cardClasses}" data-id="${lvl.id}">
          <div class="nc-level-card-left">
            <span class="nc-level-id-tag">LEVEL ${lvl.id}</span>
            <div class="nc-level-name">${lvl.title}</div>
            <p class="nc-level-moment">${lvl.learningMoment || ''}</p>
          </div>
          <button class="nc-level-play-btn ${isActive ? 'nc-btn-continue-level' : ''}" data-id="${lvl.id}">
            ${btnText}
          </button>
        </div>
      `;
    }

    ui.screenCampaignEl.innerHTML = `
      <header class="nc-app-nav">
        <div class="nc-app-nav-left">
          <div class="nc-app-brand">
            <div class="nc-app-brand-bars">
              <span class="nc-bar bar-1"></span>
              <span class="nc-bar bar-2"></span>
              <span class="nc-bar bar-3"></span>
            </div>
            <span class="nc-app-brand-title">NetCity</span>
          </div>
          <nav class="nc-app-nav-tabs">
            <button class="nc-app-nav-tab active" id="nc-tab-play">
              <span class="nc-play-icon">▶</span> Play
            </button>
            <button class="nc-app-nav-tab" id="nc-tab-endless">
              <span style="font-size:1.1rem; line-height:1;">♾️</span> Endless
            </button>
            <button class="nc-app-nav-tab" id="nc-tab-learn">Learn</button>
          </nav>
        </div>
        <div class="nc-app-nav-right"></div>
      </header>

      <div class="nc-campaign-scrollable">
        <div class="nc-campaign-content-inner">
          <div class="nc-chapter-levels-header">
            <button class="nc-btn-back-chapters" id="nc-btn-back-chapters">
              <span>←</span> All Chapters
            </button>
            <div class="nc-chapter-banner-info">
              <span class="nc-chapter-pill">CHAPTER ${ch.num} • ${ch.levels.length} LEVELS</span>
              <h2 class="nc-chapter-banner-title">${ch.title} &mdash; <span class="nc-chapter-banner-subtitle">${ch.subtitle}</span></h2>
              <p class="nc-chapter-banner-desc">${ch.description}</p>
            </div>
          </div>

          <div class="nc-levels-grid">
            ${levelsHtml}
          </div>
        </div>
      </div>
    `;

    const tabLearn = ui.screenCampaignEl.querySelector('#nc-tab-learn');
    if (tabLearn) {
      tabLearn.onclick = () => {
        ui._setScreen('learn');
        ui._renderLearnScreen();
      };
    }

    const tabEndless = ui.screenCampaignEl.querySelector('#nc-tab-endless');
    if (tabEndless) {
      tabEndless.onclick = () => {
        ui._setScreen('endless');
        ui._renderEndlessScreen();
      };
    }

    const backBtn = ui.screenCampaignEl.querySelector('#nc-btn-back-chapters');
    if (backBtn) {
      backBtn.onclick = () => {
        ui._campaignView = 'chapters';
        ui._renderCampaignScreen();
      };
    }

    ui.screenCampaignEl.querySelectorAll('.nc-level-card, .nc-level-play-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (id) {
          ui._loadLevel(id, ui._randomSeed());
          ui._setScreen('game');
        }
      };
    });
  }
}
