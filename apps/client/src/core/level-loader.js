/**
 * NetCity v2.0 - Level Loader & Procedural Map Generator
 * Single Responsibility: Generates deterministic procedural map data from Level Definitions
 * and random seeds, placing servers, buildings, and obstacles.
 */

import { ALL_LEVELS, getLevelById } from '../../../../packages/content/src/levels.js';
import { createStreamRng } from '../../../../packages/sim/src/prng.js';

/**
 * Find a valid grid square within a given Manhattan range from an anchor square.
 * Uses seeded RNG for deterministic layouts.
 */
export function findValidSquare(w, h, serverSq, range, used, rng = Math.random.bind(Math), side = null, river = null) {
  const sx = serverSq % w;
  const sy = Math.floor(serverSq / w);
  const minD = (range && range[0]) !== undefined ? range[0] : 2;
  const maxD = (range && range[1]) !== undefined ? range[1] : 12;

  let minX = 0;
  let maxX = w - 1;
  let anchorX = sx;
  let anchorY = sy;

  if (river && Array.isArray(river)) {
    if (side === 'left') {
      minX = 1;
      maxX = Math.max(1, river[0] - 1);
      anchorX = Math.floor(river[0] / 2);
      anchorY = Math.floor(h / 2);
    } else if (side === 'right') {
      minX = Math.min(w - 2, river[1] + 1);
      maxX = w - 2;
      anchorX = Math.floor((river[1] + 1 + w) / 2);
      anchorY = Math.floor(h / 2);
    }
  }

  for (let r = 0; r < 300; r++) {
    const x = minX + Math.floor(rng() * (maxX - minX + 1));
    const y = Math.floor(rng() * h);
    const sq = y * w + x;
    if (river && x >= river[0] && x <= river[1]) continue;
    const d = Math.abs(x - anchorX) + Math.abs(y - anchorY);
    if (!used.has(sq) && d >= minD && d <= maxD && Math.max(Math.abs(x - anchorX), Math.abs(y - anchorY)) >= 2) {
      return sq;
    }
  }

  // Fallback safe square search
  for (let y = 1; y < h - 1; y++) {
    for (let x = minX; x <= maxX; x++) {
      const sq = y * w + x;
      if (river && x >= river[0] && x <= river[1]) continue;
      if (!used.has(sq)) return sq;
    }
  }

  return (Math.min(sy + minD, h - 1)) * w + minX;
}

/**
 * Generate complete map data object for a level and seed.
 * @param {string} levelId
 * @param {string} seed
 * @param {object|null} customDef
 * @returns {{ levelDef: Object, mapData: Object }}
 */
