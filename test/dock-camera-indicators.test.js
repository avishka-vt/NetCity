import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockDOM } from './mock-dom.js';
import { NetCityClientUI } from '../apps/client/src/ui.js';
import { NetCitySimulation } from '../packages/sim/src/sim.js';
import { findValidSquare } from '../apps/client/src/core/level-loader.js';
import { splitTheoryIntoMessages } from '../apps/client/src/ui/modals/briefing-modal.js';

test('Camera Fit & Dock Clearance: grid bottom row is positioned cleanly above bottom dock toolbar', () => {
  const mockDOM = createMockDOM();
  const prevWindow = globalThis.window;
  const prevDoc = globalThis.document;
  globalThis.window = mockDOM.window;
  globalThis.document = mockDOM.document;

  try {
    const container = mockDOM.document.createElement('div');
    mockDOM.document.body.appendChild(container);

    const ui = new NetCityClientUI(container);
    ui._loadLevel('1.2', 'test-seed');

    // Canvas size 1200 x 700
    ui.canvas.width = 1200;
    ui.canvas.height = 700;

    ui._fitCamera();

    const sz = ui.camera.baseSquareSize * ui.camera.zoom;
    const gridBottom = ui.camera.y + ui.sim.height * sz;
    const dockReach = 700 - 120; // Dock extends ~120px from screen bottom

    // Grid bottom must stay strictly above the top edge of the floating bottom dock
    assert.ok(gridBottom <= dockReach, `Grid bottom (${gridBottom}px) must be above dock toolbar (${dockReach}px)`);

    // Center on square functionality
    const testSquare = 5;
    ui.centerOnSquare(testSquare);
    assert.ok(typeof ui.camera.x === 'number' && !isNaN(ui.camera.x));
    assert.ok(typeof ui.camera.y === 'number' && !isNaN(ui.camera.y));

    ui.destroy();
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDoc;
  }
});

test('Dock Toolbar: collapse/expand toggle button exists and toggles collapsed class', () => {
  const mockDOM = createMockDOM();
  const prevWindow = globalThis.window;
  const prevDoc = globalThis.document;
  globalThis.window = mockDOM.window;
  globalThis.document = mockDOM.document;

  try {
    const container = mockDOM.document.createElement('div');
    mockDOM.document.body.appendChild(container);

    const ui = new NetCityClientUI(container);
    const dockToggle = container.querySelector('#nc-dock-toggle');
    const dockCard = container.querySelector('#nc-dock-card');

    assert.ok(dockToggle, '#nc-dock-toggle must exist in bottom dock header');
    assert.ok(dockCard, '#nc-dock-card must exist in bottom dock');

    // Click to collapse
    dockToggle.click();
    assert.ok(dockCard.classList.contains('nc-dock-collapsed'), 'Clicking toggle must add nc-dock-collapsed');
    assert.equal(dockToggle.textContent, '▲');

    // Click again to expand
    dockToggle.click();
    assert.ok(!dockCard.classList.contains('nc-dock-collapsed'), 'Clicking again must expand dock');
    assert.equal(dockToggle.textContent, '▼');

    ui.destroy();
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDoc;
  }
});

test('Edge Indicators: detects buildings obscured by bottom dock or off-screen and provides edge beacons', () => {
  const mockDOM = createMockDOM();
  const prevWindow = globalThis.window;
  const prevDoc = globalThis.document;
  globalThis.window = mockDOM.window;
  globalThis.document = mockDOM.document;

  try {
    const container = mockDOM.document.createElement('div');
    mockDOM.document.body.appendChild(container);

    const ui = new NetCityClientUI(container);
    ui.canvas.width = 1000;
    ui.canvas.height = 700;

    // Simulate building under bottom dock (e.g. y = 650 on screen)
    const sim = new NetCitySimulation({
      level: 'test',
      seed: 'test',
      width: 20,
      height: 14,
      server: 50,
      startingCoins: 50,
      buildings: [
        {
          id: 1,
          type: 'classroom',
          square: 13 * 20 + 10, // bottom center
          state: 'construction',
          opensAtTick: 100,
          quota: 3,
          firstTimerTicks: 800,
          cycleTimerTicks: 240,
          deadlineTicks: 40,
          requestIntervalTicks: 40
        }
      ],
      wiresAllowed: ['twisted_pair']
    });

    ui.sim = sim;
    // Set camera such that square 270 (x=10, y=13) is at bottom center (sx=500, sy=660)
    ui.camera.baseSquareSize = 40;
    ui.camera.zoom = 1.0;
    ui.camera.x = 100;
    ui.camera.y = 140; // 13 * 40 + 140 = 660, directly behind bottom dock (y >= 580)

    ui.canvasRenderer.render({
      sim: ui.sim,
      camera: ui.camera,
      levelDef: { wiresAllowed: ['twisted_pair'] }
    });

    assert.ok(Array.isArray(ui.canvasRenderer.edgeIndicators), 'edgeIndicators array must exist');
    assert.ok(ui.canvasRenderer.edgeIndicators.length > 0, 'Edge indicator must be generated for obscured building');

    const ind = ui.canvasRenderer.edgeIndicators[0];
    assert.equal(ind.building.id, 1);
    // Indicator Y should be safely positioned above the dock (<= 580)
    assert.ok(ind.y <= 580, `Edge indicator Y (${ind.y}) should be positioned safely above dock`);

    ui.destroy();
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDoc;
  }
});

