import test from 'node:test';
import assert from 'node:assert/strict';
import { NetCitySimulation } from '../packages/sim/src/sim.js';
import { ALL_LEVELS, CHAPTER_5_LEVELS, CHAPTER_6_LEVELS, CHAPTER_7_LEVELS, getLevelById } from '../packages/content/src/levels.js';
import { DEVICE_CATALOG } from '../packages/content/src/devices.js';
import { createMockDOM } from './mock-dom.js';
import { NetCityClientUI } from '../apps/client/src/ui.js';

function makePath(coords, width) {
  const path = [];
  for (let i = 0; i < coords.length - 1; i++) {
    let [x1, y1] = coords[i];
    const [x2, y2] = coords[i + 1];
    if (i === 0) path.push(y1 * width + x1);
    while (x1 !== x2) {
      x1 += x2 > x1 ? 1 : -1;
      path.push(y1 * width + x1);
    }
    while (y1 !== y2) {
      y1 += y2 > y1 ? 1 : -1;
      path.push(y1 * width + x1);
    }
  }
  return path;
}

test('Ch5 to Ch7: Level catalogs are complete, well-formed, and reach 44 total levels', () => {
  assert.equal(CHAPTER_5_LEVELS.length, 5, 'Chapter 5 should have 5 levels (5.1 to 5.5)');
  assert.equal(CHAPTER_6_LEVELS.length, 5, 'Chapter 6 should have 5 levels (6.1 to 6.5)');
  assert.equal(CHAPTER_7_LEVELS.length, 6, 'Chapter 7 should have 6 levels (7.1 to 7.6)');
  assert.equal(ALL_LEVELS.length, 44, 'Total levels should be exactly 44 across all 7 chapters');

  for (const lvl of [...CHAPTER_5_LEVELS, ...CHAPTER_6_LEVELS, ...CHAPTER_7_LEVELS]) {
    assert.ok(lvl.id, 'Level must have an id');
    assert.ok(lvl.title, `Level ${lvl.id} must have a title`);
    assert.ok(lvl.learningMoment, `Level ${lvl.id} must have a learning moment`);
    assert.ok(lvl.hint, `Level ${lvl.id} must have a hint`);
    assert.ok(lvl.grid && lvl.grid.w >= 36 && lvl.grid.h >= 20, `Level ${lvl.id} must have at least 36x20 grid`);
    assert.ok(Array.isArray(lvl.wiresAllowed) && lvl.wiresAllowed.length > 0, `Level ${lvl.id} must specify wiresAllowed`);
    assert.ok(Array.isArray(lvl.devicesAllowed) && lvl.devicesAllowed.length > 0, `Level ${lvl.id} must specify devicesAllowed`);
    assert.ok(lvl.coins > 0, `Level ${lvl.id} must provide starting coins`);
  }
});

