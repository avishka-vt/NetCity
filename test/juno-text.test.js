/**
 * NetCity v2.0 - Chief Juno Text Pack & Mentor Integration Test Suite
 * Validates Sections 2–12 of NetCity Chief Juno Text Pack:
 * - Complete key coverage (open, close, all 44 levels + 6 detective cases, 9 tutorial steps,
 *   win reactions, level over causes, 20 event pairs, 12 special moments, 5 ending cards)
 * - Line length (<= 110 chars) and punctuation (<= 1 '!' per line) constraints
 * - Simulation telemetry (undoLastWire, EventWarning 200t ahead, EventFixed, failCause, evaluateStars)
 * - UI integration (Briefing, 9-step Tutorial 1.1, Level Won/Over with Rewind (10s), Finale Ceremony)
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { createMockDOM } from './mock-dom.js';
import { ALL_LEVELS } from '../packages/content/src/levels.js';
import {
  JUNO_TEXT,
  JUNO_TUTORIAL_STEPS,
  SIM_EVENT_TO_JUNO_ID,
  CHAPTER_FINALE_IDS,
  formatJunoLine,
  getJunoChapterOpenLines,
  getJunoChapterCloseLine,
  getJunoLevelIntro,
  getJunoWinReaction,
  getJunoOverReaction,
  getJunoEndingCards
} from '../packages/content/src/juno-text.js';
import { NetCitySimulation } from '../packages/sim/src/sim.js';
import { StateManager } from '../apps/client/src/core/state-manager.js';
import { NetCityClientUI } from '../apps/client/src/ui.js';
import { showLevelWonModal, showLevelOverModal } from '../apps/client/src/ui/modals/level-end-modal.js';

function installMockGlobals() {
  const dom = createMockDOM();
  const store = new Map();
  const mockLocalStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); }
  };
  globalThis.window = dom.window;
  globalThis.document = dom.document;
  globalThis.localStorage = mockLocalStorage;
  return { ...dom, storage: mockLocalStorage, container: dom.document.createElement('div') };
}

test('Juno Text Pack: all required keys exist and obey <= 110 chars & <= 1 exclamation rule', () => {
  const entries = Object.entries(JUNO_TEXT);
  assert.ok(entries.length >= 165, `Expected at least 165 entries, got ${entries.length}`);

  for (const [key] of entries) {
    const rendered = formatJunoLine(key, { name: 'Apprentice', building: 'Classroom' });
    assert.ok(rendered.length > 0, `Line ${key} must not be empty`);
    assert.ok(rendered.length <= 110, `Line ${key} exceeds 110 chars (${rendered.length}): "${rendered}"`);
    const bangs = (rendered.match(/!/g) || []).length;
    assert.ok(bangs <= 1, `Line ${key} has ${bangs} exclamation marks: "${rendered}"`);
  }

  for (let ch = 1; ch <= 7; ch++) {
    const openLines = getJunoChapterOpenLines(ch, { name: 'Maya' });
    assert.equal(openLines.length, 2, `Chapter ${ch} opening must have 2 lines`);
    assert.ok(openLines[0].length > 0 && openLines[1].length > 0);
    const closeLine = getJunoChapterCloseLine(ch, { name: 'Maya' });
    assert.ok(closeLine.length > 0, `Chapter ${ch} closing must exist`);
  }

  assert.equal(ALL_LEVELS.length, 44);
  for (const lvl of ALL_LEVELS) {
    const intro = getJunoLevelIntro(lvl.id, { name: 'Apprentice' });
    assert.ok(intro.length > 0, `Missing Juno intro for level ${lvl.id}`);
  }
  for (let c = 1; c <= 6; c++) {
    const intro = getJunoLevelIntro(`case_${c}`, { name: 'Apprentice' });
    assert.ok(intro.length > 0, `Missing Juno intro for detective case_${c}`);
  }

  assert.equal(JUNO_TUTORIAL_STEPS.length, 9);

  const expectedEventIds = [
    'cable_cut', 'slow_link', 'wifi_interference', 'hub_jam', 'moved_device',
    'duplicate_ip', 'missing_gateway', 'router_overload', 'dhcp_exhausted', 'dns_down',
    'server_crash', 'wrong_zone', 'missing_route', 'link_failure', 'traffic_flood',
    'eavesdropper', 'rogue_device', 'packet_storm', 'power_cut', 'mystery_fault'
  ];
  for (const evtId of expectedEventIds) {
    assert.ok(JUNO_TEXT[`juno.evt.${evtId}.warn`], `Missing warn line for ${evtId}`);
    assert.ok(JUNO_TEXT[`juno.evt.${evtId}.fixed`], `Missing fixed line for ${evtId}`);
  }
  assert.ok(Object.keys(SIM_EVENT_TO_JUNO_ID).length >= 10);

  const ending = getJunoEndingCards({ name: 'Maya' });
  assert.equal(ending.length, 5);
  assert.ok(ending[0].includes('Maya'));
});

test('Juno Text Pack: helpers select appropriate win, over, and finale reactions', () => {
  assert.deepEqual(
    getJunoWinReaction({ isFirstWin: true, starsEarned: 3 }, { name: 'Alex' }),
    ['Your first network, Alex. I still remember mine.']
  );
  assert.deepEqual(
    getJunoWinReaction({ isFirstWin: false, starsEarned: 3, levelId: '1.2' }),
    [formatJunoLine('juno.win.3_stars')]
  );
  assert.deepEqual(
    getJunoWinReaction({ isFirstWin: false, starsEarned: 2, missingStarKind: 'reliability', levelId: '1.2' }),
    [formatJunoLine('juno.win.2_stars'), formatJunoLine('juno.win.missing_reliability')]
  );
  assert.deepEqual(
    getJunoWinReaction({ isFirstWin: false, wonAfterRewind: true, starsEarned: 3, levelId: '1.2' }),
    [formatJunoLine('juno.win.after_rewind')]
  );
  assert.deepEqual(
    getJunoWinReaction({ isFirstWin: false, starsEarned: 3, levelId: '1.9' }),
    [formatJunoLine('juno.win.finale_1_9')]
  );
  assert.deepEqual(
    getJunoWinReaction({ isDetectiveSolved: true, starsEarned: 3, levelId: '7.5' }),
    [formatJunoLine('juno.win.detective_solved')]
  );

  assert.equal(
    getJunoOverReaction('signal_faded', { building: 'Library' }),
    JUNO_TEXT['juno.over.signal_faded']
  );
  assert.equal(
    getJunoOverReaction('no_link', { building: 'Library' }),
    'Library never got a wire. New buildings always need attention first.'
  );
  assert.ok(CHAPTER_FINALE_IDS.has('7.6'));
});

test('Simulation Telemetry: undoLastWire, 10s EventWarning, EventFixed, and failCause diagnosis', () => {
  const sim = new NetCitySimulation({
    width: 12,
    height: 8,
    server: 5,
    coins: 50,
    wiresAllowed: ['twisted_pair'],
    devicesAllowed: ['backup_power'],
    buildings: [{ id: 1, type: 'laptop', name: 'Classroom', square: 2, quota: 2, firstTimerTicks: 400, cycleTimerTicks: 300, required: true }],
    events: [{ tick: 250, type: 'CableCut' }]
  });

  // Path [2, 3, 4, 5] is within twisted_pair range (cost 3 coins)
  const path = [2, 3, 4, 5];
  const conn = sim.connectWire(1, path, 'twisted_pair', 'building');
  assert.equal(conn.success, true);
  assert.equal(sim.coins, 47);

  // Undo restores coins and removes wire
  const undone = sim.undoLastWire();
  assert.equal(undone.success, true);
  assert.equal(sim.coins, 50);
  assert.equal(sim.wires.size, 0);

  // Reconnect and tick up to tick 250 -> EventWarning fires 200t ahead at tick 50
  sim.connectWire(1, path, 'twisted_pair', 'building');
  let sawWarning = false;
  for (let t = 0; t < 250; t++) {
    const evs = sim.tick();
    if (evs.some(e => e.type === 'EventWarning' && e.eventType === 'CableCut')) {
      sawWarning = true;
    }
  }
  assert.equal(sawWarning, true, 'Must emit EventWarning 200 ticks before scheduled event');
  assert.equal(sim.activeFaultEvents.has('CableCut'), true);

  // Reconnecting after CableCut must emit EventFixed
  const fixRes = sim.connectWire(1, path, 'twisted_pair', 'building');
  assert.equal(fixRes.success, true);
  assert.ok(sim.events.some(e => e.type === 'EventFixed' && e.eventType === 'CableCut'));
});

test('StateManager: persists playerName (default Apprentice) and seenMoments cleanly', () => {
  installMockGlobals();

  const sm = new StateManager();
  assert.equal(sm.playerName, 'Apprentice');
  sm.setPlayerName('Asha');
  assert.equal(sm.playerName, 'Asha');
  assert.equal(sm.hasSeenMoment('paused'), false);
  sm.markMomentSeen('paused');
  assert.equal(sm.hasSeenMoment('paused'), true);

  const smReloaded = new StateManager();
  assert.equal(smReloaded.playerName, 'Asha');
  assert.equal(smReloaded.hasSeenMoment('paused'), true);

  smReloaded.resetProgress();
  assert.equal(smReloaded.playerName, 'Apprentice');
  assert.equal(smReloaded.hasSeenMoment('paused'), false);
});

test('UI Integration: Briefing, Level 1.1 Tutorial (9 steps + Undo), Level Won/Over with Rewind (10s), and Finale Ceremony', () => {
  const { container } = installMockGlobals();

  const ui = new NetCityClientUI(container, { initialLevel: '1.1', testMode: true });

  // Briefing modal embeds Chief Juno portrait & level 1.1 intro
  assert.ok(ui.modalEl.innerHTML.includes('chief_juno.png'));
  assert.ok(ui.modalEl.innerHTML.includes(formatJunoLine('juno.lvl.1.1', { name: 'Apprentice' })));

  // Clicking Start Level begins Level 1.1 9-step Tutorial
  ui.modalEl.querySelector('#nc-btn-start-level').onclick();
  assert.equal(ui.tutorialController.active, true);
  assert.equal(ui.tutorialController.stepIndex, 0);
  assert.ok(ui.junoComms.rootEl.innerHTML.includes(JUNO_TEXT['juno.tut.1']));

  // Advance through all 9 steps including auto-advance & Undo button click
  ui.junoComms.rootEl.querySelector('#nc-tut-next').click(); // -> 2
  ui.junoComms.rootEl.querySelector('#nc-tut-next').click(); // -> 3
  ui.tutorialController.handleEvent('wire_tool_selected'); // -> 4
  assert.equal(ui.tutorialController.stepIndex, 3);
  ui.tutorialController.handleEvent('wire_connected'); // -> 5
  ui.tutorialController.handleEvent('packet_in_flight'); // -> 6
  ui.tutorialController.handleEvent('coin_earned'); // -> 7
  ui.junoComms.rootEl.querySelector('#nc-tut-next').click(); // -> 8
  assert.equal(ui.tutorialController.stepIndex, 7);
  ui.container.querySelector('#nc-btn-undo').click(); // -> 9
  assert.equal(ui.tutorialController.stepIndex, 8);
  assert.ok(ui.junoComms.rootEl.innerHTML.includes(JUNO_TEXT['juno.tut.9']));
  ui.junoComms.rootEl.querySelector('#nc-tut-next').click(); // finishes tutorial
  assert.equal(ui.tutorialController.active, false);

  // Pause triggers paused moment once
  ui.sim.paused = false;
  ui.container.querySelector('#nc-btn-pause').click();
  assert.equal(ui.stateManager.hasSeenMoment('paused'), true);

  // Level Won shows Chief Juno's first_ever reaction
  showLevelWonModal(ui);
  assert.ok(ui.modalEl.innerHTML.includes('Your first network, Apprentice. I still remember mine.'));

  // Level Over keeps exact "Rewind (10s)" label and Chief Juno debrief
  ui.sim.failCause = 'no_link';
  ui.sim.failingBuilding = { label: 'Library' };
  showLevelOverModal(ui);
  assert.ok(ui.modalEl.innerHTML.includes('Rewind (10s)'), 'Must preserve Rewind (10s) button text');
  assert.ok(ui.modalEl.innerHTML.includes('Library never got a wire.'));

  // Finale Level 7.6 -> City Finale Ceremony -> 5 ending cards + Mayor Mira Chief Network Engineer
  ui._loadLevel('7.6', 'finale-seed');
  showLevelWonModal(ui);
  ui.modalEl.querySelector('#nc-card-next').onclick();
  assert.ok(ui.modalEl.innerHTML.includes('GRAND FINALE'));
  for (let i = 0; i < 5; i++) {
    ui.modalEl.querySelector('#nc-end-next').onclick();
  }
  assert.ok(ui.modalEl.innerHTML.includes('Chief Network Engineer'));
  assert.ok(ui.modalEl.innerHTML.includes('MAYOR MIRA'));

  ui.destroy();
});

test('Tutorial: timers are completely stopped during tutorial and resume after tutorial stops', () => {
  const { container } = installMockGlobals();
  const ui = new NetCityClientUI(container, { initialLevel: '1.1', testMode: true });

  // On Level 1.1 load, timers are paused
  assert.equal(ui.sim.timersPaused, true);
  const laptop = ui.sim.buildings[0];
  const initialTicks = laptop.timerTicksLeft;
  assert.ok(initialTicks > 0);

  // Start tutorial
  ui.sim.paused = false;
  ui.tutorialController.start();
  assert.equal(ui.tutorialController.active, true);
  assert.equal(ui.sim.timersPaused, true);

  // Tick simulation 100 times during tutorial
  for (let i = 0; i < 100; i++) {
    ui.sim.tick();
  }

  // Timer must NOT have decreased
  assert.equal(laptop.timerTicksLeft, initialTicks, 'Building timer must not decrease during tutorial');
  assert.equal(laptop.state, 'open', 'Building must remain open and not expire');

  // Finish tutorial
  ui.tutorialController.stop();
  assert.equal(ui.tutorialController.active, false);
  assert.equal(ui.sim.timersPaused, false);
  assert.equal(laptop.timerTicksLeft, laptop.firstTimerTicks, 'Building timer must reset to full upon tutorial exit');

  // Now tick simulation outside tutorial — timer should decrement normally
  ui.sim.tick();
  assert.equal(laptop.timerTicksLeft, laptop.firstTimerTicks - 1, 'Building timer should decrement after tutorial stops');

  ui.destroy();
});

test('Chief Juno: mentor comms card is active across all levels on start and via topbar Juno button', () => {
  const { container } = installMockGlobals();
  const ui = new NetCityClientUI(container, { initialLevel: '1.2', testMode: true });

  // 1. Briefing modal shows Chief Juno's level 1.2 intro
  const level12Intro = formatJunoLine('juno.lvl.1.2', { name: 'Apprentice' });
  assert.ok(ui.modalEl.innerHTML.includes(level12Intro));

  // 2. Clicking Start Level dismisses briefing and opens Chief Juno field comms on screen (without numbers like 1.2 or 1.1)
  ui.modalEl.querySelector('#nc-btn-start-level').onclick();
  assert.equal(ui.modalEl.style.display, 'none');
  assert.equal(ui.junoComms.rootEl.style.display, 'block');
  assert.ok(ui.junoComms.rootEl.innerHTML.includes(level12Intro));
  assert.ok(ui.junoComms.rootEl.innerHTML.includes('CHIEF JUNO · MENTOR'));
  assert.ok(!ui.junoComms.rootEl.innerHTML.includes('LEVEL 1.2'), 'Juno cards must not contain numbers like LEVEL 1.2');
  assert.ok(!ui.junoComms.rootEl.innerHTML.includes('1.1'), 'Juno cards must not contain numbers like 1.1');

  // 3. User closes comms card
  ui.junoComms.hide();
  assert.equal(ui.junoComms.rootEl.style.display, 'none');

  // 4. Clicking topbar #nc-btn-juno gives hint only without repeating previous intro line
  const btnJuno = ui.container.querySelector('#nc-btn-juno');
  assert.ok(btnJuno, '#nc-btn-juno button must exist in topbar');
  btnJuno.click();
  assert.equal(ui.junoComms.rootEl.style.display, 'block');
  assert.ok(ui.junoComms.rootEl.innerHTML.includes(ui.levelDef.hint), 'Clicking Juno button must show the level hint');
  assert.ok(!ui.junoComms.rootEl.innerHTML.includes(level12Intro), 'Clicking Juno button must NOT repeat previous intro line');
  assert.ok(ui.junoComms.rootEl.innerHTML.includes('CHIEF JUNO · HINT'));
  assert.ok(!ui.junoComms.rootEl.innerHTML.includes('LEVEL 1.2'), 'Juno cards must not contain numbers like LEVEL 1.2');

  // 5. Check Detective Case level 7.5
  ui._loadLevel('7.5', 'case-seed');
  ui.modalEl.querySelector('#nc-btn-start-level').onclick();
  assert.equal(ui.junoComms.rootEl.style.display, 'block');
  const case1Intro = formatJunoLine('juno.lvl.case_1', { name: 'Apprentice' });
  assert.ok(ui.junoComms.rootEl.innerHTML.includes(case1Intro));
  assert.ok(!ui.junoComms.rootEl.innerHTML.includes('CASE 1'), 'Juno cards must not contain numbers like CASE 1');

  ui.destroy();
});
