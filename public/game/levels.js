export const CABLE_TYPES = {
  copper: {
    type: 'copper',
    name: 'Copper',
    costPerSquare: 1,
    maxLength: 10,
    speed: 1, // square per tick
    color: '#e8903a',
    maxMeters: 100
  },
  fiber: {
    type: 'fiber',
    name: 'Fiber',
    costPerSquare: 3,
    maxLength: 40,
    speed: 4, // squares per tick
    color: '#4cc9f0',
    maxMeters: 400
  }
};

export const REFUSAL_MESSAGES = {
  copperLonger: 'Copper signal fades after 10 squares (100 m). Try fiber!',
  fiberLonger: 'Even fiber has a limit: 40 squares.',
  notEnoughBudget: 'Not enough budget left. Try a shorter route or a cheaper cable.',
  wallOrBuilding: "A cable can't pass through walls or buildings.",
  cableTypeNotAllowed: "That cable type isn't available in this level.",
  releasedAwayFromServer: 'Drop the cable on the server to finish it.'
};

export const LEVELS = [
  {
    id: '1.1',
    title: '1.1 First Connection',
    idea: 'A cable carries messages to the server',
    hint: 'Every building needs a cable to the server. Press a building, drag to the server and let go.',
    winSentence: 'A cable carries messages between a building and the server.',
    nearCount: 1,
    nearRange: [4, 7],
    farCount: 0,
    farRange: null,
    wallBlocks: 0,
    cablesAllowed: ['copper'],
    budgetMultiplier: 2.0,
    messagesNeeded: 3
  },
  {
    id: '1.2',
    title: '1.2 The Neighbourhood',
    idea: 'Cables cost money, so plan routes',
    hint: 'Cables cost money. Shorter routes leave more budget and earn more stars.',
    winSentence: 'Cables cost money, so good planning means shorter, tidier routes.',
    nearCount: 4,
    nearRange: [3, 9],
    farCount: 0,
    farRange: null,
    wallBlocks: 2,
    cablesAllowed: ['copper'],
    budgetMultiplier: 1.3,
    messagesNeeded: 3
  },
  {
    id: '1.3',
    title: '1.3 Too Far',
    idea: 'Copper signal fades, so far buildings need fiber',
    hint: 'One building is very far away. Copper only reaches 10 squares (100 m). Try fiber.',
    winSentence: 'Copper cable carries a signal only about 100 metres. Longer distances need fiber.',
    nearCount: 3,
    nearRange: [3, 8],
    farCount: 1,
    farRange: [13, 20],
    wallBlocks: 2,
    cablesAllowed: ['copper', 'fiber'],
    budgetMultiplier: 1.2,
    messagesNeeded: 3
  },
  {
    id: '1.4',
    title: '1.4 Growing Town',
    idea: 'Combine both choices under a budget',
    hint: 'A bigger town. Use copper for short runs and fiber only where you must.',
    winSentence: 'Real networks mix cable types: cheap copper for short runs, fiber where distance demands it.',
    nearCount: 4,
    nearRange: [3, 9],
    farCount: 2,
    farRange: [13, 20],
    wallBlocks: 4,
    cablesAllowed: ['copper', 'fiber'],
    budgetMultiplier: 1.2,
    messagesNeeded: 4
  }
];

export function getLevelById(id) {
  return LEVELS.find(l => l.id === id) || null;
}
