import test from 'node:test';
import assert from 'node:assert/strict';
import { NetCitySimulation } from '../packages/sim/src/sim.js';
import { ALL_LEVELS, CHAPTER_3_LEVELS, CHAPTER_4_LEVELS, getLevelById } from '../packages/content/src/levels.js';

test('Ch3 & Ch4: Catalogs are complete and well-formed', () => {
  assert.equal(CHAPTER_3_LEVELS.length, 8, 'Chapter 3 should have exactly 8 levels (3.1 to 3.8)');
  assert.equal(CHAPTER_4_LEVELS.length, 6, 'Chapter 4 should have exactly 6 levels (4.1 to 4.6)');
  assert.ok(ALL_LEVELS.length >= 28, 'ALL_LEVELS should contain at least 28 levels');

  for (const lvl of [...CHAPTER_3_LEVELS, ...CHAPTER_4_LEVELS]) {
    assert.ok(lvl.id, 'Level must have an id');
    assert.ok(lvl.title, `Level ${lvl.id} must have a title`);
    assert.ok(lvl.learningMoment, `Level ${lvl.id} must have a learning moment`);
    assert.ok(lvl.hint, `Level ${lvl.id} must have a hint`);
    assert.ok(lvl.grid && lvl.grid.w >= 24 && lvl.grid.h >= 14, `Level ${lvl.id} must have a valid grid`);
    assert.ok(Array.isArray(lvl.wiresAllowed) && lvl.wiresAllowed.length > 0, `Level ${lvl.id} must have wiresAllowed`);
    assert.ok(Array.isArray(lvl.devicesAllowed) && lvl.devicesAllowed.length > 0, `Level ${lvl.id} must have devicesAllowed`);
    assert.ok(lvl.coins > 0, `Level ${lvl.id} must have starting coins`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Chapter 3 Tests
// ─────────────────────────────────────────────────────────────────────────────

test('Level 3.1: Two Islands - packets without router cannot cross river', () => {
  const lvl = getLevelById('3.1');
  const sim = new NetCitySimulation({
    ...lvl,
    seed: 'two-islands-test',
    width: 32,
    height: 18,
    server: 18 * 9 + 25,
    buildings: [
      { id: 1, type: 'home', square: 18 * 9 + 5, side: 'left', required: false, ip: '192.168.1.10', quota: 2, opensAtTick: 0, firstTimerTicks: 600, cycleTimerTicks: 240, deadlineTicks: 40, requestIntervalTicks: 20 },
      { id: 2, type: 'classroom', square: 18 * 9 + 20, side: 'right', required: true, ip: '192.168.2.10', quota: 2, opensAtTick: 0, firstTimerTicks: 600, cycleTimerTicks: 240, deadlineTicks: 40, requestIntervalTicks: 20 }
    ]
  });

  // Wire right classroom to server
  const classSq = 18 * 9 + 20;
  const pathRight = [];
  for (let x = 20; x <= 25; x++) pathRight.push(18 * 9 + x);
  sim.connectWire(2, pathRight, 'twisted_pair', 'building');

  let classroomDelivered = false;
  let homeDroppedNoRoute = false;

  // Wire home across to river edge
  const homeSq = 18 * 9 + 5;
  const pathLeft = [];
  for (let x = 5; x <= 14; x++) pathLeft.push(18 * 9 + x);
  sim.connectWire(1, pathLeft, 'twisted_pair', 'building');

  for (let t = 0; t < 50; t++) {
    const events = sim.tick();
    for (const e of events) {
      if (e.type === 'PacketDelivered' && e.buildingId === 2) classroomDelivered = true;
      if (e.type === 'PacketDropped' && e.buildingId === 1 && (e.reason === 'no_route' || e.reason === 'no_wire')) {
        homeDroppedNoRoute = true;
      }
    }
  }

  assert.ok(classroomDelivered, 'Classroom on school side should deliver packets to server');
  assert.ok(homeDroppedNoRoute, 'Home across river without router should drop packet with no_route or no_wire');
});

test('Level 3.2: The Router bridges two networks across the river', () => {
  const lvl = getLevelById('3.2');
  const sim = new NetCitySimulation({
    ...lvl,
    seed: 'router-bridge-test',
    width: 32,
    height: 18,
    server: 32 * 9 + 26,
    buildings: [
      { id: 1, type: 'home', square: 32 * 9 + 4, side: 'left', required: true, ip: '192.168.1.10', defaultGateway: '192.168.1.1', quota: 2, opensAtTick: 0, firstTimerTicks: 600, cycleTimerTicks: 240, deadlineTicks: 50, requestIntervalTicks: 20 }
    ]
  });

  // Place Router at x = 14 (just at the river border)
  const routerSq = 32 * 9 + 14;
  const rRes = sim.placeDevice('router', routerSq);
  assert.ok(rRes.success, 'Router placed');

  // Wire home to router
  const homeToRouter = [];
  for (let x = 4; x <= 14; x++) homeToRouter.push(32 * 9 + x);
  const w1 = sim.connectWire(1, homeToRouter, 'twisted_pair', 'building');
  assert.ok(w1.success, 'Home wired to router');

  // Wire router to server across the river
  const routerToServer = [];
  for (let x = 14; x <= 26; x++) routerToServer.push(32 * 9 + x);
  const w2 = sim.connectWire(rRes.deviceId, routerToServer, 'multimode_fiber', 'device');
  assert.ok(w2.success, 'Router wired to server');

  let homeDelivered = false;
  for (let t = 0; t < 80; t++) {
    const events = sim.tick();
    for (const e of events) {
      if (e.type === 'PacketDelivered' && e.buildingId === 1) homeDelivered = true;
    }
    if (homeDelivered) break;
  }

  assert.ok(homeDelivered, 'Home requests must cross the router and reach the server');
});

test('Level 3.3: IP Addresses - devices with no IP drop requests with no_address', () => {
  const sim = new NetCitySimulation({
    level: '3.3',
    chapter: 3,
    concept: 'ip_addresses',
    width: 32,
    height: 18,
    server: 32 * 9 + 20,
    coins: 100,
    wiresAllowed: ['twisted_pair'],
    devicesAllowed: ['server', 'switch'],
    buildings: [
      { id: 1, type: 'laptop', square: 32 * 9 + 10, required: true, ip: null, quota: 2, opensAtTick: 0, firstTimerTicks: 600, cycleTimerTicks: 240, deadlineTicks: 40, requestIntervalTicks: 15 }
    ]
  });

  // Wire laptop to server
  const path = [];
  for (let x = 10; x <= 20; x++) path.push(32 * 9 + x);
  sim.connectWire(1, path, 'twisted_pair', 'building');

  let droppedNoAddress = false;
  for (let t = 0; t < 30; t++) {
    const events = sim.tick();
    for (const e of events) {
      if (e.type === 'PacketDropped' && e.reason === 'no_address') droppedNoAddress = true;
    }
  }
  assert.ok(droppedNoAddress, 'Laptop with null IP must drop packet with reason no_address');

  // Now assign an IP to the laptop
  sim.setBuildingIp(1, '192.168.1.15');

  let deliveredAfterIp = false;
  for (let t = 0; t < 50; t++) {
    const events = sim.tick();
    for (const e of events) {
      if (e.type === 'PacketDelivered' && e.buildingId === 1) deliveredAfterIp = true;
    }
    if (deliveredAfterIp) break;
  }
  assert.ok(deliveredAfterIp, 'Once assigned an IP address, laptop packets must deliver successfully');
});

test('Level 3.5: Default Gateway - missing gateway drops cross-network requests', () => {
  const sim = new NetCitySimulation({
    level: '3.5',
    chapter: 3,
    concept: 'default_gateway',
    width: 32,
    height: 18,
    server: 32 * 9 + 25,
    coins: 100,
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    devicesAllowed: ['server', 'router'],
    buildings: [
      { id: 1, type: 'laptop', square: 32 * 9 + 5, side: 'left', subnet: '192.168.1.0/24', ip: '192.168.1.10', defaultGateway: null, required: true, quota: 2, opensAtTick: 0, firstTimerTicks: 600, cycleTimerTicks: 240, deadlineTicks: 50, requestIntervalTicks: 15 }
    ]
  });

  const routerSq = 32 * 9 + 15;
  const rRes = sim.placeDevice('router', routerSq);

  const pathToRouter = [];
  for (let x = 5; x <= 15; x++) pathToRouter.push(32 * 9 + x);
  sim.connectWire(1, pathToRouter, 'twisted_pair', 'building');

  const routerToServer = [];
  for (let x = 15; x <= 25; x++) routerToServer.push(32 * 9 + x);
  sim.connectWire(rRes.deviceId, routerToServer, 'twisted_pair', 'device');

  let droppedNoGateway = false;
  for (let t = 0; t < 30; t++) {
    const events = sim.tick();
    for (const e of events) {
      if (e.type === 'PacketDropped' && e.reason === 'no_gateway') droppedNoGateway = true;
    }
  }
  assert.ok(droppedNoGateway, 'Cross-network request with missing default gateway must drop with no_gateway');

  // Configure default gateway
  sim.setBuildingIp(1, '192.168.1.10', '192.168.1.1');

  let deliveredWithGateway = false;
  for (let t = 0; t < 60; t++) {
    const events = sim.tick();
    for (const e of events) {
      if (e.type === 'PacketDelivered' && e.buildingId === 1) deliveredWithGateway = true;
    }
    if (deliveredWithGateway) break;
  }
  assert.ok(deliveredWithGateway, 'Setting default gateway allows packet to route cross-network to server');
});

test('Level 3.7: Multi-Hop Routers - packet traverses two routers in series', () => {
  const sim = new NetCitySimulation({
    level: '3.7',
    chapter: 3,
    concept: 'multi_hop_routers',
    width: 32,
    height: 18,
    server: 32 * 9 + 28,
    coins: 150,
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    devicesAllowed: ['server', 'router'],
    buildings: [
      { id: 1, type: 'laptop', square: 32 * 9 + 4, required: true, ip: '192.168.1.10', defaultGateway: '192.168.1.1', quota: 2, opensAtTick: 0, firstTimerTicks: 600, cycleTimerTicks: 240, deadlineTicks: 60, requestIntervalTicks: 20 }
    ]
  });

  // Router 1 at x = 12, Router 2 at x = 20
  const r1 = sim.placeDevice('router', 32 * 9 + 12);
  const r2 = sim.placeDevice('router', 32 * 9 + 20);

  // Wire 1: Laptop -> Router 1
  const path1 = [];
  for (let x = 4; x <= 12; x++) path1.push(32 * 9 + x);
  sim.connectWire(1, path1, 'twisted_pair', 'building');

  // Wire 2: Router 1 -> Router 2
  const path2 = [];
  for (let x = 12; x <= 20; x++) path2.push(32 * 9 + x);
  sim.connectWire(r1.deviceId, path2, 'multimode_fiber', 'device');

  // Wire 3: Router 2 -> Server
  const path3 = [];
  for (let x = 20; x <= 28; x++) path3.push(32 * 9 + x);
  sim.connectWire(r2.deviceId, path3, 'multimode_fiber', 'device');

  let deliveredMultiHop = false;
  for (let t = 0; t < 80; t++) {
    const events = sim.tick();
    for (const e of events) {
      if (e.type === 'PacketDelivered' && e.buildingId === 1) deliveredMultiHop = true;
    }
    if (deliveredMultiHop) break;
  }
  assert.ok(deliveredMultiHop, 'Packets must traverse multiple routers in series to reach destination');
});

// ─────────────────────────────────────────────────────────────────────────────
// Chapter 4 Tests
// ─────────────────────────────────────────────────────────────────────────────

test('Level 4.1: DHCP Server - automatically leases IP address and default gateway to new devices', () => {
  const sim = new NetCitySimulation({
    level: '4.1',
    chapter: 4,
    concept: 'dhcp_server',
    width: 32,
    height: 18,
    server: 32 * 9 + 24,
    coins: 150,
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    devicesAllowed: ['server', 'switch', 'dhcp_server'],
    buildings: [
      { id: 1, type: 'laptop', square: 32 * 9 + 6, required: true, ip: null, quota: 2, opensAtTick: 0, firstTimerTicks: 500, cycleTimerTicks: 220, deadlineTicks: 50, requestIntervalTicks: 15 }
    ]
  });

  const swRes = sim.placeDevice('switch', 32 * 9 + 12);
  const dhcpRes = sim.placeDevice('dhcp_server', 32 * 8 + 12);

  // Wire laptop to switch
  const pathLap = [];
  for (let x = 6; x <= 12; x++) pathLap.push(32 * 9 + x);
  sim.connectWire(1, pathLap, 'twisted_pair', 'building');

  // Wire switch to DHCP
  sim.connectWire(dhcpRes.deviceId, [32 * 8 + 12, 32 * 9 + 12], 'twisted_pair', 'device');

  // Wire switch to server
  const pathServer = [];
  for (let x = 12; x <= 24; x++) pathServer.push(32 * 9 + x);
  sim.connectWire(swRes.deviceId, pathServer, 'multimode_fiber', 'device');

  let dhcpLeased = false;
  let delivered = false;

  for (let t = 0; t < 60; t++) {
    const events = sim.tick();
    for (const e of events) {
      if (e.type === 'DhcpLeaseAssigned') {
        dhcpLeased = true;
        assert.ok(e.ip.startsWith('192.168.1.'), 'Leased IP must be in DHCP subnet');
      }
      if (e.type === 'PacketDelivered' && e.buildingId === 1) delivered = true;
    }
  }

  assert.ok(dhcpLeased, 'DHCP Server must automatically allocate lease to device without IP');
  assert.ok(delivered, 'Device with leased IP must successfully deliver packets');
});

test('Level 4.2: DNS Server - resolves hostname and drops packets if DNS is unreachable', () => {
  const sim = new NetCitySimulation({
    level: '4.2',
    chapter: 4,
    concept: 'dns_server',
    width: 32,
    height: 18,
    server: 32 * 9 + 20,
    coins: 150,
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    devicesAllowed: ['server', 'switch', 'dns_server'],
    servers: [
      { id: 'web', type: 'web', name: 'Web Server', icon: '🌐', color: '#2ec4b6', hostname: 'school.net', ip: '192.168.2.50', square: 32 * 9 + 20 }
    ],
    buildings: [
      { id: 1, type: 'laptop', square: 32 * 9 + 6, required: true, ip: '192.168.1.10', targetHostname: 'school.net', quota: 2, opensAtTick: 0, firstTimerTicks: 500, cycleTimerTicks: 220, deadlineTicks: 50, requestIntervalTicks: 15 }
    ]
  });

  const swRes = sim.placeDevice('switch', 32 * 9 + 12);

  // Wire laptop to switch
  const pathLap = [];
  for (let x = 6; x <= 12; x++) pathLap.push(32 * 9 + x);
  sim.connectWire(1, pathLap, 'twisted_pair', 'building');

  // Wire switch to server
  const pathServer = [];
  for (let x = 12; x <= 20; x++) pathServer.push(32 * 9 + x);
  sim.connectWire(swRes.deviceId, pathServer, 'twisted_pair', 'device');

  let droppedDnsFailed = false;
  for (let t = 0; t < 30; t++) {
    const events = sim.tick();
    for (const e of events) {
      if (e.type === 'PacketDropped' && e.reason === 'dns_failed') droppedDnsFailed = true;
    }
  }
  assert.ok(droppedDnsFailed, 'Request targeting hostname must drop with dns_failed if DNS server is absent');

  // Place DNS server and wire it to switch
  const dnsRes = sim.placeDevice('dns_server', 32 * 8 + 12);
  sim.connectWire(dnsRes.deviceId, [32 * 8 + 12, 32 * 9 + 12], 'twisted_pair', 'device');

  let deliveredWithDns = false;
  for (let t = 0; t < 60; t++) {
    const events = sim.tick();
    for (const e of events) {
      if (e.type === 'PacketDelivered' && e.buildingId === 1) deliveredWithDns = true;
    }
    if (deliveredWithDns) break;
  }
  assert.ok(deliveredWithDns, 'With DNS server reachable, hostname resolves and packet delivers');
});

test('Level 4.3: Round-Trip Web Request/Response - fulfilled only when reply returns to client', () => {
  const sim = new NetCitySimulation({
    level: '4.3',
    chapter: 4,
    concept: 'web_requests_roundtrip',
    width: 32,
    height: 18,
    server: 32 * 9 + 20,
    coins: 100,
    wiresAllowed: ['twisted_pair'],
    devicesAllowed: ['server', 'web_server'],
    servers: [
      { id: 'web', type: 'web', name: 'Web Server', icon: '🌐', color: '#2ec4b6' }
    ],
    buildings: [
      { id: 1, type: 'laptop', square: 32 * 9 + 10, required: true, targetServerId: 'web', quota: 2, opensAtTick: 0, firstTimerTicks: 500, cycleTimerTicks: 220, deadlineTicks: 60, requestIntervalTicks: 25 }
    ]
  });

  const path = [];
  for (let x = 10; x <= 20; x++) path.push(32 * 9 + x);
  sim.connectWire(1, path, 'twisted_pair', 'building');

  let serverReplied = false;
  let clientDelivered = false;

  for (let t = 0; t < 80; t++) {
    const events = sim.tick();
    for (const e of events) {
      if (e.type === 'ServerReplied') serverReplied = true;
      if (e.type === 'PacketDelivered' && e.buildingId === 1) clientDelivered = true;
    }
    if (serverReplied && clientDelivered) break;
  }

  assert.ok(serverReplied, 'Web server must emit ServerReplied and send response packet back');
  assert.ok(clientDelivered, 'Building request is fulfilled upon return of the reply packet');
});

test('Level 4.5: Doors and Ports - requests sent to closed ports are dropped with port_closed', () => {
  const sim = new NetCitySimulation({
    level: '4.5',
    chapter: 4,
    concept: 'service_ports',
    width: 32,
    height: 18,
    server: 32 * 9 + 20,
    coins: 100,
    wiresAllowed: ['twisted_pair'],
    devicesAllowed: ['server'],
    servers: [
      { id: 'srv', type: 'multi', name: 'Server', portsOpen: [80] } // Only port 80 is open
    ],
    buildings: [
      { id: 1, type: 'laptop', square: 32 * 9 + 10, required: true, targetServerId: 'srv', targetPort: 80, quota: 1, opensAtTick: 0, firstTimerTicks: 500, cycleTimerTicks: 220, deadlineTicks: 60, requestIntervalTicks: 20 },
      { id: 2, type: 'laptop', square: 32 * 8 + 10, required: true, targetServerId: 'srv', targetPort: 25, quota: 1, opensAtTick: 0, firstTimerTicks: 500, cycleTimerTicks: 220, deadlineTicks: 60, requestIntervalTicks: 20 } // Port 25 closed
    ]
  });

  // Wire laptop 1 to server
  const p1 = [];
  for (let x = 10; x <= 20; x++) p1.push(32 * 9 + x);
  sim.connectWire(1, p1, 'twisted_pair', 'building');

  // Wire laptop 2 to server
  const p2 = [];
  for (let x = 10; x <= 20; x++) p2.push(32 * 8 + x);
  p2.push(32 * 9 + 20);
  sim.connectWire(2, p2, 'twisted_pair', 'building');

  let openPortDelivered = false;
  let closedPortDropped = false;

  for (let t = 0; t < 80; t++) {
    const events = sim.tick();
    for (const e of events) {
      if (e.type === 'PacketDelivered' && e.buildingId === 1) openPortDelivered = true;
      if (e.type === 'PacketDropped' && e.buildingId === 2 && e.reason === 'port_closed') closedPortDropped = true;
    }
  }

  assert.ok(openPortDelivered, 'Request to open port (80) must be delivered');
  assert.ok(closedPortDropped, 'Request to closed port (25) must be dropped with reason port_closed');
});

// ─────────────────────────────────────────────────────────────────────────────
// Chapter 3 & 4 UI & Procedural Map Generation Tests
// ─────────────────────────────────────────────────────────────────────────────

import { NetCityClientUI } from '../apps/client/src/ui.js';
import { createMockDOM } from './mock-dom.js';

test('UI: River and Side Layout Invariants (Level 3.1 & 3.2)', () => {
  const mockDOM = createMockDOM();
  const prevWin = globalThis.window;
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
      initialLevel: '3.1',
      initialSeed: 'river-layout-seed'
    });

    const river = ui.levelDef.river;
    assert.deepEqual(river, [15, 16], 'Level 3.1 river should span columns 15-16');

    // Server must be placed on the school (right) side
    const srvX = ui.sim.server % ui.sim.width;
    assert.ok(srvX > river[1], `Server square x=${srvX} must be to the right of river column ${river[1]}`);

    // Check each building side constraint
    for (const b of ui.sim.buildings) {
      const bx = b.square % ui.sim.width;
      assert.ok(bx < river[0] || bx > river[1], `Building ${b.id} at x=${bx} must not be inside river`);
      if (b.side === 'left') {
        assert.ok(bx < river[0], `Home ${b.id} at x=${bx} must be on left side of river (< ${river[0]})`);
      } else if (b.side === 'right') {
        assert.ok(bx > river[1], `Classroom ${b.id} at x=${bx} must be on right side of river (> ${river[1]})`);
      }
    }

    // Check walls
    for (const w of ui.sim.walls) {
      const wx = w % ui.sim.width;
      assert.ok(wx < river[0] || wx > river[1], `Wall at x=${wx} must not be inside river`);
    }

    ui.destroy();
  } finally {
    globalThis.window = prevWin;
    globalThis.document = prevDoc;
    globalThis.requestAnimationFrame = prevRaf;
    globalThis.cancelAnimationFrame = prevCaf;
  }
});

test('UI: Interactive Building Inspector & Config Editing (Level 3.3)', () => {
  const mockDOM = createMockDOM();
  const prevWin = globalThis.window;
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
      initialLevel: '3.3',
      initialSeed: 'inspector-test-seed'
    });

    const b = ui.sim.buildings[0];
    assert.equal(b.ip, null, 'Level 3.3 buildings start with null IP');

    // 1. Single click on building opens building inspector
    const sz = ui.baseSquareSize * ui.camera.zoom;
    const bx = (b.square % ui.sim.width) * sz + ui.camera.x + sz / 2;
    const by = Math.floor(b.square / ui.sim.width) * sz + ui.camera.y + sz / 2;

    ui.canvas.dispatchEvent({ type: 'pointerdown', button: 0, clientX: bx, clientY: by });
    window.dispatchEvent({ type: 'pointerup', button: 0, clientX: bx, clientY: by });

    assert.equal(ui.modalEl.style.display, 'flex', 'Inspector modal must open');
    const ipInput = ui.modalEl.querySelector('#nc-input-ip');
    const gwInput = ui.modalEl.querySelector('#nc-input-gw');
    const saveBtn = ui.modalEl.querySelector('#nc-btn-save-ip');
    assert.ok(ipInput, 'IP input should be rendered');
    assert.ok(gwInput, 'Gateway input should be rendered');
    assert.ok(saveBtn, 'Save button should be rendered');

    // 2. Set IP and Gateway and click Save
    ipInput.value = '192.168.1.15';
    gwInput.value = '192.168.1.1';
    saveBtn.dispatchEvent({ type: 'click' });

    assert.equal(b.ip, '192.168.1.15', 'Building IP should be updated');
    assert.equal(b.defaultGateway, '192.168.1.1', 'Building Gateway should be updated');
    assert.equal(ui.modalEl.style.display, 'none', 'Modal should close after saving');

    ui.destroy();
  } finally {
    globalThis.window = prevWin;
    globalThis.document = prevDoc;
    globalThis.requestAnimationFrame = prevRaf;
    globalThis.cancelAnimationFrame = prevCaf;
  }
});

