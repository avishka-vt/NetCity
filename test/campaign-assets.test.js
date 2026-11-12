import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createMockDOM } from './mock-dom.js';
import { NetCityClientUI } from '../apps/client/src/ui.js';
import { AssetManager, ASSET_PATHS } from '../apps/client/src/assets.js';

test('AssetManager: Catalog paths cover all buildings, devices, servers, chapters, and UI', () => {
  const assets = new AssetManager();
  const keys = Object.keys(ASSET_PATHS);

  assert.ok(keys.length >= 25, `Expected at least 25 registered assets, got ${keys.length}`);

  // Confirm key categories
  assert.ok(ASSET_PATHS['buildings/laptop'], 'buildings/laptop asset must be configured');
  assert.ok(ASSET_PATHS['buildings/classroom'], 'buildings/classroom asset must be configured');
  assert.ok(ASSET_PATHS['devices/web_server'], 'devices/web_server asset must be configured');
  assert.ok(ASSET_PATHS['devices/dhcp_server'], 'devices/dhcp_server asset must be configured');
  assert.ok(ASSET_PATHS['devices/dns_server'], 'devices/dns_server asset must be configured');
  assert.ok(ASSET_PATHS['devices/switch'], 'devices/switch asset must be configured');
  assert.ok(ASSET_PATHS['devices/router'], 'devices/router asset must be configured');
  assert.ok(ASSET_PATHS['devices/firewall'], 'devices/firewall asset must be configured');
  assert.ok(ASSET_PATHS['devices/load_balancer'], 'devices/load_balancer asset must be configured');
  assert.ok(ASSET_PATHS['chapters/ch1'], 'chapters/ch1 asset must be configured');
  assert.ok(ASSET_PATHS['ui/logo'], 'ui/logo asset must be configured');

  // Verify that all asset files physically exist in apps/client/public/
  for (const key of keys) {
    const diskPath = path.resolve('apps/client/public', ASSET_PATHS[key]);
    assert.ok(fs.existsSync(diskPath), `Asset file must exist on disk: ${diskPath}`);
  }

  for (let ch = 1; ch <= 7; ch++) {
    assert.ok(assets.getChapterAssetPath(ch), `Chapter asset path must exist for Chapter ${ch}`);
  }
  assert.ok(assets.getLogoAssetPath(), `Logo asset path must exist`);
});

