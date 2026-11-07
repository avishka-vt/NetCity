/**
 * NetCity v2.0 - Campaign Screen
 * Single Responsibility: Renders the Fullscreen Campaign portal,
 * horizontal scrolling road map across a twilight skyline with glowing pedestals,
 * glowing neon fiber-optic cable winding from classroom to finale metropolis,
 * prominent active chapter spotlight card, mysterious locked silhouettes with teasers,
 * "Test Out" jump-ahead capabilities, and the chapter level selection drawer.
 */

import { ALL_LEVELS } from '../../../../../packages/content/src/levels.js';

/**
 * Return structured chapter definitions with core titles matching the theme mockup,
 * action-oriented achievement subtitles, teasers, and associated levels.
 */
export function getChaptersData() {
  return [
    {
      num: 1,
      title: 'The Basics',
      achievementTitle: 'Wire Your First Classroom',
      subtitle: 'The Basics: Physical Cables & Wires',
      teaser: 'Chapter 1: Lay copper cables & plug in your very first building',
      description: 'Learn the fundamentals of physical cabling. Drag twisted pair wires, conquer distance reach, eliminate clutter with cabinets, and maintain the 4-port capacity rule.',
      icon: '🏫',
      levels: ALL_LEVELS.filter(l => l.chapter === 1 || l.id.startsWith('1.'))
    },
    {
      num: 2,
      title: 'IP Addresses',
      achievementTitle: 'Connect the Whole School',
      subtitle: 'IP Addresses: Hubs, Switches & MAC',
      teaser: 'Chapter 2: Stop packet crashes & teach switches device memories',
      description: 'Discover packet collisions inside unmanaged Hubs. Upgrade to intelligent Switches that inspect MAC headers and build hardware forwarding tables.',
      icon: '📦',
      levels: ALL_LEVELS.filter(l => l.chapter === 2 || l.id.startsWith('2.'))
    },
    {
      num: 3,
      title: 'Switches & VLANs',
      achievementTitle: 'Bridge Across the River',
      subtitle: 'Switches & VLANs: Routers & Two Islands',
      teaser: 'Chapter 3: Cross the river & guide laptops through default gateways',
      description: 'Traverse rivers between isolated subnets with Routers. Configure device IP addresses and default gateways to reach remote servers.',
      icon: '🌉',
      levels: ALL_LEVELS.filter(l => l.chapter === 3 || l.id.startsWith('3.'))
    },
    {
      num: 4,
      title: 'Routing',
      achievementTitle: 'Make Packets Find Their Way',
      subtitle: 'Routing: DHCP, DNS & Network Services',
      teaser: 'Chapter 4: Make packets find their way — automate addresses & names',
      description: 'Automate manual configuration! Deploy DHCP servers for dynamic lease assignment and DNS servers to resolve human-readable domain names.',
      icon: '🧭',
      levels: ALL_LEVELS.filter(l => l.chapter === 4 || l.id.startsWith('4.'))
    },
    {
      num: 5,
      title: 'Security',
      achievementTitle: 'Organise the City Zones',
      subtitle: 'Security: VLANs & Department Routing',
      teaser: 'Chapter 5: Divide departments into color zones & route traffic',
      description: 'Partition shared switches into isolated VLAN color zones. Open precise inter-zone router doors and direct traffic with static and dynamic routes.',
      icon: '🛡️',
      levels: ALL_LEVELS.filter(l => l.chapter === 5 || l.id.startsWith('5.'))
    },
    {
      num: 6,
      title: 'WAN & Internet',
      achievementTitle: 'Guard the City Gates',
      subtitle: 'WAN & Internet: Firewalls, Encryption & VPNs',
      teaser: 'Chapter 6: Block rogue cyber-attacks & tunnel safely through the web',
      description: 'Defend your perimeter! Place Stateful Firewalls to block rogue attackers, enable packet encryption against eavesdroppers, use NAT, and tunnel with VPNs.',
      icon: '🌐',
      levels: ALL_LEVELS.filter(l => l.chapter === 6 || l.id.startsWith('6.'))
    },
    {
      num: 7,
      title: 'Finale',
      achievementTitle: 'Build the Unstoppable Metropolis',
      subtitle: 'Finale: Resilience & NetCity',
      teaser: 'Chapter 7: Master failovers & keep NetCity running through anything',
      description: 'Engineer fault-tolerant topologies with redundant links, prevent packet storms with Loop Guard, balance high server traffic, and run the NetCity metropolis.',
      icon: '🏆',
      levels: ALL_LEVELS.filter(l => l.chapter === 7 || l.id.startsWith('7.'))
    }
  ];
}

/**
 * Compute deterministic layout coordinates for level nodes across the 1440x760 canvas
 */