test('UI: Device Inspectors and Switch Forget Button', () => {
  const mockDOM = createMockDOM();
  const prevWin = globalThis.window;
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
      initialLevel: '4.6',
      initialSeed: 'device-inspector-seed'
    });

    // 1. Place a switch
    const swRes = ui.sim.placeDevice('switch', 10);
    const swDev = ui.sim.getDevice(swRes.deviceId);
    swDev.macTable.set('00:AA', { port: 1, deviceName: 'Laptop A', lastSeenTick: 100 });
    assert.equal(swDev.macTable.size, 1);

    // Show switch notebook
    ui._showSwitchNotebook(swDev);
    assert.equal(ui.modalEl.style.display, 'flex');
    const forgetBtn = ui.modalEl.querySelector('#nc-switch-forget');
    assert.ok(forgetBtn, 'Forget button must exist on switch notebook');

    forgetBtn.dispatchEvent({ type: 'click' });
    assert.equal(swDev.macTable.size, 0, 'Clicking Forget must clear switch MAC table');
    ui._closeModal();

    // 2. Place Router & inspect
    const rRes = ui.sim.placeDevice('router', 20);
    const rDev = ui.sim.getDevice(rRes.deviceId);
    ui._showRouterInspector(rDev);
    assert.equal(ui.modalEl.style.display, 'flex');
    assert.ok(ui.modalEl.innerHTML.includes('Routing Table'));
    ui._closeModal();

    // 3. Place DHCP server & inspect
    const dhcpRes = ui.sim.placeDevice('dhcp_server', 30);
    const dhcpDev = ui.sim.getDevice(dhcpRes.deviceId);
    ui._showDhcpInspector(dhcpDev);
    assert.equal(ui.modalEl.style.display, 'flex');
    assert.ok(ui.modalEl.innerHTML.includes('Active Leases Table'));
    ui._closeModal();

    // 4. Place DNS server & inspect
    const dnsRes = ui.sim.placeDevice('dns_server', 40);
    const dnsDev = ui.sim.getDevice(dnsRes.deviceId);
    ui._showDnsInspector(dnsDev);
    assert.equal(ui.modalEl.style.display, 'flex');
    assert.ok(ui.modalEl.innerHTML.includes('Zone Records Table'));
    ui._closeModal();

    ui.destroy();
  } finally {
    globalThis.window = prevWin;
    globalThis.document = prevDoc;
    globalThis.requestAnimationFrame = prevRaf;
    globalThis.cancelAnimationFrame = prevCaf;
  }
});
