import test from 'node:test';
import assert from 'node:assert/strict';
import { NetCitySimulation } from '../packages/sim/src/sim.js';
import { WIRE_CATALOG, REFUSAL_MESSAGES } from '../packages/content/src/wires.js';

test('V2: 4-Wire Catalog specifications match Section 4.1', () => {
  assert.equal(WIRE_CATALOG.twisted_pair.costPerSquare, 1);
  assert.equal(WIRE_CATALOG.twisted_pair.maxRunSquares, 10);
  assert.equal(WIRE_CATALOG.twisted_pair.shielded, false);

  assert.equal(WIRE_CATALOG.coaxial.costPerSquare, 2);
  assert.equal(WIRE_CATALOG.coaxial.maxRunSquares, 18);
  assert.equal(WIRE_CATALOG.coaxial.shielded, true);

  assert.equal(WIRE_CATALOG.multimode_fiber.costPerSquare, 3);
  assert.equal(WIRE_CATALOG.multimode_fiber.maxRunSquares, 40);
  assert.equal(WIRE_CATALOG.multimode_fiber.shielded, true);

  assert.equal(WIRE_CATALOG.single_mode_fiber.costPerSquare, 5);
  assert.equal(WIRE_CATALOG.single_mode_fiber.maxRunSquares, 100);
  assert.equal(WIRE_CATALOG.single_mode_fiber.shielded, true);
});

