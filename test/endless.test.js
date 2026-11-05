/**
 * NetCity v2.0 - Endless Mode Test Suite
 * Validates specifications from Sections 6.1, 5.9, and 9.7:
 * - Dynamic tier resolution (Tiers 1 to 7) based on campaign progress
 * - Endless map setup (32x18 grid, 80 starting coins, 3 start buildings)
 * - Procedural spawner with exponential decay interval
 * - Sudden failure: every building is required; 1 timer zero = level over
 * - Scoring formula: score = seconds survived + 5 * (buildings served) + citizen happiness
 * - Top 5 personal best storage persistence
 * - UI navigation and screen switching
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { createMockDOM } from './mock-dom.js';
import { getUnlockedTier, getEndlessSetup } from '../packages/content/src/endless-config.js';
import { NetCitySimulation } from '../packages/sim/src/sim.js';
import { bfsPath } from '../packages/sim/src/pathfinding.js';
import { StateManager } from '../apps/client/src/core/state-manager.js';
import { NetCityClientUI } from '../apps/client/src/ui.js';

test('Endless Mode: Dynamic tier resolution from completed levels', () => {
  assert.equal(getUnlockedTier(new Set()), 1, 'Default tier should be 1');
  assert.equal(getUnlockedTier(['1.1', '1.2']), 1, 'Ch1 progress should give tier 1');
  assert.equal(getUnlockedTier(['1.9', '2.1']), 2, 'Ch2 progress should unlock tier 2');
  assert.equal(getUnlockedTier(['3.4']), 3, 'Ch3 progress should unlock tier 3');
  assert.equal(getUnlockedTier(['4.2']), 4, 'Ch4 progress should unlock tier 4');
  assert.equal(getUnlockedTier(['5.1']), 5, 'Ch5 progress should unlock tier 5');
  assert.equal(getUnlockedTier(['6.1']), 6, 'Ch6 progress should unlock tier 6');
  assert.equal(getUnlockedTier(['7.6']), 7, 'Ch7 progress should unlock tier 7');
});

test('Endless Mode: Setup configuration specifications match Section 6.1 and 5.9', () => {
  const setup1 = getEndlessSetup(1);
  assert.equal(setup1.grid.w, 32, 'Endless grid width must be 32');
  assert.equal(setup1.grid.h, 18, 'Endless grid height must be 18');
  assert.equal(setup1.coins, 80, 'Starting coins must be 80');
  assert.equal(setup1.firstTimerTicks, 800, 'Tier 1 first timer must be 800 ticks');
  assert.equal(setup1.cycleTimerTicks, 240, 'Cycle timer must be 240 ticks');
  assert.ok(setup1.wiresAllowed.includes('twisted_pair'));
  assert.ok(setup1.devicesAllowed.includes('cabinet'));
  assert.ok(!setup1.devicesAllowed.includes('router'), 'Tier 1 should not have routers');

  const setup7 = getEndlessSetup(7);
  assert.ok(setup7.devicesAllowed.includes('router'));
  assert.ok(setup7.devicesAllowed.includes('firewall'));
  assert.ok(setup7.devicesAllowed.includes('load_balancer'));
  assert.ok(setup7.devicesAllowed.includes('backup_power'));
  assert.equal(setup7.firstTimerTicks, 350, 'Tier 7 first timer must be 350 ticks');
});

test('Endless Mode: Procedural simulation spawns 3 starting buildings and sudden failure on timeout', () => {
  const setup = getEndlessSetup(1);
  setup.seed = 'test-seed-1';

  const sim = new NetCitySimulation(setup);
  assert.equal(sim.isEndless, true, 'sim.isEndless should be true');
  assert.equal(sim.buildings.length, 3, 'Must spawn 3 starting buildings');
  
  // Starting buildings should be 2 laptops and 1 classroom per Section 6.1
  const laptops = sim.buildings.filter(b => b.type === 'laptop');
  const classrooms = sim.buildings.filter(b => b.type === 'classroom');
  assert.equal(laptops.length, 2, 'Must have 2 laptops');
  assert.equal(classrooms.length, 1, 'Must have 1 classroom');

  // All buildings in endless mode must be required
  assert.ok(sim.buildings.every(b => b.required === true), 'All endless buildings must be required');

  // Let a building timer expire -> must trigger sudden failure (level_over)
  const b = sim.buildings[0];
  b.timerTicksLeft = 1;
  sim.tick();

  assert.equal(sim.status, 'level_over', 'Timer expiry must end endless run immediately');
});

test('Endless Mode: Fulfilling quotas does NOT trigger win, run continues indefinitely', () => {
  const setup = getEndlessSetup(1);
  setup.seed = 'no-win-test';

  const sim = new NetCitySimulation(setup);
  // Mark all buildings as opened and having met quota
  for (const b of sim.buildings) {
    b.state = 'open';
    b.hasMetFirstQuota = true;
  }

  sim.tick();
  assert.equal(sim.status, 'playing', 'Endless mode should never trigger won status even when all buildings meet quota');
});

test('Endless Mode: Connected buildings send packets to server and fulfill quotas', () => {
  const setup = getEndlessSetup(1);
  setup.seed = 'packet-flow-test';

  const sim = new NetCitySimulation(setup);
  const b1 = sim.buildings[0];
  assert.ok(b1.destinationSquare, 'Building destinationSquare must be defined');

  // Find BFS path from building to server
  const path = bfsPath(b1.square, sim.server, sim.walls, sim.width, sim.height);
  assert.ok(path && path.length >= 2, 'Must find path between building and server');

  const wireRes = sim.connectWire(b1.id, path, 'twisted_pair', 'building');
  assert.equal(wireRes.success, true, 'Wire connection should succeed');

  let packetDispatched = false;
  let packetDelivered = false;

  for (let t = 1; t <= 120; t++) {
    const events = sim.tick();
    if (sim.inFlightPackets.length > 0) packetDispatched = true;
    if (events.some(e => e.type === 'PacketDelivered')) {
      packetDelivered = true;
      break;
    }
  }

  assert.equal(packetDispatched, true, 'Building must dispatch packets along wire');
  assert.equal(packetDelivered, true, 'Packet must be delivered to server');
  assert.ok(b1.deliveredTotal >= 1, 'Delivered total must increment');
});

test('Endless Mode: Multi-hop building -> cabinet -> server packet flow', () => {
  const setup = getEndlessSetup(1);
  setup.seed = 'cabinet-flow-test';
  setup.coins = 200; // ample coins for device + wires

  const sim = new NetCitySimulation(setup);
  const b = sim.buildings[0];
  assert.ok(b.destinationSquare, 'Building destinationSquare must be defined');

  // Pick an empty intermediate square between b and sim.server
  const bx = b.square % sim.width;
  const by = Math.floor(b.square / sim.width);
  const sx = sim.server % sim.width;
  const sy = Math.floor(sim.server / sim.width);
  const midX = Math.floor((bx + sx) / 2);
  const midY = Math.floor((by + sy) / 2);
  const cabSquare = midY * sim.width + midX;

  const placeRes = sim.placeDevice('cabinet', cabSquare);
  assert.equal(placeRes.success, true, 'Cabinet placement should succeed');

  const path1 = bfsPath(b.square, cabSquare, sim.walls, sim.width, sim.height);
  assert.ok(path1 && path1.length >= 2, 'Must find path to cabinet');
  const w1 = sim.connectWire(b.id, path1, 'twisted_pair', 'building');
  assert.equal(w1.success, true, 'Building to cabinet wire should connect');

  const path2 = bfsPath(cabSquare, sim.server, sim.walls, sim.width, sim.height);
  assert.ok(path2 && path2.length >= 2, 'Must find path to server');
  const w2 = sim.connectWire(placeRes.device.id, path2, 'twisted_pair', 'device');
  assert.equal(w2.success, true, 'Cabinet to server wire should connect');

  let packetDispatched = false;
  let packetDelivered = false;
  for (let t = 1; t <= 120; t++) {
    const events = sim.tick();
    if (sim.inFlightPackets.length > 0) packetDispatched = true;
    if (events.some(e => e.type === 'PacketDelivered')) {
      packetDelivered = true;
      break;
    }
  }

  assert.equal(packetDispatched, true, 'Packet must dispatch through cabinet');
  assert.equal(packetDelivered, true, 'Packet must be delivered via cabinet');
  assert.ok(b.deliveredTotal >= 1, 'Building delivered total should increment');
});

test('Endless Mode: Procedural spawner adds buildings over time with exponential decay interval', () => {
  const setup = getEndlessSetup(2);
  setup.seed = 'spawner-test';

  const sim = new NetCitySimulation(setup);
  const initialCount = sim.buildings.length;
  assert.equal(initialCount, 3);

  // Force spawn tick to trigger spawn
  sim.nextEndlessSpawnTick = 1;
  sim.tickNumber = 1;
  sim.tick();

  assert.equal(sim.buildings.length, initialCount + 1, 'Procedural spawner must add a new building');
  const spawned = sim.buildings[sim.buildings.length - 1];
  assert.equal(spawned.state, 'construction', 'New building starts in construction');
  assert.equal(spawned.required, true, 'Spawned building must be required');
});

test('Endless Mode: Score calculation matches Section 6.1 formula', () => {
  const setup = getEndlessSetup(1);
  setup.seed = 'score-test';

  const sim = new NetCitySimulation(setup);
  sim.tickNumber = 1200; // 60 seconds (at 20 ticks/s)
  sim.servedBuildingIds.add(1);
  sim.servedBuildingIds.add(2);
  sim.servedBuildingIds.add(3);
  sim.happinessMeter = 90;

  const scoreData = sim.getEndlessScore();
  assert.equal(scoreData.secondsSurvived, 60, 'Seconds survived should be 60');
  assert.equal(scoreData.buildingsServed, 3, 'Buildings served should be 3');
  assert.equal(scoreData.averageHappiness, 90, 'Average happiness should be 90');
  // Formula: score = seconds survived + 5 * (buildings served) + citizen happiness
  // 60 + 5 * 3 + 90 = 165
  assert.equal(scoreData.totalScore, 165, 'Total score must match formula');
});

test('Endless Mode: State persistence saves and ranks top 5 runs', () => {
  const mockDOM = createMockDOM();
  const storage = new Map();
  const mockLocalStorage = {
    getItem: (k) => storage.has(k) ? storage.get(k) : null,
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
    clear: () => storage.clear()
  };

  globalThis.window = mockDOM.window;
  globalThis.document = mockDOM.document;
  globalThis.localStorage = mockLocalStorage;

  const stateManager = new StateManager();
  localStorage.clear();

  assert.deepEqual(stateManager.loadEndlessHighScores(), []);

  // Save 1st run
  const res1 = stateManager.saveEndlessScore({
    score: 100,
    secondsSurvived: 40,
    buildingsServed: 2,
    averageHappiness: 80,
    seed: 'seed-1'
  });
  assert.equal(res1.isNewHighScore, true, 'First score should be new high score');
  assert.equal(res1.rank, 1);

  // Save 2nd lower run
  const res2 = stateManager.saveEndlessScore({
    score: 80,
    secondsSurvived: 30,
    buildingsServed: 1,
    averageHappiness: 75,
    seed: 'seed-2'
  });
  assert.equal(res2.isNewHighScore, false);
  assert.equal(res2.rank, 2);

  // Save 3rd higher run
  const res3 = stateManager.saveEndlessScore({
    score: 150,
    secondsSurvived: 60,
    buildingsServed: 4,
    averageHappiness: 90,
    seed: 'seed-3'
  });
  assert.equal(res3.isNewHighScore, true, 'Higher score should be rank 1');
  assert.equal(res3.rank, 1);

  const top = stateManager.loadEndlessHighScores();
  assert.equal(top.length, 3);
  assert.equal(top[0].score, 150);
  assert.equal(top[1].score, 100);
  assert.equal(top[2].score, 80);
});

test('Endless Mode: UI integration switches screens and launches endless run', () => {
  const mockDOM = createMockDOM();
  globalThis.window = mockDOM.window;
  globalThis.document = mockDOM.document;
  globalThis.localStorage = mockDOM.window.localStorage;
  globalThis.requestAnimationFrame = mockDOM.window.requestAnimationFrame;
  globalThis.cancelAnimationFrame = mockDOM.window.cancelAnimationFrame;

  const container = mockDOM.document.createElement('div');
  const ui = new NetCityClientUI(container, { testMode: true });

  // 1. Initial state
  assert.ok(ui.screenCampaignEl);
  assert.ok(ui.screenEndlessEl);
  assert.ok(ui.screenLearnEl);

  // 2. Switch to Endless Screen
  ui._setScreen('endless');
  ui._renderEndlessScreen();

  assert.equal(ui.screenEndlessEl.style.display, 'flex');
  assert.equal(ui.screenCampaignEl.style.display, 'none');
  assert.ok(ui.screenEndlessEl.innerHTML.includes('Endless Metropolis'));
  assert.ok(ui.screenEndlessEl.innerHTML.includes('SELECT DIFFICULTY TIER'));
  assert.ok(ui.screenEndlessEl.innerHTML.includes('nc-tier-pill'));
  assert.ok(ui.screenEndlessEl.innerHTML.includes('Start Endless Run ▶'));

  // 3. Launch Endless Run
  ui._startEndlessRun('test-endless-run');
  assert.equal(ui.currentScreen, 'game');
  assert.equal(ui.screenGameEl.style.display, 'flex');
  assert.equal(ui.sim.isEndless, true);
  assert.equal(ui.titleEl.textContent, 'Endless Metropolis');
});

test('Endless Mode: Tier selection — lower tier is playable after higher tier unlocked', () => {
  // getUnlockedTier with ch2 progress = tier 2
  const completedCh2 = new Set(['2.1', '2.2']);
  const maxTier = getUnlockedTier(completedCh2);
  assert.ok(maxTier >= 2, 'Should unlock tier 2 after ch2 progress');

  // Tier 1 setup should have no hub/switch
  const t1 = getEndlessSetup(1);
  assert.equal(t1.tier, 1);
  assert.ok(!t1.devicesAllowed.includes('hub'), 'Tier 1 should NOT have hub');
  assert.ok(!t1.devicesAllowed.includes('switch'), 'Tier 1 should NOT have switch');

  // Tier 2 setup should have hub/switch
  const t2 = getEndlessSetup(2);
  assert.equal(t2.tier, 2);
  assert.ok(t2.devicesAllowed.includes('hub'), 'Tier 2 should have hub');
  assert.ok(t2.devicesAllowed.includes('switch'), 'Tier 2 should have switch');

  // _startEndlessRun with explicit tier 1 when max is 2 → resolves to tier 1
  const mockDOM = createMockDOM();
  globalThis.window = mockDOM.window;
  globalThis.document = mockDOM.document;
  globalThis.localStorage = mockDOM.window.localStorage;
  globalThis.requestAnimationFrame = mockDOM.window.requestAnimationFrame;
  globalThis.cancelAnimationFrame = mockDOM.window.cancelAnimationFrame;

  const container = mockDOM.document.createElement('div');
  const ui = new NetCityClientUI(container, { testMode: true });
  // Simulate having ch2 completed
  ui.completedLevels = completedCh2;

  ui._startEndlessRun('test-tier-select', 1);
  assert.equal(ui.sim.isEndless, true, 'Should launch endless');
  assert.equal(ui.sim.mapData.tier, 1, 'Should use tier 1 when explicitly selected');
  assert.ok(!ui.sim.mapData.devicesAllowed.includes('hub'), 'Tier 1 run should not have hub device');
});
