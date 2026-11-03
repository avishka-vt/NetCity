import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLevel, bfsPath } from '../public/game/generate.js';
import { LEVELS, CABLE_TYPES, REFUSAL_MESSAGES } from '../public/game/levels.js';
import { Simulation } from '../public/game/sim.js';
import { BrowserHostAdapter, DEFAULT_STORAGE_KEY } from '../public/game/host.js';
import { openGame, mountGame } from '../public/game/index.js';
import { createMockDOM } from './mock-dom.js';
import express from 'express';
import { createNetCityRouter } from '../netcity-router.js';

test('1. Determinism: Same level and seed produce identical stored map', () => {
  const seeds = ['k4x9q2', 'alpha-1', 'test_seed_777', 'seed_xyz_99'];
  for (const level of LEVELS) {
    for (const seed of seeds) {
      const map1 = generateLevel(level.id, seed);
      const map2 = generateLevel(level.id, seed);
      assert.deepEqual(map1, map2, `Maps for level ${level.id} and seed ${seed} should be identical`);
    }
  }
});

test('2 & 3. 500 seeds pass generation checks and scripted solution wins with 3 stars', () => {
  const fallbackCounts = { '1.1': 0, '1.2': 0, '1.3': 0, '1.4': 0 };

  for (const level of LEVELS) {
    const startTime = Date.now();
    for (let i = 0; i < 500; i++) {
      const seed = `seed-${level.id}-${i}`;
      const stats = {};
      const map = generateLevel(level.id, seed, stats);

      if (stats.fallbackUsed) {
        fallbackCounts[level.id]++;
      }

      // Check map invariants
      assert.equal(map.level, level.id);
      assert.equal(map.buildings.length, level.nearCount + level.farCount);
      assert.ok(map.budget >= map.par, `Budget (${map.budget}) must be >= par (${map.par})`);

      // Test 3: Scripted solution wins with 3 stars
      const sim = new Simulation(map);

      // Connect each building with shortest route and cheapest allowed cable
      const obstacles = new Set([
        ...map.walls,
        ...map.buildings.map(b => b.square)
      ]);

      let totalScriptedCost = 0;

      for (const b of map.buildings) {
        const bObstacles = new Set(obstacles);
        bObstacles.delete(b.square);

        const path = bfsPath(b.square, map.server, bObstacles, map.width, map.height);
        assert.ok(path, `Building ${b.id} must have a path to server`);

        const dist = path.length - 1;
        let cableType = 'copper';
        if (dist > 10) {
          assert.ok(map.cablesAllowed.includes('fiber'), `Distance ${dist} requires fiber`);
          cableType = 'fiber';
        }

        const res = sim.connectCable(b.id, path, cableType);
        assert.ok(res.success, `Cable connection should succeed for building ${b.id}: ${res.message}`);
        totalScriptedCost += res.cable.cost;
      }

      assert.equal(sim.moneySpent, map.par, `Total cost should equal par (${map.par})`);
      assert.equal(totalScriptedCost, map.par);

      // Run simulation until won
      let ticks = 0;
      while (!sim.isWon && ticks < 400) {
        sim.tick();
        ticks++;
      }

      assert.ok(sim.isWon, `Level ${level.id} seed ${seed} should be won within 400 ticks (took ${ticks})`);
      assert.equal(sim.stars, 3, `Scripted solution should earn 3 stars on level ${level.id} seed ${seed}`);
    }

    const elapsed = Date.now() - startTime;
    console.log(`Level ${level.id}: 500 seeds generated and simulated in ${elapsed}ms. No-walls fallback needed: ${fallbackCounts[level.id]} times.`);
  }
});