test('V2: Building lifecycle (construction -> open with first timer -> cycle timer)', () => {
  const mapData = {
    level: '1.2',
    seed: 'lifecycle-test',
    width: 24,
    height: 14,
    server: 24 * 7 + 12, // (12, 7)
    startingCoins: 100,
    buildings: [
      {
        id: 1,
        square: 24 * 7 + 8, // (8, 7), distance = 4
        required: true,
        opensAtTick: 0,
        quota: 2,
        firstTimerTicks: 800,
        cycleTimerTicks: 240,
        deadlineTicks: 40,
        requestIntervalTicks: 40
      },
      {
        id: 2,
        square: 24 * 7 + 16, // (16, 7), distance = 4
        required: true,
        opensAtTick: 200, // Starts under construction!
        quota: 2,
        firstTimerTicks: 800,
        cycleTimerTicks: 240,
        deadlineTicks: 40,
        requestIntervalTicks: 40
      }
    ],
    wiresAllowed: ['twisted_pair', 'coaxial', 'multimode_fiber', 'single_mode_fiber'],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(mapData);

  // Building 1 should be open with first timer 800
  const b1 = sim.getBuilding(1);
  assert.equal(b1.state, 'open');
  assert.equal(b1.timerTicksLeft, 800);
  assert.equal(b1.timerPhase, 'first');

  // Building 2 should be in construction until tick 200
  const b2 = sim.getBuilding(2);
  assert.equal(b2.state, 'construction');

  // Advance to tick 100
  for (let i = 0; i < 100; i++) sim.tick();
  assert.equal(b2.state, 'construction');

  // Advance to tick 200: opens, and tick decrements by 1 to 799
  for (let i = 0; i < 100; i++) sim.tick();
  assert.equal(b2.state, 'open');
  assert.equal(b2.timerTicksLeft, 799);
  assert.equal(b2.timerPhase, 'first');
});

test('V2: Sudden failure (Level Over) when required building timer expires', () => {
  const mapData = {
    level: '1.3',
    seed: 'fail-test',
    width: 24,
    height: 14,
    server: 24 * 7 + 12,
    startingCoins: 100,
    buildings: [
      {
        id: 1,
        square: 24 * 7 + 8,
        required: true,
        opensAtTick: 0,
        quota: 2,
        firstTimerTicks: 150, // Short timer for test
        cycleTimerTicks: 240,
        deadlineTicks: 40,
        requestIntervalTicks: 40
      }
    ],
    wiresAllowed: ['twisted_pair'],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(mapData);
  assert.equal(sim.status, 'playing');

  // Tick until timer expires without wire connection
  for (let i = 0; i < 160; i++) {
    sim.tick();
  }

  assert.equal(sim.status, 'level_over', 'Required building expiration must trigger level_over');
  const b1 = sim.getBuilding(1);
  assert.equal(b1.state, 'gave_up');
});

test('V2: Optional building expiring does NOT end the level', () => {
  const mapData = {
    level: '1.2',
    seed: 'optional-test',
    width: 24,
    height: 14,
    server: 24 * 7 + 12,
    startingCoins: 100,
    buildings: [
      {
        id: 1,
        square: 24 * 7 + 8,
        required: false, // Optional!
        opensAtTick: 0,
        quota: 2,
        firstTimerTicks: 100,
        cycleTimerTicks: 240,
        deadlineTicks: 40,
        requestIntervalTicks: 40
      }
    ],
    wiresAllowed: ['twisted_pair'],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(mapData);

  for (let i = 0; i < 120; i++) sim.tick();

  const b1 = sim.getBuilding(1);
  assert.equal(b1.state, 'gave_up');
  assert.equal(sim.status, 'playing', 'Optional building expiration must NOT trigger level_over');
});

test('V2: Strict No-Crossing Rule prevents wires from sharing squares', () => {
  const mapData = {
    level: 'no-crossing',
    seed: 'cross-test',
    width: 10,
    height: 10,
    server: 5 * 10 + 5, // (5, 5)
    startingCoins: 100,
    buildings: [
      {
        id: 1,
        square: 3 * 10 + 5, // (5, 3) - North of server
        required: true,
        opensAtTick: 0,
        quota: 2,
        firstTimerTicks: 800,
        cycleTimerTicks: 240,
        deadlineTicks: 40,
        requestIntervalTicks: 40
      },
      {
        id: 2,
        square: 5 * 10 + 3, // (3, 5) - West of server
        required: true,
        opensAtTick: 0,
        quota: 2,
        firstTimerTicks: 800,
        cycleTimerTicks: 240,
        deadlineTicks: 40,
        requestIntervalTicks: 40
      }
    ],
    wiresAllowed: ['twisted_pair', 'coaxial'],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(mapData);

  // Wire 1: from (5,3) straight South to (5,5):
  // Path: (5,3), (5,4), (5,5)
  // Square (5,4) = 4*10 + 5 = 45 is occupied by Wire 1!
  const path1 = [3 * 10 + 5, 4 * 10 + 5, 5 * 10 + 5];
  const res1 = sim.connectWire(1, path1, 'twisted_pair');
  assert.ok(res1.success, 'Wire 1 connection should succeed');
  assert.equal(sim.occupiedSquares.get(45), res1.wire.id);

  // Wire 2: from (3,5) to (5,5).
  // Suppose Wire 2 tries to route through square (5,4):
  // (3,5) -> (4,5) -> (4,4) -> (5,4) -> (5,5)
  const crossingPath = [
    5 * 10 + 3, // (3,5)
    5 * 10 + 4, // (4,5)
    4 * 10 + 4, // (4,4)
    4 * 10 + 5, // (5,4) <-- COLLISION WITH WIRE 1!
    5 * 10 + 5  // (5,5)
  ];

  const res2 = sim.connectWire(2, crossingPath, 'twisted_pair');
  assert.equal(res2.success, false, 'Crossing wire path must be refused');
  assert.equal(res2.reason, 'wireCrossing');
  assert.equal(res2.message, REFUSAL_MESSAGES.wireCrossing);

  // Now route Wire 2 without crossing: (3,5) -> (4,5) -> (5,5)
  const nonCrossingPath = [
    5 * 10 + 3, // (3,5)
    5 * 10 + 4, // (4,5)
    5 * 10 + 5  // (5,5)
  ];
  const res3 = sim.connectWire(2, nonCrossingPath, 'twisted_pair');
  assert.ok(res3.success, 'Non-crossing route should succeed');
});

test('V2: Signal Fade Rule: over-range wire can be built but packets fade', () => {
  const mapData = {
    level: 'fade-test',
    seed: 'fade-seed',
    width: 24,
    height: 14,
    server: 0 * 24 + 12, // (12, 0)
    startingCoins: 100,
    buildings: [
      {
        id: 1,
        square: 11 * 24 + 12, // (12, 11), straight line distance = 11 squares (> 10 max for twisted_pair)
        required: true,
        opensAtTick: 0,
        quota: 2,
        firstTimerTicks: 800,
        cycleTimerTicks: 240,
        deadlineTicks: 40,
        requestIntervalTicks: 40
      }
    ],
    wiresAllowed: ['twisted_pair', 'coaxial'],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(mapData);

  // Build an 11-square straight path: length = 11
  const path = [];
  for (let y = 11; y >= 0; y--) {
    path.push(y * 24 + 12);
  }
  assert.equal(path.length - 1, 11);

  // In MVP this was refused. In v2.0 it is ALLOWED, but isFaded = true!
  const res = sim.connectWire(1, path, 'twisted_pair');
  assert.ok(res.success, 'Over-range wire is allowed to be built');
  assert.equal(res.wire.isFaded, true);

  // Advance ticks so building transmits a packet
  let packetFaded = false;
  for (let i = 0; i < 80; i++) {
    const events = sim.tick();
    if (events.some(e => e.type === 'PacketDropped' && e.reason === 'signal_faded')) {
      packetFaded = true;
      break;
    }
  }

  assert.ok(packetFaded, 'Requests on over-range wire must be dropped with signal_faded');
  const b1 = sim.getBuilding(1);
  assert.equal(b1.fulfilledInCycle, 0, 'Faded requests do not fulfill quota');
});

test('V2: Quota fulfillment, coin earnings, and 20-coin connection bonus', () => {
  const mapData = {
    level: 'quota-test',
    seed: 'quota-seed',
    width: 24,
    height: 14,
    server: 24 * 7 + 12, // (12, 7)
    startingCoins: 50,
    buildings: [
      {
        id: 1,
        square: 24 * 7 + 8, // (8, 7), distance = 4
        required: true,
        opensAtTick: 0,
        quota: 2, // Needs 2 fulfilled requests
        firstTimerTicks: 800,
        cycleTimerTicks: 240,
        deadlineTicks: 40,
        requestIntervalTicks: 20
      }
    ],
    wiresAllowed: ['twisted_pair'],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(mapData);
  const path = [24 * 7 + 8, 24 * 7 + 9, 24 * 7 + 10, 24 * 7 + 11, 24 * 7 + 12];
  const wireCost = 4 * WIRE_CATALOG.twisted_pair.costPerSquare; // 4 coins
  const res = sim.connectWire(1, path, 'twisted_pair');
  assert.ok(res.success);
  assert.equal(sim.coins, 50 - wireCost); // 46 coins

  // Run simulation until quota is met (2 deliveries)
  let bonusAwarded = false;
  let cycleMet = false;

  for (let i = 0; i < 150; i++) {
    const events = sim.tick();
    if (events.some(e => e.type === 'BonusAwarded' && e.coins === 20)) {
      bonusAwarded = true;
    }
    if (events.some(e => e.type === 'CycleMet')) {
      cycleMet = true;
    }
  }

  assert.ok(cycleMet, 'CycleMet event should be emitted when quota reached');
  assert.ok(bonusAwarded, '20-coin connection bonus should be awarded on first quota met');

  const b1 = sim.getBuilding(1);
  assert.equal(b1.hasMetFirstQuota, true);
  assert.equal(b1.timerPhase, 'cycle');
  // Coins: 46 starting after wire + 2 request coins + 20 bonus = 68
  assert.ok(sim.coins >= 68, `Coins should include bonuses and request earnings (found ${sim.coins})`);
});

test('V2: Checkpoints and 30-second Rewind functionality', () => {
  const mapData = {
    level: 'rewind-test',
    seed: 'rewind-seed',
    width: 24,
    height: 14,
    server: 24 * 7 + 12,
    startingCoins: 100,
    buildings: [
      {
        id: 1,
        square: 24 * 7 + 8,
        required: true,
        opensAtTick: 0,
        quota: 2,
        firstTimerTicks: 800,
        cycleTimerTicks: 240,
        deadlineTicks: 40,
        requestIntervalTicks: 40
      }
    ],
    wiresAllowed: ['twisted_pair'],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(mapData);

  // Run 650 ticks (passes tick 600 checkpoint)
  for (let i = 0; i < 650; i++) sim.tick();
  assert.equal(sim.tickNumber, 650);
  assert.ok(sim.checkpoints.length >= 2); // Initial checkpoint + tick 600

  // Rewind
  const success = sim.rewind();
  assert.ok(success, 'Rewind should succeed');
  assert.equal(sim.rewindsUsed, 1);
  assert.ok(sim.tickNumber <= 600, 'Tick number restored to checkpoint prior to failure');
});

test('V2: Level 1.1 First Link wins when laptop meets quota', () => {
  const mapData = {
    level: '1.1',
    seed: 'win-1.1',
    width: 24,
    height: 14,
    server: 24 * 7 + 12,
    startingCoins: 20,
    buildings: [
      {
        id: 1,
        type: 'laptop',
        square: 24 * 7 + 8, // (8, 7), distance = 4
        required: false,    // Section 5.1: not required so it cannot trigger sudden failure
        opensAtTick: 0,
        quota: 2,
        firstTimerTicks: 800,
        cycleTimerTicks: 240,
        deadlineTicks: 40,
        requestIntervalTicks: 40
      }
    ],
    wiresAllowed: ['twisted_pair'],
    goal: 'connect_all'
  };

  const sim = new NetCitySimulation(mapData);
  const path = [24 * 7 + 8, 24 * 7 + 9, 24 * 7 + 10, 24 * 7 + 11, 24 * 7 + 12];
  const conn = sim.connectWire(1, path, 'twisted_pair');
  assert.ok(conn.success);

  let won = false;
  for (let i = 0; i < 200; i++) {
    const events = sim.tick();
    if (events.some(e => e.type === 'LevelWon') || sim.status === 'won') {
      won = true;
      break;
    }
  }

  assert.ok(won, 'Level 1.1 must transition to won status once quota is fulfilled');
});
