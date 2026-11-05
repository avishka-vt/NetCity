import { WIRE_CATALOG, REFUSAL_MESSAGES } from '../../content/src/wires.js';
import { DEVICE_CATALOG } from '../../content/src/devices.js';
import { createStreamRng } from './prng.js';
import { bfsPath, bfsDistance } from './pathfinding.js';

export class NetCitySimulation {
  constructor(mapData) {
    this.mapData = mapData;
    this.width = mapData.width || 24;
    this.height = mapData.height || 14;

    // Multi-server support (e.g. Web Server, Database Server)
    if (Array.isArray(mapData.servers) && mapData.servers.length > 0) {
      this.servers = mapData.servers.map((s, idx) => ({
        id: s.id || `server_${idx + 1}`,
        type: s.type || 'server',
        name: s.name || (s.type === 'web' ? 'Web Server' : s.type === 'db' ? 'Database Server' : 'Server'),
        square: s.square !== undefined ? s.square : mapData.server,
        color: s.color || (s.type === 'web' ? '#2ec4b6' : s.type === 'db' ? '#10b981' : '#3a86ff'),
        icon: s.icon || (s.type === 'web' ? '🌐' : s.type === 'db' ? '🗄️' : (s.type === 'email' ? '✉️' : '🖥️')),
        mac: s.mac || (s.type === 'web' ? '00:WB' : s.type === 'db' ? '00:DB' : (s.type === 'email' ? '00:EM' : `00:S${idx + 1}`)),
        portsOpen: s.portsOpen || (s.type === 'web' ? [80] : (s.type === 'email' ? [25] : (s.type === 'multi' ? [80, 25, 21] : [80]))),
        hostname: s.hostname || null,
        ip: s.ip || `192.168.2.${50 + idx}`,
        subnet: s.subnet || '192.168.2.0/24',
        zone: s.zone || null,
        isPublic: Boolean(s.isPublic)
      }));
      this.server = this.servers[0].square;
    } else {
      const defaultServerSq = Math.floor(this.height / 2) * this.width + Math.floor(this.width / 2);
      const serverSq = mapData.server !== undefined ? mapData.server : defaultServerSq;
      this.servers = [{
        id: 'server_1',
        type: 'server',
        name: 'Server',
        square: serverSq,
        color: '#2ec4b6',
        icon: '🖥️',
        mac: '00:FE',
        portsOpen: [80],
        hostname: null,
        ip: '192.168.2.50',
        subnet: '192.168.2.0/24',
        zone: null,
        isPublic: false
      }];
      this.server = serverSq;
    }
    this.serverSquares = new Set(this.servers.map(s => s.square));

    this.walls = new Set(Array.isArray(mapData.walls) ? mapData.walls : []);
    this.noisySquares = new Set(mapData.noisySquares || []);
    this.snoopSquares = new Set(mapData.snoopSquares || []);
    this.crashedServers = new Set();
    this.poweredDownSquares = new Set();
    this.detectiveCaseNum = mapData.detectiveCaseNum || 1;
    this.happinessMeter = 100;
    this.recentDrops = [];

    this.river = mapData.river || null;
    this.riverSquares = new Set();
    if (this.river) {
      const [rMin, rMax] = this.river;
      for (let y = 0; y < this.height; y++) {
        for (let x = rMin; x <= rMax; x++) {
          this.riverSquares.add(y * this.width + x);
        }
      }
    }

    this.tickNumber = 0;
    this.coins = mapData.startingCoins !== undefined ? mapData.startingCoins : (mapData.coins || 60);
    this.spent = 0;
    this.status = 'playing'; // 'playing' | 'won' | 'level_over'
    this.paused = false;
    this.rewindsUsed = 0;
    this.safetyNetUsed = false;

    // Deterministic PRNG streams — tracked call count for checkpoint/rewind (Bug O fix)
    this._netRngBase = createStreamRng(mapData.seed, 'net');
    this._netRngCallCount = 0;
    this._netRng = () => {
      this._netRngCallCount++;
      return this._netRngBase();
    };

    // Endless Mode Setup (Section 6.1 & 9.7)
    this.isEndless = Boolean(mapData.isEndless);
    this.spawnRng = createStreamRng(mapData.seed || 'endless-seed', 'spawn');
    this.eventRng = createStreamRng(mapData.seed || 'endless-seed', 'events');
    this.servedBuildingIds = new Set();
    this.nextEndlessSpawnTick = 400;
    this.nextEndlessEventTick = 1200;

    this.buildings = [];
    this.devices = new Map();           // deviceId -> Device
    this.wires = new Map();             // wireId -> WireLink
    this.occupiedSquares = new Map();   // square -> wireId (No-Crossing rule)
    this.inFlightPackets = [];
    this.checkpoints = [];
    this.commandLog = [];
    this.events = [];

    this.nextDeviceId = 1;
    this.nextWireId = 1;
    this.nextPacketId = 1;

    this.initBuildings();
    this.saveCheckpoint();
  }