export function getLevelMapCoordinates(index, total) {
  // Beautiful undulating S-curve coordinates strictly matching the reference design.
  // Nodes are kept in a balanced, comfortable vertical band (y: 280 to 515) on the 1440x760 canvas,
  // preventing any nodes from sinking too low or touching the screen bottom.

  // 9-Level Chapter (e.g. Chapter 1)
  const coords9 = [
    { x: 130, y: 460 }, // 1.1 First Link
    { x: 280, y: 505 }, // 1.2 Copper Cable (gentle valley)
    { x: 440, y: 400 }, // 1.3 Coaxial Cable (crest)
    { x: 600, y: 490 }, // 1.4 Fiber Optics (valley)
    { x: 750, y: 510 }, // 1.5 Security (gentle low)
    { x: 890, y: 460 }, // 1.6 Routing (mid)
    { x: 1020, y: 400 }, // 1.7 Bandwidth (crest)
    { x: 1140, y: 450 }, // 1.8 Redundancy (mid step)
    { x: 1260, y: 280 }  // 1.9 Campus Finale (Elevated Datacenter)
  ];

  if (total === 9 && coords9[index]) {
    return coords9[index];
  }

  // 8-Level Chapter (e.g. Chapter 3: Routers & Two Islands)
  const coords8 = [
    { x: 140, y: 460 }, // 3.1 Two Islands (Local Network)
    { x: 290, y: 505 }, // 3.2 The Router: Connecting the Two Islands
    { x: 450, y: 405 }, // 3.3 IP Addresses: House Numbers (crest)
    { x: 610, y: 495 }, // 3.4 Same Street or Different Street?
    { x: 770, y: 510 }, // 3.5 The Front Door (Default Gateway)
    { x: 920, y: 465 }, // 3.6 Address Clash (Duplicate IPs)
    { x: 1070, y: 405 }, // 3.7 Two Routers (Multi-Hop crest)
    { x: 1260, y: 280 }  // 3.8 Campus Finale (Elevated Datacenter)
  ];

  if (total === 8 && coords8[index]) {
    return coords8[index];
  }

  // 6-Level Chapter (e.g. Chapter 4 & Chapter 7)
  const coords6 = [
    { x: 150, y: 460 },
    { x: 370, y: 505 },
    { x: 590, y: 405 },
    { x: 810, y: 495 },
    { x: 1040, y: 420 },
    { x: 1260, y: 280 }
  ];

  if (total === 6 && coords6[index]) {
    return coords6[index];
  }

  // 5-Level Chapter (e.g. Chapter 2, Chapter 5, Chapter 6)
  const coords5 = [
    { x: 160, y: 460 },
    { x: 420, y: 505 },
    { x: 700, y: 405 },
    { x: 980, y: 480 },
    { x: 1260, y: 280 }
  ];

  if (total === 5 && coords5[index]) {
    return coords5[index];
  }

  // Generalized smooth wave mapping for any other chapter lengths
  const minX = 140;
  const maxX = 1260;
  const t = total > 1 ? index / (total - 1) : 0.5;
  const x = Math.round(minX + t * (maxX - minX));

  if (index === total - 1) {
    return { x: maxX, y: 280 };
  }

  const normT = index / Math.max(1, total - 2);
  const y = Math.round(465 + Math.sin(normT * Math.PI * 2.5) * 50);
  return { x, y };
}

/**
 * Map level titles and concepts to corresponding 3D isometric device visuals
 */
