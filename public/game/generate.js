import { getLevelById } from './levels.js';

export const GRID_WIDTH = 24;
export const GRID_HEIGHT = 14;

export function fnv1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function mulberry32(seedUint32) {
  let a = seedUint32 >>> 0;
  return function() {
    let t = (a = (a + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function bfsPath(startSquare, targetSquare, obstaclesSet, width = GRID_WIDTH, height = GRID_HEIGHT) {
  if (startSquare === targetSquare) return [startSquare];
  const queue = [startSquare];
  const visited = new Uint8Array(width * height);
  const parent = new Int16Array(width * height).fill(-1);
  visited[startSquare] = 1;

  let head = 0;
  let found = false;

  while (head < queue.length) {
    const curr = queue[head++];
    const cx = curr % width;
    const cy = Math.floor(curr / width);

    const neighbors = [
      cy > 0 ? curr - width : -1,         // up
      cx < width - 1 ? curr + 1 : -1,     // right
      cy < height - 1 ? curr + width : -1,// down
      cx > 0 ? curr - 1 : -1              // left
    ];

    for (const next of neighbors) {
      if (next === -1) continue;
      if (visited[next]) continue;
      if (obstaclesSet.has(next) && next !== targetSquare) continue;

      visited[next] = 1;
      parent[next] = curr;
      if (next === targetSquare) {
        found = true;
        break;
      }
      queue.push(next);
    }
    if (found) break;
  }

  if (!found) return null;

  const path = [];
  let curr = targetSquare;
  while (curr !== -1) {
    path.push(curr);
    curr = parent[curr];
  }
  path.reverse();
  return path;
}

export function bfsDistance(startSquare, targetSquare, obstaclesSet, width = GRID_WIDTH, height = GRID_HEIGHT) {
  const path = bfsPath(startSquare, targetSquare, obstaclesSet, width, height);
  return path ? path.length - 1 : Infinity;
}

/**
 * Generates a level map according to section 4 rules.
 * @param {string|object} levelOrId - Level object or ID string (e.g. '1.1')
 * @param {string} seed - Seed string (e.g. 'k4x9q2')
 * @param {object} [stats] - Optional object to receive generation stats (e.g. fallbackUsed, attempts)
 * @returns {object} Stored form of map
 */
export function generateLevel(levelOrId, seed, stats = {}) {
  const level = typeof levelOrId === 'string' ? getLevelById(levelOrId) : levelOrId;
  if (!level) throw new Error(`Unknown level: ${levelOrId}`);

  let fallbackUsed = false;

  for (let attempt = 0; attempt < 400; attempt++) {
    const useWalls = attempt < 200;
    if (attempt >= 200) fallbackUsed = true;

    const hash = fnv1a(`world:${seed}#${attempt}`);
    const rng = mulberry32(hash);

    // 1. Server: random square with x from 10 to 13 and y from 6 to 7
    const sx = Math.floor(rng() * (13 - 10 + 1)) + 10;
    const sy = Math.floor(rng() * (7 - 6 + 1)) + 6;
    const serverSquare = sy * GRID_WIDTH + sx;

    // 2. Walls
    const wallSet = new Set();
    if (useWalls && level.wallBlocks > 0) {
      for (let b = 0; b < level.wallBlocks; b++) {
        const w = Math.floor(rng() * 3) + 1; // 1 to 3
        const h = Math.floor(rng() * 2) + 1; // 1 to 2
        const wx = Math.floor(rng() * (GRID_WIDTH - w + 1));
        const wy = Math.floor(rng() * (GRID_HEIGHT - h + 1));

        // Skip block if touches a square within 2 squares of server (chebyshev <= 2)
        const overlapsX = Math.max(wx, sx - 2) <= Math.min(wx + w - 1, sx + 2);
        const overlapsY = Math.max(wy, sy - 2) <= Math.min(wy + h - 1, sy + 2);
        if (overlapsX && overlapsY) {
          continue; // skip
        }

        for (let y = wy; y < wy + h; y++) {
          for (let x = wx; x < wx + w; x++) {
            wallSet.add(y * GRID_WIDTH + x);
          }
        }
      }
    }

    // 3. Buildings: far buildings first, then near buildings
    const buildingPlans = [];
    if (level.farCount > 0) {
      for (let i = 0; i < level.farCount; i++) {
        buildingPlans.push({ isFar: true, range: level.farRange });
      }
    }
    for (let i = 0; i < level.nearCount; i++) {
      buildingPlans.push({ isFar: false, range: level.nearRange });
    }

    const placedBuildings = [];
    let placementFailed = false;

    for (const plan of buildingPlans) {
      // Find all valid squares
      const candidates = [];
      const currentObstacles = new Set([...wallSet, ...placedBuildings.map(b => b.square)]);

      for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
          const sq = y * GRID_WIDTH + x;
          if (sq === serverSquare) continue;
          if (wallSet.has(sq)) continue;
          if (placedBuildings.some(b => b.square === sq)) continue;

          // Must be at least 2 squares in any direction from server
          if (Math.max(Math.abs(x - sx), Math.abs(y - sy)) < 2) continue;

          // Must be at least 2 squares in any direction from every building already placed
          let tooClose = false;
          for (const b of placedBuildings) {
            const bx = b.square % GRID_WIDTH;
            const by = Math.floor(b.square / GRID_WIDTH);
            if (Math.max(Math.abs(x - bx), Math.abs(y - by)) < 2) {
              tooClose = true;
              break;
            }
          }
          if (tooClose) continue;

          // Distance from server must be inside level's range
          const dist = bfsDistance(sq, serverSquare, currentObstacles);
          if (dist === Infinity || dist < plan.range[0] || dist > plan.range[1]) {
            continue;
          }

          // Candidate weight
          let weight = 1;
          if (placedBuildings.length > 0) {
            let minBuildingDist = Infinity;
            for (const b of placedBuildings) {
              const d = bfsDistance(sq, b.square, wallSet);
              if (d < minBuildingDist) minBuildingDist = d;
            }
            weight = 1 + Math.min(8, minBuildingDist === Infinity ? 8 : minBuildingDist);
          }

          candidates.push({ square: sq, weight, dist });
        }
      }

      if (candidates.length === 0) {
        placementFailed = true;
        break;
      }

      // Pick weighted candidate
      const totalWeight = candidates.reduce((acc, c) => acc + c.weight, 0);
      let r = rng() * totalWeight;
      let chosen = candidates[candidates.length - 1];
      for (const c of candidates) {
        if (r < c.weight) {
          chosen = c;
          break;
        }
        r -= c.weight;
      }

      placedBuildings.push({
        id: placedBuildings.length + 1,
        square: chosen.square
      });
    }

    if (placementFailed) {
      continue; // retry attempt
    }

    // 4. Checks (all must pass, otherwise retry)
    let allChecksPassed = true;
    let farBuildingCount = 0;
    let par = 0;

    const allBuildingSquares = placedBuildings.map(b => b.square);
    const maxCableLength = level.cablesAllowed.includes('fiber') ? 40 : 10;

    for (const b of placedBuildings) {
      const obstacles = new Set([
        ...wallSet,
        ...allBuildingSquares.filter(sq => sq !== b.square)
      ]);
      const d = bfsDistance(b.square, serverSquare, obstacles);

      // Check 1: Every building can reach the server, treating the other buildings as obstacles
      if (d === Infinity) {
        allChecksPassed = false;
        break;
      }

      // Check 3: Every building is within reach of the longest cable the level allows
      if (d > maxCableLength) {
        allChecksPassed = false;
        break;
      }

      if (d > 10) {
        farBuildingCount++;
      }

      // Calculate par component for this building
      // Cheapest allowed cable that can reach d squares (copper 1, fiber 3)
      let costPerSquare = Infinity;
      if (level.cablesAllowed.includes('copper') && d <= 10) {
        costPerSquare = 1;
      } else if (level.cablesAllowed.includes('fiber') && d <= 40) {
        costPerSquare = 3;
      }

      if (costPerSquare === Infinity) {
        allChecksPassed = false;
        break;
      }

      par += d * costPerSquare;
    }

    if (!allChecksPassed) continue;

    // Check 2: The number of buildings farther than 10 squares from the server equals the level's number of far buildings
    if (farBuildingCount !== level.farCount) {
      continue;
    }

    // Budget: par times the level's multiplier, rounded up
    const budget = Math.ceil(par * level.budgetMultiplier);

    // Check 4: The budget is at least par
    if (budget < par) {
      continue;
    }

    // Sort walls array deterministically
    const sortedWalls = Array.from(wallSet).sort((a, b) => a - b);

    stats.attempts = attempt + 1;
    stats.fallbackUsed = fallbackUsed;

    return {
      level: level.id,
      seed,
      width: GRID_WIDTH,
      height: GRID_HEIGHT,
      server: serverSquare,
      walls: sortedWalls,
      buildings: placedBuildings,
      cablesAllowed: [...level.cablesAllowed],
      par,
      budget,
      messageEvery: 24,
      deadline: 40,
      needed: level.messagesNeeded
    };
  }

  throw new Error(`Failed to generate valid map for level ${level.id} with seed "${seed}" after 400 attempts`);
}