test('Campaign UI: Entry screen is fullscreen Campaign, Learn is dedicated page, no badges/profile, accurate progress', () => {
  const mockDOM = createMockDOM();
  const prevWindow = globalThis.window;
  const prevDoc = globalThis.document;
  const prevRaf = globalThis.requestAnimationFrame;
  const prevCaf = globalThis.cancelAnimationFrame;

  globalThis.window = mockDOM.window;
  globalThis.document = mockDOM.document;
  globalThis.requestAnimationFrame = mockDOM.window.requestAnimationFrame;
  globalThis.cancelAnimationFrame = mockDOM.window.cancelAnimationFrame;

  try {
    const container = mockDOM.document.createElement('div');
    mockDOM.document.body.appendChild(container);

    // Instantiating without initialLevel launches fullscreen on Campaign Screen
    const ui = new NetCityClientUI(container, { initialLevel: null, testMode: false });

    // 1. Entry screen is fullscreen Campaign Dashboard
    assert.equal(ui.currentScreen, 'campaign', 'Entry screen must be campaign');
    assert.equal(ui.screenCampaignEl.style.display, 'flex', 'Campaign screen must be displayed');
    assert.equal(ui.screenGameEl.style.display, 'none', 'Game screen must be hidden');
    assert.equal(ui.screenLearnEl.style.display, 'none', 'Learn screen must be hidden');
    assert.equal(ui._campaignView, 'chapters', 'Initial campaign view must be chapters');

    // 2. Topbar clean: Brand + Play & Learn tabs only; no badges, no progress, no profile
    const campaignHtml = ui.screenCampaignEl.innerHTML;
    assert.ok(campaignHtml.includes('NetCity'), 'Topbar must have NetCity brand');
    assert.ok(campaignHtml.includes('id="nc-tab-play"'), 'Must have Play tab');
    assert.ok(campaignHtml.includes('id="nc-tab-learn"'), 'Must have Learn tab');
    assert.ok(!campaignHtml.includes('Alex'), 'Profile Alex must be removed');
    assert.ok(!campaignHtml.includes('id="nc-nav-badges"'), 'Badges link must be removed');
    assert.ok(!campaignHtml.includes('id="nc-nav-progress"'), 'Progress link must be removed');

    // 3. User requirements: No badges, no profile, no coins, no day streak
    assert.ok(!campaignHtml.includes('Coins'), 'Coins widget must be removed');
    assert.ok(!campaignHtml.includes('Day streak'), 'Day streak widget must be removed');
    assert.ok(campaignHtml.includes('nc-chapters-carousel'), 'Chapters must be organized in a carousel container');

    const chapterCards = ui.screenCampaignEl.querySelectorAll('.nc-chapter-card');
    assert.equal(chapterCards.length, 7, 'Must display all 7 chapter cards on Page 1');
    assert.ok(campaignHtml.includes('0/9'), 'Active chapter shows 0/9 progress count');
    assert.ok(campaignHtml.includes('Continue'), 'Active chapter shows Continue button');

    // 4. Clicking Chapter 1 transitions to Level Selection for Chapter 1
    const ch1Card = chapterCards[0];
    ch1Card.onclick({ stopPropagation: () => {}, target: ch1Card, closest: () => ch1Card });

    assert.equal(ui._campaignView, 'chapter_levels', 'Must transition to chapter_levels view');
    assert.equal(ui._currentViewingCh, 1, 'Must be viewing Chapter 1');
    assert.ok(ui.screenCampaignEl.innerHTML.includes('The Basics'), 'Must show Chapter 1 title');

    const levelCards = ui.screenCampaignEl.querySelectorAll('.nc-level-card');
    assert.equal(levelCards.length, 9, 'Chapter 1 must list all 9 levels');
    assert.ok(ui.screenCampaignEl.innerHTML.includes('LEVEL 1.1'), 'Must display Level 1.1');
    assert.ok(ui.screenCampaignEl.innerHTML.includes('LEVEL 1.9'), 'Must display Level 1.9');

    // 5. Clicking "← All Chapters" transitions back to All Chapters Grid
    const backBtn = ui.screenCampaignEl.querySelector('#nc-btn-back-chapters');
    assert.ok(backBtn, 'Must have Back to Chapters button');
    backBtn.onclick();

    assert.equal(ui._campaignView, 'chapters', 'Must return to chapters grid');
    assert.equal(ui.screenCampaignEl.querySelectorAll('.nc-chapter-card').length, 7, 'Must show 7 chapter cards again');

    // 6. Clicking Learn in topbar switches to dedicated full-page Learn Screen
    const tabLearn = ui.screenCampaignEl.querySelector('#nc-tab-learn');
    assert.ok(tabLearn, 'Must have Learn tab button');
    tabLearn.onclick();

    assert.equal(ui.currentScreen, 'learn', 'Must switch to learn screen');
    assert.equal(ui.screenLearnEl.style.display, 'flex', 'Learn screen must be displayed');
    assert.equal(ui.screenCampaignEl.style.display, 'none', 'Campaign screen must be hidden');
    assert.ok(ui.screenLearnEl.innerHTML.includes('MAC vs IP Addresses'), 'Must show Field Manual content');
    assert.ok(ui.screenLearnEl.querySelectorAll('.nc-learn-nav-btn').length >= 6, 'Must list all topic buttons in sidebar');

    // 7. Clicking "← Back to Play" switches back to Campaign
    const backPlayBtn = ui.screenLearnEl.querySelector('#nc-learn-back-play');
    assert.ok(backPlayBtn, 'Must have Back to Play button');
    backPlayBtn.onclick();

    assert.equal(ui.currentScreen, 'campaign', 'Must return to campaign screen');
    assert.equal(ui.screenCampaignEl.style.display, 'flex');

    // 8. Open Chapter 2 and click Play on a level -> switches to Gameplay
    ui._campaignView = 'chapter_levels';
    ui._currentViewingCh = 2;
    ui._renderCampaignScreen();

    const lvl21PlayBtn = ui.screenCampaignEl.querySelector('.nc-level-play-btn');
    assert.ok(lvl21PlayBtn, 'Must have level Play button');
    lvl21PlayBtn.onclick({ stopPropagation: () => {}, getAttribute: () => '2.1' });

    assert.equal(ui.currentScreen, 'game', 'Must switch to game screen');
    assert.equal(ui.screenGameEl.style.display, 'flex');
    assert.equal(ui.screenCampaignEl.style.display, 'none');
    assert.equal(ui.currentLevelId, '2.1', 'Loads chosen level 2.1');

    // 9. In Gameplay: clicking topbar back button (←) returns to Campaign
    const topBarBack = container.querySelector('#nc-btn-levels');
    assert.ok(topBarBack, 'Top bar back button must exist in game');
    topBarBack.dispatchEvent({ type: 'click' });

    assert.equal(ui.currentScreen, 'campaign', 'Must return to campaign screen on back button');
    assert.equal(ui.screenCampaignEl.style.display, 'flex');

    ui.destroy();
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDoc;
    globalThis.requestAnimationFrame = prevRaf;
    globalThis.cancelAnimationFrame = prevCaf;
  }
});

