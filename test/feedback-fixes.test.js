/**
 * NetCity v2.0 - Feedback Fixes Verification Test Suite
 * Validates UX improvements, modal scrolling, speed resets, level start briefing,
 * concept explanations, subnet colors, and chapter 1-4 level calibrations.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ALL_LEVELS, getLevelById, CHAPTER_1_LEVELS, CHAPTER_2_LEVELS, CHAPTER_3_LEVELS, CHAPTER_4_LEVELS } from '../packages/content/src/levels.js';
import { NetCitySimulation } from '../packages/sim/src/sim.js';
import { NetCityClientUI } from '../apps/client/src/ui.js';
import { AssetManager, ASSET_PATHS } from '../apps/client/src/assets.js';
import { CONCEPT_THEORY } from '../apps/client/src/ui/modals/briefing-modal.js';
import { showLevelWonModal, showLevelOverModal } from '../apps/client/src/ui/modals/level-end-modal.js';
import { showSwitchNotebook, showRouterInspector, showFirewallInspector, showWireInspector, showBuildingInspector } from '../apps/client/src/ui/modals/inspectors.js';
import { generateLevelMap } from '../apps/client/src/core/level-loader.js';
import { CanvasRenderer } from '../apps/client/src/rendering/canvas-renderer.js';
import { Camera } from '../apps/client/src/rendering/camera.js';
import { bfsPath } from '../packages/sim/src/pathfinding.js';
import { createMockDOM } from './mock-dom.js';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Level Start Briefing & Auto-Pause
// ─────────────────────────────────────────────────────────────────────────────
test('Level Start: Auto-pause simulation and show Briefing Modal with Objective, Theory, and Hint', () => {
  const mockDOM = createMockDOM();
  const prevWindow = globalThis.window;
  const prevDoc = globalThis.document;
  globalThis.window = mockDOM.window;
  globalThis.document = mockDOM.document;

  try {
    const container = mockDOM.document.createElement('div');
    const ui = new NetCityClientUI(container);

    // Load level 1.1
    ui._loadLevel('1.1', 'briefing-seed-1');

    // Simulation MUST start paused
    assert.equal(ui.sim.paused, true, 'Simulation must start paused');
    assert.equal(ui.btnPause.textContent, 'Resume', 'Pause button must read Resume');

    // Briefing modal must be opened
    assert.equal(ui.modalEl.style.display, 'flex', 'Modal must be open');
    assert.ok(ui.modalEl.innerHTML.includes('Mission Objective'), 'Must contain Mission Objective');
    assert.ok(ui.modalEl.innerHTML.includes('The Concept'), 'Must contain Concept/Theory');
    assert.ok(ui.modalEl.innerHTML.includes('First Step'), 'Must contain First Step hint');
    assert.ok(ui.modalEl.innerHTML.includes('Start Level ▶'), 'Must contain Start Level button');

    // Clicking Start Level unpauses and closes briefing
    const startBtn = ui.modalEl.querySelector('#nc-btn-start-level');
    assert.ok(startBtn, 'Start Level button must exist');
    startBtn.onclick();
    assert.equal(ui.sim.paused, false, 'Simulation must unpause on Start Level click');
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDoc;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Speed Reset to 1x on Level Completion & Level Load
// ─────────────────────────────────────────────────────────────────────────────
test('Speed Reset: 1x, 2x, 4x speed resets to 1x upon level complete and new level load', () => {
  const mockDOM = createMockDOM();
  const prevWindow = globalThis.window;
  const prevDoc = globalThis.document;
  globalThis.window = mockDOM.window;
  globalThis.document = mockDOM.document;

  try {
    const container = mockDOM.document.createElement('div');
    const ui = new NetCityClientUI(container);
    ui._loadLevel('1.1', 'speed-test-seed');

    // Set speed to 4x
    ui.gameSpeed = 4;
    ui.gameLoop.setSpeed(4);
    ui.btnSpeed.textContent = '4×';

    // Show level won modal
    showLevelWonModal(ui);

    assert.equal(ui.gameSpeed, 1, 'gameSpeed must be reset to 1');
    assert.equal(ui.gameLoop.gameSpeed, 1, 'gameLoop speed must be reset to 1');
    assert.equal(ui.btnSpeed.textContent, '1×', 'btnSpeed text must be reset to 1×');

    // Load next level
    ui.gameSpeed = 2;
    ui.gameLoop.setSpeed(2);
    ui._loadLevel('1.2', 'speed-test-seed-2');
    assert.equal(ui.gameSpeed, 1, 'gameSpeed must reset to 1 on _loadLevel');
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDoc;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Level Won Modal: Criteria Checklist Above Educational Lesson
// ─────────────────────────────────────────────────────────────────────────────
test('Level Won Modal: Criteria Met checklist is placed ABOVE the What You Learned lesson', () => {
  const mockDOM = createMockDOM();
  const prevWindow = globalThis.window;
  const prevDoc = globalThis.document;
  globalThis.window = mockDOM.window;
  globalThis.document = mockDOM.document;

  try {
    const container = mockDOM.document.createElement('div');
    const ui = new NetCityClientUI(container);
    ui._loadLevel('1.1', 'won-test-seed');
    showLevelWonModal(ui);

    const html = ui.modalEl.innerHTML;
    const criteriaPos = html.indexOf('Mission Criteria Met');
    const learnedPos = html.indexOf('What You Learned');

    assert.ok(criteriaPos !== -1, 'Mission Criteria Met must exist');
    assert.ok(learnedPos !== -1, 'What You Learned must exist');
    assert.ok(criteriaPos < learnedPos, 'Criteria Met MUST appear before What You Learned in HTML layout');
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDoc;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Switch & Router Inspectors: Top-Right Close Button & Explanations
// ─────────────────────────────────────────────────────────────────────────────
test('Hardware Inspectors: Switch & Router include Top-Right Close Button and clear explanations', () => {
  const mockDOM = createMockDOM();
  const prevWindow = globalThis.window;
  const prevDoc = globalThis.document;
  globalThis.window = mockDOM.window;
  globalThis.document = mockDOM.document;

  try {
    const container = mockDOM.document.createElement('div');
    const ui = new NetCityClientUI(container);
    ui._loadLevel('2.3', 'inspect-test-seed');

    // Test Switch Notebook
    const swDevice = { id: 10, type: 'switch', ports: 4, macTable: new Map() };
    showSwitchNotebook(ui, swDevice);
    assert.ok(ui.modalEl.innerHTML.includes('id="nc-modal-x-close"'), 'Switch notebook must have top-right close button');
    assert.ok(ui.modalEl.innerHTML.includes('What is a Switch?'), 'Switch must explain what it is');
    assert.ok(ui.modalEl.innerHTML.includes('MAC Address:'), 'Switch must explain MAC address');
    assert.ok(ui.modalEl.innerHTML.includes('VLAN Zones:'), 'Switch must explain VLAN zones');

    // Test Router Inspector
    const rtrDevice = { id: 20, type: 'router', ports: 4, staticRoutes: new Map(), allowRules: [] };
    showRouterInspector(ui, rtrDevice);
    assert.ok(ui.modalEl.innerHTML.includes('id="nc-modal-x-close"'), 'Router inspector must have top-right close button');
    assert.ok(ui.modalEl.innerHTML.includes('How a Router Works:'), 'Router must explain how it works');
    assert.ok(ui.modalEl.innerHTML.includes('Default Gateway:'), 'Router must explain Default Gateway');
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDoc;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Level 1.2: Distance Limit & Required Far Laptop
// ─────────────────────────────────────────────────────────────────────────────
test('Level 1.2: Win requires connecting the distant laptop within 10m copper reach', () => {
  const lvl12 = getLevelById('1.2');
  assert.equal(lvl12.wiresAllowed.length, 1);
  assert.equal(lvl12.wiresAllowed[0], 'twisted_pair');

  // Spawned or start laptop must be required: true
  const laptopItem = (lvl12.spawns && lvl12.spawns[0]) || lvl12.start.find(b => b.type === 'laptop');
  assert.ok(laptopItem, 'Level 1.2 must contain a laptop');
  assert.equal(laptopItem.required, true, 'Far laptop MUST be required: true to teach wire distance limit');
  assert.ok(laptopItem.range[0] >= 9 && laptopItem.range[1] <= 10, 'Laptop range must be at 9-10 squares (twisted pair limit)');
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Level 1.7 vs 2.1: Bandwidth Upgrades vs Street Cabinet
// ─────────────────────────────────────────────────────────────────────────────
test('Level 1.7 vs 2.1: Level 1.7 focuses on Wire Bandwidth upgrades, 2.1 on Street Cabinet Star topology', () => {
  const lvl17 = getLevelById('1.7');
  const lvl21 = getLevelById('2.1');

  // 1.7: No street cabinet, has multimode fiber for bandwidth upgrades
  assert.ok(lvl17.wiresAllowed.includes('multimode_fiber'), 'Level 1.7 must allow multimode_fiber for bandwidth upgrade');
  assert.ok(!lvl17.devicesAllowed.includes('cabinet'), 'Level 1.7 must NOT include cabinet so bandwidth lesson is clear');

  // 2.1: Dedicated street cabinet introduction
  assert.ok(lvl21.devicesAllowed.includes('cabinet'), 'Level 2.1 must include street cabinet');
  assert.ok(lvl21.title.includes('Star'), 'Level 2.1 title must reflect Star topology');
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Level 2.2: Hub Collisions
// ─────────────────────────────────────────────────────────────────────────────
test('Level 2.2: Explains Hub broadcast and simultaneous packet collisions clearly', () => {
  const lvl22 = getLevelById('2.2');
  assert.ok(lvl22.devicesAllowed.includes('hub'), 'Level 2.2 must include hub');
  assert.ok(lvl22.hint.includes('collision'), 'Level 2.2 hint must explain collision bursts');
  assert.ok(lvl22.learningMoment.includes('collide'), 'Level 2.2 learning moment must explain collisions');
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Level 3.1 & 3.2: Local Island vs Router Bridge
// ─────────────────────────────────────────────────────────────────────────────
test('Level 3.1 & 3.2: 3.1 connects local island to server; 3.2 connects both islands across Router', () => {
  const lvl31 = getLevelById('3.1');
  const lvl32 = getLevelById('3.2');

  // 3.1: Connect local right-side classrooms
  assert.equal(lvl31.goal, 'connect_all', 'Level 3.1 goal should be connect_all');
  const reqStart31 = lvl31.start.filter(b => b.required === true);
  assert.ok(reqStart31.every(b => b.side === 'right'), 'Only right-side buildings in 3.1 are required');

  // 3.2: Connect both islands across router
  assert.ok(lvl32.devicesAllowed.includes('router'), 'Level 3.2 must provide router');
  assert.ok(lvl32.start.some(b => b.side === 'left' && b.required === true), 'Left-side homes are required in 3.2');
  assert.ok(lvl32.start.some(b => b.side === 'right' && b.required === true), 'Right-side classrooms are required in 3.2');
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Level 3.4: Subnet Color-Coding (Blue vs Green Laptops)
// ─────────────────────────────────────────────────────────────────────────────
test('Level 3.4: Laptops are clearly distinguished into Blue (192.168.1.x) and Green (192.168.2.x)', () => {
  const lvl34 = getLevelById('3.4');
  const blueLaptops = lvl34.start.filter(b => b.colorGroup === 'blue' || (b.subnet && b.subnet.includes('.1.')));
  const greenLaptops = lvl34.start.filter(b => b.colorGroup === 'green' || (b.subnet && b.subnet.includes('.2.')));

  assert.ok(blueLaptops.length >= 2, 'Must have at least 2 blue laptops');
  assert.ok(greenLaptops.length >= 2, 'Must have at least 2 green laptops');
  assert.ok(lvl34.hint.includes('Blue'), 'Hint must reference Blue laptops');
  assert.ok(lvl34.hint.includes('Green'), 'Hint must reference Green laptops');
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Level 3.7: Simulation Mode Reference Removed
// ─────────────────────────────────────────────────────────────────────────────
test('Level 3.7: Confusing "Simulation Mode" reference is replaced with clear packet tracing instructions', () => {
  const lvl37 = getLevelById('3.7');
  assert.ok(!lvl37.hint.includes('in Simulation Mode'), 'Must not contain confusing "in Simulation Mode"');
  assert.ok(lvl37.hint.includes('Trace') || lvl37.hint.includes('hop'), 'Must guide user to observe hops or use Trace');
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Level 4.1: DHCP Win Condition
// ─────────────────────────────────────────────────────────────────────────────
test('Level 4.1: DHCP win condition is connect_all for immediate rewarding victory upon quota fulfillment', () => {
  const lvl41 = getLevelById('4.1');
  assert.equal(lvl41.goal, 'connect_all', 'Level 4.1 goal must be connect_all');
  assert.ok(lvl41.devicesAllowed.includes('dhcp_server'), 'Must allow dhcp_server');
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Level 4.4 & 4.6: Email Depots and DNS Role
// ─────────────────────────────────────────────────────────────────────────────
test('Level 4.4 & 4.6: Email relays and DNS name translation role are explicitly explained', () => {
  const lvl44 = getLevelById('4.4');
  const lvl46 = getLevelById('4.6');

  assert.ok(lvl44.hint.includes('Depot'), 'Level 4.4 must explain Mail Depots');
  assert.ok(lvl46.hint.includes('DNS'), 'Level 4.6 hint must explain DNS server');
  assert.ok(lvl46.hint.includes('school.net'), 'Level 4.6 must mention school.net translation');
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. Chapter 5: Multi-Server Map Placement (5.1, 5.2, 5.5)
// ─────────────────────────────────────────────────────────────────────────────
test('Chapter 5: Multiple servers in 5.1, 5.2, 5.5 have distinct grid squares', () => {
  for (const lvlId of ['5.1', '5.2', '5.5']) {
    const { mapData } = generateLevelMap(lvlId, 'multi-server-test-seed');
    assert.ok(Array.isArray(mapData.servers), `${lvlId} must have servers array`);
    assert.ok(mapData.servers.length >= 2, `${lvlId} must have at least 2 servers`);

    // Verify all servers have unique squares
    const sqs = new Set(mapData.servers.map(s => s.square));
    assert.equal(sqs.size, mapData.servers.length, `${lvlId} all servers must have distinct positions`);

    // In 5.1: srv_student and srv_teacher both exist
    if (lvlId === '5.1') {
      const studentSrv = mapData.servers.find(s => s.id === 'srv_student');
      const teacherSrv = mapData.servers.find(s => s.id === 'srv_teacher');
      assert.ok(studentSrv, '5.1 must have srv_student');
      assert.ok(teacherSrv, '5.1 must have srv_teacher');
      assert.notEqual(studentSrv.square, teacherSrv.square, '5.1 servers must be at different squares');
    }
    // In 5.2: srv_library and srv_gradebook both exist
    if (lvlId === '5.2') {
      const libSrv = mapData.servers.find(s => s.id === 'srv_library');
      const gbSrv = mapData.servers.find(s => s.id === 'srv_gradebook');
      assert.ok(libSrv, '5.2 must have srv_library');
      assert.ok(gbSrv, '5.2 must have srv_gradebook');
      assert.notEqual(libSrv.square, gbSrv.square, '5.2 servers must be at different squares');
    }
    // In 5.5: all 3 servers exist
    if (lvlId === '5.5') {
      assert.equal(mapData.servers.length, 3, '5.5 must have 3 distinct servers');
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. Level 5.3 & 5.4: Router Exclusivity & Subnet Routing
// ─────────────────────────────────────────────────────────────────────────────
test('Level 5.3 & 5.4: Router exclusivity and clear Server C guidance', () => {
  const lvl53 = getLevelById('5.3');
  const lvl54 = getLevelById('5.4');

  // 5.3: Only router allowed (no switch), clear hint referencing Server C
  assert.deepEqual(lvl53.devicesAllowed, ['router'], '5.3 should only provide router device');
  assert.ok(lvl53.hint.includes('Server C'), '5.3 hint must reference Server C');
  assert.ok(lvl53.servers[0].name.includes('Server C'), '5.3 server name must indicate Server C');

  // 5.4: Only router allowed (no switch to bypass dynamic routing)
  assert.deepEqual(lvl54.devicesAllowed, ['router'], '5.4 should only provide router device');
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. Level 6.1: Firewall Inspector & Rule Cards
// ─────────────────────────────────────────────────────────────────────────────
test('Level 6.1: Clicking Firewall opens Firewall Inspector and allows rule cards', () => {
  const mockDOM = createMockDOM();
  const prevWindow = globalThis.window;
  const prevDoc = globalThis.document;
  globalThis.window = mockDOM.window;
  globalThis.document = mockDOM.document;

  try {
    const container = mockDOM.document.createElement('div');
    const ui = new NetCityClientUI(container);
    ui._loadLevel('6.1', 'seed-fw-test');

    // Place firewall
    const fwRes = ui.sim.placeDevice('firewall', 100);
    const fwDev = ui.sim.getDevice(fwRes.device.id);

    // Open inspector via _showDeviceInspector
    ui._showDeviceInspector(fwDev);
    assert.equal(ui.modalEl.style.display, 'flex');
    assert.ok(ui.modalEl.innerHTML.includes('Firewall Inspector'), 'Must open Firewall Inspector');
    assert.ok(ui.modalEl.innerHTML.includes('Rule Cards'), 'Must show Rule Cards');
    assert.ok(ui.modalEl.innerHTML.includes('10.99.99.99'), 'Must contain 10.99.99.99 reference');

    // Click quick rogue fill and add rule
    const quickBtn = ui.modalEl.querySelector('#nc-fw-quick-rogue');
    assert.ok(quickBtn, 'Quick Rogue button must exist');
    quickBtn.onclick();

    const addBtn = ui.modalEl.querySelector('#nc-fw-add-btn');
    assert.ok(addBtn, 'Add Rule button must exist');
    addBtn.onclick();
    assert.equal(fwDev.rules.length, 1, 'Rule must be added to firewall');
    assert.equal(fwDev.rules[0].action, 'block');
    assert.equal(fwDev.rules[0].sourceIp, '10.99.99.99');
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDoc;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. Level 6.2: Encryption Availability Gate
// ─────────────────────────────────────────────────────────────────────────────
test('Level 6.2: Link encryption toggle is available in 6.2+, but disabled in earlier levels', () => {
  const mockDOM = createMockDOM();
  const prevWindow = globalThis.window;
  const prevDoc = globalThis.document;
  globalThis.window = mockDOM.window;
  globalThis.document = mockDOM.document;

  try {
    const container = mockDOM.document.createElement('div');
    const ui = new NetCityClientUI(container);

    // Level 1.1: Pre-6.2 level
    ui._loadLevel('1.1', 'seed-enc-test-1');
    const mockWire1 = { id: 1, wireType: 'twisted_pair', length: 5, cost: 5, encrypted: false, path: [0, 1] };
    showWireInspector(ui, mockWire1);

    // Encrypt button must NOT exist in level 1.1 HTML
    assert.ok(!ui.modalEl.innerHTML.includes('nc-btn-toggle-encrypt'), 'Level 1.1 must not have Encrypt button');
    assert.ok(!ui.modalEl.innerHTML.includes('Encryption:'), 'Level 1.1 must not show Encryption status');

    // Level 6.2: Encryption level
    ui._loadLevel('6.2', 'seed-enc-test-2');
    const mockWire2 = { id: 2, wireType: 'twisted_pair', length: 5, cost: 5, encrypted: false, path: [0, 1] };
    showWireInspector(ui, mockWire2);

    // Encrypt button MUST exist in level 6.2 HTML
    assert.ok(ui.modalEl.innerHTML.includes('nc-btn-toggle-encrypt'), 'Level 6.2 must have Encrypt button');
    assert.ok(ui.modalEl.innerHTML.includes('Encryption:'), 'Must show Encryption status in 6.2');
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDoc;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 17. Chapter 5: Centered Layouts (5.1–5.5)
// ─────────────────────────────────────────────────────────────────────────────
test('Chapter 5: Levels 5.1 to 5.5 have handcrafted centered buildings and servers', () => {
  for (const lvlId of ['5.1', '5.2', '5.3', '5.4', '5.5']) {
    const lvl = getLevelById(lvlId);
    const { mapData } = generateLevelMap(lvlId, 'test-seed-chapter5-centered');
    const w = lvl.grid.w; // 36

    const usedSquares = new Set();

    // Check servers
    for (const s of mapData.servers) {
      assert.ok(s.square !== undefined, `${lvlId} server ${s.id} must have explicit square`);
      const col = s.square % w;
      const row = Math.floor(s.square / w);
      assert.ok(col >= 17 && col <= 26, `${lvlId} server ${s.id} col (${col}) must be centered towards right (17-26)`);
      assert.ok(row >= 2 && row <= 18, `${lvlId} server ${s.id} row (${row}) must be within grid margins`);
      assert.ok(!usedSquares.has(s.square), `${lvlId} duplicate square at ${s.square}`);
      usedSquares.add(s.square);
    }

    // Check all buildings (both start and spawns are generated into mapData.buildings)
    for (const b of mapData.buildings) {
      assert.ok(b.square !== undefined, `${lvlId} building ${b.id} must have explicit square`);
      const col = b.square % w;
      const row = Math.floor(b.square / w);
      assert.ok(col >= 7 && col <= 26, `${lvlId} building ${b.id} col (${col}) must be centered (7-26)`);
      assert.ok(row >= 2 && row <= 18, `${lvlId} building ${b.id} row (${row}) must be within grid margins`);
      assert.ok(!usedSquares.has(b.square), `${lvlId} building ${b.id} duplicate square at ${b.square}`);
      usedSquares.add(b.square);
    }

    // Also verify level definition spawns have explicit squares
    for (const sp of lvl.spawns) {
      assert.ok(sp.square !== undefined, `${lvlId} spawn at tick ${sp.tick} must have explicit square`);
      const col = sp.square % w;
      assert.ok(col >= 7 && col <= 26, `${lvlId} spawn col (${col}) must be centered (7-26)`);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 18. Rewind: Rewinds 5-10 seconds and preserves placed wires/devices
// ─────────────────────────────────────────────────────────────────────────────
test('Rewind: 10s rewind preserves placed wires & devices instead of wiping clean', () => {
  const mapData = {
    level: 'test-rewind-infra',
    seed: 'seed-rewind-infra',
    width: 24,
    height: 14,
    server: 24 * 7 + 12,
    startingCoins: 300,
    buildings: [
      { id: 1, type: 'laptop', square: 24 * 7 + 8, required: true, opensAtTick: 0, quota: 2, firstTimerTicks: 500, cycleTimerTicks: 240, deadlineTicks: 40, requestIntervalTicks: 40 },
      { id: 2, type: 'laptop', square: 24 * 7 + 4, required: true, opensAtTick: 0, quota: 2, firstTimerTicks: 120, cycleTimerTicks: 240, deadlineTicks: 40, requestIntervalTicks: 40 }
    ],
    devicesAllowed: ['switch'],
    wiresAllowed: ['twisted_pair'],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(mapData);

  // Play until tick 50
  for (let i = 0; i < 50; i++) sim.tick();

  // Player builds infrastructure: switch + 2 wires
  const swRes = sim.placeDevice('switch', 24 * 7 + 10);
  assert.ok(swRes.success, 'Switch placed successfully');

  const w1Res = sim.connectWire(1, [24 * 7 + 8, 24 * 7 + 9, 24 * 7 + 10], 'twisted_pair');
  assert.ok(w1Res.success, 'Wire 1 connected successfully');

  const w2Res = sim.connectWire(swRes.deviceId, [24 * 7 + 10, 24 * 7 + 11, 24 * 7 + 12], 'twisted_pair', 'device');
  assert.ok(w2Res.success, 'Wire 2 connected successfully');

  // Advance simulation until building 2 expires at tick 120
  for (let i = sim.tickNumber; i < 125; i++) sim.tick();

  assert.equal(sim.status, 'level_over', 'Simulation should fail when required building timer expires');
  assert.equal(sim.getBuilding(2).state, 'gave_up', 'Building 2 should be in gave_up state');

  // Trigger rewind (10 seconds)
  const rewound = sim.rewind(10);
  assert.ok(rewound, 'Rewind should return true');

  // 1. Level status must be playing again
  assert.equal(sim.status, 'playing', 'Level must resume in playing state');

  // 2. Placed devices and wires MUST STILL BE THERE (not wiped clean!)
  assert.equal(sim.devices.size, 1, 'Placed switch must NOT be wiped clean');
  assert.ok(sim.devices.has(swRes.deviceId), 'Switch ID must remain in sim.devices');
  assert.equal(sim.wires.size, 2, 'Placed wires must NOT be wiped clean');
  assert.ok(sim.wires.has(w1Res.wire.id), 'Wire 1 must remain intact');
  assert.ok(sim.wires.has(w2Res.wire.id), 'Wire 2 must remain intact');

  // 3. Building 2 must be restored to open with timer restored
  const b2 = sim.getBuilding(2);
  assert.equal(b2.state, 'open', 'Building 2 must be resurrected from gave_up to open');
  assert.ok(b2.timerTicksLeft >= 100, 'Building 2 must have its timer restored (>= 5-10 seconds)');

  // 4. UI check: Modal button displays "Rewind (10s)"
  const mockDOM = createMockDOM();
  const prevWindow = globalThis.window;
  const prevDoc = globalThis.document;
  globalThis.window = mockDOM.window;
  globalThis.document = mockDOM.document;
  try {
    const container = mockDOM.document.createElement('div');
    const ui = new NetCityClientUI(container);
    ui.sim = sim;
    showLevelOverModal(ui);
    assert.ok(ui.modalEl.innerHTML.includes('Rewind (10s)'), 'Modal button must display Rewind (10s)');
    assert.ok(!ui.modalEl.innerHTML.includes('Rewind (30s)'), 'Modal button must NOT display Rewind (30s)');
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDoc;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 19. Level 5.1: Computer 3 Packet Delivery, Non-Faded Wires, & Wire Inspector Warning
// ─────────────────────────────────────────────────────────────────────────────
test('Level 5.1: Computer 3 can deliver packets through switch without fading and inspect displays warning if faded', () => {
  const { mapData } = generateLevelMap('5.1', 'seed-5-1-test');
  const sim = new NetCitySimulation(mapData);

  // 1. Verify Computer 3 coordinates are centered and not boxed in
  const c3 = sim.getBuilding(3);
  assert.equal(c3.zone, 'blue', 'Computer 3 must be in blue zone');
  assert.equal(c3.targetServerId, 'srv_student', 'Computer 3 must target srv_student');
  const c3Col = c3.square % 36;
  const c3Row = Math.floor(c3.square / 36);
  assert.ok(c3Col >= 10 && c3Col <= 16, 'Computer 3 must be comfortably in cols 10-16');

  // 2. Place Switch in middle corridor (row 13, col 17)
  const switchSq = 13 * 36 + 17;
  const swRes = sim.placeDevice('switch', switchSq);
  assert.ok(swRes.success, 'Switch placement must succeed');
  const dev = swRes.device;

  // 3. Connect Computer 3 to switch with twisted_pair
  const occupied = new Set(sim.occupiedSquares);
  const p3 = bfsPath(c3.square, switchSq, occupied, 36, 20);
  assert.ok(p3, 'Path must exist from Computer 3 to switch');
  assert.ok(p3.length - 1 <= 10, `Path length (${p3.length - 1}) must not exceed maxRunSquares (10) for twisted pair`);

  const w3Res = sim.connectWire(3, p3, 'twisted_pair', 'building');
  assert.ok(w3Res.success, 'Wire from Computer 3 to switch must connect');
  const w3 = sim.wires.get(w3Res.wire.id);
  assert.equal(w3.isFaded, false, 'Wire must NOT be faded');

  // 4. Connect switch to srv_student (row 13, col 24)
  const studentSrv = sim.servers.find(s => s.id === 'srv_student');
  assert.ok(studentSrv, 'srv_student must exist');
  const pSrv = bfsPath(switchSq, studentSrv.square, occupied, 36, 20);
  assert.ok(pSrv, 'Path must exist from switch to server');
  assert.ok(pSrv.length - 1 <= 10, `Path length (${pSrv.length - 1}) must not exceed maxRunSquares (10)`);

  const wSrvRes = sim.connectWire(dev.id, pSrv, 'twisted_pair', 'device');
  assert.ok(wSrvRes.success, 'Wire from switch to server must connect');
  const wSrv = sim.wires.get(wSrvRes.wire.id);
  assert.equal(wSrv.isFaded, false, 'Server wire must NOT be faded');

  // 5. Configure switch port zones to blue
  sim.setSwitchPortZone(dev.id, w3.id, 'blue');
  sim.setSwitchPortZone(dev.id, wSrv.id, 'blue');

  // 6. Step simulation and verify packets delivered to Computer 3
  let deliveredCount = 0;
  for (let t = 0; t < 200; t++) {
    const events = sim.tick();
    for (const e of events) {
      if (e.buildingId === 3 && e.type === 'PacketDelivered') {
        deliveredCount++;
      }
    }
  }

  assert.ok(deliveredCount >= 1, `Computer 3 must receive packets and deliver them (got ${deliveredCount})`);
  assert.equal(c3.hasMetFirstQuota, true, 'Computer 3 must meet its quota');

  // 7. Test Wire Inspector & Building Inspector display Signal Faded warning on faded wire
  const mockDOM = createMockDOM();
  const prevWindow = globalThis.window;
  const prevDoc = globalThis.document;
  globalThis.window = mockDOM.window;
  globalThis.document = mockDOM.document;
  try {
    const container = mockDOM.document.createElement('div');
    const ui = new NetCityClientUI(container);
    ui.sim = sim;

    // Faded wire
    const fadedWire = { id: 99, wireType: 'twisted_pair', length: 14, cost: 14, isFaded: true, path: [0, 1] };
    showWireInspector(ui, fadedWire);
    assert.ok(ui.modalEl.innerHTML.includes('Signal Faded'), 'showWireInspector must display Signal Faded warning');
    assert.ok(ui.modalEl.innerHTML.includes('exceeds maximum length'), 'showWireInspector must state exceeds maximum length');

    // Building inspector with faded wire
    sim.wires.set(99, fadedWire);
    const mockBuilding = { id: 10, type: 'laptop', wireId: 99, state: 'open', fulfilledInCycle: 0, quota: 2 };
    showBuildingInspector(ui, mockBuilding);
    assert.ok(ui.modalEl.innerHTML.includes('Signal Faded'), 'showBuildingInspector must display Signal Faded warning');
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDoc;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 20. Laptop 4 Color Variations & Dynamic Zone Switching
// ─────────────────────────────────────────────────────────────────────────────
test('Laptop Variants: Normal, Blue, Green, Orange assets exist and switch when assigned a zone', () => {
  // 1. Verify all 4 laptop assets are registered in ASSET_PATHS
  assert.ok(ASSET_PATHS['buildings/laptop'], 'Normal laptop asset must exist');
  assert.ok(ASSET_PATHS['buildings/laptop_blue'], 'Blue laptop asset must exist');
  assert.ok(ASSET_PATHS['buildings/laptop_green'], 'Green laptop asset must exist');
  assert.ok(ASSET_PATHS['buildings/laptop_orange'], 'Orange laptop asset must exist');

  // 2. Verify all 4 PNG files physically exist on disk and have valid file sizes
  for (const key of ['buildings/laptop', 'buildings/laptop_blue', 'buildings/laptop_green', 'buildings/laptop_orange']) {
    const diskPath = path.resolve('apps/client/public', ASSET_PATHS[key]);
    assert.ok(fs.existsSync(diskPath), `Laptop asset ${key} must exist on disk: ${diskPath}`);
    const stat = fs.statSync(diskPath);
    assert.ok(stat.size > 100000, `Laptop asset ${key} must be a high-res PNG (>100KB, got ${stat.size})`);
  }

  // 3. Test Simulation setBuildingZone and setBuildingIp zone support
  const mapData = {
    level: 'test-laptop-zones',
    seed: 'seed-lz',
    width: 20,
    height: 10,
    server: 20 * 5 + 10,
    startingCoins: 100,
    devicesAllowed: ['switch'],
    buildings: [
      { id: 1, type: 'laptop', square: 20 * 5 + 5, required: true, opensAtTick: 0, quota: 2, zone: null }
    ]
  };
  const sim = new NetCitySimulation(mapData);
  const b1 = sim.getBuilding(1);
  assert.equal(b1.zone, null, 'Initial zone should be null');

  // Change to blue
  sim.setBuildingZone(1, 'blue');
  assert.equal(b1.zone, 'blue', 'b.zone must be updated to blue');

  // Change to green
  sim.setBuildingZone(1, 'green');
  assert.equal(b1.zone, 'green', 'b.zone must be updated to green');

  // Change to orange
  sim.setBuildingZone(1, 'orange');
  assert.equal(b1.zone, 'orange', 'b.zone must be updated to orange');

  // 4. Test Switch port zone assignment propagates to connected building
  const swRes = sim.placeDevice('switch', 20 * 5 + 7);
  assert.ok(swRes.success, 'Switch placement must succeed');
  const wRes = sim.connectWire(1, [20 * 5 + 5, 20 * 5 + 6, 20 * 5 + 7], 'twisted_pair', 'building');
  assert.ok(wRes.success, 'Wire connection must succeed');

  sim.setSwitchPortZone(swRes.deviceId, wRes.wire.id, 'blue');
  assert.equal(b1.zone, 'blue', 'Setting switch port zone to blue must update connected building zone to blue');

  sim.setSwitchPortZone(swRes.deviceId, wRes.wire.id, 'green');
  assert.equal(b1.zone, 'green', 'Setting switch port zone to green must update connected building zone to green');

  sim.setSwitchPortZone(swRes.deviceId, wRes.wire.id, 'orange');
  assert.equal(b1.zone, 'orange', 'Setting switch port zone to orange must update connected building zone to orange');

  // 5. Test AssetManager drawBuilding resolution
  const assets = new AssetManager();
  const mockCanvasCtx = {
    save() {},
    restore() {},
    drawImage() {},
    imageSmoothingQuality: 'high'
  };
  // Mock image objects in asset cache
  assets.images.set('buildings/laptop', { complete: true, naturalWidth: 480, naturalHeight: 389 });
  assets.images.set('buildings/laptop_blue', { complete: true, naturalWidth: 480, naturalHeight: 389 });
  assets.images.set('buildings/laptop_green', { complete: true, naturalWidth: 480, naturalHeight: 389 });
  assets.images.set('buildings/laptop_orange', { complete: true, naturalWidth: 480, naturalHeight: 389 });

  assert.equal(assets.drawBuilding(mockCanvasCtx, 'laptop', 100, 100, 40, null), true, 'Normal laptop draws');
  assert.equal(assets.drawBuilding(mockCanvasCtx, 'laptop', 100, 100, 40, 'blue'), true, 'Blue laptop draws');
  assert.equal(assets.drawBuilding(mockCanvasCtx, 'laptop', 100, 100, 40, 'green'), true, 'Green laptop draws');
  assert.equal(assets.drawBuilding(mockCanvasCtx, 'laptop', 100, 100, 40, 'orange'), true, 'Orange laptop draws');

  // 5.5 Test Sports Ground variations
  assets.images.set('buildings/sports_ground', { complete: true, naturalWidth: 480, naturalHeight: 389 });
  assets.images.set('buildings/sports_ground_blue', { complete: true, naturalWidth: 480, naturalHeight: 389 });
  assets.images.set('buildings/sports_ground_green', { complete: true, naturalWidth: 480, naturalHeight: 389 });
  assets.images.set('buildings/sports_ground_orange', { complete: true, naturalWidth: 480, naturalHeight: 389 });

  assert.equal(assets.drawBuilding(mockCanvasCtx, 'sports_ground', 100, 100, 40, null), true, 'Normal sports ground draws');
  assert.equal(assets.drawBuilding(mockCanvasCtx, 'sports_ground', 100, 100, 40, 'blue'), true, 'Blue sports ground draws');
  assert.equal(assets.drawBuilding(mockCanvasCtx, 'sports_ground', 100, 100, 40, 'green'), true, 'Green sports ground draws');
  assert.equal(assets.drawBuilding(mockCanvasCtx, 'sports_ground', 100, 100, 40, 'orange'), true, 'Orange sports ground draws');

  // 5.6 Test Home variations
  assets.images.set('buildings/home', { complete: true, naturalWidth: 480, naturalHeight: 389 });
  assets.images.set('buildings/home_blue', { complete: true, naturalWidth: 480, naturalHeight: 389 });
  assets.images.set('buildings/home_green', { complete: true, naturalWidth: 480, naturalHeight: 389 });
  assets.images.set('buildings/home_orange', { complete: true, naturalWidth: 480, naturalHeight: 389 });

  assert.equal(assets.drawBuilding(mockCanvasCtx, 'home', 100, 100, 40, null), true, 'Normal home draws');
  assert.equal(assets.drawBuilding(mockCanvasCtx, 'home', 100, 100, 40, 'blue'), true, 'Blue home draws');
  assert.equal(assets.drawBuilding(mockCanvasCtx, 'home', 100, 100, 40, 'green'), true, 'Green home draws');
  assert.equal(assets.drawBuilding(mockCanvasCtx, 'home', 100, 100, 40, 'orange'), true, 'Orange home draws');

  // 5.7 Test Library variations
  assets.images.set('buildings/library', { complete: true, naturalWidth: 480, naturalHeight: 389 });
  assets.images.set('buildings/library_blue', { complete: true, naturalWidth: 480, naturalHeight: 389 });
  assets.images.set('buildings/library_green', { complete: true, naturalWidth: 480, naturalHeight: 389 });
  assets.images.set('buildings/library_orange', { complete: true, naturalWidth: 480, naturalHeight: 389 });

  assert.equal(assets.drawBuilding(mockCanvasCtx, 'library', 100, 100, 40, null), true, 'Normal library draws');
  assert.equal(assets.drawBuilding(mockCanvasCtx, 'library', 100, 100, 40, 'blue'), true, 'Blue library draws');
  assert.equal(assets.drawBuilding(mockCanvasCtx, 'library', 100, 100, 40, 'green'), true, 'Green library draws');
  assert.equal(assets.drawBuilding(mockCanvasCtx, 'library', 100, 100, 40, 'orange'), true, 'Orange library draws');

  // 5.8 Test Computer Lab variations
  assets.images.set('buildings/lab', { complete: true, naturalWidth: 480, naturalHeight: 389 });
  assets.images.set('buildings/lab_blue', { complete: true, naturalWidth: 480, naturalHeight: 389 });
  assets.images.set('buildings/lab_green', { complete: true, naturalWidth: 480, naturalHeight: 389 });
  assets.images.set('buildings/lab_orange', { complete: true, naturalWidth: 480, naturalHeight: 389 });

  assert.equal(assets.drawBuilding(mockCanvasCtx, 'lab', 100, 100, 40, null), true, 'Normal lab draws');
  assert.equal(assets.drawBuilding(mockCanvasCtx, 'lab', 100, 100, 40, 'blue'), true, 'Blue lab draws');
  assert.equal(assets.drawBuilding(mockCanvasCtx, 'lab', 100, 100, 40, 'green'), true, 'Green lab draws');
  assert.equal(assets.drawBuilding(mockCanvasCtx, 'lab', 100, 100, 40, 'orange'), true, 'Orange lab draws');

  // 5.9 Test Phone building drawing
  assets.images.set('buildings/phone', { complete: true, naturalWidth: 400, naturalHeight: 480 });
  assert.equal(assets.drawBuilding(mockCanvasCtx, 'phone', 100, 100, 40, null), true, 'Phone building draws');

  // 5.10 Test Server variants drawing
  assets.images.set('devices/server', { complete: true, naturalWidth: 480, naturalHeight: 480 });
  assets.images.set('devices/web_server', { complete: true, naturalWidth: 480, naturalHeight: 480 });
  assets.images.set('devices/database_server', { complete: true, naturalWidth: 480, naturalHeight: 480 });
  assets.images.set('devices/email_server', { complete: true, naturalWidth: 480, naturalHeight: 480 });
  assets.images.set('devices/dhcp_server', { complete: true, naturalWidth: 480, naturalHeight: 480 });
  assets.images.set('devices/dns_server', { complete: true, naturalWidth: 480, naturalHeight: 480 });

  assert.equal(assets.drawServer(mockCanvasCtx, 'server', 100, 100, 40), true, 'General server draws');
  assert.equal(assets.drawServer(mockCanvasCtx, 'web', 100, 100, 40), true, 'Web server draws');
  assert.equal(assets.drawServer(mockCanvasCtx, 'db', 100, 100, 40), true, 'Database server draws');
  assert.equal(assets.drawServer(mockCanvasCtx, 'email', 100, 100, 40), true, 'Email server draws');
  assert.equal(assets.drawServer(mockCanvasCtx, 'mail', 100, 100, 40), true, 'Mail server draws');
  assert.equal(assets.drawServer(mockCanvasCtx, 'database_server', 100, 100, 40), true, 'Database_server type draws');
  assert.equal(assets.drawServer(mockCanvasCtx, 'dhcp', 100, 100, 40), true, 'DHCP server draws');
  assert.equal(assets.drawServer(mockCanvasCtx, 'dhcp_server', 100, 100, 40), true, 'dhcp_server type draws');
  assert.equal(assets.drawServer(mockCanvasCtx, 'dns', 100, 100, 40), true, 'DNS server draws');
  assert.equal(assets.drawServer(mockCanvasCtx, 'dns_server', 100, 100, 40), true, 'dns_server type draws');

  // 5.11 Test Hardware Device variants drawing (cabinet, hub, switch, access_point, router)
  assets.images.set('devices/cabinet', { complete: true, naturalWidth: 480, naturalHeight: 480 });
  assets.images.set('devices/hub', { complete: true, naturalWidth: 480, naturalHeight: 480 });
  assets.images.set('devices/switch', { complete: true, naturalWidth: 480, naturalHeight: 480 });
  assets.images.set('devices/access_point', { complete: true, naturalWidth: 480, naturalHeight: 480 });
  assets.images.set('devices/router', { complete: true, naturalWidth: 480, naturalHeight: 480 });

  assert.equal(assets.drawDevice(mockCanvasCtx, 'cabinet', 100, 100, 40), true, 'Street cabinet device draws');
  assert.equal(assets.drawDevice(mockCanvasCtx, 'hub', 100, 100, 40), true, 'Hub device draws');
  assert.equal(assets.drawDevice(mockCanvasCtx, 'switch', 100, 100, 40), true, 'Switch device draws');
  assert.equal(assets.drawDevice(mockCanvasCtx, 'access_point', 100, 100, 40), true, 'Access Point device draws');
  assert.equal(assets.drawDevice(mockCanvasCtx, 'ap', 100, 100, 40), true, 'AP alias device draws');
  assert.equal(assets.drawDevice(mockCanvasCtx, 'router', 100, 100, 40), true, 'Router device draws');

  // 6. Test Building Inspector zone dropdown UI
  const mockDOM = createMockDOM();
  const prevWindow = globalThis.window;
  const prevDoc = globalThis.document;
  globalThis.window = mockDOM.window;
  globalThis.document = mockDOM.document;
  try {
    const container = mockDOM.document.createElement('div');
    const ui = new NetCityClientUI(container);
    ui.sim = sim;
    showBuildingInspector(ui, b1);

    const zoneDropdown = ui.modalEl.querySelector('#nc-input-zone');
    assert.ok(zoneDropdown, 'Building inspector must render zone selector dropdown');
    assert.ok(ui.modalEl.innerHTML.includes('Blue Zone'), 'Zone dropdown must include Blue option');
    assert.ok(ui.modalEl.innerHTML.includes('Green Zone'), 'Zone dropdown must include Green option');
    assert.ok(ui.modalEl.innerHTML.includes('Orange Zone'), 'Zone dropdown must include Orange option');
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDoc;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 21. Canvas Rendering: All levels render completely without throwing any errors
// ─────────────────────────────────────────────────────────────────────────────
test('Canvas Rendering: All 44 levels + endless mode render completely with zero errors', () => {
  const drawnOperations = [];
  const mockCanvasCtx = {
    save() {},
    restore() {},
    translate() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fill() {},
    fillRect() {},
    strokeRect() {},
    rect() {},
    roundRect() {},
    arc() {},
    ellipse() {},
    fillText(text, x, y) {
      drawnOperations.push({ op: 'fillText', text, x, y });
    },
    drawImage(img, ...args) {
      drawnOperations.push({ op: 'drawImage', img });
    },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
    measureText(str) { return { width: (str || '').length * 8 }; },
    setLineDash() {},
    canvas: { width: 1200, height: 800 }
  };

  const renderer = new CanvasRenderer({ width: 1200, height: 800 }, mockCanvasCtx, null);

  for (const lvl of ALL_LEVELS) {
    drawnOperations.length = 0;
    const { levelDef, mapData } = generateLevelMap(lvl.id, 'test-render-seed');
    const sim = new NetCitySimulation(mapData);
    const camera = { x: 50, y: 50, baseSquareSize: 32, zoom: 1 };

    // Render should never throw an error
    assert.doesNotThrow(() => {
      renderer.render({
        sim,
        camera,
        levelDef,
        isDragging: false,
        dragPath: [],
        dragValidity: { valid: true },
        activeWireType: 'twisted_pair',
        collisionBursts: [],
        cursorSquare: null,
        heldItem: null,
        activeTool: null,
        deviceBtns: {}
      });
    }, `Level ${lvl.id} canvas render must not throw`);

    // Verify elements were actually drawn for each level
    assert.ok(drawnOperations.length > 0, `Level ${lvl.id} must draw elements to canvas`);

    // Verify at least one building label or icon was drawn
    const texts = drawnOperations.filter(d => d.op === 'fillText').map(d => d.text);
    assert.ok(texts.length > 0, `Level ${lvl.id} must render text labels on canvas`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 22. Grid Sizing & Tag Cleanup: End device tags removed, server tags kept, larger sprites
// ─────────────────────────────────────────────────────────────────────────────
test('Grid Sizing & Tag Cleanup: End devices have no floating pill tags, servers keep tags, larger grid scale', () => {
  const drawnTexts = [];
  const mockCanvasCtx = {
    save() {},
    restore() {},
    translate() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fill() {},
    fillRect() {},
    strokeRect() {},
    rect() {},
    roundRect() {},
    arc() {},
    ellipse() {},
    fillText(text, x, y) {
      drawnTexts.push(text);
    },
    drawImage() {},
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
    measureText(str) { return { width: (str || '').length * 8 }; },
    setLineDash() {},
    canvas: { width: 1024, height: 600 }
  };

  const assets = new AssetManager();
  // Register assets
  assets.images.set('buildings/laptop', { complete: true, naturalWidth: 480, naturalHeight: 389 });
  assets.images.set('devices/server', { complete: true, naturalWidth: 480, naturalHeight: 480 });

  const renderer = new CanvasRenderer({ width: 1024, height: 600 }, mockCanvasCtx, assets);

  const { levelDef, mapData } = generateLevelMap('3.4', 'test-tags-seed');
  const sim = new NetCitySimulation(mapData);
  const camera = { x: 50, y: 50, baseSquareSize: 48, zoom: 1 };

  renderer.render({
    sim,
    camera,
    levelDef,
    isDragging: false,
    dragPath: [],
    dragValidity: { valid: true },
    activeWireType: 'twisted_pair',
    collisionBursts: [],
    cursorSquare: null,
    heldItem: null,
    activeTool: null,
    deviceBtns: {}
  });

  // 1. Verify NO end device tags like "Blue Laptop" or "Green Laptop" are rendered on canvas
  const hasLaptopTag = drawnTexts.some(t => t.includes('Laptop') || t.includes('School'));
  assert.equal(hasLaptopTag, false, 'End devices (laptops, schools) must NOT have floating pill tags');

  // 2. Verify server tag IS kept
  const hasServerTag = drawnTexts.some(t => t.includes('Server') || t.includes('Gradebook') || t.includes('Library'));
  assert.ok(hasServerTag, 'Server floating pill badges must be kept for server identification');

  // 3. Verify camera minimum square size ensures legible grid
  const testCam = new Camera();
  testCam.fit(1024, 462, 32, 18, { top: 50, bottom: 60, left: 20, right: 20 }, 44);
  assert.ok(testCam.baseSquareSize >= 44, 'Base square size must be at least 44px on small viewports');
});