  findEndlessSquare(range = [3, 14]) {
    const w = this.width;
    const h = this.height;
    const sx = this.server % w;
    const sy = Math.floor(this.server / w);
    const minD = range[0] || 3;
    const maxD = range[1] || 14;

    const used = new Set([
      this.server,
      ...this.walls,
      ...Array.from(this.devices.values()).map(d => d.square),
      ...this.buildings.map(b => b.square)
    ]);
    if (this.wires) {
      for (const wire of this.wires.values()) {
        for (const sq of wire.path) used.add(sq);
      }
    }

    for (let r = 0; r < 300; r++) {
      const x = Math.floor(this.spawnRng() * w);
      const y = Math.floor(this.spawnRng() * h);
      const sq = y * w + x;
      if (used.has(sq)) continue;

      let minDist = Math.abs(x - sx) + Math.abs(y - sy);
      for (const d of this.devices.values()) {
        const dx = d.square % w;
        const dy = Math.floor(d.square / w);
        const dist = Math.abs(x - dx) + Math.abs(y - dy);
        if (dist < minDist) minDist = dist;
      }

      let spacingOk = true;
      for (const b of this.buildings) {
        const bx = b.square % w;
        const by = Math.floor(b.square / w);
        if (Math.abs(x - bx) < 2 && Math.abs(y - by) < 2) {
          spacingOk = false;
          break;
        }
      }

      if (spacingOk && minDist >= minD && minDist <= maxD) {
        return sq;
      }
    }

    // Fallback safe square search
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const sq = y * w + x;
        if (!used.has(sq)) return sq;
      }
    }
    return null;
  }

  initBuildings() {
    if (this.isEndless && (!this.mapData.buildings || this.mapData.buildings.length === 0)) {
      // 3 initial buildings for Endless mode (Section 6.1)
      const startTypes = ['laptop', 'laptop', 'classroom'];
      this.buildings = [];

      for (let i = 0; i < startTypes.length; i++) {
        const bType = startTypes[i];
        const sq = this.findEndlessSquare([3, 8]);
        if (sq !== null) {
          const quota = bType === 'classroom' ? 3 : 2;
          const firstTimer = this.mapData.firstTimerTicks || 800;
          const cycleTimer = this.mapData.cycleTimerTicks || 240;
          const deadline = this.mapData.deadlineTicks || 40;
          const reqInterval = bType === 'classroom' ? 40 : 60;
          const srv = (this.servers && this.servers.length > 0) ? this.servers[0] : null;
          const destSquare = srv ? srv.square : this.server;
          const targetMac = srv ? srv.mac : '00:FE';
          const targetType = srv ? srv.type : 'server';
          const targetName = srv ? srv.name : 'Server';
          const targetColor = srv ? srv.color : '#2ec4b6';
          const targetServerId = srv ? srv.id : 'server_1';

          this.buildings.push({
            id: i + 1,
            name: `${bType.charAt(0).toUpperCase() + bType.slice(1)} #${i + 1}`,
            type: bType,
            square: sq,
            state: 'open',
            opensAtTick: 0,
            required: true,
            quota,
            fulfilledInCycle: 0,
            firstTimerTicks: firstTimer,
            cycleTimerTicks: cycleTimer,
            timerTicksLeft: firstTimer,
            timerPhase: 'first',
            deadlineTicks: deadline,
            requestIntervalTicks: reqInterval,
            nextRequestTick: Math.floor(this._netRng() * 20),
            happiness: 100,
            mac: `00:${(i + 11).toString(16).toUpperCase()}`,
            ip: `192.168.1.${10 + i + 1}`,
            subnet: '192.168.1.0/24',
            defaultGateway: '192.168.1.1',
            destinationSquare: destSquare,
            targetServerId,
            targetType,
            targetMac,
            targetName,
            targetColor,
            deliveredTotal: 0,
            hasMetFirstQuota: false,
            wireId: null,
            warning: false
          });
        }
      }
      return;
    }

    const rawBuildings = [...(this.mapData.buildings || [])];
    if (Array.isArray(this.mapData.spawns)) {
      for (const s of this.mapData.spawns) {
        if (!rawBuildings.some(rb => rb.opensAtTick === s.tick && rb.type === s.type)) {
          rawBuildings.push({
            id: rawBuildings.length + 1,
            name: s.name || `Building ${rawBuildings.length + 1}`,
            type: s.type,
            range: s.range,
            zone: s.zone,
            isRogue: s.isRogue,
            required: s.required !== false,
            targetServerId: s.targetServerId,
            opensAtTick: s.tick,
            quota: s.type === 'classroom' ? 3 : 2,
            firstTimerTicks: this.mapData.firstTimerTicks || 800,
            cycleTimerTicks: this.mapData.cycleTimerTicks || 240,
            deadlineTicks: this.mapData.deadlineTicks || 40,
            requestIntervalTicks: s.type === 'classroom' ? 40 : 60
          });
        }
      }
    }
    let requiredCount = 0;
    const hasConcentrators = (this.mapData.devicesAllowed || []).some(d => ['cabinet', 'hub', 'switch', 'access_point'].includes(d));
    const maxDeviceCapacity = hasConcentrators ? 999 : 4; // 4-neighbor rule for single 1x1 target device (Section 7.8)

    for (const b of rawBuildings) {
      const opensAt = b.opensAtTick || 0;
      const isConstruction = opensAt > 0;
      const quota = b.quota || 2;
      const firstTimer = b.firstTimerTicks || 800;
      const cycleTimer = b.cycleTimerTicks || 240;
      const deadline = b.deadlineTicks || 40;
      const interval = b.requestIntervalTicks || (b.type === 'classroom' ? 40 : 60);

      // Consume one netRng call (tracked for checkpoint/rewind determinism)
      const jitter = Math.floor(this._netRng() * 15);

      // Enforce 4-neighbor capacity: demote overflow buildings to optional
      const isReq = b.required !== false && requiredCount < maxDeviceCapacity;
      if (isReq) requiredCount++;

      // Resolve target server
      let destSquare = this.server;
      let targetMac = '00:FE';
      let targetType = 'server';
      let targetName = 'Server';
      let targetColor = '#2ec4b6';
      if (b.targetServerId) {
        const targetSrv = this.getServerById(b.targetServerId);
        if (targetSrv) {
          destSquare = targetSrv.square;
          targetMac = targetSrv.mac;
          targetType = targetSrv.type;
          targetName = targetSrv.name;
          targetColor = targetSrv.color;
        }
      } else if (this.servers.length > 0) {
        destSquare = this.servers[0].square;
        targetMac = this.servers[0].mac;
        targetType = this.servers[0].type;
        targetName = this.servers[0].name;
        targetColor = this.servers[0].color;
      }

      let square = b.square;
      if (square === undefined) {
        const rMin = (b.range && b.range[0]) || 3;
        const rMax = (b.range && b.range[1]) || 8;
        const row = Math.min(this.height - 2, Math.max(1, (b.id * 2) % (this.height - 2) + 1));
        const col = Math.min(this.width - 2, Math.max(1, rMin + ((b.id * 3) % (rMax - rMin + 1))));
        square = row * this.width + col;
      }

      const clientMac = b.mac || `00:${(b.id + 10).toString(16).toUpperCase()}`;
      const side = b.side || (square % this.width < (this.river ? this.river[0] : 16) ? 'left' : 'right');
      const ch = this.mapData.chapter || 1;
      const defaultSubnet = side === 'left' ? '192.168.1.0/24' : '192.168.2.0/24';
      const defaultIp = ch >= 3 ? (side === 'left' ? `192.168.1.${10 + b.id}` : `192.168.2.${10 + b.id}`) : null;
      const ip = b.ip !== undefined ? b.ip : defaultIp;
      const subnet = b.subnet || defaultSubnet;
      const defaultGateway = b.defaultGateway !== undefined ? b.defaultGateway : (ch >= 3 ? (side === 'left' ? '192.168.1.1' : '192.168.2.1') : null);

      this.buildings.push({
        id: b.id,
        name: b.name || `Computer ${b.id}`,
        type: b.type || 'classroom',
        square: square,
        mac: clientMac,
        ip,
        subnet,
        defaultGateway,
        side,
        zone: b.zone || null,
        isRogue: Boolean(b.isRogue),
        targetServerId: b.targetServerId || null,
        targetHostname: b.targetHostname || null,
        targetPort: b.targetPort || null,
        targetType,
        targetMac,
        targetName,
        targetColor,
        state: isConstruction ? 'construction' : 'open',
        opensAtTick: opensAt,
        timerTicksLeft: firstTimer,
        timerPhase: 'first',
        fulfilledInCycle: 0,
        quota,
        firstTimerTicks: firstTimer,
        cycleTimerTicks: cycleTimer,
        deadlineTicks: deadline,
        requestIntervalTicks: interval,
        nextRequestTick: opensAt + 10 + jitter,
        required: isReq,
        destinationSquare: destSquare,
        deliveredTotal: 0,
        hasMetFirstQuota: false,
        wireId: null,
        warning: false
      });
    }
  }

  setBuildingIp(id, ip, gateway = undefined, zone = undefined) {
    const b = this.getBuilding(id);
    if (!b) return false;
    b.ip = ip;
    if (gateway !== undefined) b.defaultGateway = gateway;
    if (zone !== undefined) {
      b.zone = zone || null;
      b.colorGroup = zone || null;
    }
    b.warning = false;
    return true;
  }

  setBuildingZone(id, zone) {
    const b = this.getBuilding(id);
    if (!b) return false;
    b.zone = zone || null;
    b.colorGroup = zone || null;
    this.events.push({ type: 'BuildingZoneSet', tick: this.tickNumber, buildingId: id, zone: b.zone });
    return true;
  }

  getBuilding(id) {
    return this.buildings.find(b => b.id === id) || null;
  }

  getBuildingAt(square) {
    return this.buildings.find(b => b.square === square) || null;
  }

  getDevice(id) {
    return this.devices.get(id) || null;
  }

  getDeviceAt(square) {
    for (const d of this.devices.values()) {
      if (d.square === square) return d;
    }
    return null;
  }

  isServer(square) {
    return this.serverSquares.has(square);
  }

  getServerAt(square) {
    return this.servers.find(s => s.square === square) || null;
  }

  getServerById(id) {
    return this.servers.find(s => s.id === id || s.type === id) || null;
  }

  getWirelessCoverage(buildingId) {
    const b = this.getBuilding(buildingId);
    if (!b || (b.type !== 'phone' && b.type !== 'tablet')) return null;

    for (const dev of this.devices.values()) {
      if (dev.type === 'access_point' && dev.uplinkWireId && this.wires.has(dev.uplinkWireId)) {
        const bx = b.square % this.width, by = Math.floor(b.square / this.width);
        const ax = dev.square % this.width, ay = Math.floor(dev.square / this.width);
        const dist = Math.hypot(bx - ax, by - ay);

        // Straight-line wall attenuation (Section 4.2: -3 per wall crossed)
        let wallsCrossed = 0;
        const steps = Math.max(1, Math.ceil(dist * 2));
        const checkedSquares = new Set();
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          const cx = Math.floor(ax + (bx - ax) * t);
          const cy = Math.floor(ay + (by - ay) * t);
          const sq = cy * this.width + cx;
          if (!checkedSquares.has(sq)) {
            checkedSquares.add(sq);
            if (this.walls.has(sq)) wallsCrossed++;
          }
        }

        const strength = 6 - dist - (3 * wallsCrossed);
        if (strength >= 0) {
          return { connected: true, strength, apId: dev.id, dist, wallsCrossed };
        }
      }
    }
    return { connected: false, strength: 0 };
  }

  placeDevice(type, square) {
    const spec = DEVICE_CATALOG[type];
    if (!spec) return { success: false, message: 'Invalid device type.' };
    const allowed = this.mapData.devicesAllowed || ['server'];
    if (!allowed.includes(type)) {
      return { success: false, message: `Device ${type} is not unlocked in this level.` };
    }
    if (this.coins < spec.cost) {
      return { success: false, message: 'Not enough coins to place device.' };
    }
    if (
      this.walls.has(square) ||
      this.riverSquares.has(square) ||
      square === this.server ||
      this.getBuildingAt(square) ||
      this.getDeviceAt(square) ||
      this.occupiedSquares.has(square)
    ) {
      return { success: false, message: 'Square is not free for device placement.' };
    }

    const deviceId = this.nextDeviceId++;
    const device = {
      id: deviceId,
      type,
      square,
      cost: spec.cost,
      ports: spec.ports,
      uplinkWireId: null,
      wireIds: new Set(),
      outgoingWireIds: new Set(),
      macTable: new Map(),
      portZones: type === 'switch' ? new Map() : null,
      loopGuardActive: type === 'switch' ? (this.mapData.concept === 'loop_guard' ? false : true) : false,
      blockedPorts: new Set(),
      staticRoutes: type === 'router' ? new Map() : null,
      dynamicRouting: false,
      dynamicRoutes: new Map(),
      allowRules: type === 'router' ? [] : null,
      natEnabled: false,
      natTable: new Map(),
      publicIp: '203.0.113.10',
      rules: type === 'firewall' ? [] : null,
      tunnelActive: type === 'vpn_gateway' ? true : false,
      peerGatewaySquare: null,
      encapsulatedCount: 0,
      backendServerSquares: [],
      nextBackendIndex: 0,
      batteryTicks: type === 'backup_power' ? 3600 : 0,
      active: true,
      interfaces: type === 'router' ? [
        { id: 1, ip: '192.168.1.1', subnet: '192.168.1.0/24' },
        { id: 2, ip: '192.168.2.1', subnet: '192.168.2.0/24' },
        { id: 3, ip: '192.168.3.1', subnet: '192.168.3.0/24' },
        { id: 4, ip: '192.168.4.1', subnet: '192.168.4.0/24' }
      ] : null,
      dhcpPool: type === 'dhcp_server' ? {
        range: ['192.168.1.50', '192.168.1.51', '192.168.1.52', '192.168.1.53', '192.168.1.54', '192.168.1.55', '192.168.1.56', '192.168.1.57'],
        allocated: new Map(),
        gateway: '192.168.1.1',
        mask: '255.255.255.0'
      } : null,
      dnsRecords: type === 'dns_server' ? new Map([
        ['school.net', '192.168.2.50'],
        ['web.town', '192.168.1.100'],
        ['mail.school', '192.168.2.25']
      ]) : null,
      portsOpen: type === 'web_server' ? [80] : (type === 'email_server' ? [25] : [80, 25, 21])
    };

    this.coins -= spec.cost;
    this.spent += spec.cost;
    this.devices.set(deviceId, device);

    this.commandLog.push({
      tick: this.tickNumber,
      command: 'placeDevice',
      payload: { type, square }
    });

    this.saveCheckpoint();

    return { success: true, device, deviceId: device.id };
  }

  removeDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) return { success: false, message: 'Device not found.' };

    this.coins += device.cost;
    this.spent -= device.cost;

    if (device.uplinkWireId) {
      this.removeWireById(device.uplinkWireId);
    }
    if (device.outgoingWireIds) {
      for (const wId of Array.from(device.outgoingWireIds)) {
        this.removeWireById(wId);
      }
    }
    for (const wId of Array.from(device.wireIds)) {
      this.removeWireById(wId);
    }

    this.devices.delete(deviceId);
    this.commandLog.push({
      tick: this.tickNumber,
      command: 'removeDevice',
      payload: { deviceId }
    });

    this.saveCheckpoint();

    return { success: true, refund: device.cost };
  }

  // --- No-Crossing Rule & Wire Validation ---

  validateWire(sourceId, path, wireType, sourceType = 'building') {
    const spec = WIRE_CATALOG[wireType];
    const allowed = this.mapData.wiresAllowed || Object.keys(WIRE_CATALOG);
    if (!spec || !allowed.includes(wireType)) {
      return { valid: false, reason: 'wireTypeNotUnlocked', message: REFUSAL_MESSAGES.wireTypeNotUnlocked };
    }

    let sourceSquare = null;
    let existingWireId = null;

    if (sourceType === 'device') {
      const dev = this.getDevice(sourceId);
      if (!dev) return { valid: false, reason: 'deviceNotFound', message: 'Device not found.' };
      sourceSquare = dev.square;
      existingWireId = dev.uplinkWireId;
    } else {
      const building = this.getBuilding(sourceId);
      if (!building) return { valid: false, reason: 'buildingNotFound', message: 'Building not found.' };
      if (building.state === 'construction') {
        return { valid: false, reason: 'buildingUnderConstruction', message: REFUSAL_MESSAGES.buildingUnderConstruction };
      }
      if (building.type === 'phone' || building.type === 'tablet') {
        return { valid: false, reason: 'wirelessOnly', message: 'Phones and tablets connect wirelessly via Access Points.' };
      }
      sourceSquare = building.square;
      existingWireId = building.wireId;
    }

    if (!Array.isArray(path) || path.length < 2) {
      return { valid: false, reason: 'invalidPath', message: 'Path must contain at least 2 squares.' };
    }
    if (path[0] !== sourceSquare) {
      return { valid: false, reason: 'mustStartAtSource', message: 'Wire must start at the source.' };
    }

    const destSquare = path[path.length - 1];
    const isDestServer = this.isServer(destSquare);
    const destDevice = this.getDeviceAt(destSquare);
    const destBuilding = this.getBuildingAt(destSquare);

    if (destBuilding && destBuilding.state === 'construction') {
      return { valid: false, reason: 'buildingUnderConstruction', message: REFUSAL_MESSAGES.buildingUnderConstruction };
    }

    if (!isDestServer && !destDevice) {
      return { valid: false, reason: 'releasedAwayFromDestination', message: REFUSAL_MESSAGES.releasedAwayFromDestination };
    }
    if (destSquare === sourceSquare) {
      return { valid: false, reason: 'invalidPath', message: 'Cannot connect to self.' };
    }

    // 4-Port Capacity Check on Source Device (Section 4.3 & 4-Port Rule)
    if (sourceType === 'device') {
      const srcDev = this.getDevice(sourceId);
      if (srcDev) {
        const srcPorts = srcDev.ports || 4;
        const incoming = srcDev.wireIds ? srcDev.wireIds.size : 0;
        const outgoing = (srcDev.outgoingWireIds ? srcDev.outgoingWireIds.size : (srcDev.uplinkWireId ? 1 : 0));
        const isReplacing = Boolean(existingWireId) || (srcDev.outgoingWireIds && Array.from(srcDev.outgoingWireIds).some(wId => {
          const w = this.wires.get(wId);
          return w && w.path[w.path.length - 1] === destSquare;
        }));
        const used = incoming + outgoing - (isReplacing ? 1 : 0);
        if (used >= srcPorts) {
          return {
            valid: false,
            reason: 'allPortsOccupied',
            message: `${srcDev.name || 'Device'} only has ${srcPorts} ports. All ports are occupied.`
          };
        }
      }
    }

    // 4-Port Capacity Check on Destination Device or Server (Section 4.3 & 4-Port Rule)
    if (destDevice) {
      const destPorts = destDevice.ports || 4;
      const incoming = destDevice.wireIds ? destDevice.wireIds.size : 0;
      const outgoing = (destDevice.outgoingWireIds ? destDevice.outgoingWireIds.size : (destDevice.uplinkWireId ? 1 : 0));
      const isReplacing = Boolean(existingWireId && destDevice.wireIds && destDevice.wireIds.has(existingWireId));
      const used = incoming + outgoing - (isReplacing ? 1 : 0);
      if (used >= destPorts) {
        return {
          valid: false,
          reason: 'allPortsOccupied',
          message: `${destDevice.name || 'Device'} only has ${destPorts} ports. All ports are occupied.`
        };
      }
    } else if (isDestServer) {
      const destServer = this.getServerAt(destSquare);
      const srvPorts = (destServer && destServer.ports) || 4;
      const serverWires = Array.from(this.wires.values()).filter(w => w.path[w.path.length - 1] === destSquare && w.id !== existingWireId);
      if (serverWires.length >= srvPorts) {
        return {
          valid: false,
          reason: 'allPortsOccupied',
          message: `${destServer?.name || 'Server'} only has ${srvPorts} ports. All ports are occupied. Place a Switch or Hub to expand capacity!`
        };
      }
    }

    const seen = new Set();
    for (let i = 0; i < path.length; i++) {
      const sq = path[i];

      // Self-intersection check
      if (seen.has(sq)) {
        return { valid: false, reason: 'selfIntersection', message: REFUSAL_MESSAGES.selfIntersection };
      }
      seen.add(sq);

      // Cardinal adjacency check
      if (i > 0) {
        const prev = path[i - 1];
        const px = prev % this.width;
        const py = Math.floor(prev / this.width);
        const cx = sq % this.width;
        const cy = Math.floor(sq / this.width);
        const dx = Math.abs(cx - px);
        const dy = Math.abs(cy - py);
        if (!((dx === 1 && dy === 0) || (dx === 0 && dy === 1))) {
          return { valid: false, reason: 'notAdjacent', message: 'Steps must move up, down, left or right.' };
        }
      }

      // Obstacle collision check (walls, other buildings, devices, construction sites)
      if (sq !== sourceSquare && sq !== destSquare) {
        if (this.walls.has(sq)) {
          return { valid: false, reason: 'wallOrBuilding', message: REFUSAL_MESSAGES.wallOrBuilding };
        }
        if (this.buildings.some(b => b.square === sq)) {
          return { valid: false, reason: 'wallOrBuilding', message: REFUSAL_MESSAGES.wallOrBuilding };
        }
        if (this.getDeviceAt(sq)) {
          return { valid: false, reason: 'wallOrBuilding', message: 'Cannot pass through a device.' };
        }

        // NO-CROSSING RULE (Section 4.1):
        // Two wires may never occupy or cross the same square unless a device sits there.
        const occ = this.occupiedSquares.get(sq);
        if (occ !== undefined && occ !== existingWireId) {
          return { valid: false, reason: 'wireCrossing', message: REFUSAL_MESSAGES.wireCrossing };
        }
      }
    }

    const length = path.length - 1;
    const cost = length * spec.costPerSquare;

    const existingWire = existingWireId ? this.wires.get(existingWireId) : null;
    const availableCoins = this.coins + (existingWire ? existingWire.cost : 0);
    if (cost > availableCoins) {
      return { valid: false, reason: 'notEnoughCoins', message: REFUSAL_MESSAGES.notEnoughCoins };
    }

    const isFaded = length > spec.maxRunSquares;

    return {
      valid: true,
      cost,
      length,
      speed: spec.speed,
      capacity: spec.capacity,
      shielded: spec.shielded,
      isFaded,
      destDeviceId: destDevice ? destDevice.id : null
    };
  }

  connectWire(sourceId, path, wireType, sourceType = 'building') {
    const val = this.validateWire(sourceId, path, wireType, sourceType);
    if (!val.valid) {
      return { success: false, reason: val.reason, message: val.message };
    }

    if (sourceType === 'device') {
      const dev = this.getDevice(sourceId);
      if (dev) {
        if (dev.type === 'access_point' || dev.type === 'cabinet') {
          if (dev.uplinkWireId) this.removeWireById(dev.uplinkWireId);
        } else if (['switch', 'hub', 'router', 'dhcp_server', 'dns_server', 'web_server', 'email_server', 'firewall', 'vpn_gateway', 'load_balancer', 'backup_power'].includes(dev.type)) {
          // If replacing a wire to the same destination square, refund old wire
          if (dev.outgoingWireIds) {
            for (const wId of dev.outgoingWireIds) {
              const oldW = this.wires.get(wId);
              if (oldW && oldW.path[oldW.path.length - 1] === path[path.length - 1]) {
                this.removeWireById(wId);
              }
            }
          }
        }
      }
    } else {
      const building = this.getBuilding(sourceId);
      if (building && building.wireId) this.removeWire(sourceId);
    }

    const wireId = this.nextWireId++;
    const link = {
      id: wireId,
      buildingId: sourceType === 'building' ? sourceId : null,
      deviceId: sourceType === 'device' ? sourceId : null,
      targetDeviceId: val.destDeviceId,
      wireType,
      path: [...path],
      length: val.length,
      cost: val.cost,
      speed: val.speed,
      capacity: val.capacity,
      shielded: val.shielded,
      isFaded: val.isFaded,
      encrypted: false
    };

    this.coins -= link.cost;
    this.spent += link.cost;
    this.wires.set(wireId, link);

    // Register wire squares into occupied grid map
    for (let i = 1; i < path.length - 1; i++) {
      this.occupiedSquares.set(path[i], wireId);
    }

    if (sourceType === 'device') {
      const dev = this.getDevice(sourceId);
      if (dev) {
        dev.uplinkWireId = wireId;
        if (dev.outgoingWireIds) dev.outgoingWireIds.add(wireId);
      }
    } else {
      const building = this.getBuilding(sourceId);
      if (building) {
        building.wireId = wireId;
        building.warning = false;
      }
    }

    if (val.destDeviceId) {
      const destDev = this.getDevice(val.destDeviceId);
      if (destDev) destDev.wireIds.add(wireId);
    }

    this.commandLog.push({
      tick: this.tickNumber,
      command: 'connectWire',
      payload: { sourceId, sourceType, wireType, path: [...path] }
    });

    this.saveCheckpoint();

    return { success: true, wire: link };
  }

  removeWireById(wireId) {
    const wire = this.wires.get(wireId);
    if (!wire) return { success: false, message: 'Wire not found.' };

    this.coins += wire.cost;
    this.spent -= wire.cost;

    for (let i = 1; i < wire.path.length - 1; i++) {
      if (this.occupiedSquares.get(wire.path[i]) === wire.id) {
        this.occupiedSquares.delete(wire.path[i]);
      }
    }

    this.inFlightPackets = this.inFlightPackets.filter(p => p.wireId !== wire.id);

    if (wire.buildingId) {
      const b = this.getBuilding(wire.buildingId);
      if (b) b.wireId = null;
    }
    for (const d of this.devices.values()) {
      if (d.wireIds) d.wireIds.delete(wire.id);
      if (d.outgoingWireIds) d.outgoingWireIds.delete(wire.id);
      if (d.uplinkWireId === wire.id) d.uplinkWireId = null;
    }

    this.wires.delete(wire.id);
    this.saveCheckpoint();
    return { success: true, refund: wire.cost };
  }

  removeWire(buildingId) {
    const building = this.getBuilding(buildingId);
    if (!building || !building.wireId) {
      return { success: false, message: 'No wire to remove.' };
    }
    return this.removeWireById(building.wireId);
  }

  upgradeWire(wireId) {
    const wire = this.wires.get(wireId);
    if (!wire) return { success: false, message: 'Wire not found.' };
    if (wire.upgraded) return { success: false, message: 'Wire is already upgraded.' };
    if (this.coins < wire.cost) return { success: false, message: 'Not enough coins for upgrade.' };
    this.coins -= wire.cost;
    this.spent += wire.cost;
    wire.upgraded = true;
    wire.speed = Math.min(8, wire.speed * 2);
    wire.capacity *= 2;
    this.events.push({ type: 'WireUpgraded', tick: this.tickNumber, wireId });
    return { success: true, wire };
  }

  setWireEncrypted(wireId, encrypted = true) {
    const wire = this.wires.get(wireId);
    if (!wire) return false;
    wire.encrypted = Boolean(encrypted);
    this.events.push({ type: 'WireEncrypted', tick: this.tickNumber, wireId, encrypted: wire.encrypted });
    return true;
  }

  setSwitchPortZone(deviceId, portWireId, zoneColor) {
    const dev = this.getDevice(deviceId);
    if (!dev || dev.type !== 'switch') return false;
    if (!dev.portZones) dev.portZones = new Map();
    if (zoneColor) dev.portZones.set(portWireId, zoneColor);
    else dev.portZones.delete(portWireId);

    // If the wire connects directly to a building, also update the building's zone
    const wire = this.wires.get(portWireId);
    if (wire && wire.buildingId) {
      const b = this.getBuilding(wire.buildingId);
      if (b) {
        b.zone = zoneColor || null;
        b.colorGroup = zoneColor || null;
      }
    }

    this.events.push({ type: 'PortZoneSet', tick: this.tickNumber, deviceId, portWireId, zone: zoneColor });
    return true;
  }

  setRouterStaticRoute(deviceId, destinationSubnet, nextHopSquare) {
    const dev = this.getDevice(deviceId);
    if (!dev || dev.type !== 'router') return false;
    if (!dev.staticRoutes) dev.staticRoutes = new Map();
    dev.staticRoutes.set(destinationSubnet, nextHopSquare);
    this.events.push({ type: 'StaticRouteSet', tick: this.tickNumber, deviceId, destinationSubnet, nextHopSquare });
    return true;
  }

  setRouterDynamicRouting(deviceId, enabled = true) {
    const dev = this.getDevice(deviceId);
    if (!dev || dev.type !== 'router') return false;
    dev.dynamicRouting = Boolean(enabled);
    this.events.push({ type: 'DynamicRoutingToggled', tick: this.tickNumber, deviceId, enabled: dev.dynamicRouting });
    return true;
  }

  setRouterNat(deviceId, enabled = true) {
    const dev = this.getDevice(deviceId);
    if (!dev || dev.type !== 'router') return false;
    dev.natEnabled = Boolean(enabled);
    this.events.push({ type: 'NatToggled', tick: this.tickNumber, deviceId, enabled: dev.natEnabled });
    return true;
  }

  addRouterAllowRule(deviceId, rule) {
    const dev = this.getDevice(deviceId);
    if (!dev || dev.type !== 'router') return false;
    if (!dev.allowRules) dev.allowRules = [];
    dev.allowRules.push(rule);
    this.events.push({ type: 'RouterAllowRuleAdded', tick: this.tickNumber, deviceId, rule });
    return true;
  }

  addFirewallRule(deviceId, rule) {
    const dev = this.getDevice(deviceId);
    if (!dev || dev.type !== 'firewall') return false;
    if (!dev.rules) dev.rules = [];
    const ruleId = dev.rules.length + 1;
    const ruleObj = { id: ruleId, ...rule };
    dev.rules.push(ruleObj);
    this.events.push({ type: 'FirewallRuleAdded', tick: this.tickNumber, deviceId, rule: ruleObj });
    return ruleId;
  }

  removeFirewallRule(deviceId, ruleId) {
    const dev = this.getDevice(deviceId);
    if (!dev || dev.type !== 'firewall' || !dev.rules) return false;
    dev.rules = dev.rules.filter(r => r.id !== ruleId);
    this.events.push({ type: 'FirewallRuleRemoved', tick: this.tickNumber, deviceId, ruleId });
    return true;
  }

  setSwitchLoopGuard(deviceId, enabled = true) {
    const dev = this.getDevice(deviceId);
    if (!dev || dev.type !== 'switch') return false;
    dev.loopGuardActive = Boolean(enabled);
    if (!dev.loopGuardActive) {
      dev.blockedPorts.clear();
    }
    this.events.push({ type: 'LoopGuardToggled', tick: this.tickNumber, deviceId, enabled: dev.loopGuardActive });
    return true;
  }

  testMessage(fromSquare, toSquare) {
    const b = this.getBuildingAt(fromSquare);
    if (!b) return { success: false, hops: [], failureReason: 'no_device_at_source' };
    const wire = b.wireId ? this.wires.get(b.wireId) : null;
    if (!wire) return { success: false, hops: [fromSquare], failureReason: 'no_wire' };

    // Check wrong gateway
    if (b.defaultGateway && b.subnet) {
      const netPrefix = b.subnet.split('/')[0].split('.').slice(0, 3).join('.');
      const gwPrefix = b.defaultGateway.split('.').slice(0, 3).join('.');
      if (netPrefix !== gwPrefix) {
        return { success: false, hops: [fromSquare], failureReason: 'wrong_gateway' };
      }
    }

    const route = this._findPathToDestination(wire, toSquare, b);
    if (!route) return { success: false, hops: [fromSquare], failureReason: 'no_route' };
    if (route.blockedReason) return { success: false, hops: route.path, failureReason: route.blockedReason };

    return { success: true, hops: route.path, failureReason: null };
  }

  traceRoute(fromSquare, toSquare) {
    const result = this.testMessage(fromSquare, toSquare);
    const detailedHops = [];
    for (const sq of (result.hops || [])) {
      const b = this.getBuildingAt(sq);
      const dev = this.getDeviceAt(sq);
      const srv = this.getServerAt(sq);
      detailedHops.push({
        square: sq,
        type: b ? b.type : (dev ? dev.type : (srv ? 'server' : 'wire')),
        name: b ? b.name : (dev ? dev.type : (srv ? srv.name : 'Square'))
      });
    }
    return { ...result, detailedHops };
  }

  resetDetectiveFaults() {
    if (this.buildings[0]) {
      this.buildings[0].ip = '192.168.1.10';
      this.buildings[0].defaultGateway = '192.168.1.1';
      this.buildings[0].targetHostname = null;
    }
    if (this.buildings[1]) {
      this.buildings[1].ip = '192.168.1.11';
      this.buildings[1].defaultGateway = '192.168.1.1';
      this.buildings[1].targetHostname = null;
    }
    for (const dev of this.devices.values()) {
      if (dev.type === 'switch') dev.loopGuardActive = true;
    }
  }

  loadDetectiveCase(caseNum) {
    this.detectiveCaseNum = caseNum;
    this.resetDetectiveFaults();
    if (caseNum === 1) {
      // Wrong gateway
      const b = this.buildings[0];
      if (b) { b.ip = '192.168.1.10'; b.defaultGateway = '192.168.99.1'; }
    } else if (caseNum === 2) {
      // Duplicate IP
      const b1 = this.buildings[0];
      const b2 = this.buildings[1];
      if (b1) { b1.ip = '192.168.1.10'; }
      if (b2) { b2.ip = '192.168.1.10'; }
    } else if (caseNum === 3) {
      // Cut Cable: sever uplink cable to server
      const srvWire = Array.from(this.wires.values()).find(w => w.path[w.path.length - 1] === this.server || this.isServer(w.path[w.path.length - 1]));
      if (srvWire) {
        this.removeWireById(srvWire.id);
      }
    } else if (caseNum === 4) {
      // Missing Route: clear static routes on routers
      for (const dev of this.devices.values()) {
        if (dev.type === 'router' && dev.staticRoutes) {
          dev.staticRoutes.clear();
        }
      }
    } else if (caseNum === 5) {
      // DNS Problem
      const b = this.buildings[0];
      if (b) { b.targetHostname = 'school.net'; }
      for (const dev of this.devices.values()) {
        if (dev.type === 'dns_server' && dev.dnsRecords) {
          dev.dnsRecords.delete('school.net');
        }
      }
    } else if (caseNum === 6) {
      // Loop
      for (const dev of this.devices.values()) {
        if (dev.type === 'switch') dev.loopGuardActive = false;
      }
    }
    this.events.push({ type: 'DetectiveCaseLoaded', tick: this.tickNumber, caseNum });
    return true;
  }

  // --- Checkpoints and Rewind ---

  saveCheckpoint() {
    this.checkpoints.push({
      tick: this.tickNumber,
      coins: this.coins,
      spent: this.spent,
      netRngCallCount: this._netRngCallCount,
      buildings: JSON.parse(JSON.stringify(this.buildings)),
      devices: Array.from(this.devices.values()).map(d => ({
        ...d,
        wireIds: Array.from(d.wireIds || []),
        outgoingWireIds: Array.from(d.outgoingWireIds || []),
        blockedPorts: Array.from(d.blockedPorts || []),
        macTable: d.macTable ? Array.from(d.macTable.entries()) : [],
        portZones: d.portZones ? Array.from(d.portZones.entries()) : [],
        staticRoutes: d.staticRoutes ? Array.from(d.staticRoutes.entries()) : [],
        dynamicRoutes: d.dynamicRoutes ? Array.from(d.dynamicRoutes.entries()) : [],
        natTable: d.natTable ? Array.from(d.natTable.entries()) : [],
        rules: d.rules ? JSON.parse(JSON.stringify(d.rules)) : [],
        allowRules: d.allowRules ? JSON.parse(JSON.stringify(d.allowRules)) : []
      })),
      wires: Array.from(this.wires.values()).map(w => ({ ...w, path: [...w.path] })),
      commandLogLength: this.commandLog.length
    });

    if (this.checkpoints.length > 250) {
      this.checkpoints = [this.checkpoints[0], ...this.checkpoints.slice(-200)];
    }
  }

  rewind(seconds = 10) {
    const rewindTicks = Math.round((seconds || 10) * 20); // 20 ticks = 1 second
    const targetTick = Math.max(0, this.tickNumber - rewindTicks);
    let chosen = null;

    for (let i = this.checkpoints.length - 1; i >= 0; i--) {
      if (this.checkpoints[i].tick <= targetTick) {
        chosen = this.checkpoints[i];
        break;
      }
    }
    if (!chosen && this.checkpoints.length > 0) {
      chosen = this.checkpoints[0];
    }
    if (!chosen) return false;

    this.tickNumber = chosen.tick;
    this.status = 'playing';
    this.rewindsUsed++;

    // Restore deterministic PRNG to checkpoint state (Bug O fix):
    this._netRngBase = createStreamRng(this.mapData.seed, 'net');
    for (let i = 0; i < chosen.netRngCallCount; i++) this._netRngBase();
    this._netRngCallCount = chosen.netRngCallCount;

    // Preserve devices and wires so that player's placed infrastructure is NOT wiped clean
    if (this.devices.size === 0 && chosen.devices && chosen.devices.length > 0) {
      for (const d of chosen.devices) {
        this.devices.set(d.id, {
          ...d,
          wireIds: new Set(d.wireIds || []),
          outgoingWireIds: new Set(d.outgoingWireIds || []),
          blockedPorts: new Set(d.blockedPorts || []),
          macTable: new Map(d.macTable || []),
          portZones: d.portZones ? new Map(d.portZones) : null,
          staticRoutes: d.staticRoutes ? new Map(d.staticRoutes) : null,
          dynamicRoutes: d.dynamicRoutes ? new Map(d.dynamicRoutes) : null,
          natTable: d.natTable ? new Map(d.natTable) : null
        });
      }
    }

    if (this.wires.size === 0 && chosen.wires && chosen.wires.length > 0) {
      for (const w of chosen.wires) {
        this.wires.set(w.id, { ...w });
      }
    }

    // Ensure occupiedSquares correctly mirrors current wires
    this.occupiedSquares.clear();
    for (const w of this.wires.values()) {
      for (let i = 1; i < w.path.length - 1; i++) {
        this.occupiedSquares.set(w.path[i], w.id);
      }
    }

    // Restore buildings from checkpoint snapshot
    this.buildings = JSON.parse(JSON.stringify(chosen.buildings));

    // If level failed because a building gave up, reopen it and grant at least rewindTicks on timer
    for (const b of this.buildings) {
      if (b.state === 'gave_up') {
        b.state = 'open';
        b.timerTicksLeft = Math.max(rewindTicks, b.firstTimerTicks || 200);
        b.timerPhase = b.hasMetFirstQuota ? 'cycle' : 'first';
      }
      // Reconnect wireId to matching wire if one exists
      const wire = Array.from(this.wires.values()).find(w =>
        w.buildingId === b.id || w.path[0] === b.square || w.path[w.path.length - 1] === b.square
      );
      if (wire) b.wireId = wire.id;
    }

    // Ensure device wire attachments are linked
    for (const dev of this.devices.values()) {
      if (!dev.wireIds) dev.wireIds = new Set();
      if (!dev.outgoingWireIds) dev.outgoingWireIds = new Set();
      for (const w of this.wires.values()) {
        if (w.deviceId === dev.id || w.targetDeviceId === dev.id || w.path[0] === dev.square || w.path[w.path.length - 1] === dev.square) {
          dev.wireIds.add(w.id);
          if (w.path[0] === dev.square) dev.outgoingWireIds.add(w.id);
        }
      }
    }

    this.inFlightPackets = [];
    this.commandLog = this.commandLog.slice(0, chosen.commandLogLength);
    return true;
  }

  grantSafetyNet(neededCost) {
    if (this.safetyNetUsed) return false;
    this.coins += neededCost;
    this.safetyNetUsed = true;
    return true;
  }

  _findPathToDestination(startWire, destinationSquare, b = null) {
    if (!startWire) return null;

    const queue = [{
      wire: startWire,
      fullPath: [...startWire.path],
      minSpeed: startWire.speed,
      anyFaded: startWire.isFaded,
      allShielded: startWire.shielded,
      hubEncountered: null,
      switchesCrossed: [],
      routersCrossed: [],
      firewallsCrossed: [],
      vpnGatewaysCrossed: [],
      loadBalancersCrossed: [],
      isEncrypted: Boolean(startWire.encrypted),
      visitedWireIds: new Set([startWire.id]),
      blockedReason: null
    }];

    while (queue.length > 0) {
      const curr = queue.shift();
      const lastSq = curr.fullPath[curr.fullPath.length - 1];

      if (lastSq === destinationSquare) {
        // Record MAC learning in crossed switches
        if (b) {
          const destServer = this.getServerAt(destinationSquare);
          for (const sw of curr.switchesCrossed) {
            sw.macTable.set(b.mac, { mac: b.mac, deviceName: b.name || `PC-${b.id}`, port: curr.wire.id, tick: this.tickNumber });
            if (destServer) {
              sw.macTable.set(destServer.mac, { mac: destServer.mac, deviceName: destServer.name, port: curr.wire.id, tick: this.tickNumber });
            }
          }
        }
        return {
          path: curr.fullPath,
          speed: curr.minSpeed,
          isFaded: curr.anyFaded,
          isShielded: curr.allShielded,
          viaHubId: curr.hubEncountered,
          switchesCrossed: curr.switchesCrossed,
          routersCrossed: curr.routersCrossed,
          firewallsCrossed: curr.firewallsCrossed,
          vpnGatewaysCrossed: curr.vpnGatewaysCrossed,
          loadBalancersCrossed: curr.loadBalancersCrossed,
          isEncrypted: curr.isEncrypted,
          isVpnEncapsulated: curr.vpnGatewaysCrossed.length >= 2,
          blockedReason: curr.blockedReason
        };
      }

      let dev = this.getDeviceAt(lastSq);
      if (!dev && curr.wire.targetDeviceId) {
        dev = this.getDevice(curr.wire.targetDeviceId);
      }

      if (dev) {
        // Power cut check
        if (this.poweredDownSquares.has(dev.square)) {
          const hasBackup = Array.from(this.devices.values()).some(d => d.type === 'backup_power' && (
            d.square === dev.square || Math.abs(d.square % this.width - dev.square % this.width) + Math.abs(Math.floor(d.square / this.width) - Math.floor(dev.square / this.width)) <= 3
          ));
          if (!hasBackup) {
            return { path: curr.fullPath, blockedReason: 'power_off' };
          }
        }

        const nextHub = dev.type === 'hub' ? dev.id : curr.hubEncountered;
        const nextSwitches = dev.type === 'switch' ? [...curr.switchesCrossed, dev] : curr.switchesCrossed;
        const nextRouters = dev.type === 'router' ? [...curr.routersCrossed, dev] : curr.routersCrossed;
        const nextFirewalls = dev.type === 'firewall' ? [...curr.firewallsCrossed, dev] : curr.firewallsCrossed;
        const nextVpn = dev.type === 'vpn_gateway' ? [...curr.vpnGatewaysCrossed, dev] : curr.vpnGatewaysCrossed;
        const nextLb = dev.type === 'load_balancer' ? [...curr.loadBalancersCrossed, dev] : curr.loadBalancersCrossed;

        // Switch Loop Guard check
        if (dev.type === 'switch' && dev.loopGuardActive && dev.blockedPorts.has(curr.wire.id)) {
          continue;
        }

        const candidateWireIds = new Set();
        if (dev.uplinkWireId) candidateWireIds.add(dev.uplinkWireId);
        if (dev.outgoingWireIds) {
          for (const id of dev.outgoingWireIds) candidateWireIds.add(id);
        }
        if (dev.wireIds) {
          for (const id of dev.wireIds) candidateWireIds.add(id);
        }

        for (const nextId of candidateWireIds) {
          if (curr.visitedWireIds.has(nextId)) {
            if (dev.type === 'switch' && !dev.loopGuardActive && curr.switchesCrossed.length >= 1) {
              return { path: curr.fullPath, blockedReason: 'packet_storm', switchesCrossed: nextSwitches };
            }
            continue;
          }
          const nextWire = this.wires.get(nextId);
          if (!nextWire) continue;

          // Switch port blocking check (Spanning Tree)
          if (dev.type === 'switch' && dev.loopGuardActive && dev.blockedPorts.has(nextId)) {
            continue;
          }

          // Switch port zone check (VLANs)
          if (dev.type === 'switch' && dev.portZones && dev.portZones.size > 0 && b && b.zone) {
            const inZone = dev.portZones.get(curr.wire.id);
            const outZone = dev.portZones.get(nextId);
            if (inZone && inZone !== b.zone) {
              return { path: curr.fullPath, blockedReason: 'wrong_zone', switchesCrossed: nextSwitches };
            }
            if (outZone && outZone !== b.zone) {
              const lastSquare = nextWire.path[0] === dev.square ? nextWire.path[nextWire.path.length - 1] : nextWire.path[0];
              if (lastSquare === destinationSquare) {
                let seg = nextWire.path[0] === dev.square ? nextWire.path.slice(1) : [...nextWire.path].reverse().slice(1);
                return { path: [...curr.fullPath, ...seg], blockedReason: 'wrong_zone', switchesCrossed: nextSwitches };
              }
              const destDev = nextWire.targetDeviceId ? this.getDevice(nextWire.targetDeviceId) : this.getDeviceAt(lastSquare);
              if (!destDev || destDev.type !== 'router') {
                continue;
              }
            }
          }

          const visitedWireIds = new Set(curr.visitedWireIds);
          visitedWireIds.add(nextId);

          let nextSegment = nextWire.path;
          if (nextWire.path[0] === dev.square) {
            nextSegment = nextWire.path.slice(1);
          } else if (nextWire.path[nextWire.path.length - 1] === dev.square) {
            nextSegment = [...nextWire.path].reverse().slice(1);
          }

          queue.push({
            wire: nextWire,
            fullPath: [...curr.fullPath, ...nextSegment],
            minSpeed: Math.min(curr.minSpeed, nextWire.speed),
            anyFaded: curr.anyFaded || nextWire.isFaded,
            allShielded: curr.allShielded && nextWire.shielded,
            hubEncountered: nextHub,
            switchesCrossed: nextSwitches,
            routersCrossed: nextRouters,
            firewallsCrossed: nextFirewalls,
            vpnGatewaysCrossed: nextVpn,
            loadBalancersCrossed: nextLb,
            isEncrypted: curr.isEncrypted || Boolean(nextWire.encrypted),
            visitedWireIds,
            blockedReason: curr.blockedReason
          });
        }
      }
    }
    return null;
  }

  _findPathToDeviceType(startWire, deviceType) {
    if (!startWire) return null;
    const queue = [startWire];
    const visited = new Set([startWire.id]);

    while (queue.length > 0) {
      const wire = queue.shift();
      const endSquares = [wire.path[0], wire.path[wire.path.length - 1]];
      for (const sq of endSquares) {
        const dev = this.getDeviceAt(sq);
        if (dev && dev.type === deviceType) return dev;
        if (dev) {
          const cands = [...(dev.wireIds || []), ...(dev.outgoingWireIds || []), dev.uplinkWireId].filter(Boolean);
          for (const wid of cands) {
            if (!visited.has(wid)) {
              visited.add(wid);
              const w = this.wires.get(wid);
              if (w) queue.push(w);
            }
          }
        }
      }
    }
    return null;
  }

  // --- Simulation Tick ---

  tick() {
    this.events = [];
    if (this.status !== 'playing' || this.paused) return this.events;

    this.tickNumber++;

    // 0. Scheduled Events (e.g. CableCut, ServerCrash, PowerCut, TrafficFlood, LinkCut, WrongZoneTest)
    if (Array.isArray(this.mapData.events)) {
      for (const ev of this.mapData.events) {
        if (ev.tick === this.tickNumber) {
          if (ev.type === 'CableCut') {
            let targetWire = null;
            if (ev.wireId && this.wires.has(ev.wireId)) {
              targetWire = this.wires.get(ev.wireId);
            } else if (ev.targetSquare !== undefined) {
              targetWire = Array.from(this.wires.values()).find(w => w.path.includes(ev.targetSquare));
            } else if (ev.targetDescription === 'Primary Uplink') {
              targetWire = Array.from(this.wires.values()).find(w => w.deviceId && (w.path[w.path.length - 1] === this.server || this.isServer(w.path[w.path.length - 1])));
            } else if (ev.targetDescription === 'Secondary Link' || ev.targetDescription === 'Primary Inter-Switch Trunk') {
              targetWire = Array.from(this.wires.values()).find(w => w.deviceId && !(w.path[w.path.length - 1] === this.server || this.isServer(w.path[w.path.length - 1])))
                || Array.from(this.wires.values()).find(w => w.deviceId);
            } else {
              // Prefer cutting primary trunk/server link (Redundancy test in 7.1)
              targetWire = Array.from(this.wires.values()).find(w => w.deviceId && (w.path[w.path.length - 1] === this.server || this.isServer(w.path[w.path.length - 1])))
                || Array.from(this.wires.values()).find(w => w.deviceId)
                || this.wires.values().next().value;
            }
            if (targetWire) {
              const cutWireId = targetWire.id;
              this.removeWireById(cutWireId);
              this.events.push({
                type: 'CableCut',
                tick: this.tickNumber,
                wireId: cutWireId,
                buildingId: targetWire.buildingId || null
              });
            }
          } else if (ev.type === 'ServerCrash') {
            this.crashedServers.add(ev.serverId || 'srv_cluster_1');
            this.events.push({ type: 'ServerCrash', tick: this.tickNumber, serverId: ev.serverId });
          } else if (ev.type === 'PowerCut') {
            let pSquare = ev.deviceSquare;
            if (!this.getDeviceAt(pSquare) && ev.targetDeviceType) {
              const d = Array.from(this.devices.values()).find(dev => dev.type === ev.targetDeviceType);
              if (d) pSquare = d.square;
            }
            this.poweredDownSquares.add(pSquare);
            this.events.push({ type: 'PowerCut', tick: this.tickNumber, square: pSquare });
          } else if (ev.type === 'TrafficFlood') {
            const rogueB = this.getBuilding(ev.sourceBuildingId || 99);
            if (rogueB) {
              rogueB.requestIntervalTicks = 6;
              rogueB.nextRequestTick = this.tickNumber + 1;
            }
            this.events.push({ type: 'TrafficFlood', tick: this.tickNumber, sourceBuildingId: ev.sourceBuildingId });
          } else if (ev.type === 'WrongZoneTest') {
            const targetB = this.getBuilding(ev.targetBuildingId || 1);
            if (targetB) {
              targetB.zone = ev.expectedZone || (targetB.zone === 'blue' ? 'green' : 'blue');
            }
            this.events.push({ type: 'WrongZoneTest', tick: this.tickNumber, targetBuildingId: ev.targetBuildingId });
          } else if (ev.type === 'LinkCut') {
            let targetWire = null;
            if (ev.routerPair && Array.isArray(ev.routerPair)) {
              const r1 = this.getDevice(ev.routerPair[0]) || Array.from(this.devices.values()).filter(d => d.type === 'router')[ev.routerPair[0] - 1];
              const r2 = this.getDevice(ev.routerPair[1]) || Array.from(this.devices.values()).filter(d => d.type === 'router')[ev.routerPair[1] - 1];
              if (r1 && r2) {
                targetWire = Array.from(this.wires.values()).find(w =>
                  (w.path[0] === r1.square && w.path[w.path.length - 1] === r2.square) ||
                  (w.path[0] === r2.square && w.path[w.path.length - 1] === r1.square)
                );
              }
            }
            if (!targetWire && this.wires.size > 0) {
              targetWire = Array.from(this.wires.values()).find(w => w.deviceId && w.targetDeviceId) ||
                           Array.from(this.wires.values()).find(w => w.deviceId);
            }
            if (targetWire) {
              this.removeWireById(targetWire.id);
              this.events.push({ type: 'LinkCut', tick: this.tickNumber, wireId: targetWire.id });
            }
          }
        }
      }
    }

    // Dynamic routing periodic exchange (every 100 ticks)
    if (this.tickNumber % 100 === 0) {
      const dynamicRouters = Array.from(this.devices.values()).filter(d => d.type === 'router' && d.dynamicRouting);
      for (const r of dynamicRouters) {
        if (!r.dynamicRoutes) r.dynamicRoutes = new Map();
        for (const iface of (r.interfaces || [])) {
          r.dynamicRoutes.set(iface.subnet, { nextHop: r.square, hops: 1 });
        }
      }
      for (const r of dynamicRouters) {
        const neighborRouters = [];
        const connectedWires = [...(r.wireIds || []), ...(r.outgoingWireIds || []), r.uplinkWireId].filter(id => this.wires.has(id));
        for (const wid of connectedWires) {
          const wire = this.wires.get(wid);
          const otherSq = wire.path[0] === r.square ? wire.path[wire.path.length - 1] : wire.path[0];
          const neighbor = this.getDeviceAt(otherSq);
          if (neighbor && neighbor.type === 'router' && neighbor.dynamicRouting) {
            neighborRouters.push({ router: neighbor, viaSquare: otherSq });
          }
        }
        for (const { router: nr, viaSquare } of neighborRouters) {
          if (!nr.dynamicRoutes) nr.dynamicRoutes = new Map();
          for (const [subnet, routeInfo] of r.dynamicRoutes.entries()) {
            const currentRoute = nr.dynamicRoutes.get(subnet);
            const newHops = routeInfo.hops + 1;
            if (!currentRoute || newHops < currentRoute.hops) {
              nr.dynamicRoutes.set(subnet, { nextHop: viaSquare, hops: newHops });
            }
          }
        }
      }
    }

    // Loop Guard auto-unblock check if redundant link severed
    for (const dev of this.devices.values()) {
      if (dev.type === 'switch' && dev.loopGuardActive) {
        for (const wId of Array.from(dev.blockedPorts)) {
          if (!this.wires.has(wId)) {
            dev.blockedPorts.delete(wId);
          }
        }
      }
    }

    // 1. Checkpoint capture every 20 ticks (1 second)
    if (this.tickNumber % 20 === 0) {
      this.saveCheckpoint();
    }

    // 1.5. Endless Mode Procedural Spawning & Events (Section 6.1 & 9.7)
    if (this.isEndless && this.status === 'playing') {
      if (!this.nextEndlessSpawnTick) this.nextEndlessSpawnTick = 400;
      if (this.tickNumber >= this.nextEndlessSpawnTick) {
        const decayFactor = Math.pow(0.92, this.tickNumber / 1200);
        const baseInterval = this.mapData.baseInterval || 600;
        const minInterval = this.mapData.minInterval || 200;
        const nextInterval = Math.max(minInterval, Math.floor(baseInterval * decayFactor));

        const pool = this.mapData.buildingPool || ['laptop', 'classroom'];
        const bType = pool[Math.floor(this.spawnRng() * pool.length)];
        const sq = this.findEndlessSquare();

        if (sq !== null) {
          const newId = this.buildings.length + 1;
          const quota = bType === 'classroom' ? 3 : (bType === 'lab' ? 5 : (bType === 'library' ? 4 : 2));
          const firstTimer = this.mapData.firstTimerTicks || 600;
          const cycleTimer = this.mapData.cycleTimerTicks || 240;
          const deadline = this.mapData.deadlineTicks || 40;
          const reqInterval = bType === 'classroom' ? 40 : (bType === 'lab' ? 20 : (bType === 'library' ? 30 : 60));
          const srv = (this.servers && this.servers.length > 0) ? this.servers[0] : null;
          const destSquare = srv ? srv.square : this.server;
          const targetMac = srv ? srv.mac : '00:FE';
          const targetType = srv ? srv.type : 'server';
          const targetName = srv ? srv.name : 'Server';
          const targetColor = srv ? srv.color : '#2ec4b6';
          const targetServerId = srv ? srv.id : 'server_1';

          const newBuilding = {
            id: newId,
            name: `${bType.charAt(0).toUpperCase() + bType.slice(1)} #${newId}`,
            type: bType,
            square: sq,
            state: 'construction',
            opensAtTick: this.tickNumber + 200,
            required: true,
            quota,
            fulfilledInCycle: 0,
            firstTimerTicks: firstTimer,
            cycleTimerTicks: cycleTimer,
            timerTicksLeft: firstTimer,
            timerPhase: 'first',
            deadlineTicks: deadline,
            requestIntervalTicks: reqInterval,
            nextRequestTick: this.tickNumber + 200 + Math.floor(this._netRng() * 20),
            happiness: 100,
            mac: `00:${(newId + 10).toString(16).toUpperCase()}`,
            ip: `192.168.1.${10 + newId}`,
            subnet: '192.168.1.0/24',
            defaultGateway: '192.168.1.1',
            destinationSquare: destSquare,
            targetServerId,
            targetType,
            targetMac,
            targetName,
            targetColor,
            deliveredTotal: 0,
            hasMetFirstQuota: false,
            wireId: null,
            warning: false
          };

          this.buildings.push(newBuilding);
          this.events.push({
            type: 'BuildingConstruction',
            tick: this.tickNumber,
            buildingId: newId,
            square: sq,
            opensAtTick: this.tickNumber + 200
          });

          this.nextEndlessSpawnTick = this.tickNumber + nextInterval;
        } else {
          this.nextEndlessSpawnTick = this.tickNumber + 50;
        }
      }

      // Procedural events in Endless
      if (!this.nextEndlessEventTick) this.nextEndlessEventTick = 1200;
      if (this.tickNumber >= this.nextEndlessEventTick) {
        this.triggerEndlessRandomEvent();
        const evInterval = Math.max(400, Math.floor(1800 * Math.pow(0.90, this.tickNumber / 2400)));
        this.nextEndlessEventTick = this.tickNumber + evInterval;
      }
    }

    // 2. Building Lifecycle (Construction -> Open)
    for (const b of this.buildings) {
      if (b.state === 'construction' && this.tickNumber >= b.opensAtTick) {
        b.state = 'open';
        b.timerTicksLeft = b.firstTimerTicks;
        b.timerPhase = 'first';
        b.fulfilledInCycle = 0;
        this.events.push({ type: 'BuildingOpened', tick: this.tickNumber, buildingId: b.id });
        this.saveCheckpoint();
      }
    }

    // 3. Request Generation
    for (const b of this.buildings) {
      if (b.state !== 'open') continue;

      if (this.tickNumber >= b.nextRequestTick) {
        let activePath = null;
        let activeSpeed = 1;
        let activeWireId = null;
        let isFaded = false;
        let isShielded = false;
        let viaHubId = null;
        let routeFound = null;

        // Check 1: Wireless for phone or tablet
        if (b.type === 'phone' || b.type === 'tablet') {
          const cov = this.getWirelessCoverage(b.id);
          if (cov && cov.connected) {
            const dev = this.getDevice(cov.apId);
            if (dev && dev.uplinkWireId && this.wires.has(dev.uplinkWireId)) {
              const uplinkWire = this.wires.get(dev.uplinkWireId);
              const route = this._findPathToDestination(uplinkWire, b.destinationSquare, b);
              if (route) {
                activePath = [b.square, dev.square, ...route.path.slice(1)];
                activeSpeed = route.speed;
                activeWireId = dev.uplinkWireId;
                isFaded = route.isFaded;
                isShielded = route.isShielded;
                viaHubId = route.viaHubId;
                routeFound = route;
              }
            }
          }
        }

        // Check 2: Physical wire link (supports multi-hop chained switches/hubs/cabinets/routers and multi-servers)
        if (!activePath && b.wireId && this.wires.has(b.wireId)) {
          const startWire = this.wires.get(b.wireId);
          const route = this._findPathToDestination(startWire, b.destinationSquare, b);
          if (route) {
            activePath = route.path;
            activeSpeed = route.speed;
            activeWireId = b.wireId;
            isFaded = route.isFaded;
            isShielded = route.isShielded;
            viaHubId = route.viaHubId;
            routeFound = route;
          }
        }

        if (activePath && activeWireId) {
          let blockedReason = null;

          // River / Two Islands cross-network check (Level 3.1 & 3.2)
          if (this.riverSquares.size > 0 && b.side === 'left' && (this.mapData.concept === 'two_islands' || this.mapData.concept === 'the_router')) {
            if (!routeFound || !routeFound.routersCrossed || routeFound.routersCrossed.length === 0) {
              blockedReason = 'no_route';
            }
          }

          // DHCP lease acquisition / No-Address check (Level 3.3, 4.1+)
          if (!blockedReason && this.mapData.chapter >= 3 && b.ip === null) {
            const startWire = (b.wireId && this.wires.get(b.wireId)) || null;
            const dhcp = this._findPathToDeviceType(startWire, 'dhcp_server');
            if (dhcp && dhcp.dhcpPool && dhcp.dhcpPool.allocated.size < dhcp.dhcpPool.range.length) {
              const nextIp = dhcp.dhcpPool.range[dhcp.dhcpPool.allocated.size];
              b.ip = nextIp;
              b.defaultGateway = dhcp.dhcpPool.gateway;
              dhcp.dhcpPool.allocated.set(b.mac, nextIp);
              this.events.push({ type: 'DhcpLeaseAssigned', tick: this.tickNumber, buildingId: b.id, ip: b.ip, gateway: b.defaultGateway });
            } else if (this.mapData.concept === 'ip_addresses' || this.mapData.chapter >= 4) {
              blockedReason = 'no_address';
            }
          }

          // Default Gateway check (Level 3.5)
          if (!blockedReason && this.mapData.concept === 'default_gateway' && !b.defaultGateway) {
            blockedReason = 'no_gateway';
          }

          // Duplicate IP collision check (Level 3.6)
          if (!blockedReason && this.mapData.concept === 'duplicate_ip') {
            const clash = this.buildings.find(other => other.id !== b.id && other.state === 'open' && other.ip === b.ip);
            if (clash && this._netRng() < 0.5) {
              blockedReason = 'duplicate_ip';
            }
          }

          // DNS resolution check (Level 4.2 & 4.6)
          if (!blockedReason && b.targetHostname) {
            const startWire = (b.wireId && this.wires.get(b.wireId)) || null;
            const dns = this._findPathToDeviceType(startWire, 'dns_server');
            if (!dns || !dns.dnsRecords || !dns.dnsRecords.has(b.targetHostname)) {
              if (this.mapData.concept === 'dns_server' || this.mapData.concept === 'chapter_4_finale') {
                blockedReason = 'dns_failed';
              }
            }
          }

          // Service Port check (Level 4.5)
          if (!blockedReason && b.targetPort) {
            const destServer = this.getServerAt(b.destinationSquare);
            if (destServer && destServer.portsOpen && !destServer.portsOpen.includes(b.targetPort)) {
              blockedReason = 'port_closed';
            }
          }

          if (!blockedReason && routeFound.blockedReason) {
            blockedReason = routeFound.blockedReason;
          }

          // VLAN Zone check (Chapter 5)
          if (!blockedReason && b.zone) {
            const destServer = this.getServerAt(b.destinationSquare);
            if (destServer && destServer.zone && destServer.zone !== b.zone) {
              const crossedRouter = routeFound.routersCrossed && routeFound.routersCrossed.length > 0 ? routeFound.routersCrossed[0] : null;
              if (!crossedRouter) {
                blockedReason = 'wrong_zone';
              } else {
                const allowed = crossedRouter.allowRules && crossedRouter.allowRules.some(r =>
                  r.action === 'allow' && (!r.fromZone || r.fromZone === b.zone) && (r.toServerId ? r.toServerId === destServer.id : (!r.toZone || r.toZone === destServer.zone))
                );
                if (!allowed) {
                  blockedReason = 'wrong_zone';
                }
              }
            }
          }

          // Static & Dynamic Routing check (5.3 & 5.4)
          if (!blockedReason && (this.mapData.concept === 'static_routes' || this.mapData.concept === 'dynamic_routing')) {
            const destServer = this.getServerAt(b.destinationSquare);
            if (destServer && destServer.subnet && b.subnet && destServer.subnet !== b.subnet) {
              const routers = routeFound.routersCrossed || [];
              if (routers.length === 0) {
                // Cross-network traffic requires a router
                blockedReason = 'no_route';
              } else {
                for (const r of routers) {
                  const hasStatic = r.staticRoutes && r.staticRoutes.has(destServer.subnet);
                  const hasDynamic = r.dynamicRouting && (r.dynamicRoutes ? r.dynamicRoutes.has(destServer.subnet) : true);
                  const isDirect = r.interfaces && r.interfaces.some(iface => iface.subnet === destServer.subnet);
                  if (!isDirect && !hasStatic && !hasDynamic) {
                    blockedReason = 'no_route';
                    break;
                  }
                }
              }
            }
          }

          // Firewall check (6.1 & 6.5)
          if (!blockedReason && routeFound.firewallsCrossed && routeFound.firewallsCrossed.length > 0) {
            for (const fw of routeFound.firewallsCrossed) {
              if (fw.rules && fw.rules.length > 0) {
                for (const rule of fw.rules) {
                  const matchIp = !rule.sourceIp || rule.sourceIp === b.ip || (rule.sourceIp === '10.99.99.99' && (b.isRogue || b.ip === '10.99.99.99'));
                  const matchPort = !rule.port || rule.port === b.targetPort;
                  if (matchIp && matchPort) {
                    if (rule.action === 'block') {
                      blockedReason = 'blocked_by_rule';
                      break;
                    }
                  }
                }
              }
            }
          }

          // NAT check (6.3)
          if (!blockedReason && this.mapData.concept === 'nat') {
            const destServer = this.getServerAt(b.destinationSquare);
            if (destServer && destServer.isPublic) {
              const isPrivateIp = b.ip && (b.ip.startsWith('192.168.') || b.ip.startsWith('10.'));
              if (isPrivateIp) {
                const natRouter = (routeFound.routersCrossed || []).find(r => r.natEnabled);
                if (!natRouter) {
                  blockedReason = 'private_address_outside';
                } else {
                  natRouter.natTable.set(b.ip, `${natRouter.publicIp}:${10000 + b.id}`);
                }
              }
            }
          }

          // Load Balancer resolution (7.3)
          if (!blockedReason && routeFound.loadBalancersCrossed && routeFound.loadBalancersCrossed.length > 0) {
            const lb = routeFound.loadBalancersCrossed[0];
            const healthyServers = this.servers.filter(s => !this.crashedServers.has(s.id));
            if (healthyServers.length > 0) {
              const chosen = healthyServers[lb.nextBackendIndex++ % healthyServers.length];
              if (activePath[activePath.length - 1] !== chosen.square) {
                const lbSq = lb.square;
                const pathToChosen = Array.from(this.wires.values()).find(w =>
                  (w.path[0] === lbSq && w.path[w.path.length - 1] === chosen.square) ||
                  (w.path[w.path.length - 1] === lbSq && w.path[0] === chosen.square)
                );
                if (pathToChosen) {
                  const seg = pathToChosen.path[0] === lbSq ? pathToChosen.path.slice(1) : [...pathToChosen.path].reverse().slice(1);
                  const lbIdx = activePath.indexOf(lbSq);
                  if (lbIdx !== -1) {
                    activePath = [...activePath.slice(0, lbIdx + 1), ...seg];
                  }
                }
              }
            }
          }

          if (blockedReason) {
            b.warning = true;
            this.recentDrops.push(this.tickNumber);
            this.events.push({
              type: 'PacketDropped',
              tick: this.tickNumber,
              buildingId: b.id,
              reason: blockedReason
            });
          } else {
            const isEncrypted = routeFound.isEncrypted || routeFound.isVpnEncapsulated;
            const latencyDelay = isEncrypted ? 2 : 0;
            const travelTicks = Math.max(1, Math.ceil((activePath.length - 1) / activeSpeed)) + latencyDelay;

            // Electrical noise check: unshielded wires lose ~1 in 4 packets on noisy squares
            let droppedInNoise = false;
            if (!isShielded) {
              for (const sq of activePath) {
                if (this.noisySquares.has(sq) && this._netRng() < 0.25) {
                  droppedInNoise = true;
                  break;
                }
              }
            }

            if (droppedInNoise) {
              this.events.push({
                type: 'PacketDropped',
                tick: this.tickNumber,
                buildingId: b.id,
                reason: 'electrical_noise'
              });
            } else {
              this.inFlightPackets.push({
                id: this.nextPacketId++,
                buildingId: b.id,
                kind: 'request',
                sourceMac: b.mac,
                targetMac: b.targetMac,
                targetType: b.targetType,
                color: isEncrypted ? '#10b981' : (b.targetColor || '#ffffff'),
                path: activePath,
                speed: activeSpeed,
                startTick: this.tickNumber,
                travelTicks,
                arrivalTick: this.tickNumber + travelTicks,
                wireId: activeWireId,
                faded: isFaded,
                hubId: viaHubId,
                encrypted: isEncrypted,
                isVpnEncapsulated: routeFound.isVpnEncapsulated
              });
            }
            b.warning = false;
          }
        } else {
          // No link: packet lost, show warning marker
          b.warning = true;
          this.events.push({
            type: 'PacketDropped',
            tick: this.tickNumber,
            buildingId: b.id,
            reason: 'no_wire'
          });
        }

        const jitter = Math.floor(this._netRng() * (b.requestIntervalTicks / 2));
        b.nextRequestTick = this.tickNumber + b.requestIntervalTicks + jitter;
      }
    }

    // Snoop eavesdropper inspection
    if (this.snoopSquares.size > 0) {
      for (const pkt of this.inFlightPackets) {
        for (const sq of pkt.path) {
          if (this.snoopSquares.has(sq)) {
            if (!pkt.encrypted && !pkt.isVpnEncapsulated) {
              this.events.push({
                type: 'PacketSnooped',
                tick: this.tickNumber,
                buildingId: pkt.buildingId,
                packetId: pkt.id,
                square: sq
              });
              const sb = this.getBuilding(pkt.buildingId);
              if (sb && sb.state === 'open') {
                sb.timerTicksLeft = Math.max(1, sb.timerTicksLeft - 5);
              }
            }
            break;
          }
        }
      }
    }

    // 4. Packet Delivery, Round-Trip Service & Hub Collision Detection
    const hubArrivals = new Map();
    for (const pkt of this.inFlightPackets) {
      if (pkt.hubId && this.tickNumber >= pkt.arrivalTick) {
        if (!hubArrivals.has(pkt.hubId)) hubArrivals.set(pkt.hubId, []);
        hubArrivals.get(pkt.hubId).push(pkt);
      }
    }
    const collidedPktIds = new Set();
    for (const [hubId, pkts] of hubArrivals.entries()) {
      if (pkts.length >= 2) {
        const hubDev = this.getDevice(hubId);
        this.events.push({
          type: 'Collision',
          tick: this.tickNumber,
          deviceId: hubId,
          square: hubDev ? hubDev.square : null
        });
        for (const p of pkts) collidedPktIds.add(p.id);
      }
    }

    const remainingPackets = [];
    const isRoundTripLevel = (this.mapData.chapter >= 4 && (parseFloat(this.mapData.level || this.mapData.id) >= 4.3 || this.mapData.concept === 'web_requests_roundtrip' || this.mapData.concept === 'chapter_4_finale' || this.mapData.concept === 'service_ports' || this.mapData.concept === 'email_servers'));

    for (const pkt of this.inFlightPackets) {
      if (this.tickNumber >= pkt.arrivalTick) {
        if (collidedPktIds.has(pkt.id)) {
          this.recentDrops.push(this.tickNumber);
          this.events.push({
            type: 'PacketDropped',
            tick: this.tickNumber,
            buildingId: pkt.buildingId,
            reason: 'hub_collision'
          });
          continue;
        }

        if (pkt.faded) {
          // SIGNAL FADE RULE: over-range wire requests are lost with reason signal_faded
          this.recentDrops.push(this.tickNumber);
          this.events.push({
            type: 'PacketDropped',
            tick: this.tickNumber,
            buildingId: pkt.buildingId,
            reason: 'signal_faded'
          });
          continue;
        }

        // Crashed Server check
        const srvAtDest = this.getServerAt(pkt.path[pkt.path.length - 1]);
        if (srvAtDest && this.crashedServers.has(srvAtDest.id)) {
          this.recentDrops.push(this.tickNumber);
          this.events.push({
            type: 'PacketDropped',
            tick: this.tickNumber,
            buildingId: pkt.buildingId,
            reason: 'server_down'
          });
          continue;
        }

        // Chapter 4: Round-Trip Request/Response Mechanism
        if (isRoundTripLevel && pkt.kind !== 'reply') {
          const reversePath = [...pkt.path].reverse();
          const replyTravelTicks = Math.max(1, Math.ceil((reversePath.length - 1) / pkt.speed));
          remainingPackets.push({
            id: this.nextPacketId++,
            buildingId: pkt.buildingId,
            kind: 'reply',
            sourceMac: pkt.targetMac,
            targetMac: pkt.sourceMac,
            targetType: pkt.targetType,
            color: '#a78bfa',
            path: reversePath,
            speed: pkt.speed,
            startTick: this.tickNumber,
            travelTicks: replyTravelTicks,
            arrivalTick: this.tickNumber + replyTravelTicks,
            wireId: pkt.wireId,
            faded: pkt.faded,
            hubId: pkt.hubId,
            totalElapsedStart: pkt.startTick
          });
          this.events.push({
            type: 'ServerReplied',
            tick: this.tickNumber,
            buildingId: pkt.buildingId,
            serverSquare: pkt.path[pkt.path.length - 1]
          });
          continue;
        }

        const elapsed = pkt.kind === 'reply' ? (this.tickNumber - pkt.totalElapsedStart) : (pkt.arrivalTick - pkt.startTick);
        const b = this.getBuilding(pkt.buildingId);

        // Rogue device breach check
        if (b && b.isRogue) {
          this.events.push({ type: 'SecurityBreach', tick: this.tickNumber, buildingId: b.id });
          this.status = 'level_over';
          this.events.push({ type: 'LevelOver', tick: this.tickNumber, reason: 'security_breach' });
          return this.events;
        }

        if (b && b.state === 'open' && elapsed <= b.deadlineTicks) {
          // Fulfilled request pays 1 coin
          this.coins += 1;
          b.fulfilledInCycle++;
          b.deliveredTotal++;
          this.events.push({ type: 'PacketDelivered', tick: this.tickNumber, buildingId: b.id, packetId: pkt.id });

          // Check quota fulfillment
          if (b.fulfilledInCycle >= b.quota) {
            this.events.push({ type: 'CycleMet', tick: this.tickNumber, buildingId: b.id });
            b.fulfilledInCycle = 0;
            b.timerTicksLeft = b.cycleTimerTicks;
            b.timerPhase = 'cycle';
            if (!this.servedBuildingIds) this.servedBuildingIds = new Set();
            this.servedBuildingIds.add(b.id);

            // First time quota met: 20-coin connection bonus
            if (!b.hasMetFirstQuota) {
              b.hasMetFirstQuota = true;
              this.coins += 20;
              this.events.push({ type: 'BonusAwarded', tick: this.tickNumber, buildingId: b.id, coins: 20 });
            }
          }
        }
      } else {
        remainingPackets.push(pkt);
      }
    }
    this.inFlightPackets = remainingPackets;

    // Dynamic Happiness Calculation (Level 7.6 Grand Finale & Endless Mode)
    let totalHealth = 0;
    let openCount = 0;
    for (const b of this.buildings) {
      if (b.state === 'open') {
        openCount++;
        const maxTimer = b.timerPhase === 'first' ? b.firstTimerTicks : b.cycleTimerTicks;
        const ratio = Math.max(0, b.timerTicksLeft / maxTimer);
        totalHealth += ratio >= 0.5 ? 100 : (ratio >= 0.25 ? 75 : 25);
      }
    }
    const baseHappiness = openCount > 0 ? (totalHealth / openCount) : 100;
    this.recentDrops = (this.recentDrops || []).filter(t => t >= this.tickNumber - 60);
    const dropPenalty = Math.min(50, this.recentDrops.length * 3);
    this.happinessMeter = Math.max(0, Math.min(100, Math.round(baseHappiness - dropPenalty)));

    if (this.mapData.goal === 'keep_happy' && this.happinessMeter < 40) {
      this.status = 'level_over';
      this.events.push({ type: 'LevelOver', tick: this.tickNumber, reason: 'unhappy_citizens' });
      return this.events;
    }

    // 5. Timers & Sudden Failure Engine
    const quotaMetThisTick = new Set(
      this.events.filter(e => e.type === 'CycleMet').map(e => e.buildingId)
    );

    for (const b of this.buildings) {
      if (b.state !== 'open') continue;

      if (quotaMetThisTick.has(b.id)) continue; // timer just reset — don't burn 1 tick

      b.timerTicksLeft--;

      if (b.timerTicksLeft <= 0) {
        b.state = 'gave_up';
        this.events.push({ type: 'TimerExpired', tick: this.tickNumber, buildingId: b.id });

        // SUDDEN FAILURE RULE: If required, level is immediately over
        if (b.required || this.isEndless) {
          this.status = 'level_over';
          this.events.push({ type: 'LevelOver', tick: this.tickNumber, buildingId: b.id });
          return this.events;
        }
      }
    }

    // 6. Win Conditions (Skipped in Endless mode)
    if (!this.isEndless) {
      if (this.mapData.goal === 'keep_happy') {
        const targetTicks = this.mapData.targetTicks || 3600;
        const minHappiness = this.mapData.minHappiness || 80;
        if (this.tickNumber >= targetTicks) {
          if (this.happinessMeter >= minHappiness) {
            this.status = 'won';
            this.events.push({ type: 'LevelWon', tick: this.tickNumber });
          } else {
            this.status = 'level_over';
            this.events.push({ type: 'LevelOver', tick: this.tickNumber });
          }
        }
      } else if (this.mapData.goal === 'connect_all') {
        const targetBuildings = this.buildings.filter(b => b.required).length > 0
          ? this.buildings.filter(b => b.required)
          : this.buildings;
        const allTargetOpened = targetBuildings.every(b => b.state !== 'construction');
        const allTargetMetQuota = targetBuildings.length > 0 && targetBuildings.every(b => b.hasMetFirstQuota);
        if (allTargetOpened && allTargetMetQuota) {
          this.status = 'won';
          this.events.push({ type: 'LevelWon', tick: this.tickNumber });
        }
      } else if (this.mapData.goal && (this.mapData.goal.startsWith('survive') || this.mapData.targetTicks)) {
        const targetTicks = this.mapData.targetTicks || parseInt(this.mapData.goal.replace(/\D/g, '')) || 3600;
        if (this.tickNumber >= targetTicks) {
          this.status = 'won';
          this.events.push({ type: 'LevelWon', tick: this.tickNumber });
        }
      }
    }

    return this.events;
  }

  /**
   * Compute official Endless Mode score (Section 6.1)
   * Score = seconds survived + (5 * buildings served) + average happiness (0 to 100)
   */
  getEndlessScore() {
    const secondsSurvived = Math.floor(this.tickNumber / 20);
    const buildingsServed = this.servedBuildingIds ? this.servedBuildingIds.size : 0;
    const avgHappiness = Math.round(this.happinessMeter !== undefined ? this.happinessMeter : 100);
    const totalScore = secondsSurvived + (5 * buildingsServed) + avgHappiness;
    return {
      totalScore,
      secondsSurvived,
      buildingsServed,
      averageHappiness: avgHappiness,
      ticks: this.tickNumber
    };
  }

  /**
   * Procedural random events in Endless Mode (Section 8 & 9.7)
   */
  triggerEndlessRandomEvent() {
    const eligible = this.mapData.eligibleEvents || ['CableCut', 'SlowLink'];
    if (!eligible || eligible.length === 0) return;
    const evType = eligible[Math.floor(this.eventRng() * eligible.length)];

    if (evType === 'CableCut' && this.wires.size > 0) {
      const wireList = Array.from(this.wires.values());
      const targetWire = wireList[Math.floor(this.eventRng() * wireList.length)];
      if (targetWire) {
        this.removeWireById(targetWire.id);
        this.events.push({
          type: 'CableCut',
          tick: this.tickNumber,
          wireId: targetWire.id,
          buildingId: targetWire.buildingId || null
        });
      }
    } else if (evType === 'ServerCrash' && this.servers && this.servers.length > 1) {
      const srv = this.servers[Math.floor(this.eventRng() * this.servers.length)];
      this.crashedServers.add(srv.id);
      this.events.push({ type: 'ServerCrash', tick: this.tickNumber, serverId: srv.id });
    }
  }
}