test('Toolbar Layout: Bottom dock toolbar is dedicated footer outside canvas-wrapper to prevent obscuring map', () => {
  const mockDOM = createMockDOM();
  const prevWindow = globalThis.window;
  const prevDoc = globalThis.document;

  globalThis.window = mockDOM.window;
  globalThis.document = mockDOM.document;

  try {
    const container = mockDOM.document.createElement('div');
    const ui = new NetCityClientUI(container);

    const canvasWrapper = container.querySelector('#nc-canvas-wrapper');
    const bottomDock = container.querySelector('#nc-bottom-dock');
    const screenGame = container.querySelector('#nc-screen-game');

    assert.ok(canvasWrapper, 'Canvas wrapper must exist');
    assert.ok(bottomDock, 'Bottom dock must exist');
    assert.ok(screenGame, 'Game screen must exist');

    // Verify in HTML template that bottom dock is outside </main> canvas-wrapper
    const html = container.innerHTML;
    const mainCloseIdx = html.indexOf('</main>');
    const bottomDockIdx = html.indexOf('id="nc-bottom-dock"');
    assert.ok(mainCloseIdx !== -1, '</main> tag must exist in template');
    assert.ok(bottomDockIdx !== -1, 'nc-bottom-dock must exist in template');
    assert.ok(bottomDockIdx > mainCloseIdx, 'Bottom dock must be placed AFTER </main> so canvas never overlaps it');

    // Verify camera fit accommodates grid without clipping
    ui.camera.fit(800, 600, 32, 18);
    const sz = ui.camera.baseSquareSize;
    assert.ok(sz >= 12, 'Square size must be at least 12');
    assert.ok(32 * sz <= 800, 'Total grid width must fit within available width');
    assert.ok(18 * sz <= 600, 'Total grid height must fit within available height');
    assert.ok(ui.camera.x >= 0, 'Camera X offset must be non-negative');
    assert.ok(ui.camera.y >= 0, 'Camera Y offset must be non-negative');

    // Verify hint pill hides when empty
    ui.hudController.setHint('');
    assert.equal(ui.hintBarEl.style.display, 'none', 'Hint bar should be hidden when empty');

    ui.hudController.setHint('Connect twisted pair cable');
    assert.equal(ui.hintBarEl.style.display, 'inline-flex', 'Hint bar should be visible with text');

    ui.destroy();
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDoc;
  }
});