test('4. Refused cables leave state unchanged', () => {
  const map = generateLevel('1.3', 'refusal-test-seed');
  const sim = new Simulation(map);

  const initialMoneySpent = sim.moneySpent;
  const initialBuildingsState = JSON.stringify(sim.buildings);

  function assertStateUnchanged(label) {
    assert.equal(sim.moneySpent, initialMoneySpent, `${label}: moneySpent must be unchanged`);
    assert.equal(JSON.stringify(sim.buildings), initialBuildingsState, `${label}: buildings must be unchanged`);
  }

  // 4a. Copper of 11 squares
  // In Level 1.3, the far building is > 10 squares away
  const farBuilding = map.buildings.find(b => {
    const obstacles = new Set([...map.walls, ...map.buildings.filter(o => o.id !== b.id).map(o => o.square)]);
    return bfsPath(b.square, map.server, obstacles, map.width, map.height).length - 1 > 10;
  });
  assert.ok(farBuilding, 'Far building exists in 1.3');

  const bObstacles = new Set([...map.walls, ...map.buildings.filter(o => o.id !== farBuilding.id).map(o => o.square)]);
  const naturalPathFar = bfsPath(farBuilding.square, map.server, bObstacles, map.width, map.height);
  assert.ok(naturalPathFar.length - 1 > 10, 'Path length is > 10');

  const copperOverResult = sim.connectCable(farBuilding.id, naturalPathFar, 'copper');
  assert.equal(copperOverResult.success, false);
  assert.equal(copperOverResult.reason, 'copperLonger');
  assert.equal(copperOverResult.message, REFUSAL_MESSAGES.copperLonger);
  assertStateUnchanged('copper > 10 squares');

  // 4b. Fiber of 41 squares (exceeds 40)
  const customMap = {
    level: '1.4',
    seed: 'custom',
    width: 24,
    height: 14,
    server: 5,
    walls: [],
    buildings: [{ id: 1, square: 0 }],
    cablesAllowed: ['copper', 'fiber'],
    par: 100,
    budget: 120,
    messageEvery: 24,
    deadline: 40,
    needed: 3
  };
  const customSim = new Simulation(customMap);

  function makeExactPath(targetLength, startSq, endSq) {
    const queue = [[startSq]];
    while (queue.length > 0) {
      const p = queue.pop();
      if (p.length === targetLength + 1) {
        if (p[p.length - 1] === endSq) return p;
        continue;
      }
      const last = p[p.length - 1];
      const lx = last % 24;
      const ly = Math.floor(last / 24);
      const neighbors = [
        ly > 0 ? (ly - 1) * 24 + lx : -1,
        lx < 23 ? ly * 24 + lx + 1 : -1,
        ly < 13 ? (ly + 1) * 24 + lx : -1,
        lx > 0 ? ly * 24 + lx - 1 : -1
      ];
      for (const n of neighbors) {
        if (n !== -1 && !p.includes(n)) {
          const nx = n % 24;
          const ny = Math.floor(n / 24);
          const ex = endSq % 24;
          const ey = Math.floor(endSq / 24);
          const rem = targetLength - p.length;
          const dist = Math.abs(nx - ex) + Math.abs(ny - ey);
          if (dist <= rem && (rem - dist) % 2 === 0) {
            queue.push([...p, n]);
            if (queue.length > 2000) break;
          }
        }
      }
    }
    return null;
  }

  const path41 = makeExactPath(41, 0, 5);
  assert.ok(path41, '41-step path constructed');
  assert.equal(path41.length - 1, 41);

  const fiberOverResult = customSim.connectCable(1, path41, 'fiber');
  assert.equal(fiberOverResult.success, false);
  assert.equal(fiberOverResult.reason, 'fiberLonger');
  assert.equal(fiberOverResult.message, REFUSAL_MESSAGES.fiberLonger);
  assert.equal(customSim.moneySpent, 0);

  // 4c. Route through a wall
  const mapWithWall = generateLevel('1.2', 'wall-test-seed');
  assert.ok(mapWithWall.walls.length > 0, 'Map has walls');
  const simWall = new Simulation(mapWithWall);
  const wallSquare = mapWithWall.walls[0];
  const b1 = mapWithWall.buildings[0];
  const pathToWall = bfsPath(b1.square, wallSquare, new Set(), mapWithWall.width, mapWithWall.height);
  const pathFromWallToServer = bfsPath(wallSquare, mapWithWall.server, new Set(), mapWithWall.width, mapWithWall.height);
  assert.ok(pathToWall && pathFromWallToServer);
  const wallPath = [...pathToWall, ...pathFromWallToServer.slice(1)];
  const wallResult = simWall.connectCable(b1.id, wallPath, 'copper');
  assert.equal(wallResult.success, false);
  assert.equal(wallResult.reason, 'wallOrBuilding');
  assert.equal(wallResult.message, REFUSAL_MESSAGES.wallOrBuilding);
  assert.equal(simWall.moneySpent, 0);

  // 4d. Route through another building
  const b2 = mapWithWall.buildings[1];
  const pathToB2 = bfsPath(b1.square, b2.square, new Set(), mapWithWall.width, mapWithWall.height);
  const pathFromB2ToServer = bfsPath(b2.square, mapWithWall.server, new Set(), mapWithWall.width, mapWithWall.height);
  assert.ok(pathToB2 && pathFromB2ToServer);
  const throughB2Path = [...pathToB2, ...pathFromB2ToServer.slice(1)];
  const b2Result = simWall.connectCable(b1.id, throughB2Path, 'copper');
  assert.equal(b2Result.success, false);
  assert.equal(b2Result.reason, 'wallOrBuilding');
  assert.equal(b2Result.message, REFUSAL_MESSAGES.wallOrBuilding);
  assert.equal(simWall.moneySpent, 0);

  // 4e. Cable costing more than the remaining budget
  const mapBudget = generateLevel('1.1', 'budget-test-seed');
  const simBudget = new Simulation(mapBudget);
  const bTest = mapBudget.buildings[0];
  const pathToServ = bfsPath(bTest.square, mapBudget.server, new Set(), mapBudget.width, mapBudget.height);
  simBudget.mapData.budget = (pathToServ.length - 1) - 1; // 1 less than cost
  const budgetResult = simBudget.connectCable(bTest.id, pathToServ, 'copper');
  assert.equal(budgetResult.success, false);
  assert.equal(budgetResult.reason, 'notEnoughBudget');
  assert.equal(budgetResult.message, REFUSAL_MESSAGES.notEnoughBudget);
  assert.equal(simBudget.moneySpent, 0);
});

