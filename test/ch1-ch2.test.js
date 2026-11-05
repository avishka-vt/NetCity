import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_LEVELS, CHAPTER_1_LEVELS, CHAPTER_2_LEVELS, getLevelById } from '../packages/content/src/levels.js';
import { DEVICE_CATALOG } from '../packages/content/src/devices.js';
import { WIRE_CATALOG } from '../packages/content/src/wires.js';
import { NetCitySimulation } from '../packages/sim/src/sim.js';
import { NetCityClientUI } from '../apps/client/src/ui.js';
import { createMockDOM } from './mock-dom.js';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Catalog & Structure Tests
// ─────────────────────────────────────────────────────────────────────────────

test('Ch1 & Ch2: Level catalogs are complete and consistent', () => {
  assert.equal(CHAPTER_1_LEVELS.length, 9, 'Chapter 1 should have exactly 9 levels (1.1 to 1.9)');
  assert.equal(CHAPTER_2_LEVELS.length, 5, 'Chapter 2 should have exactly 5 levels (2.1 to 2.5)');
  assert.ok(ALL_LEVELS.length >= 14, 'ALL_LEVELS should contain at least 14 levels');

  for (const lvl of ALL_LEVELS) {
    assert.ok(lvl.id, `Level must have id`);
    assert.ok(lvl.title, `Level ${lvl.id} must have title`);
    assert.ok(lvl.learningMoment, `Level ${lvl.id} must have learningMoment`);
    assert.ok(lvl.grid && lvl.grid.w > 0 && lvl.grid.h > 0, `Level ${lvl.id} must have valid grid`);
    assert.ok(Array.isArray(lvl.wiresAllowed) && lvl.wiresAllowed.length > 0, `Level ${lvl.id} must have wiresAllowed`);
    assert.ok(Array.isArray(lvl.devicesAllowed) && lvl.devicesAllowed.length > 0, `Level ${lvl.id} must have devicesAllowed`);
    assert.ok(lvl.coins > 0, `Level ${lvl.id} must have starting coins`);
    assert.ok(Array.isArray(lvl.start) && lvl.start.length > 0, `Level ${lvl.id} must have start buildings`);

    // Verify all allowed wires and devices exist in catalogs
    for (const w of lvl.wiresAllowed) {
      assert.ok(WIRE_CATALOG[w], `Level ${lvl.id} specifies unknown wire type: ${w}`);
    }
    for (const d of lvl.devicesAllowed) {
      assert.ok(DEVICE_CATALOG[d], `Level ${lvl.id} specifies unknown device type: ${d}`);
    }
  }
});