test('Learn Screen Back Navigation: Returns to exact previous page (game, endless, or specific chapter view)', () => {
  const mockDOM = createMockDOM();
  const prevWindow = globalThis.window;
  const prevDoc = globalThis.document;

  globalThis.window = mockDOM.window;
  globalThis.document = mockDOM.document;

  try {
    const container = mockDOM.document.createElement('div');
    const ui = new NetCityClientUI(container);

    // Scenario 1: User is in Gameplay -> opens Guide -> clicking Back returns to Gameplay
    ui._loadLevel('1.2', 'seed-1');
    ui._setScreen('game');
    assert.equal(ui.currentScreen, 'game');

    ui._showTutorialModal('ports_wiring');
    assert.equal(ui.currentScreen, 'learn', 'Must navigate to learn screen');
    assert.equal(ui.screenLearnEl.style.display, 'flex');

    const backPlayBtn = ui.screenLearnEl.querySelector('#nc-learn-back-play');
    assert.ok(backPlayBtn, 'Back button must exist on learn screen');
    assert.ok(ui.screenLearnEl.innerHTML.includes('Back to Game'), 'Template should indicate returning to Game');
    backPlayBtn.onclick();

    assert.equal(ui.currentScreen, 'game', 'Must return to game screen, not homepage');
    assert.equal(ui.screenGameEl.style.display, 'flex');

    // Scenario 2: User is in Chapter 3 Level List -> opens Learn -> header Back returns to Chapter 3 Level List
    ui._campaignView = 'chapter_levels';
    ui._currentViewingCh = 3;
    ui._setScreen('campaign');

    ui._setScreen('learn');
    ui._renderLearnScreen();

    const headerBackBtn = ui.screenLearnEl.querySelector('#nc-learn-btn-back');
    assert.ok(headerBackBtn, 'Header back button must exist on learn screen');
    headerBackBtn.onclick();

    assert.equal(ui.currentScreen, 'campaign', 'Must return to campaign');
    assert.equal(ui._campaignView, 'chapter_levels', 'Must preserve chapter levels view, not reset to chapters');
    assert.equal(ui._currentViewingCh, 3, 'Must preserve Chapter 3 selection');

    // Scenario 3: User is in Endless Portal -> opens Learn -> Back returns to Endless Portal
    ui._setScreen('endless');
    ui._setScreen('learn');
    ui._renderLearnScreen();

    const backBtn3 = ui.screenLearnEl.querySelector('#nc-learn-back-play');
    assert.ok(ui.screenLearnEl.innerHTML.includes('Back to Endless'), 'Template should indicate returning to Endless');
    backBtn3.onclick();

    assert.equal(ui.currentScreen, 'endless', 'Must return to endless portal, not homepage');
    assert.equal(ui.screenEndlessEl.style.display, 'flex');

    ui.destroy();
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDoc;
  }
});