test('5. Removing a cable refunds exactly what it cost', () => {
  const map = generateLevel('1.2', 'refund-test-seed');
  const sim = new Simulation(map);

  const b0 = map.buildings[0];
  const obstacles = new Set([...map.walls, ...map.buildings.filter(b => b.id !== b0.id).map(b => b.square)]);
  const path = bfsPath(b0.square, map.server, obstacles, map.width, map.height);
  assert.ok(path);

  const cost = (path.length - 1) * CABLE_TYPES.copper.costPerSquare;
  const conn = sim.connectCable(b0.id, path, 'copper');
  assert.ok(conn.success);
  assert.equal(sim.moneySpent, cost);

  const rem = sim.removeCable(b0.id);
  assert.ok(rem.success);
  assert.equal(rem.refund, cost);
  assert.equal(sim.moneySpent, 0);
  assert.equal(sim.getBuilding(b0.id).cable, null);
});

test('6. Progress survives a page reload (Host Adapter persistence)', () => {
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, val) => storage.set(key, String(val)),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear()
  };

  const adapter1 = new BrowserHostAdapter();
  adapter1.recordLevelComplete('1.1', 3, 14);
  adapter1.recordLevelComplete('1.2', 2, 31);

  const rawStored = JSON.parse(storage.get(DEFAULT_STORAGE_KEY));
  assert.deepEqual(rawStored, {
    levels: {
      '1.1': { stars: 3, bestCost: 14 },
      '1.2': { stars: 2, bestCost: 31 }
    }
  });

  const adapter2 = new BrowserHostAdapter();
  const loaded = adapter2.loadProgress();
  assert.deepEqual(loaded, {
    levels: {
      '1.1': { stars: 3, bestCost: 14 },
      '1.2': { stars: 2, bestCost: 31 }
    }
  });

  adapter2.recordLevelComplete('1.1', 2, 20); // worse score
  const loaded2 = adapter2.loadProgress();
  assert.equal(loaded2.levels['1.1'].stars, 3);
  assert.equal(loaded2.levels['1.1'].bestCost, 14);

  adapter2.recordLevelComplete('1.1', 3, 10); // better cost
  const loaded3 = adapter2.loadProgress();
  assert.equal(loaded3.levels['1.1'].stars, 3);
  assert.equal(loaded3.levels['1.1'].bestCost, 10);
});

test('7. Opening and closing the game 20 times leaves no extra event listeners or running animation loops behind', () => {
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
    const initialWindowListeners = mockDOM.windowListeners.size;
    const initialDocumentListeners = mockDOM.documentListeners.size;

    const host = new BrowserHostAdapter();

    for (let i = 0; i < 20; i++) {
      const handle = openGame(host);
      assert.ok(handle, 'openGame returns handle');
      assert.ok(mockDOM.document.body.children.length > 0, 'Overlay attached');

      // Close the game cleanly
      handle.destroy();

      assert.equal(mockDOM.document.body.children.length, 0, `Overlay removed on cycle ${i + 1}`);
    }

    // After 20 open-and-close cycles, verify zero leaked listeners and zero active animation frames
    const finalWindowListeners = [...mockDOM.windowListeners.values()].reduce((sum, s) => sum + s.size, 0);
    const finalDocumentListeners = [...mockDOM.documentListeners.values()].reduce((sum, s) => sum + s.size, 0);

    assert.equal(finalWindowListeners, initialWindowListeners, `No extra window listeners left behind (found ${finalWindowListeners})`);
    assert.equal(finalDocumentListeners, initialDocumentListeners, `No extra document listeners left behind (found ${finalDocumentListeners})`);
    assert.equal(mockDOM.activeRafs.size, 0, `No running animation frames left behind (found ${mockDOM.activeRafs.size})`);
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDoc;
    globalThis.requestAnimationFrame = prevRaf;
    globalThis.cancelAnimationFrame = prevCaf;
  }
});

test('8. Express Integration: createNetCityRouter serves game assets and host demo', async () => {
  const app = express();
  app.use('/netcity', createNetCityRouter());

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // Check router index
    const resIndex = await fetch(`${baseUrl}/netcity/index.html`);
    assert.equal(resIndex.status, 200);
    const textIndex = await resIndex.text();
    assert.ok(textIndex.includes('NetCity'), 'index.html contains NetCity');

    // Check host demo
    const resDemo = await fetch(`${baseUrl}/netcity/host-demo.html`);
    assert.equal(resDemo.status, 200);
    const textDemo = await resDemo.text();
    assert.ok(textDemo.includes('NetCity: Network Builder Lab'), 'host-demo.html contains lab title');

    // Check game module files
    const resJs = await fetch(`${baseUrl}/netcity/game/index.js`);
    assert.equal(resJs.status, 200);

    const resCss = await fetch(`${baseUrl}/netcity/game/game.css`);
    assert.equal(resCss.status, 200);
  } finally {
    server.close();
  }
});
