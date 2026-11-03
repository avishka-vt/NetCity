import { CABLE_TYPES, REFUSAL_MESSAGES } from './levels.js';
import { fnv1a, mulberry32 } from './generate.js';

export class Simulation {
  constructor(mapData) {
    this.mapData = mapData;
    this.width = mapData.width;
    this.height = mapData.height;
    this.server = mapData.server;
    this.walls = new Set(mapData.walls);

    // net RNG for deterministic message timing
    const netHash = fnv1a(`net:${mapData.seed}`);
    this.netRng = mulberry32(netHash);

    this.tickNumber = 0;
    this.moneySpent = 0;
    this.isWon = false;
    this.wonTick = null;
    this.stars = 0;
    this.nextMsgId = 0;
    this.commandLog = [];

    // Initialize buildings
    this.buildings = mapData.buildings.map((b, index) => {
      // First message goes out a few ticks after level starts, staggered between buildings
      const stagger = 4 + index * 3 + Math.floor(this.netRng() * 4);
      return {
        id: b.id,
        square: b.square,
        cable: null,
        deliveredOnTimeCount: 0,
        warning: false,
        nextMessageTick: stagger
      };
    });

    this.inFlightMessages = [];
  }

  getBuilding(buildingId) {
    return this.buildings.find(b => b.id === buildingId) || null;
  }

  getBuildingAt(square) {
    return this.buildings.find(b => b.square === square) || null;
  }

  getCable(buildingId) {
    const b = this.getBuilding(buildingId);
    return b ? b.cable : null;
  }

  validateCable(buildingId, path, cableType) {
    const cableConfig = CABLE_TYPES[cableType];
    if (!cableConfig || !this.mapData.cablesAllowed.includes(cableType)) {
      return {
        valid: false,
        reason: 'cableTypeNotAllowed',
        message: REFUSAL_MESSAGES.cableTypeNotAllowed
      };
    }

    const building = this.getBuilding(buildingId);
    if (!building) {
      return {
        valid: false,
        reason: 'buildingNotFound',
        message: 'Building not found.'
      };
    }

    if (!Array.isArray(path) || path.length < 2) {
      return {
        valid: false,
        reason: 'invalidPath',
        message: 'Path must contain at least 2 squares.'
      };
    }

    // Path must start at building square
    if (path[0] !== building.square) {
      return {
        valid: false,
        reason: 'mustStartAtBuilding',
        message: 'Cable must start at the building.'
      };
    }

    // Path must end at the server
    if (path[path.length - 1] !== this.server) {
      return {
        valid: false,
        reason: 'releasedAwayFromServer',
        message: REFUSAL_MESSAGES.releasedAwayFromServer
      };
    }

    // Check steps and intermediate squares
    const seenSquares = new Set();
    for (let i = 0; i < path.length; i++) {
      const sq = path[i];

      // Cable cannot enter a square it already uses (no self-intersection)
      if (seenSquares.has(sq)) {
        return {
          valid: false,
          reason: 'selfIntersection',
          message: "A cable can't cross over itself."
        };
      }
      seenSquares.add(sq);

      // Check step adjacency
      if (i > 0) {
        const prev = path[i - 1];
        const px = prev % this.width;
        const py = Math.floor(prev / this.width);
        const cx = sq % this.width;
        const cy = Math.floor(sq / this.width);
        const dx = Math.abs(cx - px);
        const dy = Math.abs(cy - py);

        if (!((dx === 1 && dy === 0) || (dx === 0 && dy === 1))) {
          return {
            valid: false,
            reason: 'notAdjacent',
            message: 'Cable steps must move one square up, down, left, or right.'
          };
        }
      }

      // Cable cannot pass through walls or other buildings
      if (sq !== building.square && sq !== this.server) {
        if (this.walls.has(sq)) {
          return {
            valid: false,
            reason: 'wallOrBuilding',
            message: REFUSAL_MESSAGES.wallOrBuilding
          };
        }
        if (this.buildings.some(b => b.square === sq)) {
          return {
            valid: false,
            reason: 'wallOrBuilding',
            message: REFUSAL_MESSAGES.wallOrBuilding
          };
        }
      }
    }

    // Cable length in squares (number of steps)
    const length = path.length - 1;

    // Check length limits per cable type
    if (cableType === 'copper' && length > cableConfig.maxLength) {
      return {
        valid: false,
        reason: 'copperLonger',
        message: REFUSAL_MESSAGES.copperLonger
      };
    }

    if (cableType === 'fiber' && length > cableConfig.maxLength) {
      return {
        valid: false,
        reason: 'fiberLonger',
        message: REFUSAL_MESSAGES.fiberLonger
      };
    }

    // Calculate cost
    const cost = length * cableConfig.costPerSquare;

    // Check budget
    const existingCable = building.cable;
    const oldCost = existingCable ? existingCable.cost : 0;
    const remainingBudget = this.mapData.budget - (this.moneySpent - oldCost);

    if (cost > remainingBudget) {
      return {
        valid: false,
        reason: 'notEnoughBudget',
        message: REFUSAL_MESSAGES.notEnoughBudget
      };
    }

    return {
      valid: true,
      length,
      cost,
      speed: cableConfig.speed
    };
  }

