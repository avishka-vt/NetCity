/**
 * NetCity Wire Catalog (Version 2.0, Section 4.1)
 *
 * 1. Twisted Pair: Ethernet cable inside rooms and buildings (Cat5e, Cat6)
 * 2. Coaxial: TV cable and older Ethernet
 * 3. Multimode Fiber: Light through glass between nearby buildings
 * 4. Single-Mode Fiber: Light through very thin glass across a town
 */

export const WIRE_CATALOG = {
  twisted_pair: {
    id: 'twisted_pair',
    name: 'Twisted Pair',
    realWorldUse: 'Ethernet cable inside rooms and buildings (Cat5e, Cat6)',
    maxRunSquares: 10,
    maxRunMeters: 100,
    costPerSquare: 1,
    speed: 1,        // squares per tick
    capacity: 2,     // packets per tick
    shielded: false,
    color: '#e8903a',
    firstLevel: '1.1'
  },
  coaxial: {
    id: 'coaxial',
    name: 'Coaxial Cable',
    realWorldUse: 'TV cable and older Ethernet',
    maxRunSquares: 18,
    maxRunMeters: 185,
    costPerSquare: 2,
    speed: 2,
    capacity: 2,
    shielded: true,
    color: '#b08968',
    firstLevel: '1.3'
  },
  multimode_fiber: {
    id: 'multimode_fiber',
    name: 'Multimode Fiber',
    realWorldUse: 'Light through glass between nearby buildings',
    maxRunSquares: 40,
    maxRunMeters: 400,
    costPerSquare: 3,
    speed: 4,
    capacity: 8,
    shielded: true,
    color: '#4cc9f0',
    firstLevel: '1.4'
  },
  single_mode_fiber: {
    id: 'single_mode_fiber',
    name: 'Single-Mode Fiber',
    realWorldUse: 'Light through very thin glass across a town',
    maxRunSquares: 100,
    maxRunMeters: 1000,
    costPerSquare: 5,
    speed: 4,
    capacity: 12,
    shielded: true,
    color: '#9d8cff',
    firstLevel: '1.5'
  }
};

export const REFUSAL_MESSAGES = {
  notEnoughCoins: 'Not enough coins. Try a shorter route or a cheaper wire.',
  wallOrBuilding: "A wire can't pass through walls, buildings or construction sites.",
  wireCrossing: "Wires cannot cross each other. Find an open route around.",
  wireTypeNotUnlocked: "That wire isn't available yet.",
  releasedAwayFromDestination: 'Drop the wire on the server to finish it.',
  selfIntersection: "A wire can't cross over itself.",
  signalFadedNotice: 'The signal fades after this distance. Requests on over-range wires are lost.',
  noisyNotice: 'This wire passes through electrical noise. A shielded wire would help.',
  buildingUnderConstruction: 'This site is under construction! Wires cannot connect until it opens.',
  allPortsOccupied: 'All 4 ports on this device are occupied. Disconnect a wire or add another switch/hub.'
};