test('Procedural Generation: findValidSquare and findEndlessSquare avoid placing in bottom-center dock area', () => {
  const w = 24;
  const h = 14;
  const used = new Set([100]);
  const rng = () => 0.5; // Always picks center

  for (let i = 0; i < 20; i++) {
    const sq = findValidSquare(w, h, 100, [2, 10], used, rng);
    const gx = sq % w;
    const gy = Math.floor(sq / w);
    const inDangerZone = (gy >= h - 1 && gx >= Math.floor(w * 0.3) && gx <= Math.floor(w * 0.7));
    assert.ok(!inDangerZone, `Square (${gx}, ${gy}) should not be in the bottom-center dock obscured zone`);
  }
});

test('Phone Messenger Briefing: breaks theory into multiple text messages inside smartphone mockup', () => {
  const longTheory = 'Twisted-pair copper cables (Ethernet) are inexpensive and flexible, but electrical resistance causes signals to fade over distance. In NetCity, twisted pair reaches up to 10 squares (100 meters). Beyond that, packets lose power and vanish! Direct wiring is key.';
  const messages = splitTheoryIntoMessages(longTheory);
  assert.ok(Array.isArray(messages), 'Must return an array of messages');
  assert.ok(messages.length >= 2, `Long theory should be split into multiple text messages, got ${messages.length}`);

  const mockDOM = createMockDOM();
  const prevWindow = globalThis.window;
  const prevDoc = globalThis.document;
  globalThis.window = mockDOM.window;
  globalThis.document = mockDOM.document;

  try {
    const container = mockDOM.document.createElement('div');
    mockDOM.document.body.appendChild(container);

    const ui = new NetCityClientUI(container);
    ui._loadLevel('1.2', 'test-phone-seed');

    // Phone frame structure assertions
    assert.ok(ui.modalEl.innerHTML.includes('nc-phone-frame'), 'Must render smartphone frame container');
    assert.ok(ui.modalEl.innerHTML.includes('nc-phone-island'), 'Must render phone top dynamic island notch');
    assert.ok(ui.modalEl.innerHTML.includes('nc-phone-bubble'), 'Must render chat message bubbles');
    assert.ok(ui.modalEl.innerHTML.includes('Chief Juno'), 'Must show Chief Juno contact header');
    assert.ok(ui.modalEl.innerHTML.includes('nc-phone-home-indicator'), 'Must render phone home indicator');
    assert.ok(ui.modalEl.innerHTML.includes('nc-phone-typing'), 'Must include typing indicator element');

    // First message is displayed immediately, pending timers are tracked
    assert.ok(Array.isArray(ui._briefingTimers), 'Must track briefing timers in array');
    assert.ok(ui._briefingTimers.length > 0, 'Must have scheduled next message timer');

    // Tapping chat or calling revealAll reveals all messages and clears timers
    const tapHint = ui.modalEl.querySelector('#nc-phone-tap-hint');
    assert.ok(tapHint, 'Tap hint must exist when multiple messages are queued');
    tapHint.onclick();
    assert.equal(ui._briefingTimers.length, 0, 'Timers must be cleared after fast-forward reveal');
    assert.ok(ui.modalEl.innerHTML.includes('All messages received'), 'Must display completed stamp');

    // Clicking start level button on phone
    const startBtn = ui.modalEl.querySelector('#nc-btn-start-level');
    assert.ok(startBtn, 'Start Level action button must exist on phone footer');
    startBtn.onclick();
    assert.equal(ui.sim.paused, false, 'Simulation should unpause after clicking Start Level on phone');

    ui.destroy();
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDoc;
  }
});

test('Sequential Phone Messaging: delivers first message immediately and subsequent messages one-by-one', async () => {
  const mockDOM = createMockDOM();
  const prevWindow = globalThis.window;
  const prevDoc = globalThis.document;
  globalThis.window = mockDOM.window;
  globalThis.document = mockDOM.document;

  try {
    const container = mockDOM.document.createElement('div');
    mockDOM.document.body.appendChild(container);

    const ui = new NetCityClientUI(container);
    ui._loadLevel('1.2', 'seq-phone-seed');

    // Initial message count
    const messagesEl = ui.modalEl.querySelector('#nc-phone-messages');
    assert.ok(messagesEl, 'Messages container must exist');
    assert.ok(messagesEl.innerHTML.includes('Twisted pair is cheap and everywhere'), 'First message (Juno intro) must be visible immediately');

    // Reveal all messages programmatically
    ui._revealAllBriefingMessages();
    assert.ok(messagesEl.innerHTML.includes('Twisted-pair copper cables'), 'Subsequent theory message must be present after reveal');
    assert.equal(ui._briefingTimers.length, 0, 'Briefing timers must be cleared');

    // Modal close clears any remaining timers cleanly
    ui._closeModal();
    assert.equal(ui._briefingTimers.length, 0, 'Timers must remain empty after modal close');

    ui.destroy();
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDoc;
  }
});