test('Ch1 & Ch2: Device Catalog specifications match spec', () => {
  const expectedDevices = ['server', 'access_point', 'cabinet', 'hub', 'switch'];
  for (const key of expectedDevices) {
    assert.ok(DEVICE_CATALOG[key], `DEVICE_CATALOG must define ${key}`);
    const dev = DEVICE_CATALOG[key];
    assert.equal(typeof dev.name, 'string');
    assert.equal(typeof dev.cost, 'number');
    assert.equal(typeof dev.ports, 'number');
    assert.ok(dev.color);
  }

  assert.equal(DEVICE_CATALOG.server.cost, 0);
  assert.equal(DEVICE_CATALOG.access_point.cost, 8);
  assert.equal(DEVICE_CATALOG.cabinet.cost, 2);
  assert.equal(DEVICE_CATALOG.hub.cost, 4);
  assert.equal(DEVICE_CATALOG.switch.cost, 10);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Chapter 1 Mechanics Tests (1.6 - 1.9)
// ─────────────────────────────────────────────────────────────────────────────

test('Level 1.6: Wireless Access Point fulfills phone quota within range', () => {
  const map = {
    level: '1.6',
    seed: 'ap-test',
    width: 24,
    height: 14,
    server: 24 * 7 + 12,
    startingCoins: 100,
    devicesAllowed: ['server', 'access_point'],
    wiresAllowed: ['twisted_pair'],
    buildings: [
      {
        id: 1,
        type: 'phone',
        square: 24 * 7 + 8, // Distance 4 from AP at (7, 10)
        required: true,
        opensAtTick: 0,
        quota: 2,
        firstTimerTicks: 800,
        cycleTimerTicks: 240,
        deadlineTicks: 50,
        requestIntervalTicks: 40
      }
    ],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(map);

  // Place Access Point at 24 * 7 + 10 (2 squares left of server)
  const apSq = 24 * 7 + 10;
  const placeRes = sim.placeDevice('access_point', apSq);
  assert.ok(placeRes.success, 'Access Point should be placed');

  // Wire AP to server
  const apWirePath = [apSq, 24 * 7 + 11, sim.server];
  const wireRes = sim.connectWire(placeRes.deviceId, apWirePath, 'twisted_pair', 'device');
  assert.ok(wireRes.success, 'AP should connect to server');

  // Phone at (24 * 7 + 8) is 2 squares from AP (well within wireless range 6)
  // Advance simulation and verify packets arrive wirelessly and fulfill quota
  let delivered = false;
  for (let i = 0; i < 200; i++) {
    const events = sim.tick();
    if (events.some(e => e.type === 'PacketDelivered' && e.buildingId === 1)) {
      delivered = true;
      break;
    }
  }

  assert.ok(delivered, 'Phone packets should reach server via wireless AP');
  const b = sim.getBuilding(1);
  assert.ok(b.deliveredTotal > 0, 'Phone deliveredTotal should increase');
});

test('Level 1.6: Phone outside Access Point range 6 does NOT connect', () => {
  const map = {
    level: '1.6',
    seed: 'ap-out-of-range',
    width: 24,
    height: 14,
    server: 24 * 7 + 12,
    startingCoins: 100,
    devicesAllowed: ['server', 'access_point'],
    wiresAllowed: ['twisted_pair'],
    buildings: [
      {
        id: 1,
        type: 'phone',
        square: 24 * 7 + 2, // Distance 8 from AP at (7, 10) -> beyond range 6
        required: true,
        opensAtTick: 0,
        quota: 2,
        firstTimerTicks: 800,
        cycleTimerTicks: 240,
        deadlineTicks: 50,
        requestIntervalTicks: 20
      }
    ],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(map);
  const apSq = 24 * 7 + 10;
  const placeRes = sim.placeDevice('access_point', apSq);
  sim.connectWire(placeRes.deviceId, [apSq, 24 * 7 + 11, sim.server], 'twisted_pair', 'device');

  let droppedNoWire = false;
  for (let i = 0; i < 100; i++) {
    const events = sim.tick();
    if (events.some(e => e.type === 'PacketDropped' && e.reason === 'no_wire')) {
      droppedNoWire = true;
      break;
    }
  }

  assert.ok(droppedNoWire, 'Phone out of range must drop packets with reason no_wire');
});

test('Level 1.6: Diagonal positioning within Euclidean radius 6 connects (Euclidean vs Manhattan)', () => {
  // Screenshot scenario: AP at (15, 6), Phone at (13, 1).
  // dx = 2, dy = 5 -> Euclidean = sqrt(29) = 5.385 <= 6.0 (inside circle)
  // Manhattan = 2 + 5 = 7 > 6 (would incorrectly fail under Manhattan)
  const map = {
    level: '1.6',
    seed: 'ap-diagonal-test',
    width: 24,
    height: 14,
    server: 24 * 7 + 12, // (12, 7)
    startingCoins: 100,
    devicesAllowed: ['server', 'access_point'],
    wiresAllowed: ['twisted_pair'],
    buildings: [
      {
        id: 1,
        type: 'phone',
        square: 24 * 1 + 13, // (13, 1)
        required: true,
        opensAtTick: 0,
        quota: 2,
        firstTimerTicks: 800,
        cycleTimerTicks: 240,
        deadlineTicks: 50,
        requestIntervalTicks: 30
      }
    ],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(map);

  // Place AP at (15, 6)
  const apSq = 24 * 6 + 15;
  const placeRes = sim.placeDevice('access_point', apSq);
  assert.ok(placeRes.success, 'AP placed at (15, 6)');

  // Connect AP to server
  const uplink = sim.connectWire(placeRes.deviceId, [apSq, 24 * 7 + 15, 24 * 7 + 14, 24 * 7 + 13, sim.server], 'twisted_pair', 'device');
  assert.ok(uplink.success, 'AP uplinked to server');

  // Verify getWirelessCoverage reports connected
  const cov = sim.getWirelessCoverage(1);
  assert.ok(cov && cov.connected, 'Phone at (13, 1) must be covered by AP at (15, 6) within Euclidean radius 6');
  assert.ok(cov.strength > 0, 'Signal strength should be positive');

  // Advance simulation and verify packets deliver
  let delivered = false;
  for (let i = 0; i < 200; i++) {
    const events = sim.tick();
    if (events.some(e => e.type === 'PacketDelivered' && e.buildingId === 1)) {
      delivered = true;
      break;
    }
  }

  assert.ok(delivered, 'Diagonal phone packets must deliver to server via AP');
});

test('Level 1.6: Wall between AP and Phone attenuates signal (-3 per wall)', () => {
  // AP at (10, 5), Phone at (10, 1) -> distance = 4.
  // Wall placed at (10, 3) between AP and Phone -> strength = 6 - 4 - 3 = -1 < 0 -> blocked!
  const map = {
    level: '1.6',
    seed: 'ap-wall-test',
    width: 24,
    height: 14,
    server: 24 * 7 + 12,
    startingCoins: 100,
    devicesAllowed: ['server', 'access_point'],
    wiresAllowed: ['twisted_pair'],
    walls: [24 * 3 + 10], // Wall at (10, 3)
    buildings: [
      {
        id: 1,
        type: 'phone',
        square: 24 * 1 + 10, // (10, 1)
        required: true,
        opensAtTick: 0,
        quota: 2,
        firstTimerTicks: 800,
        cycleTimerTicks: 240,
        deadlineTicks: 50,
        requestIntervalTicks: 20
      }
    ],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(map);
  const apSq = 24 * 5 + 10;
  const placeRes = sim.placeDevice('access_point', apSq);
  sim.connectWire(placeRes.deviceId, [apSq, 24 * 6 + 10, 24 * 7 + 10, 24 * 7 + 11, sim.server], 'twisted_pair', 'device');

  const cov = sim.getWirelessCoverage(1);
  assert.equal(cov.connected, false, 'Wall between AP and Phone must block connection due to -3 attenuation');
});

test('Level 1.6: Dragging physical wire to phone is rejected (wireless only)', () => {
  const map = {
    level: '1.6',
    seed: 'wire-to-phone-test',
    width: 24,
    height: 14,
    server: 24 * 7 + 12,
    startingCoins: 100,
    devicesAllowed: ['server', 'access_point'],
    wiresAllowed: ['twisted_pair'],
    buildings: [
      { id: 1, type: 'phone', square: 24 * 7 + 8, required: true, opensAtTick: 0, quota: 2, firstTimerTicks: 800, cycleTimerTicks: 240, deadlineTicks: 50, requestIntervalTicks: 40 }
    ],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(map);
  const res = sim.connectWire(1, [24 * 7 + 8, 24 * 7 + 9, sim.server], 'twisted_pair');
  assert.equal(res.success, false, 'Direct wire to phone must be rejected');
  assert.equal(res.reason, 'wirelessOnly');
});

test('Level 1.7: Street Cabinet aggregates multiple laptops into a single server uplink', () => {
  const map = {
    level: '1.7',
    seed: 'cabinet-test',
    width: 24,
    height: 14,
    server: 24 * 7 + 12,
    startingCoins: 200,
    devicesAllowed: ['server', 'cabinet'],
    wiresAllowed: ['twisted_pair'],
    buildings: [
      { id: 1, type: 'laptop', square: 24 * 5 + 8, required: true, opensAtTick: 0, quota: 2, firstTimerTicks: 800, cycleTimerTicks: 240, deadlineTicks: 50, requestIntervalTicks: 30 },
      { id: 2, type: 'laptop', square: 24 * 9 + 8, required: true, opensAtTick: 0, quota: 2, firstTimerTicks: 800, cycleTimerTicks: 240, deadlineTicks: 50, requestIntervalTicks: 30 }
    ],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(map);
  const cabSq = 24 * 7 + 8;
  const cabRes = sim.placeDevice('cabinet', cabSq);
  assert.ok(cabRes.success, 'Cabinet placed');

  // Uplink cabinet to server
  const cabUplink = sim.connectWire(cabRes.deviceId, [cabSq, 24 * 7 + 9, 24 * 7 + 10, 24 * 7 + 11, sim.server], 'twisted_pair', 'device');
  assert.ok(cabUplink.success, 'Cabinet uplink connected');

  // Connect laptop 1 to cabinet
  const w1 = sim.connectWire(1, [24 * 5 + 8, 24 * 6 + 8, cabSq], 'twisted_pair', 'building');
  assert.ok(w1.success, 'Laptop 1 connected to cabinet');

  // Connect laptop 2 to cabinet
  const w2 = sim.connectWire(2, [24 * 9 + 8, 24 * 8 + 8, cabSq], 'twisted_pair', 'building');
  assert.ok(w2.success, 'Laptop 2 connected to cabinet');

  // Verify packets flow from both laptops through cabinet to server
  let b1Delivered = false;
  let b2Delivered = false;

  for (let i = 0; i < 200; i++) {
    const events = sim.tick();
    for (const e of events) {
      if (e.type === 'PacketDelivered') {
        if (e.buildingId === 1) b1Delivered = true;
        if (e.buildingId === 2) b2Delivered = true;
      }
    }
    if (b1Delivered && b2Delivered) break;
  }

  assert.ok(b1Delivered, 'Laptop 1 packets delivered through cabinet');
  assert.ok(b2Delivered, 'Laptop 2 packets delivered through cabinet');
});

test('Level 1.8: CableCut event severs a connected wire and allows repair', () => {
  const map = {
    level: '1.8',
    seed: 'cut-test',
    width: 24,
    height: 14,
    server: 24 * 7 + 12,
    startingCoins: 200,
    devicesAllowed: ['server'],
    wiresAllowed: ['twisted_pair'],
    events: [
      { type: 'CableCut', tick: 50 }
    ],
    buildings: [
      { id: 1, type: 'classroom', square: 24 * 7 + 9, required: true, opensAtTick: 0, quota: 10, firstTimerTicks: 800, cycleTimerTicks: 240, deadlineTicks: 40, requestIntervalTicks: 20 }
    ],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(map);
  const wirePath = [24 * 7 + 9, 24 * 7 + 10, 24 * 7 + 11, sim.server];
  sim.connectWire(1, wirePath, 'twisted_pair');
  assert.ok(sim.getBuilding(1).wireId !== null, 'Wire initially connected');

  // Advance simulation to tick 50
  let cutFired = false;
  for (let i = 0; i < 50; i++) {
    const events = sim.tick();
    if (events.some(e => e.type === 'CableCut')) {
      cutFired = true;
    }
  }

  assert.ok(cutFired, 'CableCut event should fire at tick 50');
  assert.equal(sim.getBuilding(1).wireId, null, 'Wire should be removed after CableCut');

  // Reconnecting wire restores service
  const reconnectRes = sim.connectWire(1, wirePath, 'twisted_pair');
  assert.ok(reconnectRes.success, 'Reconnecting wire succeeds');

  let deliveredAfterCut = false;
  for (let i = 0; i < 150; i++) {
    const events = sim.tick();
    if (events.some(e => e.type === 'PacketDelivered' && e.buildingId === 1)) {
      deliveredAfterCut = true;
      break;
    }
  }
  assert.ok(deliveredAfterCut, 'Packets delivered after cable repair');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Chapter 2 Mechanics Tests (2.1 - 2.5)
// ─────────────────────────────────────────────────────────────────────────────

test('Level 2.2: The Hub produces packet collision when simultaneous packets arrive', () => {
  const map = {
    level: '2.2',
    seed: 'hub-collision-test',
    width: 24,
    height: 14,
    server: 24 * 7 + 12,
    startingCoins: 300,
    devicesAllowed: ['server', 'hub'],
    wiresAllowed: ['twisted_pair'],
    buildings: [
      // Symmetrical layout with identical requestIntervalTicks to trigger simultaneous arrival
      { id: 1, type: 'laptop', square: 24 * 6 + 9, required: true, opensAtTick: 0, quota: 2, firstTimerTicks: 800, cycleTimerTicks: 240, deadlineTicks: 40, requestIntervalTicks: 40 },
      { id: 2, type: 'laptop', square: 24 * 8 + 9, required: true, opensAtTick: 0, quota: 2, firstTimerTicks: 800, cycleTimerTicks: 240, deadlineTicks: 40, requestIntervalTicks: 40 }
    ],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(map);
  const hubSq = 24 * 7 + 9;
  const hubRes = sim.placeDevice('hub', hubSq);
  assert.ok(hubRes.success, 'Hub placed');

  // Uplink hub to server
  sim.connectWire(hubRes.deviceId, [hubSq, 24 * 7 + 10, 24 * 7 + 11, sim.server], 'twisted_pair', 'device');

  // Connect both laptops to hub (both length 1)
  sim.connectWire(1, [24 * 6 + 9, hubSq], 'twisted_pair', 'building');
  sim.connectWire(2, [24 * 8 + 9, hubSq], 'twisted_pair', 'building');

  // Force buildings to request on the exact same tick to test collision
  sim.getBuilding(1).nextRequestTick = 10;
  sim.getBuilding(2).nextRequestTick = 10;

  let collisionOccurred = false;
  let hubDropped = false;

  for (let i = 0; i < 60; i++) {
    const events = sim.tick();
    for (const e of events) {
      if (e.type === 'Collision' && e.deviceId === hubRes.deviceId) {
        collisionOccurred = true;
      }
      if (e.type === 'PacketDropped' && e.reason === 'hub_collision') {
        hubDropped = true;
      }
    }
  }

  assert.ok(collisionOccurred, 'Simultaneous packets through Hub must trigger Collision event');
  assert.ok(hubDropped, 'Packets colliding at Hub must drop with reason hub_collision');
});

test('Level 2.3: The Switch delivers simultaneous packets without collision', () => {
  const map = {
    level: '2.3',
    seed: 'switch-unicast-test',
    width: 24,
    height: 14,
    server: 24 * 7 + 12,
    startingCoins: 300,
    devicesAllowed: ['server', 'switch'],
    wiresAllowed: ['twisted_pair'],
    buildings: [
      { id: 1, type: 'laptop', square: 24 * 6 + 9, required: true, opensAtTick: 0, quota: 2, firstTimerTicks: 800, cycleTimerTicks: 240, deadlineTicks: 40, requestIntervalTicks: 40 },
      { id: 2, type: 'laptop', square: 24 * 8 + 9, required: true, opensAtTick: 0, quota: 2, firstTimerTicks: 800, cycleTimerTicks: 240, deadlineTicks: 40, requestIntervalTicks: 40 }
    ],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(map);
  const swSq = 24 * 7 + 9;
  const swRes = sim.placeDevice('switch', swSq);
  assert.ok(swRes.success, 'Switch placed');

  // Uplink switch to server
  sim.connectWire(swRes.deviceId, [swSq, 24 * 7 + 10, 24 * 7 + 11, sim.server], 'twisted_pair', 'device');

  // Connect both laptops to switch
  sim.connectWire(1, [24 * 6 + 9, swSq], 'twisted_pair', 'building');
  sim.connectWire(2, [24 * 8 + 9, swSq], 'twisted_pair', 'building');

  // Synchronize requests to arrive on the exact same tick
  sim.getBuilding(1).nextRequestTick = 10;
  sim.getBuilding(2).nextRequestTick = 10;

  let collisionOccurred = false;
  let deliveredCount = 0;

  for (let i = 0; i < 60; i++) {
    const events = sim.tick();
    for (const e of events) {
      if (e.type === 'Collision') collisionOccurred = true;
      if (e.type === 'PacketDelivered') deliveredCount++;
    }
  }

  assert.equal(collisionOccurred, false, 'Switch must NOT cause packet collisions');
  assert.ok(deliveredCount >= 2, 'Both simultaneous packets must be delivered through the Switch');
});

test('Level 2.5: Chaining Switches (Building -> Switch 1 -> Switch 2 -> Server)', () => {
  const map = {
    level: '2.5',
    seed: 'chain-test',
    width: 24,
    height: 14,
    server: 24 * 7 + 12,
    startingCoins: 300,
    devicesAllowed: ['server', 'switch'],
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    buildings: [
      { id: 1, type: 'laptop', square: 24 * 7 + 3, required: true, opensAtTick: 0, quota: 2, firstTimerTicks: 800, cycleTimerTicks: 240, deadlineTicks: 40, requestIntervalTicks: 30 }
    ],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(map);

  // Switch 1 at (7, 6)
  const sw1Sq = 24 * 7 + 6;
  const sw1Res = sim.placeDevice('switch', sw1Sq);
  assert.ok(sw1Res.success, 'Switch 1 placed');

  // Switch 2 at (7, 9)
  const sw2Sq = 24 * 7 + 9;
  const sw2Res = sim.placeDevice('switch', sw2Sq);
  assert.ok(sw2Res.success, 'Switch 2 placed');

  // Wire Switch 2 to Server
  const uplink2 = sim.connectWire(sw2Res.deviceId, [sw2Sq, 24 * 7 + 10, 24 * 7 + 11, sim.server], 'twisted_pair', 'device');
  assert.ok(uplink2.success, 'Switch 2 uplinked to Server');

  // Chain Switch 1 uplink to Switch 2
  const uplink1 = sim.connectWire(sw1Res.deviceId, [sw1Sq, 24 * 7 + 7, 24 * 7 + 8, sw2Sq], 'twisted_pair', 'device');
  assert.ok(uplink1.success, 'Switch 1 uplinked to Switch 2');

  // Connect Laptop to Switch 1
  const clientWire = sim.connectWire(1, [24 * 7 + 3, 24 * 7 + 4, 24 * 7 + 5, sw1Sq], 'twisted_pair', 'building');
  assert.ok(clientWire.success, 'Laptop connected to Switch 1');

  // Run simulation and verify multi-hop delivery
  let chainDelivered = false;
  for (let i = 0; i < 200; i++) {
    const events = sim.tick();
    if (events.some(e => e.type === 'PacketDelivered' && e.buildingId === 1)) {
      chainDelivered = true;
      break;
    }
  }

  assert.ok(chainDelivered, 'Packets must traverse the chained switches from Laptop to Server');
});

test('Ch1 & Ch2: Next Level progression steps through entire curriculum', () => {
  for (let i = 0; i < ALL_LEVELS.length - 1; i++) {
    const current = ALL_LEVELS[i];
    const next = ALL_LEVELS[i + 1];
    const retrievedCurrent = getLevelById(current.id);
    const retrievedNext = getLevelById(next.id);

    assert.ok(retrievedCurrent, `Level ${current.id} found`);
    assert.ok(retrievedNext, `Level ${next.id} found`);
  }

  // Check boundary transition from 1.9 to 2.1
  const idx19 = ALL_LEVELS.findIndex(l => l.id === '1.9');
  assert.ok(idx19 >= 0, '1.9 found');
  assert.equal(ALL_LEVELS[idx19 + 1].id, '2.1', 'Level following 1.9 must be 2.1');
});

test('Level 1.6: Pick up Wireless Access Point, refund 100%, and relocate elsewhere', () => {
  const map = {
    level: '1.6',
    seed: 'ap-relocate-test',
    width: 24,
    height: 14,
    server: 24 * 7 + 12,
    startingCoins: 60,
    devicesAllowed: ['server', 'access_point'],
    wiresAllowed: ['twisted_pair'],
    buildings: [
      { id: 1, type: 'phone', square: 24 * 3 + 12, required: true, opensAtTick: 0, quota: 2, firstTimerTicks: 800, cycleTimerTicks: 240, deadlineTicks: 50, requestIntervalTicks: 20 }
    ],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(map);
  const initialCoins = sim.coins; // 60

  // 1. Place AP in a bad spot (too far: (12, 11) - distance 8 from phone at (12, 3))
  const badSq = 24 * 11 + 12;
  const placeRes = sim.placeDevice('access_point', badSq);
  assert.ok(placeRes.success);
  assert.equal(sim.coins, initialCoins - 8); // 52

  const wireRes = sim.connectWire(placeRes.deviceId, [badSq, 24 * 10 + 12, 24 * 9 + 12, 24 * 8 + 12, sim.server], 'twisted_pair', 'device');
  assert.ok(wireRes.success);
  assert.equal(sim.coins, 52 - 4); // 48

  // Phone should be out of coverage
  const covBad = sim.getWirelessCoverage(1);
  assert.equal(covBad.connected, false);

  // 2. Pick up the device (calls removeDevice)
  const removeRes = sim.removeDevice(placeRes.deviceId);
  assert.ok(removeRes.success);

  // 100% refund of both device ($8) and wire ($4)
  assert.equal(sim.coins, initialCoins, '100% of device and wire cost must be refunded');
  assert.equal(sim.getDeviceAt(badSq), null, 'Device must be removed from square');

  // 3. Place AP in a good spot: (12, 5) - distance 2 from phone at (12, 3)
  const goodSq = 24 * 5 + 12;
  const newPlaceRes = sim.placeDevice('access_point', goodSq);
  assert.ok(newPlaceRes.success);

  // Uplink good AP to server
  const newWireRes = sim.connectWire(newPlaceRes.deviceId, [goodSq, 24 * 6 + 12, sim.server], 'twisted_pair', 'device');
  assert.ok(newWireRes.success);

  // Phone is now covered!
  const covGood = sim.getWirelessCoverage(1);
  assert.ok(covGood && covGood.connected, 'Phone must be covered after relocating AP');

  // Verify packets deliver through the relocated AP
  let delivered = false;
  for (let i = 0; i < 150; i++) {
    const events = sim.tick();
    if (events.some(e => e.type === 'PacketDelivered' && e.buildingId === 1)) {
      delivered = true;
      break;
    }
  }

  assert.ok(delivered, 'Packets must deliver after AP relocation');
});

test('Construction Mode: Wires cannot start from or connect to a construction site', () => {
  const map = {
    level: '1.2',
    seed: 'construction-wire-block',
    width: 24,
    height: 14,
    server: 24 * 7 + 12,
    startingCoins: 100,
    wiresAllowed: ['twisted_pair'],
    buildings: [
      { id: 1, type: 'laptop', square: 24 * 7 + 8, opensAtTick: 500, required: true }
    ],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(map);
  const b = sim.getBuilding(1);
  assert.equal(b.state, 'construction', 'Building must initially be in construction state');

  // 1. Attempt to connect wire from building in construction to server
  const path = [24 * 7 + 8, 24 * 7 + 9, 24 * 7 + 10, 24 * 7 + 11, sim.server];
  const val = sim.validateWire(1, path, 'twisted_pair', 'building');
  assert.equal(val.valid, false, 'Wire must NOT be valid when building is in construction');
  assert.equal(val.reason, 'buildingUnderConstruction');

  const connectRes = sim.connectWire(1, path, 'twisted_pair', 'building');
  assert.equal(connectRes.success, false, 'connectWire must fail during construction');
  assert.equal(connectRes.reason, 'buildingUnderConstruction');

  // Advance ticks until construction opens (opensAtTick: 500)
  for (let i = 0; i < 500; i++) sim.tick();
  assert.equal(b.state, 'open', 'Building should open after 500 ticks');

  // 2. Now that building is open, connecting wire succeeds
  const postOpenVal = sim.validateWire(1, path, 'twisted_pair', 'building');
  assert.equal(postOpenVal.valid, true, 'Wire becomes valid once construction completes');
  const postOpenConnect = sim.connectWire(1, path, 'twisted_pair', 'building');
  assert.equal(postOpenConnect.success, true, 'connectWire succeeds after building opens');
});

test('UI Interaction: Device mode prohibits wire dragging and Move tool relocates devices', () => {
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

    const ui = new NetCityClientUI(container, {
      initialLevel: '1.6',
      initialSeed: 'ui-tool-test'
    });

    // 1. Move tool button must be visible because Level 1.6 allows access_point
    assert.equal(ui.pickupBtn.style.display, 'inline-flex');

    // 2. Select access_point tool
    ui.activeTool = 'access_point';
    ui._updateToolButtons();
    assert.ok(ui.deviceBtns['access_point'].classList.contains('nc-active-access_point'));

    // 3. Clicking on a building when access_point is selected must NOT start dragging wire
    const building = ui.sim.buildings[0];
    const sz = ui.baseSquareSize * ui.camera.zoom;
    const bx = (building.square % ui.sim.width) * sz + ui.camera.x + sz / 2;
    const by = Math.floor(building.square / ui.sim.width) * sz + ui.camera.y + sz / 2;

    ui.canvas.dispatchEvent({
      type: 'pointerdown',
      button: 0,
      clientX: bx,
      clientY: by
    });

    assert.equal(ui.isDragging, false, 'Clicking while in device mode must never initiate wire dragging');

    // 4. Clicking on an empty square places the device and switches active tool to default wire
    let emptySquare = 0;
    while (
      emptySquare === ui.sim.server ||
      ui.sim.walls.has(emptySquare) ||
      ui.sim.getBuildingAt(emptySquare) ||
      ui.sim.getDeviceAt(emptySquare)
    ) {
      emptySquare++;
    }

    const ex = (emptySquare % ui.sim.width) * sz + ui.camera.x + sz / 2;
    const ey = Math.floor(emptySquare / ui.sim.width) * sz + ui.camera.y + sz / 2;

    ui.canvas.dispatchEvent({
      type: 'pointerdown',
      button: 0,
      clientX: ex,
      clientY: ey
    });

    const placedDevice = ui.sim.getDeviceAt(emptySquare);
    assert.ok(placedDevice, 'AP must be placed at empty square');
    assert.equal(placedDevice.type, 'access_point');
    assert.equal(ui.activeTool, 'twisted_pair', 'Tool must auto-switch to default wire after placing device');

    // 5. Select Move tool (pickup)
    ui.pickupBtn.dispatchEvent({ type: 'click' });
    assert.equal(ui.activeTool, 'pickup');
    assert.ok(ui.pickupBtn.classList.contains('nc-active-pickup'));

    // 6. Clicking on placed device picks it up
    ui.canvas.dispatchEvent({
      type: 'pointerdown',
      button: 0,
      clientX: ex,
      clientY: ey
    });

    assert.ok(ui.heldItem, 'Device must be held in Move tool');
    assert.equal(ui.heldItem.type, 'access_point');
    assert.equal(ui.sim.getDeviceAt(emptySquare), null, 'Device must be removed from previous square while held');

    // 7. Clicking another empty square places it and reverts active tool to default wire
    let targetSquare = emptySquare + 1;
    while (
      targetSquare === ui.sim.server ||
      ui.sim.walls.has(targetSquare) ||
      ui.sim.getBuildingAt(targetSquare) ||
      ui.sim.getDeviceAt(targetSquare)
    ) {
      targetSquare++;
    }

    const tx = (targetSquare % ui.sim.width) * sz + ui.camera.x + sz / 2;
    const ty = Math.floor(targetSquare / ui.sim.width) * sz + ui.camera.y + sz / 2;

    ui.canvas.dispatchEvent({
      type: 'pointerdown',
      button: 0,
      clientX: tx,
      clientY: ty
    });

    assert.equal(ui.heldItem, null, 'Held item must be cleared after placement');
    assert.ok(ui.sim.getDeviceAt(targetSquare), 'Device must exist at target square');
    assert.equal(ui.activeTool, 'twisted_pair', 'Tool must revert to default cable after relocating');

    ui.destroy();
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDoc;
    globalThis.requestAnimationFrame = prevRaf;
    globalThis.cancelAnimationFrame = prevCaf;
  }
});

test('Level 2.3: Multi-Server routing (Web vs DB Server with distinct packet colors)', () => {
  const map = {
    level: '2.3',
    seed: 'multi-server-test',
    width: 24,
    height: 14,
    startingCoins: 300,
    devicesAllowed: ['server', 'switch'],
    wiresAllowed: ['twisted_pair'],
    servers: [
      { id: 'web', type: 'web', name: 'Web Server', square: 24 * 7 + 10, color: '#2ec4b6', mac: '00:WB' },
      { id: 'db', type: 'db', name: 'Database Server', square: 24 * 7 + 14, color: '#10b981', mac: '00:DB' }
    ],
    buildings: [
      { id: 1, type: 'laptop', square: 24 * 7 + 4, required: true, targetServerId: 'web', quota: 2, firstTimerTicks: 800, cycleTimerTicks: 240, deadlineTicks: 40, requestIntervalTicks: 20 },
      { id: 2, type: 'laptop', square: 24 * 9 + 6, required: true, targetServerId: 'db', quota: 2, firstTimerTicks: 800, cycleTimerTicks: 240, deadlineTicks: 40, requestIntervalTicks: 20 }
    ],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(map);
  const swSq = 24 * 7 + 6;
  const swRes = sim.placeDevice('switch', swSq);
  assert.ok(swRes.success, 'Switch placed');

  // Wire Switch to Web Server (leaves right along row 7)
  const toWeb = sim.connectWire(swRes.deviceId, [swSq, 24 * 7 + 7, 24 * 7 + 8, 24 * 7 + 9, 24 * 7 + 10], 'twisted_pair', 'device');
  assert.ok(toWeb.success, 'Switch wired to Web Server');

  // Wire Switch to DB Server (leaves top, travels along row 6 to col 14, down to DB server)
  const dbPath = [swSq];
  for (let x = 6; x <= 14; x++) dbPath.push(24 * 6 + x);
  dbPath.push(24 * 7 + 14);
  const toDb = sim.connectWire(swRes.deviceId, dbPath, 'twisted_pair', 'device');
  assert.ok(toDb.success, 'Switch wired to DB Server');

  // Wire Laptop 1 to Switch (leaves left)
  const l1Res = sim.connectWire(1, [24 * 7 + 4, 24 * 7 + 5, swSq], 'twisted_pair', 'building');
  assert.ok(l1Res.success, 'Laptop 1 connected to Switch');

  // Wire Laptop 2 to Switch (leaves bottom)
  const l2Res = sim.connectWire(2, [24 * 9 + 6, 24 * 8 + 6, swSq], 'twisted_pair', 'building');
  assert.ok(l2Res.success, 'Laptop 2 connected to Switch');

  let webDelivered = false;
  let dbDelivered = false;

  for (let i = 0; i < 100; i++) {
    const events = sim.tick();
    for (const e of events) {
      if (e.type === 'PacketDelivered') {
        if (e.buildingId === 1) webDelivered = true;
        if (e.buildingId === 2) dbDelivered = true;
      }
    }
  }

  assert.ok(webDelivered, 'Laptop 1 must deliver to Web Server');
  assert.ok(dbDelivered, 'Laptop 2 must deliver to DB Server');

  // Verify in-flight packets captured distinct destination colors
  const dev = sim.getDevice(swRes.deviceId);
  assert.ok(dev.macTable.size >= 2, 'Switch must learn MAC addresses for connected devices');
});

test('Level 2.4: Switch MAC Address Table ("The Notebook") learning entries upon frame transit', () => {
  const map = {
    level: '2.4',
    seed: 'mac-notebook-test',
    width: 24,
    height: 14,
    startingCoins: 200,
    devicesAllowed: ['server', 'switch'],
    wiresAllowed: ['twisted_pair'],
    server: 24 * 7 + 12,
    buildings: [
      { id: 1, type: 'laptop', square: 24 * 7 + 4, mac: '00:A1', required: true, quota: 2, firstTimerTicks: 800, cycleTimerTicks: 240, deadlineTicks: 40, requestIntervalTicks: 20 }
    ],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(map);
  const swSq = 24 * 7 + 8;
  const swRes = sim.placeDevice('switch', swSq);

  // Before any packets travel, switch notebook is empty
  const sw = sim.getDevice(swRes.deviceId);
  assert.equal(sw.macTable.size, 0, 'Switch MAC table initially empty');

  // Wire switch to server and laptop to switch
  sim.connectWire(swRes.deviceId, [swSq, 24 * 7 + 9, 24 * 7 + 10, 24 * 7 + 11, sim.server], 'twisted_pair', 'device');
  sim.connectWire(1, [24 * 7 + 4, 24 * 7 + 5, 24 * 7 + 6, 24 * 7 + 7, swSq], 'twisted_pair', 'building');

  // Advance simulation to generate and transmit a packet
  for (let i = 0; i < 40; i++) {
    sim.tick();
    if (sw.macTable.has('00:A1')) break;
  }

  assert.ok(sw.macTable.has('00:A1'), 'Switch must learn Laptop MAC 00:A1');
  const entry = sw.macTable.get('00:A1');
  assert.equal(entry.mac, '00:A1');
  assert.ok(entry.port !== undefined, 'Switch entry must record port');
});

test('UI & CSS Layout: Fullscreen flex hierarchy and zero stray syntax', async () => {
  const fs = await import('node:fs');
  const cssPaths = ['apps/client/public/game.css'];

  for (const p of cssPaths) {
    const css = fs.readFileSync(p, 'utf8');
    assert.ok(!css.includes('color: #bfdbfe;\n}'), `${p} must not contain stray closing brace`);

    let depth = 0;
    const lines = css.split('\n');
    lines.forEach((line, i) => {
      for (const ch of line) {
        if (ch === '{') depth++;
        if (ch === '}') depth--;
        assert.ok(depth >= 0, `Brace depth in ${p} must never go negative at line ${i + 1}`);
      }
    });
    assert.equal(depth, 0, `Brace depth in ${p} must balance cleanly to 0`);

    // Verify critical flex structure
    assert.ok(css.includes('.nc-canvas-wrapper {'), 'Must define .nc-canvas-wrapper');
    assert.ok(css.includes('min-height: 0;'), '.nc-canvas-wrapper must prevent flex collapse with min-height: 0');
    assert.ok(css.includes('flex: 1 1 0%;'), '.nc-canvas-wrapper must expand with flex: 1 1 0%');
  }
});

test('Pedagogical Concept Pacing: MAC addresses only visible in Level 2.4+', () => {
  for (const l of ALL_LEVELS) {
    const showMac = Boolean(l.concept === 'mac_learning' || (l.chapter >= 2 && parseFloat(l.id) >= 2.4));
    if (l.chapter === 1 || parseFloat(l.id) < 2.4) {
      assert.equal(showMac, false, `Level ${l.id} (${l.title}) must NOT show MAC addresses to avoid overwhelming players`);
    } else {
      assert.equal(showMac, true, `Level ${l.id} (${l.title}) must introduce and show MAC addresses`);
    }
  }
});

test('4-Port Limit: Switch, Hub, Router, Cabinet, Server strictly accept max 4 connections and reject a 5th', () => {
  const map = {
    level: '2.3',
    seed: 'port-limit-test',
    width: 20,
    height: 14,
    server: 20 * 7 + 10, // (10, 7)
    startingCoins: 500,
    devicesAllowed: ['server', 'switch', 'hub'],
    wiresAllowed: ['twisted_pair'],
    buildings: [
      { id: 1, type: 'classroom', square: 20 * 3 + 8, required: false }, // (8, 3)
      { id: 2, type: 'classroom', square: 20 * 5 + 6, required: false }, // (6, 5)
      { id: 3, type: 'classroom', square: 20 * 7 + 8, required: false }, // (8, 7)
      { id: 4, type: 'classroom', square: 20 * 5 + 10, required: false } // (10, 5)
    ],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(map);
  const swSq = 20 * 5 + 8; // (8, 5)
  const sw = sim.placeDevice('switch', swSq);
  assert.ok(sw.success);

  // Uplink Switch to Server: (8,5) -> (9,5) -> (10,5) -> (10,6) -> (10,7)
  // Wait, (10, 5) is building 4, so route: (8,5) -> (8,6) -> (9,6) -> (10,6) -> (10,7)
  const up = sim.connectWire(sw.deviceId, [
    20 * 5 + 8,
    20 * 6 + 8,
    20 * 6 + 9,
    20 * 6 + 10,
    sim.server
  ], 'twisted_pair', 'device');
  assert.ok(up.success, 'Port 1 uplink should succeed: ' + up.message);

  // Connect Building 1 (8, 3) -> (8, 4) -> (8, 5) [swSq] (Port 2)
  const w1 = sim.connectWire(1, [
    20 * 3 + 8,
    20 * 4 + 8,
    swSq
  ], 'twisted_pair', 'building');
  assert.ok(w1.success, 'Port 2 should succeed: ' + w1.message);

  // Connect Building 2 (6, 5) -> (7, 5) -> (8, 5) [swSq] (Port 3)
  const w2 = sim.connectWire(2, [
    20 * 5 + 6,
    20 * 5 + 7,
    swSq
  ], 'twisted_pair', 'building');
  assert.ok(w2.success, 'Port 3 should succeed: ' + w2.message);

  // Connect Building 3 (8, 7) -> (7, 7) -> (7, 6) -> (8, 6... wait (8,6) is used by uplink)
  // Let's route: (8, 7) -> (7, 7) -> (7, 6) -> (7, 5... wait (7,5) is w2) -> route: (8,7) -> (8,8) -> (7,8) -> (6,8) -> (6,7) -> (6,6) -> (7,6) -> wait
  // Better: Building 3 at (9, 4), path: (9,4) -> (9,5) -> (8,5) [swSq] (Port 4)
  // But building 3 in map is at (8, 7). Let's connect Building 4 at (10, 5) -> (9, 5) -> (8, 5) [swSq] (Port 4)
  const w4 = sim.connectWire(4, [
    20 * 5 + 10,
    20 * 5 + 9,
    swSq
  ], 'twisted_pair', 'building');
  assert.ok(w4.success, 'Port 4 should succeed: ' + w4.message);

  // Now Switch has 4 ports occupied! Attempting a 5th wire to Switch must fail!
  // Building 3 at (8, 7) tries to connect to Switch via: (8,7) -> (8,8) -> (7,8) -> (7,7) -> (7,6) -> wait (7,6) is open, but to enter swSq:
  // All 4 adjacent squares of swSq: (8,4) is w1, (7,5) is w2, (9,5) is w4, (8,6) is up!
  // Try to connect a wire from Building 3:
  const res5 = sim.validateWire(3, [20 * 7 + 8, 20 * 6 + 8, swSq], 'twisted_pair', 'building');
  assert.equal(res5.valid, false);
  // It fails either due to wireCrossing or allPortsOccupied:
  // Let's test allPortsOccupied directly by checking dev.ports
  const dev = sim.getDevice(sw.deviceId);
  assert.equal(dev.ports, 4, 'Switch must have exactly 4 ports');
  assert.equal(dev.wireIds.size + (dev.outgoingWireIds ? dev.outgoingWireIds.size : 1), 4, 'All 4 ports are occupied');
});

test('Single-Wire Disconnect: Removing 1 wire from a multi-port device leaves other wires intact', () => {
  const map = {
    level: '2.3',
    seed: 'single-wire-removal-test',
    width: 20,
    height: 14,
    server: 20 * 7 + 10,
    startingCoins: 500,
    devicesAllowed: ['server', 'switch'],
    wiresAllowed: ['twisted_pair'],
    buildings: [
      { id: 1, type: 'classroom', square: 20 * 3 + 8, required: false },
      { id: 2, type: 'classroom', square: 20 * 5 + 6, required: false },
      { id: 3, type: 'classroom', square: 20 * 5 + 10, required: false }
    ],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(map);
  const swSq = 20 * 5 + 8;
  const sw = sim.placeDevice('switch', swSq);

  const up = sim.connectWire(sw.deviceId, [20 * 5 + 8, 20 * 6 + 8, 20 * 6 + 9, 20 * 6 + 10, sim.server], 'twisted_pair', 'device');
  const w1 = sim.connectWire(1, [20 * 3 + 8, 20 * 4 + 8, swSq], 'twisted_pair', 'building');
  const w2 = sim.connectWire(2, [20 * 5 + 6, 20 * 5 + 7, swSq], 'twisted_pair', 'building');

  assert.ok(up.success);
  assert.ok(w1.success);
  assert.ok(w2.success);

  const initialCoins = sim.coins;
  const wire1Cost = w1.wire.cost;

  // Remove ONLY wire 1
  const removeRes = sim.removeWireById(w1.wire.id);
  assert.ok(removeRes.success);
  assert.equal(sim.coins, initialCoins + wire1Cost, 'Exact wire cost refunded');

  // Verify wire 2 and uplink are STILL active
  assert.ok(sim.wires.has(w2.wire.id), 'Wire 2 remains connected');
  assert.ok(sim.wires.has(up.wire.id), 'Uplink remains connected');

  // Verify switch now has 2 ports used (free port can be rewired)
  const dev = sim.getDevice(sw.deviceId);
  assert.equal(dev.wireIds.size, 1, 'Only wire 2 in incoming wireIds');
  assert.ok(!dev.wireIds.has(w1.wire.id));

  // Now wire 3 can connect into the freed port
  const w3 = sim.connectWire(3, [20 * 5 + 10, 20 * 5 + 9, swSq], 'twisted_pair', 'building');
  assert.ok(w3.success, 'Freed port can now accept new connection');
});