export function getLevelVisualMeta(levelDef, index, totalInCh) {
  const isFinale = (index === totalInCh - 1);
  if (isFinale) {
    return {
      type: 'datacenter',
      img: './assets/images/devices/server.png',
      fallbackImg: './assets/images/buildings/school.png',
      label: 'Campus Finale',
      isFinale: true
    };
  }

  const titleLower = (levelDef.title || '').toLowerCase();
  const concept = (levelDef.concept || '').toLowerCase();

  // Clean short label from title
  const cleanLabel = levelDef.title.replace(/^[0-9.]+\s*/, '');

  if (concept.includes('first_link') || titleLower.includes('laptop') || titleLower.includes('first link')) {
    return {
      type: 'laptop',
      img: './assets/images/buildings/laptop.png',
      fallbackImg: './assets/images/buildings/laptop.svg',
      label: cleanLabel || 'First Link'
    };
  }
  if (concept.includes('copper') || concept.includes('twisted') || titleLower.includes('copper')) {
    return {
      type: 'switch',
      img: './assets/images/devices/switch.png',
      fallbackImg: './assets/images/devices/switch.svg',
      label: cleanLabel || 'Copper Cable'
    };
  }
  if (concept.includes('coaxial') || titleLower.includes('coaxial')) {
    return {
      type: 'access_point',
      img: './assets/images/devices/access_point.png',
      fallbackImg: './assets/images/devices/ap.png',
      label: cleanLabel || 'Coaxial Cable'
    };
  }
  if (concept.includes('fiber') || titleLower.includes('fiber')) {
    return {
      type: 'fiber',
      img: './assets/images/devices/switch.png',
      fallbackImg: './assets/images/devices/switch.svg',
      label: cleanLabel || 'Fiber Optics'
    };
  }
  if (concept.includes('security') || concept.includes('firewall') || titleLower.includes('security') || titleLower.includes('firewall')) {
    return {
      type: 'firewall',
      img: './assets/images/devices/firewall.svg',
      fallbackImg: './assets/images/devices/server.png',
      label: cleanLabel || 'Security'
    };
  }
  if (concept.includes('router') || concept.includes('routing') || titleLower.includes('router')) {
    return {
      type: 'router',
      img: './assets/images/devices/router.png',
      fallbackImg: './assets/images/devices/router.svg',
      label: cleanLabel || 'Routing'
    };
  }
  if (concept.includes('dhcp') || titleLower.includes('dhcp')) {
    return {
      type: 'dhcp',
      img: './assets/images/devices/dhcp_server.png',
      fallbackImg: './assets/images/devices/server.png',
      label: cleanLabel || 'DHCP'
    };
  }
  if (concept.includes('dns') || titleLower.includes('dns')) {
    return {
      type: 'dns',
      img: './assets/images/devices/dns_server.png',
      fallbackImg: './assets/images/devices/server.png',
      label: cleanLabel || 'DNS'
    };
  }
  if (concept.includes('hub') || titleLower.includes('hub')) {
    return {
      type: 'hub',
      img: './assets/images/devices/hub.png',
      fallbackImg: './assets/images/devices/hub.svg',
      label: cleanLabel || 'Hub'
    };
  }

  return {
    type: 'server',
    img: './assets/images/devices/server.png',
    fallbackImg: './assets/images/buildings/classroom.png',
    label: cleanLabel || levelDef.title
  };
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
    const totalChapters = chapters.length;

    // Gentle wave offsets matching the rolling terrain in the theme mockup
    const waveOffsets = ['wave-low', 'wave-mid', 'wave-high', 'wave-mid', 'wave-low', 'wave-low', 'wave-high'];

    chapters.forEach((ch, idx) => {
      const completedInCh = ch.levels.filter(l => ui.completedLevels && ui.completedLevels.has(l.id)).length;
      const totalInCh = ch.levels.length;
      const isCompleted = completedInCh === totalInCh && totalInCh > 0;
      const isActive = ch.num === activeChNum && !isCompleted;
      const isLocked = ch.num > activeChNum && !isCompleted;
      const waveClass = waveOffsets[idx] || 'wave-mid';

      let bottomHtml = '';
      let assetStageHtml = '';

      if (isCompleted) {
        bottomHtml = `
          <div class="nc-chapter-card-bottom nc-bottom-completed">
            <div class="nc-completed-badge" title="Chapter Completed!">
              <span class="nc-check-circle">✔</span>
            </div>
            <div class="nc-chapter-pill-completed">
              <span>${completedInCh}/${totalInCh} Done</span>
            </div>
          </div>
        `;
        assetStageHtml = `
          <div class="nc-chapter-asset-stage nc-stage-completed">
            <div class="nc-pedestal-disk nc-pedestal-cyan">
              <div class="nc-pedestal-rim"></div>
              <img src="./assets/images/chapters/ch${ch.num}.png" alt="${ch.title}" class="nc-chapter-3d-img" onerror="this.src='./assets/images/chapters/ch${ch.num}.svg';" />
            </div>
          </div>
        `;
      } else if (isActive) {
        bottomHtml = `
          <div class="nc-chapter-card-bottom active-state">
            <div class="nc-chapter-progress-pill">
              <span>${completedInCh}/${totalInCh}</span>
            </div>
            <button class="nc-btn-continue" data-ch="${ch.num}">Continue</button>
          </div>
        `;
        assetStageHtml = `
          <div class="nc-chapter-asset-stage nc-stage-active">
            <div class="nc-pedestal-disk nc-pedestal-active">
              <div class="nc-halo-ring"></div>
              <div class="nc-pedestal-rim"></div>
              <img src="./assets/images/chapters/ch${ch.num}.png" alt="${ch.title}" class="nc-chapter-3d-img" onerror="this.src='./assets/images/chapters/ch${ch.num}.svg';" />
            </div>
          </div>
        `;
      } else if (ch.num === 7) {
        // Finale Chapter with Golden Trophy
        bottomHtml = `
          <div class="nc-chapter-card-bottom nc-bottom-finale">
            <div class="nc-trophy-badge" title="Final Capstone Challenge!">
              <span class="nc-trophy-glyph">🏆</span>
            </div>
            <button class="nc-btn-test-out" data-ch="${ch.num}">
              ⚡ Test Out
            </button>
          </div>
        `;
        assetStageHtml = `
          <div class="nc-chapter-asset-stage nc-stage-finale">
            <div class="nc-pedestal-disk nc-pedestal-gold">
              <div class="nc-pedestal-rim"></div>
              <img src="./assets/images/chapters/ch7.png" alt="${ch.title}" class="nc-chapter-3d-img nc-trophy-img" onerror="this.src='./assets/images/chapters/ch7.svg';" />
            </div>
          </div>
        `;
      } else {
        // Locked Chapter with Padlock Shield & Test Out
        bottomHtml = `
          <div class="nc-chapter-card-bottom nc-bottom-locked">
            <div class="nc-locked-badge" title="Locked Chapter — beat previous chapter or Test Out!">
              <span class="nc-lock-icon">🔒</span>
            </div>
            <div class="nc-chapter-teaser-box">
              <p class="nc-teaser-text">“${ch.teaser}”</p>
            </div>
            <button class="nc-btn-test-out" data-ch="${ch.num}">
              ⚡ Test Out
            </button>
          </div>
        `;
        assetStageHtml = `
          <div class="nc-chapter-asset-stage nc-stage-locked">
            <div class="nc-pedestal-disk nc-pedestal-locked">
              <div class="nc-pedestal-rim"></div>
              <div class="nc-padlock-shield">
                <span class="nc-shield-lock-icon">🔒</span>
              </div>
              <img src="./assets/images/chapters/ch${ch.num}.png" alt="${ch.title}" class="nc-chapter-3d-img nc-silhouette" onerror="this.src='./assets/images/chapters/ch${ch.num}.svg';" />
            </div>
          </div>
        `;
      }

      const cardClasses = [
        'nc-chapter-card',
        'nc-path-node',
        waveClass,
        isActive ? 'nc-chapter-active' : '',
        isCompleted ? 'nc-chapter-completed' : '',
        isLocked ? 'nc-chapter-locked' : ''
      ].filter(Boolean).join(' ');

      // Glowing fiber cable connector between chapters
      let connectorHtml = '';
      if (idx < totalChapters - 1) {
        const nextIsLocked = (idx + 1) >= activeChNum;
        const connectorClass = nextIsLocked ? 'cable-locked-purple' : 'cable-active-cyan';
        connectorHtml = `
          <div class="nc-path-connector ${connectorClass}">
            <div class="nc-cable-glow"></div>
            <div class="nc-cable-wire"></div>
            <div class="nc-stepping-stone stone-1"></div>
          </div>
        `;
      }

      chaptersHtml += `
        <div class="nc-path-node-wrapper ${waveClass}">
          <div class="${cardClasses}" data-ch="${ch.num}">
            <div class="nc-chapter-card-top">
              <div class="nc-chapter-num-badge">CHAPTER ${ch.num}</div>
              <h2 class="nc-chapter-name">${ch.title}</h2>
              <div class="nc-chapter-subtitle-pill">${ch.subtitle}</div>
              <div class="nc-chapter-achievement-pill">${ch.achievementTitle}</div>
            </div>
            ${assetStageHtml}
            ${bottomHtml}
          </div>
          ${connectorHtml}
        </div>
      `;
    });

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
        <div class="nc-app-nav-right">
          <button class="nc-btn-restart-progress" id="nc-btn-restart-progress" title="Restart your career from Chapter 1">
            🔄 Reset Progress
          </button>
          <div class="nc-user-profile-icon" title="Player Profile">
            <span class="nc-avatar-glyph">👤</span>
          </div>
        </div>
      </header>

      <!-- Atmospheric Dusk Landscape Backdrop -->
      <div class="nc-campaign-backdrop" aria-hidden="true">
        <div class="nc-sky-stars"></div>
        <div class="nc-cityscape-layer">
          <svg class="nc-cityscape-svg" viewBox="0 0 1600 360" preserveAspectRatio="none">
            <defs>
              <linearGradient id="ncHillsFar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#0e2a56" stop-opacity="0.8"/>
                <stop offset="100%" stop-color="#061633" stop-opacity="0.95"/>
              </linearGradient>
              <linearGradient id="ncHillsNear" x1="0" y1="0" x2="0" y2="1">
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
            <path d="M 0,260 Q 220,180 500,240 T 1100,220 T 1600,250 L 1600,360 L 0,360 Z" fill="url(#ncHillsFar)" />
            
            <!-- Rolling Hills Foreground Layer & River Valley -->
            <path d="M 0,290 Q 300,230 750,280 T 1600,270 L 1600,360 L 0,360 Z" fill="url(#ncHillsNear)" />
          </svg>
        </div>
      </div>

      <div class="nc-campaign-scrollable nc-campaign-main-scroll">
        <div class="nc-campaign-content-inner">
          <div class="nc-campaign-header">
            <div class="nc-campaign-title-area">
              <h1 class="nc-campaign-heading">Campaign <span class="nc-sparkle">✨</span></h1>
              <p class="nc-campaign-subheading">7 chapters • 44 levels • Learn one concept at a time</p>
            </div>
          </div>

          <!-- Horizontal Scrolling Road Map Container -->
          <div class="nc-chapters-carousel-container nc-horizontal-path-container nc-vertical-path-container">
            <div class="nc-chapters-carousel nc-horizontal-path nc-vertical-path">
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

    const resetBtn = ui.screenCampaignEl.querySelector('#nc-btn-restart-progress');
    if (resetBtn) {
      resetBtn.onclick = () => {
        const ok = (typeof confirm === 'function')
          ? confirm('Restart all progress and start fresh from Chapter 1?')
          : true;
        if (!ok) return;
        ui.resetProgress();
      };
    }

    ui.screenCampaignEl.querySelectorAll('.nc-chapter-card, .nc-btn-continue, .nc-btn-test-out').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        const card = el.closest('.nc-chapter-card') || el;
        const chNum = parseInt(card.getAttribute('data-ch') || el.getAttribute('data-ch'), 10);
        const isTestOut = el.classList.contains('nc-btn-test-out');
        if (chNum) {
          ui._campaignView = 'chapter_levels';
          ui._currentViewingCh = chNum;
          ui._isTestOutMode = isTestOut;
          ui._renderCampaignScreen();
        }
      };
    });

    // Auto-scroll horizontally to bring the active chapter into view
    try {
      const activeCard = ui.screenCampaignEl.querySelector('.nc-chapter-active');
      if (activeCard && typeof activeCard.scrollIntoView === 'function') {
        setTimeout(() => {
          activeCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }, 60);
      }
    } catch (_) {}
  }

  renderChapterLevelsView() {
    const ui = this.ui;
    if (!ui.screenCampaignEl) return;

    const chapters = getChaptersData();
    const ch = chapters.find(c => c.num === ui._currentViewingCh) || chapters[0];

    // Clean subtitle to avoid repetition (e.g. "The Basics: The Basics: Physical Cables")
    const cleanSubtitle = (ch.subtitle || '').replace(new RegExp(`^${ch.title}:?\\s*`, 'i'), '');

    // Determine the active level in this chapter
    const firstUncompleted = ch.levels.find(l => !ui.completedLevels || !ui.completedLevels.has(l.id));
    const activeLevelId = firstUncompleted ? firstUncompleted.id : (ch.levels[0]?.id || '1.1');
    const lastLevel = ch.levels[ch.levels.length - 1];

    // Selected level defaults to activeLevelId if not set or not in current chapter
    if (!ui._selectedLevelId || !ch.levels.some(l => l.id === ui._selectedLevelId)) {
      ui._selectedLevelId = activeLevelId;
    }
    const selectedLevel = ch.levels.find(l => l.id === ui._selectedLevelId) || ch.levels[0];

    const totalLevels = ch.levels.length;
    const levelCoords = ch.levels.map((lvl, idx) => getLevelMapCoordinates(idx, totalLevels));
    const selectedIndex = ch.levels.findIndex(l => l.id === ui._selectedLevelId);
    const selectedCoords = levelCoords[selectedIndex >= 0 ? selectedIndex : 0];
    const selectedVisual = getLevelVisualMeta(selectedLevel, selectedIndex >= 0 ? selectedIndex : 0, totalLevels);
    const selectedIsCompleted = Boolean(ui.completedLevels && ui.completedLevels.has(selectedLevel.id));

    // 1. Build Smooth Cable Paths with Mini Motorways Animated Packets
    let cablesSvgHtml = '';
    for (let i = 0; i < totalLevels - 1; i++) {
      const p1 = levelCoords[i];
      const p2 = levelCoords[i + 1];
      const lvlA = ch.levels[i];
      const lvlB = ch.levels[i + 1];

      const isACompleted = Boolean(ui.completedLevels && ui.completedLevels.has(lvlA.id));
      const isReached = isACompleted; // Connection is active/flowed if source is completed

      const yOff = 14;
      const p1x = p1.x;
      const p1y = p1.y + yOff;
      const p2x = p2.x;
      const p2y = p2.y + yOff;
      const dx = p2x - p1x;
      const cx1 = Math.round(p1x + dx * 0.45);
      const cy1 = p1y;
      const cx2 = Math.round(p1x + dx * 0.55);
      const cy2 = p2y;
      const pathD = `M ${p1x},${p1y} C ${cx1},${cy1} ${cx2},${cy2} ${p2x},${p2y}`;

      // Color variation for completed links: orange for copper in early levels, cyan for fiber/high speed
      const isOrangeLink = (i === 0 && ch.num === 1);
      const cableGrad = isOrangeLink ? 'url(#ncCableOrangeGrad)' : 'url(#ncCableCyanGrad)';

      if (isReached) {
        cablesSvgHtml += `
          <!-- Glowing Completed Cable ${lvlA.id} -> ${lvlB.id} -->
          <path d="${pathD}" fill="none" stroke="${cableGrad}" stroke-width="5" stroke-linecap="round" filter="url(#ncCableGlow)" />
          <path d="${pathD}" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" opacity="0.85" />
          
          <!-- Mini Motorways: Rapid Animated Data Traffic Flow -->
          <circle r="3.5" fill="#ffffff" filter="url(#ncPacketGlow)">
            <animateMotion dur="1.6s" repeatCount="indefinite" path="${pathD}" />
          </circle>
          <circle r="3" fill="#00f0ff" filter="url(#ncPacketGlow)">
            <animateMotion dur="1.6s" begin="0.4s" repeatCount="indefinite" path="${pathD}" />
          </circle>
          <circle r="3.5" fill="#ffffff" filter="url(#ncPacketGlow)">
            <animateMotion dur="1.6s" begin="0.8s" repeatCount="indefinite" path="${pathD}" />
          </circle>
          <circle r="3" fill="#38bdf8" filter="url(#ncPacketGlow)">
            <animateMotion dur="1.6s" begin="1.2s" repeatCount="indefinite" path="${pathD}" />
          </circle>
        `;
      } else {
        cablesSvgHtml += `
          <!-- Locked / Unplugged Cable ${lvlA.id} -> ${lvlB.id} -->
          <path d="${pathD}" fill="none" stroke="rgba(148, 163, 184, 0.3)" stroke-width="3" stroke-dasharray="6, 6" stroke-linecap="round" />
        `;
      }
    }

    // 2. Build 3D Hexagonal Pedestals & Device Visuals in SVG
    let pedestalsSvgHtml = '';
    let nodesHtml = '';

    ch.levels.forEach((lvl, idx) => {
      const p = levelCoords[idx];
      const isCompleted = Boolean(ui.completedLevels && ui.completedLevels.has(lvl.id));
      const isActive = lvl.id === activeLevelId;
      const isSelected = lvl.id === ui._selectedLevelId;
      const isLocked = !isCompleted && !isActive;
      const visual = getLevelVisualMeta(lvl, idx, totalLevels);
      const isFinale = visual.isFinale;

      const hw = isFinale ? 68 : 48;
      const hh = isFinale ? 30 : 22;
      const extH = 15;

      // Hexagon vertices
      const p0 = `${p.x - hw},${p.y}`;
      const p1 = `${p.x - Math.round(hw * 0.5)},${p.y - hh}`;
      const p2 = `${p.x + Math.round(hw * 0.5)},${p.y - hh}`;
      const p3 = `${p.x + hw},${p.y}`;
      const p4 = `${p.x + Math.round(hw * 0.5)},${p.y + hh}`;
      const p5 = `${p.x - Math.round(hw * 0.5)},${p.y + hh}`;

      // Extruded front walls vertices
      const wallFront = `M ${p.x - Math.round(hw * 0.5)},${p.y + hh} L ${p.x + Math.round(hw * 0.5)},${p.y + hh} L ${p.x + Math.round(hw * 0.5)},${p.y + hh + extH} L ${p.x - Math.round(hw * 0.5)},${p.y + hh + extH} Z`;
      const wallLeft = `M ${p.x - hw},${p.y} L ${p.x - Math.round(hw * 0.5)},${p.y + hh} L ${p.x - Math.round(hw * 0.5)},${p.y + hh + extH} L ${p.x - hw},${p.y + extH} Z`;
      const wallRight = `M ${p.x + Math.round(hw * 0.5)},${p.y + hh} L ${p.x + hw},${p.y} L ${p.x + hw},${p.y + extH} L ${p.x + Math.round(hw * 0.5)},${p.y + hh + extH} Z`;

      const topFill = isFinale
        ? 'url(#ncHexFinaleGrad)'
        : (isCompleted
            ? (idx === 1 && ch.num === 1 ? 'url(#ncHexCopperGrad)' : 'url(#ncHexCompletedGrad)')
            : (isActive ? 'url(#ncHexActiveGrad)' : 'url(#ncHexLockedGrad)'));

      const strokeColor = isFinale
        ? '#fbbf24'
        : (isCompleted
            ? (idx === 1 && ch.num === 1 ? '#f59e0b' : '#00f0ff')
            : (isActive ? '#00f0ff' : 'rgba(148, 163, 184, 0.3)'));

      const strokeWidth = (isActive || isSelected) ? '3' : '2';

      // Status indicator on pedestal
      let badgeSvg = '';
      if (isCompleted) {
        badgeSvg = `
          <g transform="translate(${p.x}, ${p.y + hh + 6})">
            <circle r="11" fill="#10b981" stroke="#ffffff" stroke-width="2" filter="url(#ncBadgeGlow)" />
            <path d="M -4,-1 L -1,3 L 5,-4" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          </g>
        `;
      } else if (isLocked) {
        badgeSvg = `
          <g transform="translate(${p.x}, ${p.y + hh + 6})">
            <circle r="11" fill="rgba(30, 27, 75, 0.9)" stroke="#a855f7" stroke-width="1.8" />
            <text x="0" y="3.5" text-anchor="middle" font-size="11" fill="#d8b4fe">🔒</text>
          </g>
        `;
      } else if (isActive) {
        badgeSvg = `
          <g transform="translate(${p.x}, ${p.y + hh + 6})">
            <circle r="10" fill="#00f0ff" stroke="#ffffff" stroke-width="2" filter="url(#ncBadgeGlow)">
              <animate attributeName="r" values="9;12;9" dur="1.5s" repeatCount="indefinite" />
            </circle>
          </g>
        `;
      }

      // Base Halo Ring for Active / Selected
      const haloSvg = (isActive || isSelected) ? `
        <ellipse cx="${p.x}" cy="${p.y + hh}" rx="${hw + 14}" ry="${Math.round(hh * 0.55) + 6}" fill="none" stroke="#00f0ff" stroke-width="3" filter="url(#ncHaloGlow)">
          <animate attributeName="opacity" values="0.75;1;0.75" dur="2s" repeatCount="indefinite" />
        </ellipse>
      ` : '';

      // Artwork rendering: 3D Datacenter Metropolis for Finale, 3D device artwork for standard levels
      let artworkSvg = '';
      if (isFinale) {
        artworkSvg = `
          <!-- Datacenter Metropolis Facility Complex -->
          <g transform="translate(${p.x - 48}, ${p.y - 74})" filter="${isLocked ? 'grayscale(80%) brightness(35%)' : 'drop-shadow(0 10px 20px rgba(0,0,0,0.8))'}">
            <!-- Left Server Tower -->
            <rect x="6" y="24" width="22" height="42" rx="3" fill="#0d2244" stroke="#00d2ff" stroke-width="1.2" />
            <line x1="10" y1="32" x2="24" y2="32" stroke="#00f0ff" stroke-width="1.5" opacity="0.9" />
            <line x1="10" y1="38" x2="24" y2="38" stroke="#00f0ff" stroke-width="1.5" opacity="0.9" />
            <line x1="10" y1="44" x2="24" y2="44" stroke="#38bdf8" stroke-width="1.5" opacity="0.7" />
            <line x1="10" y1="50" x2="24" y2="50" stroke="#38bdf8" stroke-width="1.5" opacity="0.7" />
            <line x1="10" y1="56" x2="24" y2="56" stroke="#00f0ff" stroke-width="1.5" opacity="0.9" />

            <!-- Center Main Datacenter Tower -->
            <rect x="34" y="8" width="28" height="58" rx="4" fill="#0f2b57" stroke="#38bdf8" stroke-width="1.5" />
            <line x1="40" y1="18" x2="56" y2="18" stroke="#ffffff" stroke-width="2" opacity="0.95" />
            <line x1="40" y1="26" x2="56" y2="26" stroke="#00f0ff" stroke-width="1.8" opacity="0.9" />
            <line x1="40" y1="34" x2="56" y2="34" stroke="#00f0ff" stroke-width="1.8" opacity="0.9" />
            <line x1="40" y1="42" x2="56" y2="42" stroke="#38bdf8" stroke-width="1.8" opacity="0.8" />
            <line x1="40" y1="50" x2="56" y2="50" stroke="#00f0ff" stroke-width="1.8" opacity="0.9" />
            <line x1="40" y1="58" x2="56" y2="58" stroke="#00f0ff" stroke-width="1.8" opacity="0.9" />

            <!-- Right Server Tower -->
            <rect x="68" y="22" width="22" height="44" rx="3" fill="#0d2244" stroke="#00d2ff" stroke-width="1.2" />
            <line x1="72" y1="30" x2="86" y2="30" stroke="#00f0ff" stroke-width="1.5" opacity="0.9" />
            <line x1="72" y1="36" x2="86" y2="36" stroke="#00f0ff" stroke-width="1.5" opacity="0.9" />
            <line x1="72" y1="42" x2="86" y2="42" stroke="#38bdf8" stroke-width="1.5" opacity="0.7" />
            <line x1="72" y1="48" x2="86" y2="48" stroke="#38bdf8" stroke-width="1.5" opacity="0.7" />
            <line x1="72" y1="54" x2="86" y2="54" stroke="#00f0ff" stroke-width="1.5" opacity="0.9" />

            <!-- Isometric Trees on base platform -->
            <circle cx="2" cy="62" r="5" fill="#10b981" />
            <circle cx="94" cy="62" r="5" fill="#10b981" />
          </g>
        `;
      } else {
        const imgW = 56;
        const imgH = 56;
        const imgX = p.x - Math.round(imgW * 0.5);
        const imgY = p.y - Math.round(imgH * 0.88);
        artworkSvg = `<image href="${visual.img}" x="${imgX}" y="${imgY}" width="${imgW}" height="${imgH}" preserveAspectRatio="xMidYMid meet" filter="${isLocked ? 'grayscale(80%) brightness(35%)' : 'drop-shadow(0 8px 16px rgba(0,0,0,0.65))'}" />`;
      }

      pedestalsSvgHtml += `
        <!-- Pedestal ${lvl.id} -->
        <g class="nc-svg-pedestal" data-id="${lvl.id}">
          <!-- Drop Shadow -->
          <ellipse cx="${p.x}" cy="${p.y + hh + 8}" rx="${hw + 8}" ry="${Math.round(hh * 0.45) + 4}" fill="rgba(0, 0, 0, 0.65)" filter="url(#ncShadowBlur)" />
          
          ${haloSvg}

          <!-- 3D Extruded Front Walls -->
          <path d="${wallLeft}" fill="rgba(5, 14, 34, 0.95)" stroke="${strokeColor}" stroke-width="1" />
          <path d="${wallRight}" fill="rgba(4, 11, 28, 0.95)" stroke="${strokeColor}" stroke-width="1" />
          <path d="${wallFront}" fill="rgba(8, 22, 54, 0.98)" stroke="${strokeColor}" stroke-width="1.2" />

          <!-- Top Hexagonal Platform -->
          <polygon points="${p0} ${p1} ${p2} ${p3} ${p4} ${p5}" fill="${topFill}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />

          <!-- 3D Device Artwork -->
          ${artworkSvg}

          ${badgeSvg}
        </g>
      `;

      // HTML Interactive Node (supports test queries and direct clicking)
      const statusBadgeHtml = isCompleted 
        ? '<span class="nc-status-check">✓</span>' 
        : (isActive ? '<span class="nc-badge-active-dot"></span>' : '');

      nodesHtml += `
        <div class="nc-level-node nc-level-card ${isActive ? 'nc-level-card-active' : ''} ${isCompleted ? 'nc-level-card-completed' : ''} ${isLocked ? 'nc-level-card-locked' : ''} ${isSelected ? 'nc-level-card-selected' : ''}" data-id="${lvl.id}" style="left: ${p.x}px; top: ${p.y}px;" title="Level ${lvl.id}: ${lvl.title}">
          <div class="nc-node-pill ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}">
            <span class="nc-node-pill-num">${lvl.id}</span>
            <span class="nc-node-pill-title">${visual.label}</span>
          </div>

          <!-- Hidden elements for test suite assertions & accessibility -->
          <div class="nc-level-id-tag" style="display:none;">LEVEL ${lvl.id} ${statusBadgeHtml}</div>
          <div class="nc-level-name" style="display:none;">${lvl.title}</div>
          <div class="nc-level-moment" style="display:none;">${lvl.moment || lvl.concept || ''}</div>
          <button class="nc-level-play-btn ${isActive ? 'nc-btn-continue-level' : ''}" data-id="${lvl.id}" style="display:none;">Play</button>
        </div>
      `;
    });

    // 3. Floating Popover Card over the Selected Node
    const popoverHtml = `
      <div class="nc-node-popover-card" style="left: ${selectedCoords.x}px; top: ${selectedCoords.y}px;" data-id="${selectedLevel.id}">
        <div class="nc-popover-top">
          <img src="${selectedVisual.img}" class="nc-popover-img" onerror="this.src='${selectedVisual.fallbackImg}';" alt="${selectedLevel.title}" />
          <div class="nc-popover-info">
            <h3 class="nc-popover-title">${selectedLevel.title}</h3>
            <p class="nc-popover-desc">${selectedLevel.learningMoment || selectedLevel.objective || selectedLevel.concept || 'Connect devices and meet delivery quotas before timer expires.'}</p>
          </div>
        </div>
        <button class="nc-level-play-btn nc-popover-play-btn ${selectedIsCompleted ? '' : 'nc-btn-continue-level'}" data-id="${selectedLevel.id}">
          <span>${selectedIsCompleted ? '↺ Replay Level  ›' : '🔍 Trace Route  ›'}</span>
        </button>
      </div>
    `;

    const testOutBannerHtml = (ui._isTestOutMode && lastLevel) ? `
      <div class="nc-test-out-banner" style="position: absolute; top: 16px; right: 32px; z-index: 30; margin: 0; max-width: 440px;">
        <div class="nc-test-out-banner-icon">⚡</div>
        <div class="nc-test-out-banner-text" style="font-size: 0.84rem;">
          <strong>Test Out Mode:</strong> Beat the <strong>Capstone Challenge (Level ${lastLevel.id})</strong> to unlock next chapter!
        </div>
        <button class="nc-btn-jump-challenge" data-id="${lastLevel.id}">Take Capstone Challenge ⚡</button>
      </div>
    ` : '';

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
        <div class="nc-app-nav-right">
          <button class="nc-btn-restart-progress" id="nc-btn-restart-progress" title="Restart your career from Chapter 1">
            🔄 Reset Progress
          </button>
          <div class="nc-user-profile-icon" title="Player Profile">
            <span class="nc-avatar-glyph">👤</span>
          </div>
        </div>
      </header>

      <div class="nc-chapter-levels-map-wrap">
        <!-- Floating Chapter Header Overlay -->
        <div class="nc-map-header-overlay">
          <button class="nc-btn-back-chapters" id="nc-btn-back-chapters">← Back to Campaign</button>
          <div class="nc-chapter-banner-info">
            <div class="nc-chapter-pill">CHAPTER ${ch.num} • ${ch.levels.length} LEVELS</div>
            <h1 class="nc-chapter-banner-title" style="font-size: 1.45rem; margin: 0; line-height: 1.25;">
              ${ch.title}${cleanSubtitle ? `: <span class="nc-chapter-banner-subtitle">${cleanSubtitle}</span>` : ''}
            </h1>
            <p class="nc-chapter-banner-desc" style="margin: 0; font-size: 0.84rem; max-width: 380px;">
              ${ch.description}
            </p>
          </div>
        </div>

        ${testOutBannerHtml}

        <!-- Interactive City Network Canvas Viewport -->
        <div class="nc-levels-map-viewport">
          <div class="nc-levels-map-canvas">
            <svg class="nc-levels-map-svg" viewBox="0 0 1440 760" preserveAspectRatio="xMidYMid meet">
              <defs>
                <!-- Glow & Shadow Filters -->
                <filter id="ncCableGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="ncPacketGlow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="ncHaloGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="ncShadowBlur" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="5" />
                </filter>
                <filter id="ncBadgeGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <!-- Seamless Glowing Hexagonal Grid Pattern -->
                <pattern id="ncHexGrid" width="60" height="104" patternUnits="userSpaceOnUse">
                  <path d="M 30,0 L 60,17.32 L 60,51.96 L 30,69.28 L 0,51.96 L 0,17.32 Z
                           M 30,104 L 60,86.68 L 60,51.96
                           M 0,51.96 L 0,86.68 L 30,104" 
                        fill="none" 
                        stroke="rgba(0, 210, 255, 0.08)" 
                        stroke-width="1.2" />
                </pattern>

                <!-- Linear Gradients for Hexagons & Cables -->
                <linearGradient id="ncHexCompletedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#0c2d58" />
                  <stop offset="100%" stop-color="#05142f" />
                </linearGradient>
                <linearGradient id="ncHexCopperGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#3d2608" />
                  <stop offset="100%" stop-color="#190e02" />
                </linearGradient>
                <linearGradient id="ncHexActiveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#0e3a74" />
                  <stop offset="100%" stop-color="#051838" />
                </linearGradient>
                <linearGradient id="ncHexLockedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#151728" />
                  <stop offset="100%" stop-color="#080912" />
                </linearGradient>
                <linearGradient id="ncHexFinaleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#0a2a52" />
                  <stop offset="100%" stop-color="#051428" />
                </linearGradient>

                <linearGradient id="ncCableCyanGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="#00f0ff" />
                  <stop offset="100%" stop-color="#0077ff" />
                </linearGradient>
                <linearGradient id="ncCableOrangeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="#f59e0b" />
                  <stop offset="100%" stop-color="#ef4444" />
                </linearGradient>
                <linearGradient id="ncRiverGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#0c2242" stop-opacity="0.85" />
                  <stop offset="100%" stop-color="#030b18" stop-opacity="0.95" />
                </linearGradient>
              </defs>

              <!-- Deep Cosmic Background Surface -->
              <rect width="100%" height="100%" fill="#04091a" />

              <!-- Subtle Glowing Hexagonal Grid Across Terrain -->
              <rect width="100%" height="100%" fill="url(#ncHexGrid)" opacity="0.95" />

              <!-- Ambient Decorative Landscape: River on bottom-left -->
              <path d="M -20,540 Q 140,580 230,640 T 290,780 L -20,780 Z" fill="url(#ncRiverGrad)" />
              <path d="M -20,540 Q 140,580 230,640 T 290,780" fill="none" stroke="#00d2ff" stroke-width="1.5" opacity="0.4" />
              <path d="M 40,600 Q 130,620 190,670" fill="none" stroke="#00f0ff" stroke-width="1" opacity="0.3" stroke-dasharray="8 12" />

              <!-- Ambient Distant Clouds -->
              <path d="M 1060,50 Q 1140,20 1220,50 T 1320,80 L 1320,0 L 1060,0 Z" fill="#091833" opacity="0.35" />

              <!-- Smooth Curved Cables with Mini Motorways Data Traffic -->
              ${cablesSvgHtml}

              <!-- 3D Hexagonal Pedestals & Device Visuals -->
              ${pedestalsSvgHtml}
            </svg>

            <!-- Interactive Level Node Overlays -->
            ${nodesHtml}

            <!-- Floating Active/Selected Popover Card -->
            ${popoverHtml}
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

    const resetBtn = ui.screenCampaignEl.querySelector('#nc-btn-restart-progress');
    if (resetBtn) {
      resetBtn.onclick = () => {
        const ok = (typeof confirm === 'function')
          ? confirm('Restart all progress and start fresh from Chapter 1?')
          : true;
        if (!ok) return;
        ui.resetProgress();
      };
    }

    const backBtn = ui.screenCampaignEl.querySelector('#nc-btn-back-chapters');
    if (backBtn) {
      backBtn.onclick = () => {
        ui._campaignView = 'chapters';
        ui._isTestOutMode = false;
        ui._renderCampaignScreen();
      };
    }

    // Node click handlers: select node and reposition popover; double-click loads level
    ui.screenCampaignEl.querySelectorAll('.nc-level-node, .nc-level-card').forEach(nodeEl => {
      nodeEl.onclick = (e) => {
        e.stopPropagation();
        const id = nodeEl.getAttribute('data-id');
        if (id) {
          if (ui._selectedLevelId === id) {
            ui._loadLevel(id);
            ui._setScreen('game');
          } else {
            ui._selectedLevelId = id;
            this.renderChapterLevelsView();
          }
        }
      };
    });

    // Play button click handlers (both in popover and inside node cards)
    ui.screenCampaignEl.querySelectorAll('.nc-level-play-btn, .nc-btn-jump-challenge').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id') || ui._selectedLevelId;
        if (id) {
          ui._loadLevel(id);
          ui._setScreen('game');
        }
      };
    });

    // Auto-scroll horizontally to bring the active node into center view on smaller screens
    try {
      const activeNodeEl = ui.screenCampaignEl.querySelector('.nc-level-card-active') || ui.screenCampaignEl.querySelector('.nc-node-popover-card');
      const viewportEl = ui.screenCampaignEl.querySelector('.nc-levels-map-viewport');
      if (activeNodeEl && viewportEl && typeof activeNodeEl.getBoundingClientRect === 'function') {
        setTimeout(() => {
          const rect = activeNodeEl.getBoundingClientRect();
          const vpRect = viewportEl.getBoundingClientRect();
          viewportEl.scrollLeft += (rect.left + rect.width / 2) - (vpRect.left + vpRect.width / 2);
        }, 60);
      }
    } catch (_) {}
  }
}