test('Ch5 to Ch7: New hardware devices exist in DEVICE_CATALOG with 4-port capacity rule', () => {
  const newDevices = ['firewall', 'vpn_gateway', 'load_balancer', 'backup_power'];
  for (const d of newDevices) {
    const spec = DEVICE_CATALOG[d];
    assert.ok(spec, `Device ${d} must be defined in DEVICE_CATALOG`);
    assert.ok(spec.cost > 0, `Device ${d} must have a cost`);
    assert.equal(spec.ports, 4, `Device ${d} must comply with the 4-port limit rule`);
    assert.ok(spec.icon, `Device ${d} must have an icon`);
    assert.ok(spec.color, `Device ${d} must have a color`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Chapter 5: Organise the City
// ─────────────────────────────────────────────────────────────────────────────

test('Level 5.1: Colour Zones (VLANs) - packets dropped as wrong_zone when crossing zones without router', () => {
  const srvStudentSq = 16 * 36 + 32;
  const srvTeacherSq = 4 * 36 + 32;

  const sim = new NetCitySimulation({
    seed: 'vlan1',
    width: 36,
    height: 20,
    server: srvStudentSq,
    servers: [
      { id: 'srv_student', square: srvStudentSq, zone: 'blue', name: 'Student Server' },
      { id: 'srv_teacher', square: srvTeacherSq, zone: 'green', name: 'Teacher Server' }
    ],
    buildings: [
      { id: 1, type: 'laptop', zone: 'blue', square: 8 * 36 + 2, targetServerId: 'srv_student', required: true, quota: 1 },
      { id: 2, type: 'laptop', zone: 'blue', square: 12 * 36 + 2, targetServerId: 'srv_teacher', required: true, quota: 1 }
    ],
    devicesAllowed: ['switch'],
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    startingCoins: 300,
    chapter: 5,
    concept: 'color_zones'
  });

  const swRes = sim.placeDevice('switch', 10 * 36 + 10);
  assert.ok(swRes.success);

  // Switch at (10, 10). 4 non-overlapping approaches:
  // Port 1 (left): laptop 1 at (2, 8)
  const p1 = makePath([[2, 8], [9, 8], [9, 10], [10, 10]], 36);
  // Port 2 (bottom): laptop 2 at (2, 12)
  const p2 = makePath([[2, 12], [10, 12], [10, 10]], 36);
  // Port 3 (right): srvStudent at (32, 16)
  const pSrvStudent = makePath([[10, 10], [32, 10], [32, 16]], 36);
  // Port 4 (top): srvTeacher at (32, 4)
  const pSrvTeacher = makePath([[10, 10], [10, 4], [32, 4]], 36);

  const w1 = sim.connectWire(1, p1, 'multimode_fiber', 'building');
  const w2 = sim.connectWire(2, p2, 'multimode_fiber', 'building');
  const wSrvStudent = sim.connectWire(swRes.deviceId, pSrvStudent, 'multimode_fiber', 'device');
  const wSrvTeacher = sim.connectWire(swRes.deviceId, pSrvTeacher, 'multimode_fiber', 'device');

  assert.ok(w1.success, `w1 failed: ${w1.reason}`);
  assert.ok(w2.success, `w2 failed: ${w2.reason}`);
  assert.ok(wSrvStudent.success, `wSrvStudent failed: ${wSrvStudent.reason}`);
  assert.ok(wSrvTeacher.success, `wSrvTeacher failed: ${wSrvTeacher.reason}`);

  // Paint switch ports with VLAN zones
  sim.setSwitchPortZone(swRes.deviceId, w1.wire.id, 'blue');
  sim.setSwitchPortZone(swRes.deviceId, w2.wire.id, 'blue');
  sim.setSwitchPortZone(swRes.deviceId, wSrvStudent.wire.id, 'blue');
  sim.setSwitchPortZone(swRes.deviceId, wSrvTeacher.wire.id, 'green');

  let drops = [];
  let deliveries = [];
  for (let t = 0; t < 120; t++) {
    const evs = sim.tick();
    drops.push(...evs.filter(e => e.type === 'PacketDropped' && e.buildingId === 2));
    deliveries.push(...evs.filter(e => e.type === 'PacketDelivered' && e.buildingId === 1));
  }

  assert.ok(drops.length > 0, 'Laptop 2 request must be dropped');
  assert.equal(drops[0].reason, 'wrong_zone', 'Drop reason must be wrong_zone');
  assert.ok(deliveries.length > 0, 'Laptop 1 in blue zone reaching blue server must deliver');
});

test('Level 5.2: Zones Need a Door - router with allow rule bridges zones', () => {
  const libSq = 4 * 36 + 32;
  const gbSq = 16 * 36 + 32;

  const sim = new NetCitySimulation({
    seed: 'door1',
    width: 36,
    height: 20,
    server: libSq,
    servers: [
      { id: 'srv_library', square: libSq, zone: 'green', name: 'Library Server' },
      { id: 'srv_gradebook', square: gbSq, zone: 'green', name: 'Gradebook Server' }
    ],
    buildings: [
      { id: 1, type: 'laptop', zone: 'blue', square: 8 * 36 + 2, targetServerId: 'srv_library', required: true, quota: 1 },
      { id: 2, type: 'laptop', zone: 'blue', square: 12 * 36 + 2, targetServerId: 'srv_gradebook', required: true, quota: 1 }
    ],
    devicesAllowed: ['switch', 'router'],
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    startingCoins: 300,
    chapter: 5,
    concept: 'zones_need_a_door'
  });

  const sw = sim.placeDevice('switch', 10 * 36 + 8);
  const rtr = sim.placeDevice('router', 10 * 36 + 16);
  assert.ok(sw.success && rtr.success);

  const p1 = makePath([[2, 8], [8, 8], [8, 10]], 36);
  const p2 = makePath([[2, 12], [8, 12], [8, 10]], 36);
  const pSwRtr = makePath([[8, 10], [16, 10]], 36);
  const pLib = makePath([[16, 10], [16, 4], [32, 4]], 36);
  const pGb = makePath([[16, 10], [16, 16], [32, 16]], 36);

  const w1 = sim.connectWire(1, p1, 'twisted_pair', 'building');
  const w2 = sim.connectWire(2, p2, 'twisted_pair', 'building');
  const wSwRtr = sim.connectWire(sw.deviceId, pSwRtr, 'multimode_fiber', 'device');
  const wLib = sim.connectWire(rtr.deviceId, pLib, 'multimode_fiber', 'device');
  const wGb = sim.connectWire(rtr.deviceId, pGb, 'multimode_fiber', 'device');

  assert.ok(w1.success && w2.success && wSwRtr.success && wLib.success && wGb.success);

  // Add allow rule on router: allow blue zone to srv_library
  sim.addRouterAllowRule(rtr.deviceId, { fromZone: 'blue', toServerId: 'srv_library', action: 'allow' });

  let libDeliveries = [];
  let gbDrops = [];
  for (let t = 0; t < 120; t++) {
    const evs = sim.tick();
    libDeliveries.push(...evs.filter(e => e.type === 'PacketDelivered' && e.buildingId === 1));
    gbDrops.push(...evs.filter(e => e.type === 'PacketDropped' && e.buildingId === 2));
  }

  assert.ok(libDeliveries.length > 0, 'Student laptop must reach library server through router allow rule');
  assert.ok(gbDrops.length > 0, 'Gradebook server must remain unreachable from student zone');
  assert.equal(gbDrops[0].reason, 'wrong_zone');
});

test('Level 5.3: Maps for Routers - static route configuration', () => {
  const srvSq = 10 * 36 + 32;

  const sim = new NetCitySimulation({
    seed: 'static1',
    width: 36,
    height: 20,
    server: srvSq,
    servers: [
      { id: 'srv_net_c', square: srvSq, subnet: '192.168.30.0/24', ip: '192.168.30.50' }
    ],
    buildings: [
      { id: 1, type: 'laptop', square: 10 * 36 + 4, ip: '192.168.10.2', subnet: '192.168.10.0/24', defaultGateway: '192.168.10.1', targetServerId: 'srv_net_c', required: true }
    ],
    devicesAllowed: ['router'],
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    startingCoins: 300,
    chapter: 5,
    concept: 'static_routes'
  });

  const rtrA = sim.placeDevice('router', 10 * 36 + 12);
  const rtrB = sim.placeDevice('router', 10 * 36 + 20);
  assert.ok(rtrA.success && rtrB.success);

  const p1 = makePath([[4, 10], [12, 10]], 36);
  const pAB = makePath([[12, 10], [20, 10]], 36);
  const pBC = makePath([[20, 10], [32, 10]], 36);

  assert.ok(sim.connectWire(1, p1, 'twisted_pair', 'building').success);
  assert.ok(sim.connectWire(rtrA.deviceId, pAB, 'multimode_fiber', 'device').success);
  assert.ok(sim.connectWire(rtrB.deviceId, pBC, 'multimode_fiber', 'device').success);

  // Without static route on router A, packet drops with no_route
  let dropsNoRoute = [];
  for (let t = 0; t < 60; t++) {
    dropsNoRoute.push(...sim.tick().filter(e => e.type === 'PacketDropped' && e.reason === 'no_route'));
  }
  assert.ok(dropsNoRoute.length > 0, 'Without static route, packets must drop with no_route');

  // Configure static route on Router A and Router B
  sim.setRouterStaticRoute(rtrA.deviceId, '192.168.30.0/24', 10 * 36 + 20);
  sim.setRouterStaticRoute(rtrB.deviceId, '192.168.30.0/24', srvSq);

  let deliveries = [];
  for (let t = 0; t < 120; t++) {
    deliveries.push(...sim.tick().filter(e => e.type === 'PacketDelivered' && e.buildingId === 1));
  }
  assert.ok(deliveries.length > 0, 'With static route configured, packet reaches destination network');
});

test('Level 5.4: Dynamic Routing - routers gossip and maintain path', () => {
  const srvSq = 10 * 36 + 26;
  const sim = new NetCitySimulation({
    seed: 'dyn1',
    width: 36,
    height: 20,
    server: srvSq,
    servers: [
      { id: 'srv_hub', square: srvSq, ip: '192.168.100.50' }
    ],
    buildings: [
      { id: 1, type: 'laptop', square: 10 * 36 + 6, ip: '192.168.10.2', subnet: '192.168.10.0/24', defaultGateway: '192.168.10.1', targetServerId: 'srv_hub', required: true }
    ],
    devicesAllowed: ['router'],
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    startingCoins: 300,
    chapter: 5,
    concept: 'dynamic_routing'
  });

  const rtr = sim.placeDevice('router', 10 * 36 + 16);
  assert.ok(rtr.success);

  const p1 = makePath([[6, 10], [16, 10]], 36);
  const pSrv = makePath([[16, 10], [26, 10]], 36);

  assert.ok(sim.connectWire(1, p1, 'twisted_pair', 'building').success);
  assert.ok(sim.connectWire(rtr.deviceId, pSrv, 'multimode_fiber', 'device').success);

  sim.setRouterDynamicRouting(rtr.deviceId, true);
  assert.equal(rtr.device.dynamicRouting, true);

  let deliveries = [];
  for (let t = 0; t < 150; t++) {
    deliveries.push(...sim.tick().filter(e => e.type === 'PacketDelivered' && e.buildingId === 1));
  }

  assert.ok(deliveries.length > 0, 'Packets deliver smoothly with dynamic routing active');
});

// ─────────────────────────────────────────────────────────────────────────────
// Chapter 6: Guard the Gates
// ─────────────────────────────────────────────────────────────────────────────

test('Level 6.1: Firewall - blocks rogue device without blocking good traffic', () => {
  const srvSq = 10 * 36 + 30;

  const sim = new NetCitySimulation({
    seed: 'fw1',
    width: 36,
    height: 20,
    server: srvSq,
    servers: [{ id: 'srv_main', square: srvSq, ip: '192.168.1.50' }],
    buildings: [
      { id: 1, type: 'laptop', ip: '192.168.1.10', square: 6 * 36 + 6, required: true },
      { id: 99, type: 'laptop', ip: '10.99.99.99', isRogue: true, square: 14 * 36 + 6, required: false }
    ],
    devicesAllowed: ['firewall'],
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    startingCoins: 300,
    chapter: 6,
    concept: 'firewall'
  });

  const fw = sim.placeDevice('firewall', 10 * 36 + 18);
  assert.ok(fw.success);

  const p1 = makePath([[6, 6], [18, 6], [18, 10]], 36);
  const p99 = makePath([[6, 14], [18, 14], [18, 10]], 36);
  const pSrv = makePath([[18, 10], [30, 10]], 36);

  assert.ok(sim.connectWire(1, p1, 'multimode_fiber', 'building').success);
  assert.ok(sim.connectWire(99, p99, 'multimode_fiber', 'building').success);
  assert.ok(sim.connectWire(fw.deviceId, pSrv, 'multimode_fiber', 'device').success);

  sim.addFirewallRule(fw.deviceId, { action: 'block', sourceIp: '10.99.99.99' });

  let rogueDrops = [];
  let goodDeliveries = [];
  for (let t = 0; t < 120; t++) {
    const evs = sim.tick();
    rogueDrops.push(...evs.filter(e => e.type === 'PacketDropped' && e.buildingId === 99));
    goodDeliveries.push(...evs.filter(e => e.type === 'PacketDelivered' && e.buildingId === 1));
  }

  assert.ok(rogueDrops.length > 0, 'Rogue device packets must be dropped');
  assert.equal(rogueDrops[0].reason, 'blocked_by_rule', 'Drop reason must be blocked_by_rule');
  assert.ok(goodDeliveries.length > 0, 'Legitimate student traffic must pass through the firewall');
});

test('Level 6.2: Encryption - scrambles packets and protects from Snoop', () => {
  const srvSq = 10 * 36 + 30;
  const snoopSq = 10 * 36 + 18;

  const sim = new NetCitySimulation({
    seed: 'enc1',
    width: 36,
    height: 20,
    server: srvSq,
    servers: [{ id: 'srv_secure', square: srvSq, name: 'Secret Exam Server', ip: '192.168.1.50' }],
    snoopSquares: [snoopSq],
    buildings: [
      { id: 1, type: 'laptop', square: 10 * 36 + 6, required: true }
    ],
    devicesAllowed: ['switch'],
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    startingCoins: 100,
    chapter: 6,
    concept: 'encryption'
  });

  const p = makePath([[6, 10], [30, 10]], 36);
  const wireRes = sim.connectWire(1, p, 'multimode_fiber', 'building');
  assert.ok(wireRes.success);

  let snooped = [];
  for (let t = 0; t < 80; t++) {
    snooped.push(...sim.tick().filter(e => e.type === 'PacketSnooped'));
  }
  assert.ok(snooped.length > 0, 'Unencrypted packet crossing snoop square must trigger PacketSnooped');

  sim.setWireEncrypted(wireRes.wire.id, true);

  let snoopedAfter = [];
  for (let t = 0; t < 120; t++) {
    snoopedAfter.push(...sim.tick().filter(e => e.type === 'PacketSnooped'));
  }
  assert.equal(snoopedAfter.length, 0, 'Encrypted packets cannot be snooped by Snoop');
});

test('Level 6.3: NAT - private IP reaching outside without NAT dropped as private_address_outside', () => {
  const srvSq = 10 * 36 + 30;

  const sim = new NetCitySimulation({
    seed: 'nat1',
    width: 36,
    height: 20,
    server: srvSq,
    servers: [{ id: 'srv_public_cloud', square: srvSq, name: 'Cloud Web Service', isPublic: true, ip: '8.8.8.8' }],
    buildings: [
      { id: 1, type: 'laptop', ip: '192.168.1.10', square: 10 * 36 + 6, required: true }
    ],
    devicesAllowed: ['router'],
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    startingCoins: 200,
    chapter: 6,
    concept: 'nat'
  });

  const rtr = sim.placeDevice('router', 10 * 36 + 18);
  assert.ok(rtr.success);

  const p1 = makePath([[6, 10], [18, 10]], 36);
  const pSrv = makePath([[18, 10], [30, 10]], 36);

  assert.ok(sim.connectWire(1, p1, 'multimode_fiber', 'building').success);
  assert.ok(sim.connectWire(rtr.deviceId, pSrv, 'multimode_fiber', 'device').success);

  let dropsNoNat = [];
  for (let t = 0; t < 60; t++) {
    dropsNoNat.push(...sim.tick().filter(e => e.type === 'PacketDropped' && e.reason === 'private_address_outside'));
  }
  assert.ok(dropsNoNat.length > 0, 'Private address reaching public server without NAT must drop');

  sim.setRouterNat(rtr.deviceId, true);

  let deliveries = [];
  for (let t = 0; t < 120; t++) {
    deliveries.push(...sim.tick().filter(e => e.type === 'PacketDelivered' && e.buildingId === 1));
  }
  assert.ok(deliveries.length > 0, 'With NAT enabled, private device packets reach outside cloud server');
});

test('Level 6.4: VPN - establishes protected tunnel across public network', () => {
  const srvSq = 10 * 36 + 32;
  const snoopSq = 10 * 36 + 18;

  const sim = new NetCitySimulation({
    seed: 'vpn1',
    width: 36,
    height: 20,
    server: srvSq,
    servers: [{ id: 'srv_school_db', square: srvSq, name: 'School DB', ip: '192.168.10.50' }],
    snoopSquares: [snoopSq],
    buildings: [
      { id: 1, type: 'home', ip: '10.0.0.10', square: 10 * 36 + 4, required: true }
    ],
    devicesAllowed: ['vpn_gateway'],
    wiresAllowed: ['twisted_pair', 'single_mode_fiber'],
    startingCoins: 250,
    chapter: 6,
    concept: 'vpn'
  });

  const vpn1 = sim.placeDevice('vpn_gateway', 10 * 36 + 12);
  const vpn2 = sim.placeDevice('vpn_gateway', 10 * 36 + 24);
  assert.ok(vpn1.success && vpn2.success);

  const p1 = makePath([[4, 10], [12, 10]], 36);
  const pTunnel = makePath([[12, 10], [24, 10]], 36);
  const pSrv = makePath([[24, 10], [32, 10]], 36);

  assert.ok(sim.connectWire(1, p1, 'twisted_pair', 'building').success);
  assert.ok(sim.connectWire(vpn1.deviceId, pTunnel, 'single_mode_fiber', 'device').success);
  assert.ok(sim.connectWire(vpn2.deviceId, pSrv, 'twisted_pair', 'device').success);

  let snooped = [];
  let delivered = [];
  for (let t = 0; t < 120; t++) {
    const evs = sim.tick();
    snooped.push(...evs.filter(e => e.type === 'PacketSnooped'));
    delivered.push(...evs.filter(e => e.type === 'PacketDelivered' && e.buildingId === 1));
  }

  assert.equal(snooped.length, 0, 'VPN encapsulated packets cannot be inspected by Snoop');
  assert.ok(delivered.length > 0, 'VPN tunnel successfully transports packet to central database');
});

// ─────────────────────────────────────────────────────────────────────────────
// Chapter 7: Keep It Running
// ─────────────────────────────────────────────────────────────────────────────

test('Level 7.1: Redundancy - redundant cable topology survives CableCut', () => {
  const srvSq = 10 * 40 + 32;

  const sim = new NetCitySimulation({
    seed: 'red1',
    width: 40,
    height: 22,
    server: srvSq,
    servers: [{ id: 'srv_isp', square: srvSq, name: 'ISP Gateway', ip: '203.0.113.1' }],
    buildings: [
      { id: 1, type: 'laptop', square: 10 * 40 + 4, required: true }
    ],
    devicesAllowed: ['switch'],
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    startingCoins: 300,
    chapter: 7,
    concept: 'redundancy',
    events: [
      { tick: 50, type: 'CableCut' }
    ]
  });

  const sw1 = sim.placeDevice('switch', 10 * 40 + 12);
  const sw2 = sim.placeDevice('switch', 16 * 40 + 22);
  assert.ok(sw1.success && sw2.success);

  const p1 = makePath([[4, 10], [12, 10]], 40);
  const pPrimary = makePath([[12, 10], [32, 10]], 40);
  const pBackup1 = makePath([[12, 10], [12, 16], [22, 16]], 40);
  const pBackup2 = makePath([[22, 16], [32, 16], [32, 10]], 40);

  assert.ok(sim.connectWire(1, p1, 'multimode_fiber', 'building').success);
  assert.ok(sim.connectWire(sw1.deviceId, pPrimary, 'multimode_fiber', 'device').success);
  assert.ok(sim.connectWire(sw1.deviceId, pBackup1, 'multimode_fiber', 'device').success);
  assert.ok(sim.connectWire(sw2.deviceId, pBackup2, 'multimode_fiber', 'device').success);

  let cutEvents = [];
  let deliveries = [];
  for (let t = 0; t < 150; t++) {
    const evs = sim.tick();
    cutEvents.push(...evs.filter(e => e.type === 'CableCut'));
    deliveries.push(...evs.filter(e => e.type === 'PacketDelivered' && e.buildingId === 1));
  }

  assert.ok(cutEvents.length > 0, 'CableCut event must occur');
  assert.ok(deliveries.length > 0, 'Packets continue delivering via backup road after cut');
});

test('Level 7.2: Too Many Roads (Loops) - Loop Guard blocks storm and permits failover', () => {
  const sim = new NetCitySimulation({
    seed: 'loop1',
    width: 40,
    height: 22,
    server: 10 * 40 + 32,
    servers: [{ id: 'srv_core', square: 10 * 40 + 32, name: 'Core Server', ip: '192.168.1.100' }],
    buildings: [
      { id: 1, type: 'laptop', square: 10 * 40 + 4, required: true }
    ],
    devicesAllowed: ['switch'],
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    startingCoins: 300,
    chapter: 7,
    concept: 'loop_guard'
  });

  const swA = sim.placeDevice('switch', 10 * 40 + 12);
  const swB = sim.placeDevice('switch', 6 * 40 + 20);
  const swC = sim.placeDevice('switch', 14 * 40 + 20);

  const p1 = makePath([[4, 10], [12, 10]], 40);
  const pAB = makePath([[12, 10], [12, 6], [20, 6]], 40);
  const pBC = makePath([[20, 6], [20, 14]], 40);
  const pCA = makePath([[20, 14], [12, 14], [12, 10]], 40);
  const pSrv = makePath([[20, 14], [32, 14], [32, 10]], 40);

  assert.ok(sim.connectWire(1, p1, 'multimode_fiber', 'building').success);
  assert.ok(sim.connectWire(swA.deviceId, pAB, 'multimode_fiber', 'device').success);
  assert.ok(sim.connectWire(swB.deviceId, pBC, 'multimode_fiber', 'device').success);
  const loopWire = sim.connectWire(swC.deviceId, pCA, 'multimode_fiber', 'device');
  assert.ok(loopWire.success);
  assert.ok(sim.connectWire(swC.deviceId, pSrv, 'multimode_fiber', 'device').success);

  sim.setSwitchLoopGuard(swA.deviceId, true);
  sim.setSwitchLoopGuard(swB.deviceId, true);
  sim.setSwitchLoopGuard(swC.deviceId, true);
  swC.device.blockedPorts.add(loopWire.wire.id);

  let storms = [];
  for (let t = 0; t < 120; t++) {
    storms.push(...sim.tick().filter(e => e.type === 'PacketDropped' && e.reason === 'packet_storm'));
  }

  assert.equal(storms.length, 0, 'Loop Guard must prevent broadcast packet storm');
});

test('Level 7.3: Load Balancer - round robin dispatch and crash failover', () => {
  const srvA = 6 * 40 + 32;
  const srvB = 14 * 40 + 32;

  const sim = new NetCitySimulation({
    seed: 'lb1',
    width: 40,
    height: 22,
    server: srvA,
    servers: [
      { id: 'srv_cluster_1', square: srvA, name: 'Web Server A', ip: '192.168.1.11' },
      { id: 'srv_cluster_2', square: srvB, name: 'Web Server B', ip: '192.168.1.12' }
    ],
    buildings: [
      { id: 1, type: 'laptop', square: 10 * 40 + 6, required: true, targetServerId: 'srv_cluster_1' }
    ],
    devicesAllowed: ['load_balancer'],
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    startingCoins: 300,
    chapter: 7,
    concept: 'load_balancing',
    events: [
      { tick: 80, type: 'ServerCrash', serverId: 'srv_cluster_1' }
    ]
  });

  const lb = sim.placeDevice('load_balancer', 10 * 40 + 18);
  assert.ok(lb.success);

  const p1 = makePath([[6, 10], [18, 10]], 40);
  const pA = makePath([[18, 10], [18, 6], [32, 6]], 40);
  const pB = makePath([[18, 10], [18, 14], [32, 14]], 40);

  assert.ok(sim.connectWire(1, p1, 'multimode_fiber', 'building').success);
  assert.ok(sim.connectWire(lb.deviceId, pA, 'multimode_fiber', 'device').success);
  assert.ok(sim.connectWire(lb.deviceId, pB, 'multimode_fiber', 'device').success);

  let deliveries = [];
  for (let t = 0; t < 160; t++) {
    const evs = sim.tick();
    deliveries.push(...evs.filter(e => e.type === 'PacketDelivered' && e.buildingId === 1));
  }

  assert.ok(sim.crashedServers.has('srv_cluster_1'), 'Server A must be marked crashed');
  assert.ok(deliveries.length > 0, 'Load balancer routes requests to healthy Server B after Server A crash');
});

test('Level 7.4: Test and Trace diagnostics with Backup Power UPS', () => {
  const srvSq = 10 * 40 + 30;
  const clientSq = 10 * 40 + 6;
  const swSq = 10 * 40 + 18;

  const sim = new NetCitySimulation({
    seed: 'diag1',
    width: 40,
    height: 22,
    server: srvSq,
    servers: [{ id: 'srv_main_hub', square: srvSq, name: 'District Portal', ip: '192.168.1.50' }],
    buildings: [
      { id: 1, type: 'laptop', square: clientSq, required: true }
    ],
    devicesAllowed: ['backup_power', 'switch'],
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    startingCoins: 300,
    chapter: 7,
    concept: 'test_and_trace'
  });

  const sw = sim.placeDevice('switch', swSq);
  assert.ok(sw.success);

  const p1 = makePath([[6, 10], [18, 10]], 40);
  const pSrv = makePath([[18, 10], [30, 10]], 40);

  assert.ok(sim.connectWire(1, p1, 'multimode_fiber', 'building').success);
  assert.ok(sim.connectWire(sw.deviceId, pSrv, 'multimode_fiber', 'device').success);

  const pingRes = sim.testMessage(clientSq, srvSq);
  assert.equal(pingRes.success, true, 'Test message ping must succeed');
  assert.ok(pingRes.hops.length >= 3, 'Ping path must include source, switch, and server');

  const traceRes = sim.traceRoute(clientSq, srvSq);
  assert.equal(traceRes.success, true);
  assert.ok(traceRes.detailedHops.length >= 3);
  assert.equal(traceRes.detailedHops[0].type, 'laptop');
});

test('Level 7.5: Detective Cases - all 6 scenarios load distinct faults', () => {
  const lvl = getLevelById('7.5');
  const sim = new NetCitySimulation({
    seed: 'case1',
    width: 40,
    height: 22,
    server: lvl.servers[0].square,
    servers: lvl.servers,
    buildings: lvl.start,
    devicesAllowed: ['switch', 'router'],
    wiresAllowed: ['twisted_pair'],
    startingCoins: 100,
    chapter: 7,
    concept: 'detective_cases'
  });

  assert.equal(lvl.detectiveCases.length, 6, 'Level 7.5 must contain exactly 6 detective cases');

  for (let c = 1; c <= 6; c++) {
    const loaded = sim.loadDetectiveCase(c);
    assert.equal(loaded, true, `Case ${c} must load cleanly`);
    assert.equal(sim.detectiveCaseNum, c);
  }
});

test('Level 7.6: Grand Finale NetCity - Happiness meter and keep_happy win condition', () => {
  const lvl = getLevelById('7.6');
  const targetSrv = lvl.servers[0];
  const srvSq = targetSrv.square; // 4 * 40 + 36 = (36, 4)
  const clientSq = 4 * 40 + 6;   // (6, 4)
  const swSq = 4 * 40 + 20;      // (20, 4)

  const sim = new NetCitySimulation({
    seed: 'city1',
    width: 40,
    height: 22,
    server: srvSq,
    servers: lvl.servers,
    buildings: [
      { id: 1, type: 'laptop', square: clientSq, targetServerId: targetSrv.id, required: true, quota: 1 }
    ],
    devicesAllowed: ['switch'],
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    startingCoins: 300,
    chapter: 7,
    concept: 'netcity_grand_finale',
    goal: 'keep_happy',
    targetTicks: 100,
    minHappiness: 80
  });

  const sw = sim.placeDevice('switch', swSq);
  assert.ok(sw.success);

  const p1 = makePath([[6, 4], [20, 4]], 40);
  const pSrv = makePath([[20, 4], [36, 4]], 40);

  assert.ok(sim.connectWire(1, p1, 'multimode_fiber', 'building').success);
  assert.ok(sim.connectWire(sw.deviceId, pSrv, 'multimode_fiber', 'device').success);

  for (let t = 0; t <= 105; t++) sim.tick();

  assert.ok(sim.happinessMeter >= 80, `Happiness meter should remain high (${sim.happinessMeter})`);
  assert.equal(sim.status, 'won', 'Should win level when maintaining high happiness for target duration');
});

test('Ch5-Ch7 Fixes: Detective Cases 3 & 4 inject proper faults and reset cleanly', () => {
  const lvl = getLevelById('7.5');
  const sim = new NetCitySimulation({
    seed: 'case-fix',
    width: 40,
    height: 22,
    server: lvl.servers[0].square,
    servers: lvl.servers,
    buildings: lvl.start,
    devicesAllowed: ['switch', 'router', 'dns_server'],
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    startingCoins: 300,
    chapter: 7,
    concept: 'detective_cases'
  });

  // Test Case 3: Cut Cable
  const srvSq = lvl.servers[0].square;
  const swRes = sim.placeDevice('switch', 11 * 40 + 20);
  assert.ok(swRes.success);
  const pSrv = makePath([[20, 11], [36, 11]], 40);
  const wSrv = sim.connectWire(swRes.deviceId, pSrv, 'multimode_fiber', 'device');
  assert.ok(wSrv.success);
  assert.ok(sim.wires.has(wSrv.wire.id));

  sim.loadDetectiveCase(3);
  assert.equal(sim.wires.has(wSrv.wire.id), false, 'Case 3 must sever the server uplink wire');

  // Test Case 4: Missing Route
  const rtrRes = sim.placeDevice('router', 11 * 40 + 10);
  assert.ok(rtrRes.success);
  sim.setRouterStaticRoute(rtrRes.deviceId, '192.168.30.0/24', 11 * 40 + 20);
  assert.ok(rtrRes.device.staticRoutes.has('192.168.30.0/24'));

  sim.loadDetectiveCase(4);
  assert.equal(rtrRes.device.staticRoutes.size, 0, 'Case 4 must clear static routes');

  // Test Reset between cases
  sim.loadDetectiveCase(1);
  assert.equal(sim.buildings[0].defaultGateway, '192.168.99.1');
  sim.loadDetectiveCase(2);
  assert.equal(sim.buildings[0].defaultGateway, '192.168.1.1', 'Loading Case 2 must reset Case 1 gateway fault');
});

test('Ch5-Ch7 Fixes: Load Balancer does not overwrite destinationSquare and drops crashed server packets', () => {
  const srvA = 6 * 40 + 32;
  const srvB = 14 * 40 + 32;

  const sim = new NetCitySimulation({
    seed: 'lb-fix',
    width: 40,
    height: 22,
    server: srvA,
    servers: [
      { id: 'srv_cluster_1', square: srvA, name: 'Web Server A', ip: '192.168.1.11' },
      { id: 'srv_cluster_2', square: srvB, name: 'Web Server B', ip: '192.168.1.12' }
    ],
    buildings: [
      { id: 1, type: 'laptop', square: 10 * 40 + 6, required: true, targetServerId: 'srv_cluster_1' }
    ],
    devicesAllowed: ['load_balancer', 'switch'],
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    startingCoins: 300,
    chapter: 7,
    concept: 'load_balancing'
  });

  const lb = sim.placeDevice('load_balancer', 10 * 40 + 18);
  assert.ok(lb.success);

  const p1 = makePath([[6, 10], [18, 10]], 40);
  const pA = makePath([[18, 10], [18, 6], [32, 6]], 40);
  const pB = makePath([[18, 10], [18, 14], [32, 14]], 40);

  assert.ok(sim.connectWire(1, p1, 'multimode_fiber', 'building').success);
  assert.ok(sim.connectWire(lb.deviceId, pA, 'multimode_fiber', 'device').success);
  assert.ok(sim.connectWire(lb.deviceId, pB, 'multimode_fiber', 'device').success);

  const origDestSquare = sim.buildings[0].destinationSquare;
  for (let t = 0; t < 100; t++) sim.tick();

  assert.equal(sim.buildings[0].destinationSquare, origDestSquare, 'Load Balancer must NOT overwrite building.destinationSquare');
});

test('Ch5-Ch7 Fixes: Rogue device delivering packet triggers SecurityBreach and LevelOver', () => {
  const srvSq = 10 * 36 + 30;
  const sim = new NetCitySimulation({
    seed: 'rogue-breach',
    width: 36,
    height: 20,
    server: srvSq,
    servers: [{ id: 'srv_main', square: srvSq, ip: '192.168.1.50' }],
    buildings: [
      { id: 99, type: 'laptop', ip: '10.99.99.99', isRogue: true, square: 10 * 36 + 6, required: false }
    ],
    devicesAllowed: ['switch'],
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    startingCoins: 300,
    chapter: 6,
    concept: 'firewall'
  });

  const p = makePath([[6, 10], [30, 10]], 36);
  assert.ok(sim.connectWire(99, p, 'multimode_fiber', 'building').success);

  let breached = false;
  for (let t = 0; t < 60; t++) {
    const evs = sim.tick();
    if (evs.some(e => e.type === 'SecurityBreach')) breached = true;
  }

  assert.ok(breached, 'Rogue device delivering packet must trigger SecurityBreach');
  assert.equal(sim.status, 'level_over', 'Rogue breach must immediately end level with level_over');
});