export function generateLevelMap(levelId, seed, customDef = null) {
  const levelDef = customDef || getLevelById(levelId) || ALL_LEVELS[0];

  const w = levelDef.grid.w;
  const h = levelDef.grid.h;
  let serverSquare = Math.floor(h / 2) * w + (w > 32 ? 6 : Math.floor(w / 2));
  if (levelDef.river && Array.isArray(levelDef.river)) {
    serverSquare = Math.floor(h / 2) * w + Math.floor((levelDef.river[1] + 1 + w) / 2);
  }
  const used = new Set();

  let servers = null;
  if (Array.isArray(levelDef.servers) && levelDef.servers.length > 0) {
    const centerX = Math.floor(w / 2);
    const centerY = Math.floor(h / 2);
    servers = levelDef.servers.map(s => {
      let sq;
      if (s.square !== undefined) {
        sq = s.square;
      } else {
        const offX = s.offset ? s.offset[0] : 0;
        const offY = s.offset ? s.offset[1] : 0;
        sq = (centerY + offY) * w + (centerX + offX);
      }
      used.add(sq);
      return {
        ...s,
        square: sq
      };
    });
    serverSquare = servers[0].square;
  } else {
    used.add(serverSquare);
  }

  // Seeded RNGs for reproducible map layout (Bug H fix)
  const mapRng = createStreamRng(seed, 'map');
  const wallRng = createStreamRng(seed, 'walls');

  // Buildings placement with 4-neighbor approach capacity enforcement (Section 4.1 & 7.8)
  const buildings = [];
  let requiredTargetingServer = 0;
  const hasConcentrators = (levelDef.devicesAllowed || []).some(d =>
    ['cabinet', 'hub', 'switch', 'access_point', 'router'].includes(d)
  );
  const maxDeviceCapacity = hasConcentrators ? 999 : 4;

  // Start buildings
  for (const b of (levelDef.start || [])) {
    const sq = b.square !== undefined ? b.square : findValidSquare(w, h, serverSquare, b.range, used, mapRng, b.side, levelDef.river);
    used.add(sq);
    const isReq = b.required !== false && requiredTargetingServer < maxDeviceCapacity;
    if (isReq) requiredTargetingServer++;

    buildings.push({
      id: b.id,
      name: b.name || undefined,
      type: b.type,
      square: sq,
      required: isReq,
      targetServerId: b.targetServerId || null,
      targetHostname: b.targetHostname || b.domain || null,
      targetPort: b.targetPort || b.port || null,
      zone: b.zone || undefined,
      isRogue: Boolean(b.isRogue),
      ip: b.ip !== undefined ? b.ip : undefined,
      subnet: b.subnet || undefined,
      defaultGateway: b.defaultGateway !== undefined ? b.defaultGateway : undefined,
      side: b.side || undefined,
      mac: b.mac || null,
      opensAtTick: 0,
      quota: b.type === 'classroom' ? 3 : 2,
      firstTimerTicks: levelDef.firstTimerTicks,
      cycleTimerTicks: levelDef.cycleTimerTicks,
      deadlineTicks: levelDef.deadlineTicks,
      requestIntervalTicks: b.type === 'classroom' ? 40 : 60
    });
  }

  // Spawn buildings
  let nextId = buildings.length + 1;
  for (const s of (levelDef.spawns || [])) {
    const sq = s.square !== undefined ? s.square : findValidSquare(w, h, serverSquare, s.range, used, mapRng, s.side, levelDef.river);
    used.add(sq);
    const isReq = s.required !== false && requiredTargetingServer < maxDeviceCapacity;
    if (isReq) requiredTargetingServer++;

    buildings.push({
      id: nextId++,
      name: s.name || undefined,
      type: s.type,
      square: sq,
      required: isReq,
      targetServerId: s.targetServerId || null,
      targetHostname: s.targetHostname || s.domain || null,
      targetPort: s.targetPort || s.port || null,
      zone: s.zone || undefined,
      isRogue: Boolean(s.isRogue),
      ip: s.ip !== undefined ? s.ip : undefined,
      subnet: s.subnet || undefined,
      defaultGateway: s.defaultGateway !== undefined ? s.defaultGateway : undefined,
      side: s.side || undefined,
      mac: s.mac || null,
      opensAtTick: s.tick,
      quota: s.type === 'classroom' ? 3 : 2,
      firstTimerTicks: levelDef.firstTimerTicks,
      cycleTimerTicks: levelDef.cycleTimerTicks,
      deadlineTicks: levelDef.deadlineTicks,
      requestIntervalTicks: s.type === 'classroom' ? 40 : 60
    });
  }

  // Wall/Pond generation — seeded rectangular obstacle blocks
  const walls = [];
  const wallBlocks = [];
  const wallCount = levelDef.walls || 0;
  const serverX = serverSquare % w;
  const serverY = Math.floor(serverSquare / w);

  for (let block = 0; block < wallCount; block++) {
    // Try up to 40 times to place a non-overlapping wall block
    for (let attempt = 0; attempt < 40; attempt++) {
      const bw = 1 + Math.floor(wallRng() * 3); // width 1-3
      const bh = 1 + Math.floor(wallRng() * 2); // height 1-2
      const bx = Math.floor(wallRng() * (w - bw));
      const by = Math.floor(wallRng() * (h - bh));

      // Collect squares this block would occupy
      const candidates = [];
      let conflicts = false;
      for (let dy = 0; dy < bh && !conflicts; dy++) {
        for (let dx = 0; dx < bw && !conflicts; dx++) {
          const sq = (by + dy) * w + (bx + dx);
          const cx = sq % w;
          const cy = Math.floor(sq / w);
          if (
            used.has(sq) ||
            walls.includes(sq) ||
            (levelDef.river && cx >= levelDef.river[0] && cx <= levelDef.river[1]) ||
            (Math.abs(cx - serverX) <= 1 && Math.abs(cy - serverY) <= 1)
          ) {
            conflicts = true;
          } else {
            candidates.push(sq);
          }
        }
      }

      if (!conflicts && candidates.length > 0) {
        for (const sq of candidates) walls.push(sq);
        wallBlocks.push({
          x: bx,
          y: by,
          w: bw,
          h: bh,
          shape: `${bw}x${bh}`
        });
        break;
      }
    }
  }

  const mapData = {
    level: levelDef.id,
    chapter: levelDef.chapter || 1,
    concept: levelDef.concept || null,
    river: levelDef.river || null,
    seed,
    width: w,
    height: h,
    server: serverSquare,
    servers: servers || undefined,
    walls,
    wallBlocks,
    noisySquares: levelDef.noisySquares || [],
    snoopSquares: levelDef.snoopSquares || [],
    startingCoins: levelDef.coins,
    buildings,
    wiresAllowed: levelDef.wiresAllowed,
    devicesAllowed: levelDef.devicesAllowed || ['server'],
    events: levelDef.events || [],
    goal: levelDef.goal,
    targetTicks: levelDef.targetTicks,
    minHappiness: levelDef.minHappiness,
    isEndless: Boolean(levelDef.isEndless),
    tier: levelDef.tier || 1,
    buildingPool: levelDef.buildingPool,
    eligibleEvents: levelDef.eligibleEvents,
    baseInterval: levelDef.baseInterval,
    minInterval: levelDef.minInterval,
    firstTimerTicks: levelDef.firstTimerTicks,
    cycleTimerTicks: levelDef.cycleTimerTicks,
    deadlineTicks: levelDef.deadlineTicks
  };

  return { levelDef, mapData };
}