test('Campaign Screen Redesign: Horizontal scrolling road map across glowing pedestals, action-oriented titles, silhouettes & test out', () => {
  const mockDOM = createMockDOM();
  const prevWindow = globalThis.window;
  const prevDoc = globalThis.document;
  const prevRaf = globalThis.requestAnimationFrame;
  const prevCaf = globalThis.cancelAnimationFrame;

  globalThis.window = mockDOM.window;
  globalThis.document = mockDOM.document;
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

  try {
    const container = mockDOM.document.createElement('div');
    container.id = 'netcity-app';
    mockDOM.document.body.appendChild(container);

    const ui = new NetCityClientUI(container, { initialLevel: null, testMode: false });
    const campaignHtml = ui.screenCampaignEl.innerHTML;

    // 1. Horizontal scrolling path container and winding node wrappers
    assert.ok(campaignHtml.includes('nc-horizontal-path'), 'Must have horizontal path container');
    assert.ok(campaignHtml.includes('nc-path-node-wrapper'), 'Must have path node wrappers for horizontal journey map');
    assert.ok(campaignHtml.includes('nc-stepping-stone'), 'Must have stepping stone connector dots');

    // 2. Kid-friendly achievement titles and preserved technical subtitles
    assert.ok(campaignHtml.includes('Wire Your First Classroom'), 'Ch 1 title must be achievement-based');
    assert.ok(campaignHtml.includes('The Basics: Physical Cables & Wires'), 'Ch 1 jargon subtitle must be preserved');
    assert.ok(campaignHtml.includes('Connect the Whole School'), 'Ch 2 title must be achievement-based');
    assert.ok(campaignHtml.includes('IP Addresses: Hubs, Switches & MAC'), 'Ch 2 jargon subtitle must be preserved');
    assert.ok(campaignHtml.includes('Bridge Across the River'), 'Ch 3 title must be achievement-based');
    assert.ok(campaignHtml.includes('Make Packets Find Their Way'), 'Ch 4 title must be achievement-based');
    assert.ok(campaignHtml.includes('Organise the City Zones'), 'Ch 5 title must be achievement-based');
    assert.ok(campaignHtml.includes('Guard the City Gates'), 'Ch 6 title must be achievement-based');
    assert.ok(campaignHtml.includes('Build the Unstoppable Metropolis'), 'Ch 7 title must be achievement-based');

    // 3. Locked chapters feature mystery silhouettes, teaser quotes, and "⚡ Test Out" button
    assert.ok(campaignHtml.includes('nc-silhouette'), 'Locked chapters must render silhouettes');
    assert.ok(campaignHtml.includes('Chapter 4: Make packets find their way'), 'Chapter 4 teaser preview quote must exist');
    assert.ok(campaignHtml.includes('nc-btn-test-out'), 'Locked chapters must offer Test Out button');
    assert.ok(campaignHtml.includes('Test Out'), 'Button text must say Test Out');

    // 4. Clicking "⚡ Test Out" opens chapter with Test Out banner & Capstone Challenge jump
    const testOutBtns = ui.screenCampaignEl.querySelectorAll('.nc-btn-test-out');
    assert.ok(testOutBtns.length > 0, 'Must have test out buttons for locked chapters');
    const ch4TestOutBtn = Array.from(testOutBtns).find(b => b.getAttribute('data-ch') === '4') || testOutBtns[0];
    
    ch4TestOutBtn.onclick({ stopPropagation: () => {}, target: ch4TestOutBtn, closest: () => ch4TestOutBtn });
    assert.equal(ui._campaignView, 'chapter_levels', 'Clicking Test Out must open levels view');
    assert.equal(ui._currentViewingCh, 4, 'Must view Chapter 4');
    assert.equal(ui._isTestOutMode, true, 'Test out mode must be active');

    const chLevelsHtml = ui.screenCampaignEl.innerHTML;
    assert.ok(chLevelsHtml.includes('nc-test-out-banner'), 'Level selection view must display Test Out banner');
    assert.ok(chLevelsHtml.includes('Capstone Challenge'), 'Banner must mention Capstone Challenge');
    assert.ok(chLevelsHtml.includes('Take Capstone Challenge ⚡'), 'Banner must have action button to jump directly to Capstone');

    // 5. Reset progress functionality
    ui.completedLevels.add('1.1');
    ui.completedLevels.add('1.2');
    ui.resetProgress();
    assert.equal(ui.completedLevels.size, 0, 'Reset progress must clear all completed levels');
    assert.equal(ui._currentViewingCh, 1, 'Reset progress must return to Chapter 1');

    // 6. Chapter Victory State: When final level in chapter is completed,
    // all cables are connected with flowing packets, no checkmarks on individual nodes, and glowing orbs on all nodes
    ui.completedLevels.add('1.9'); // Final level in Chapter 1 completed
    ui._campaignView = 'chapter_levels';
    ui._currentViewingCh = 1;
    ui._renderCampaignScreen();

    const victoryHtml = ui.screenCampaignEl.innerHTML;
    // Must have Glowing Orbs on all pedestals
    const glowingOrbs = ui.screenCampaignEl.querySelectorAll('.nc-glowing-orb-group');
    assert.equal(glowingOrbs.length, 9, 'All 9 pedestals in cleared Chapter 1 must display Glowing Orbs');
    // Must NOT have checkmark badges on individual nodes
    const checkmarks = ui.screenCampaignEl.querySelectorAll('.nc-status-check');
    assert.equal(checkmarks.length, 0, 'Must NOT display checkmark badges on individual nodes in completed chapter');
    // All cables must be glowing and connected
    assert.ok(victoryHtml.includes('ncCableGlow'), 'All cables must have active glowing styling');
    assert.ok(victoryHtml.includes('animateMotion'), 'Data packets must animate along the cables');

    ui.destroy();
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDoc;
    globalThis.requestAnimationFrame = prevRaf;
    globalThis.cancelAnimationFrame = prevCaf;
  }
});