  connectCable(buildingId, path, cableType) {
    const validation = this.validateCable(buildingId, path, cableType);
    if (!validation.valid) {
      return {
        success: false,
        reason: validation.reason,
        message: validation.message
      };
    }

    const building = this.getBuilding(buildingId);
    if (building.cable) {
      this.removeCable(buildingId);
    }

    const cable = {
      buildingId,
      cableType,
      path: [...path],
      length: validation.length,
      cost: validation.cost,
      speed: validation.speed
    };

    building.cable = cable;
    this.moneySpent += cable.cost;
    building.warning = false;

    this.commandLog.push({
      type: 'connectCable',
      tick: this.tickNumber,
      buildingId,
      cableType,
      path: [...path]
    });

    return {
      success: true,
      cable
    };
  }

  removeCable(buildingId) {
    const building = this.getBuilding(buildingId);
    if (!building || !building.cable) {
      return {
        success: false,
        message: 'No cable to remove.'
      };
    }

    const refund = building.cable.cost;
    this.moneySpent -= refund;

    // Any messages traveling on this cable are lost
    this.inFlightMessages = this.inFlightMessages.filter(m => m.buildingId !== buildingId);
    building.cable = null;

    this.commandLog.push({
      type: 'removeCable',
      tick: this.tickNumber,
      buildingId
    });

    return {
      success: true,
      refund
    };
  }

  tick() {
    if (this.isWon) return;

    this.tickNumber++;

    // 1. Building message generation
    for (const building of this.buildings) {
      if (this.tickNumber >= building.nextMessageTick) {
        if (building.cable) {
          const travelTicks = Math.ceil(building.cable.length / building.cable.speed);
          this.inFlightMessages.push({
            id: ++this.nextMsgId,
            buildingId: building.id,
            path: building.cable.path,
            cableType: building.cable.cableType,
            speed: building.cable.speed,
            length: building.cable.length,
            startTick: this.tickNumber,
            arrivalTick: this.tickNumber + travelTicks
          });
          building.warning = false;
        } else {
          // Message lost! Show small warning marker
          building.warning = true;
        }

        // Schedule next message (every 24 ticks + 0 to 12 extra ticks)
        const interval = 24 + Math.floor(this.netRng() * 13);
        building.nextMessageTick = this.tickNumber + interval;
      }
    }

    // 2. Message delivery
    const remainingMessages = [];
    for (const msg of this.inFlightMessages) {
      if (this.tickNumber >= msg.arrivalTick) {
        // Message arrived at server
        const elapsed = msg.arrivalTick - msg.startTick;
        if (elapsed <= this.mapData.deadline) {
          const building = this.getBuilding(msg.buildingId);
          if (building) {
            building.deliveredOnTimeCount++;
          }
        }
      } else {
        remainingMessages.push(msg);
      }
    }
    this.inFlightMessages = remainingMessages;

    // 3. Win check
    const allDelivered = this.buildings.every(b => b.deliveredOnTimeCount >= this.mapData.needed);
    if (allDelivered) {
      this.isWon = true;
      this.wonTick = this.tickNumber;

      if (this.moneySpent <= this.mapData.par) {
        this.stars = 3;
      } else if (this.moneySpent <= Math.ceil(this.mapData.par * 1.2)) {
        this.stars = 2;
      } else {
        this.stars = 1;
      }
    }
  }

  reset() {
    this.tickNumber = 0;
    this.moneySpent = 0;
    this.isWon = false;
    this.wonTick = null;
    this.stars = 0;
    this.inFlightMessages = [];

    // Re-seed net RNG from the same seed
    const netHash = fnv1a(`net:${this.mapData.seed}`);
    this.netRng = mulberry32(netHash);

    for (let i = 0; i < this.buildings.length; i++) {
      const b = this.buildings[i];
      const stagger = 4 + i * 3 + Math.floor(this.netRng() * 4);
      b.cable = null;
      b.deliveredOnTimeCount = 0;
      b.warning = false;
      b.nextMessageTick = stagger;
    }
  }
}
