/**
 * NetCity Level Definitions (Version 2.0, Chapter 1 & 2)
 */

export const CHAPTER_1_LEVELS = [
  {
    id: '1.1',
    title: '1.1 First Link',
    chapter: 1,
    concept: 'first_link',
    learningMoment: 'A network is two or more devices that can send messages to each other.',
    hint: 'A network starts with two things connected. Drag a wire between the laptop and the server.',
    grid: { w: 24, h: 14 },
    wiresAllowed: ['twisted_pair'],
    devicesAllowed: ['server'],
    coins: 20,
    firstTimerTicks: 800,
    cycleTimerTicks: 240,
    deadlineTicks: 40,
    walls: 0,
    noisySquares: [],
    start: [
      { id: 1, type: 'laptop', range: [4, 7], required: false }
    ],
    spawns: [],
    goal: 'connect_all',
    stars: ['cost', 'reliability']
  },
  {
    id: '1.2',
    title: '1.2 Twisted-Pair (Copper) Cable',
    chapter: 1,
    concept: 'twisted_pair_range',
    learningMoment: 'Twisted-pair cable works well up to about 100 metres.',
    hint: 'Twisted pair is cheap and common, but signals fade over distance. Watch the far laptop.',
    grid: { w: 24, h: 14 },
    wiresAllowed: ['twisted_pair'],
    devicesAllowed: ['server'],
    coins: 40,
    firstTimerTicks: 800,
    cycleTimerTicks: 240,
    deadlineTicks: 40,
    walls: 2,
    noisySquares: [],
    start: [
      { id: 1, type: 'classroom', range: [3, 9], required: true },
      { id: 2, type: 'classroom', range: [3, 9], required: true }
    ],
    spawns: [
      { tick: 300, type: 'laptop', range: [13, 20], required: false }
    ],
    goal: 'connect_all',
    stars: ['cost', 'reliability']
  },
  {
    id: '1.3',
    title: '1.3 Coaxial Cable',
    chapter: 1,
    concept: 'coaxial_shielded',
    learningMoment: 'Coaxial cable has a metal shield that keeps out electrical noise. It reaches about 185 metres.',
    hint: 'Workshop machinery causes electrical noise. Unshielded twisted pair drops packets here—use shielded coaxial cable.',
    grid: { w: 24, h: 14 },
    wiresAllowed: ['twisted_pair', 'coaxial'],
    devicesAllowed: ['server'],
    coins: 60,
    firstTimerTicks: 800,
    cycleTimerTicks: 240,
    deadlineTicks: 40,
    walls: 2,
    noisySquares: [
      ...Array.from({ length: 5 }, (_, r) =>
        Array.from({ length: 4 }, (_, c) => (5 + r) * 24 + (10 + c))
      ).flat()
    ],
    start: [
      { id: 1, type: 'classroom', range: [3, 8], required: true },
      { id: 2, type: 'classroom', range: [3, 8], required: true }
    ],
    spawns: [
      { tick: 600, type: 'classroom', range: [11, 18], required: true },
      { tick: 1800, type: 'classroom', range: [3, 8], required: true }
    ],
    goal: 'connect_all',
    stars: ['cost', 'reliability']
  },
  {
    id: '1.4',
    title: '1.4 Fiber Cable (Multimode)',
    chapter: 1,
    concept: 'multimode_fiber',
    learningMoment: 'Fiber sends pulses of light through glass threads.',
    hint: 'The sports ground is far away across campus. Multimode fiber reaches up to 400 metres.',
    grid: { w: 32, h: 16 },
    wiresAllowed: ['twisted_pair', 'coaxial', 'multimode_fiber'],
    devicesAllowed: ['server'],
    coins: 70,
    firstTimerTicks: 800,
    cycleTimerTicks: 240,
    deadlineTicks: 40,
    walls: 3,
    noisySquares: [],
    start: [
      { id: 1, type: 'classroom', range: [3, 10], required: true },
      { id: 2, type: 'classroom', range: [3, 10], required: true },
      { id: 3, type: 'classroom', range: [3, 10], required: true }
    ],
    spawns: [
      { tick: 900, type: 'sports_ground', range: [19, 24], required: true }
    ],
    goal: 'connect_all',
    stars: ['cost', 'speed']
  },
  {
    id: '1.5',
    title: '1.5 Single-Mode Fiber',
    chapter: 1,
    concept: 'single_mode_fiber',
    learningMoment: 'Single-mode fiber carries light over kilometres. It costs more, so use it only for long hauls.',
    hint: 'A second campus opens across the river, beyond multimode reach. Single-mode fiber goes up to 1,000 metres.',
    grid: { w: 60, h: 14 },
    wiresAllowed: ['twisted_pair', 'coaxial', 'multimode_fiber', 'single_mode_fiber'],
    devicesAllowed: ['server'],
    coins: 350,
    firstTimerTicks: 800,
    cycleTimerTicks: 240,
    deadlineTicks: 40,
    walls: 4,
    noisySquares: [],
    start: [
      { id: 1, type: 'classroom', range: [3, 10], required: true },
      { id: 2, type: 'classroom', range: [3, 10], required: true }
    ],
    spawns: [
      { tick: 900, type: 'classroom', range: [42, 55], required: true },
      { tick: 2400, type: 'classroom', range: [42, 55], required: true }
    ],
    goal: 'connect_all',
    stars: ['cost', 'reliability']
  },
  {
    id: '1.6',
    title: '1.6 Wireless',
    chapter: 1,
    concept: 'wireless',
    learningMoment: 'Wi-Fi is a radio signal. Walls and distance weaken it.',
    hint: 'Phones connect without cables! Place a Wireless Access Point so its signal reaches them.',
    grid: { w: 24, h: 14 },
    wiresAllowed: ['twisted_pair'],
    devicesAllowed: ['server', 'access_point'],
    coins: 60,
    firstTimerTicks: 800,
    cycleTimerTicks: 240,
    deadlineTicks: 40,
    walls: 2,
    noisySquares: [],
    start: [
      { id: 1, type: 'laptop', range: [3, 8], required: true },
      { id: 2, type: 'phone', range: [3, 8], required: true }
    ],
    spawns: [
      { tick: 900, type: 'phone', range: [3, 8], required: true }
    ],
    goal: 'connect_all',
    stars: ['cost', 'reliability']
  },
  {
    id: '1.7',
    title: '1.7 Bandwidth: Thin Pipe, Fat Pipe',
    chapter: 1,
    concept: 'bandwidth_upgrades',
    learningMoment: 'Bandwidth is how many packets can pass at once, like lanes on a road.',
    hint: 'Laptops share connections through the street cabinet. Upgrade the bottleneck link to handle traffic!',
    grid: { w: 24, h: 14 },
    wiresAllowed: ['twisted_pair'],
    devicesAllowed: ['server', 'cabinet'],
    coins: 70,
    firstTimerTicks: 800,
    cycleTimerTicks: 240,
    deadlineTicks: 40,
    walls: 1,
    noisySquares: [],
    start: [
      { id: 1, type: 'laptop', range: [3, 7], required: true },
      { id: 2, type: 'laptop', range: [3, 7], required: true },
      { id: 3, type: 'laptop', range: [3, 7], required: true }
    ],
    spawns: [
      { tick: 800, type: 'laptop', range: [3, 7], required: true }
    ],
    goal: 'connect_all',
    stars: ['cost', 'speed']
  },
  {
    id: '1.8',
    title: '1.8 Mixed Budget Challenge',
    chapter: 1,
    concept: 'mixed_budget',
    learningMoment: 'Each connection has a best use. Balance wire types within your coin budget.',
    hint: 'A varied campus with classrooms, sports ground, and mobile users. Choose the right medium!',
    grid: { w: 32, h: 16 },
    wiresAllowed: ['twisted_pair', 'coaxial', 'multimode_fiber'],
    devicesAllowed: ['server', 'access_point', 'cabinet'],
    coins: 110,
    firstTimerTicks: 800,
    cycleTimerTicks: 240,
    deadlineTicks: 40,
    walls: 3,
    noisySquares: [],
    events: [
      { type: 'CableCut', tick: 2400 }
    ],
    start: [
      { id: 1, type: 'classroom', range: [3, 8], required: true },
      { id: 2, type: 'classroom', range: [3, 8], required: true },
      { id: 3, type: 'phone', range: [3, 8], required: true }
    ],
    spawns: [
      { tick: 900, type: 'sports_ground', range: [18, 24], required: true }
    ],
    goal: 'connect_all',
    stars: ['cost', 'reliability']
  },
  {
    id: '1.9',
    title: '1.9 Chapter Finale: Campus Day One',
    chapter: 1,
    concept: 'chapter_1_finale',
    learningMoment: 'A full network connects every building across campus using the right physical media.',
    hint: 'The campus is open! Connect all academic halls, sports facilities, and wireless users.',
    grid: { w: 36, h: 18 },
    wiresAllowed: ['twisted_pair', 'coaxial', 'multimode_fiber', 'single_mode_fiber'],
    devicesAllowed: ['server', 'access_point', 'cabinet'],
    coins: 380,
    firstTimerTicks: 800,
    cycleTimerTicks: 240,
    deadlineTicks: 40,
    walls: 4,
    noisySquares: [],
    start: [
      { id: 1, type: 'classroom', range: [3, 8], required: true },
      { id: 2, type: 'phone', range: [3, 8], required: true },
      { id: 3, type: 'laptop', range: [3, 8], required: true }
    ],
    spawns: [
      { tick: 900, type: 'sports_ground', range: [20, 26], required: true }
    ],
    goal: 'connect_all',
    stars: ['cost', 'speed']
  }
];

export const CHAPTER_2_LEVELS = [
  {
    id: '2.1',
    title: '2.1 Too Many Cables',
    chapter: 2,
    concept: 'star_vs_mesh',
    learningMoment: 'A central device that everyone plugs into is called a star network.',
    hint: 'Direct point-to-point cables create a tangle. Connect all laptops neatly through a central street cabinet.',
    grid: { w: 28, h: 16 },
    wiresAllowed: ['twisted_pair'],
    devicesAllowed: ['server', 'cabinet'],
    coins: 70,
    firstTimerTicks: 800,
    cycleTimerTicks: 240,
    deadlineTicks: 40,
    walls: 2,
    noisySquares: [],
    start: [
      { id: 1, type: 'laptop', range: [3, 8], required: true },
      { id: 2, type: 'laptop', range: [3, 8], required: true },
      { id: 3, type: 'laptop', range: [3, 8], required: true }
    ],
    spawns: [
      { tick: 800, type: 'laptop', range: [3, 8], required: true }
    ],
    goal: 'connect_all',
    stars: ['cost', 'reliability']
  },
  {
    id: '2.2',
    title: '2.2 The Hub: Shout to Everyone',
    chapter: 2,
    concept: 'hub_collisions',
    learningMoment: 'A hub is like shouting across a room. Simultaneous packets collide and vanish.',
    hint: 'Place a Hub to connect the computer lab. Hubs broadcast everything, so simultaneous packets collide!',
    grid: { w: 28, h: 16 },
    wiresAllowed: ['twisted_pair'],
    devicesAllowed: ['server', 'hub'],
    coins: 80,
    firstTimerTicks: 800,
    cycleTimerTicks: 240,
    deadlineTicks: 40,
    walls: 2,
    noisySquares: [],
    start: [
      { id: 1, type: 'laptop', range: [3, 8], required: true },
      { id: 2, type: 'laptop', range: [3, 8], required: true },
      { id: 3, type: 'laptop', range: [3, 8], required: true }
    ],
    spawns: [
      { tick: 800, type: 'laptop', range: [3, 8], required: true }
    ],
    goal: 'connect_all',
    stars: ['cost', 'reliability']
  },
  {
    id: '2.3',
    title: '2.3 The Switch: Deliver to the Right Person',
    chapter: 2,
    concept: 'switch_unicast',
    learningMoment: 'A switch delivers packets only to the intended destination, eliminating collisions.',
    hint: 'The lab uses two services: Web Server (🌐 Blue) and Database (🗄️ Green). Use a Switch to deliver directly without collisions!',
    grid: { w: 28, h: 16 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    devicesAllowed: ['server', 'hub', 'switch'],
    coins: 130,
    firstTimerTicks: 800,
    cycleTimerTicks: 240,
    deadlineTicks: 40,
    walls: 2,
    noisySquares: [],
    servers: [
      { id: 'web', type: 'web', name: 'Web Server', icon: '🌐', color: '#2ec4b6', mac: '00:WB', offset: [-4, 0] },
      { id: 'db', type: 'db', name: 'Database Server', icon: '🗄️', color: '#10b981', mac: '00:DB', offset: [4, 0] }
    ],
    start: [
      { id: 1, type: 'laptop', range: [3, 8], required: true, targetServerId: 'web', mac: '00:A1' },
      { id: 2, type: 'laptop', range: [3, 8], required: true, targetServerId: 'db', mac: '00:B2' },
      { id: 3, type: 'laptop', range: [3, 8], required: true, targetServerId: 'web', mac: '00:A3' }
    ],
    spawns: [
      { tick: 800, type: 'laptop', range: [3, 8], required: true, targetServerId: 'db', mac: '00:B4' }
    ],
    goal: 'connect_all',
    stars: ['cost', 'speed']
  },
  {
    id: '2.4',
    title: '2.4 The Notebook (MAC Addresses)',
    chapter: 2,
    concept: 'mac_learning',
    learningMoment: 'A switch learns device MAC addresses by watching arrivals and builds a table.',
    hint: 'Every device has a hardware MAC address. Click the Switch to open its Notebook (MAC Table) as it learns!',
    grid: { w: 28, h: 16 },
    wiresAllowed: ['twisted_pair'],
    devicesAllowed: ['server', 'switch'],
    coins: 110,
    firstTimerTicks: 800,
    cycleTimerTicks: 240,
    deadlineTicks: 40,
    walls: 2,
    noisySquares: [],
    servers: [
      { id: 'web', type: 'web', name: 'Web Server', icon: '🌐', color: '#2ec4b6', mac: '00:WB', offset: [-4, 0] },
      { id: 'db', type: 'db', name: 'Database Server', icon: '🗄️', color: '#10b981', mac: '00:DB', offset: [4, 0] }
    ],
    start: [
      { id: 1, type: 'laptop', range: [3, 8], required: true, targetServerId: 'web', mac: '00:A1' },
      { id: 2, type: 'laptop', range: [3, 8], required: true, targetServerId: 'db', mac: '00:B2' },
      { id: 3, type: 'laptop', range: [3, 8], required: true, targetServerId: 'web', mac: '00:C3' }
    ],
    spawns: [
      { tick: 800, type: 'laptop', range: [3, 8], required: true, targetServerId: 'db', mac: '00:D4' }
    ],
    goal: 'connect_all',
    stars: ['cost', 'reliability']
  },
  {
    id: '2.5',
    title: '2.5 Busy Computer Lab (Chapter 2 Finale)',
    chapter: 2,
    concept: 'chaining_switches',
    learningMoment: 'Switches scale. Chain multiple switches together to connect entire computer labs.',
    hint: 'Chain switches together to provide enough collision-free ports for the entire computer lab!',
    grid: { w: 28, h: 16 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    devicesAllowed: ['server', 'switch', 'hub'],
    coins: 160,
    firstTimerTicks: 800,
    cycleTimerTicks: 240,
    deadlineTicks: 40,
    walls: 3,
    noisySquares: [],
    servers: [
      { id: 'web', type: 'web', name: 'Web Server', icon: '🌐', color: '#2ec4b6', mac: '00:WB', offset: [-4, 0] },
      { id: 'db', type: 'db', name: 'Database Server', icon: '🗄️', color: '#10b981', mac: '00:DB', offset: [4, 0] }
    ],
    start: [
      { id: 1, type: 'classroom', range: [3, 8], required: true, targetServerId: 'web', mac: '00:CR' },
      { id: 2, type: 'laptop', range: [3, 8], required: true, targetServerId: 'db', mac: '00:L1' },
      { id: 3, type: 'laptop', range: [3, 8], required: true, targetServerId: 'web', mac: '00:L2' }
    ],
    spawns: [
      { tick: 900, type: 'laptop', range: [3, 8], required: true, targetServerId: 'db', mac: '00:L3' }
    ],
    goal: 'connect_all',
    stars: ['cost', 'speed']
  }
];

export const CHAPTER_3_LEVELS = [
  {
    id: '3.1',
    title: '3.1 Two Islands',
    chapter: 3,
    concept: 'two_islands',
    learningMoment: 'Separate networks need something to join them.',
    hint: 'Homes on the left and the school on the right sit across a river. Without a router, packets get stuck at the edge!',
    grid: { w: 32, h: 18 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    devicesAllowed: ['server', 'switch'],
    coins: 60,
    firstTimerTicks: 600,
    cycleTimerTicks: 240,
    deadlineTicks: 40,
    river: [15, 16],
    walls: 0,
    start: [
      { id: 1, type: 'classroom', range: [3, 8], side: 'right', required: true, ip: '192.168.2.10', subnet: '192.168.2.0/24' },
      { id: 2, type: 'classroom', range: [3, 8], side: 'right', required: true, ip: '192.168.2.11', subnet: '192.168.2.0/24' },
      { id: 3, type: 'home', range: [3, 8], side: 'left', required: false, ip: '192.168.1.10', subnet: '192.168.1.0/24' },
      { id: 4, type: 'home', range: [3, 8], side: 'left', required: false, ip: '192.168.1.11', subnet: '192.168.1.0/24' }
    ],
    spawns: [
      { tick: 600, type: 'home', range: [3, 8], side: 'left', required: false, ip: '192.168.1.12', subnet: '192.168.1.0/24' }
    ],
    goal: 'survive_1800',
    targetTicks: 1800,
    stars: ['cost', 'reliability']
  },
  {
    id: '3.2',
    title: '3.2 The Router: Border Guard and Guide',
    chapter: 3,
    concept: 'the_router',
    learningMoment: 'A switch connects devices inside a network. A router connects networks to each other.',
    hint: 'Place a router across the river and connect both the home switch and the school switch to it!',
    grid: { w: 32, h: 18 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    devicesAllowed: ['server', 'switch', 'router'],
    coins: 90,
    firstTimerTicks: 600,
    cycleTimerTicks: 240,
    deadlineTicks: 40,
    river: [15, 16],
    walls: 0,
    start: [
      { id: 1, type: 'classroom', range: [3, 8], side: 'right', required: true, ip: '192.168.2.10', subnet: '192.168.2.0/24', defaultGateway: '192.168.2.1' },
      { id: 2, type: 'classroom', range: [3, 8], side: 'right', required: true, ip: '192.168.2.11', subnet: '192.168.2.0/24', defaultGateway: '192.168.2.1' },
      { id: 3, type: 'home', range: [3, 8], side: 'left', required: true, ip: '192.168.1.10', subnet: '192.168.1.0/24', defaultGateway: '192.168.1.1' },
      { id: 4, type: 'home', range: [3, 8], side: 'left', required: true, ip: '192.168.1.11', subnet: '192.168.1.0/24', defaultGateway: '192.168.1.1' }
    ],
    spawns: [
      { tick: 600, type: 'home', range: [3, 8], side: 'left', required: true, ip: '192.168.1.12', subnet: '192.168.1.0/24', defaultGateway: '192.168.1.1' },
      { tick: 1200, type: 'home', range: [3, 8], side: 'left', required: true, ip: '192.168.1.13', subnet: '192.168.1.0/24', defaultGateway: '192.168.1.1' }
    ],
    goal: 'connect_all',
    stars: ['cost', 'reliability']
  },
  {
    id: '3.3',
    title: '3.3 IP Addresses: House Numbers',
    chapter: 3,
    concept: 'ip_addresses',
    learningMoment: 'An IP address is like a house number plus a street name.',
    hint: 'Devices without an IP address cannot receive packets. Click each computer to inspect and assign an IP address!',
    grid: { w: 32, h: 18 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    devicesAllowed: ['server', 'switch', 'router'],
    coins: 40,
    firstTimerTicks: 600,
    cycleTimerTicks: 240,
    deadlineTicks: 40,
    walls: 1,
    start: [
      { id: 1, type: 'laptop', range: [3, 8], required: true, ip: null, subnet: '192.168.1.0/24' },
      { id: 2, type: 'laptop', range: [3, 8], required: true, ip: null, subnet: '192.168.1.0/24' },
      { id: 3, type: 'laptop', range: [3, 8], required: true, ip: null, subnet: '192.168.1.0/24' },
      { id: 4, type: 'classroom', range: [3, 8], required: true, ip: '192.168.1.10', subnet: '192.168.1.0/24' }
    ],
    spawns: [
      { tick: 600, type: 'laptop', range: [3, 8], required: true, ip: null, subnet: '192.168.1.0/24' },
      { tick: 1500, type: 'laptop', range: [3, 8], required: true, ip: null, subnet: '192.168.1.0/24' }
    ],
    goal: 'connect_all',
    stars: ['reliability', 'speed']
  },
  {
    id: '3.4',
    title: '3.4 Same Street or Different Street? (Subnets)',
    chapter: 3,
    concept: 'subnets',
    learningMoment: 'The subnet mask tells you which part of the address is the street and which is the house.',
    hint: 'Devices in the Blue network need 192.168.1.x; devices in the Green network need 192.168.2.x. Fix any mismatched subnets!',
    grid: { w: 32, h: 18 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    devicesAllowed: ['server', 'switch', 'router'],
    coins: 60,
    firstTimerTicks: 600,
    cycleTimerTicks: 240,
    deadlineTicks: 40,
    walls: 2,
    start: [
      { id: 1, type: 'laptop', range: [3, 8], required: true, ip: '192.168.1.10', subnet: '192.168.1.0/24', defaultGateway: '192.168.1.1' },
      { id: 2, type: 'laptop', range: [3, 8], required: true, ip: '192.168.1.11', subnet: '192.168.1.0/24', defaultGateway: '192.168.1.1' },
      { id: 3, type: 'laptop', range: [3, 8], required: true, ip: '192.168.2.10', subnet: '192.168.2.0/24', defaultGateway: '192.168.2.1' },
      { id: 4, type: 'laptop', range: [3, 8], required: true, ip: '192.168.2.11', subnet: '192.168.2.0/24', defaultGateway: '192.168.2.1' }
    ],
    spawns: [
      { tick: 500, type: 'laptop', range: [3, 8], required: true, ip: '192.168.1.12', subnet: '192.168.1.0/24', defaultGateway: '192.168.1.1' },
      { tick: 1000, type: 'laptop', range: [3, 8], required: true, ip: '192.168.2.12', subnet: '192.168.2.0/24', defaultGateway: '192.168.2.1' }
    ],
    goal: 'connect_all',
    stars: ['cost', 'reliability']
  },
  {
    id: '3.5',
    title: '3.5 The Front Door (Default Gateway)',
    chapter: 3,
    concept: 'default_gateway',
    learningMoment: 'The gateway is the front door of a network.',
    hint: 'When a device wants to talk to a different network, it must send packets to its Default Gateway (the router)! Set the missing gateways.',
    grid: { w: 32, h: 18 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    devicesAllowed: ['server', 'switch', 'router'],
    coins: 60,
    firstTimerTicks: 600,
    cycleTimerTicks: 240,
    deadlineTicks: 40,
    walls: 2,
    start: [
      { id: 1, type: 'laptop', range: [3, 8], required: true, ip: '192.168.1.10', subnet: '192.168.1.0/24', defaultGateway: null },
      { id: 2, type: 'laptop', range: [3, 8], required: true, ip: '192.168.1.11', subnet: '192.168.1.0/24', defaultGateway: null },
      { id: 3, type: 'classroom', range: [3, 8], required: true, ip: '192.168.2.10', subnet: '192.168.2.0/24', defaultGateway: '192.168.2.1' },
      { id: 4, type: 'classroom', range: [3, 8], required: true, ip: '192.168.2.11', subnet: '192.168.2.0/24', defaultGateway: '192.168.2.1' }
    ],
    spawns: [
      { tick: 600, type: 'laptop', range: [3, 8], required: true, ip: '192.168.1.12', subnet: '192.168.1.0/24', defaultGateway: null }
    ],
    goal: 'survive_3000',
    targetTicks: 3000,
    stars: ['reliability', 'speed']
  },
  {
    id: '3.6',
    title: '3.6 Address Clash (Duplicate IPs)',
    chapter: 3,
    concept: 'duplicate_ip',
    learningMoment: 'Every address on a network must be unique.',
    hint: 'Two laptops have the same IP address (192.168.1.10)! Inspect devices to find the clash and reassign a unique address.',
    grid: { w: 32, h: 18 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    devicesAllowed: ['server', 'switch', 'router'],
    coins: 60,
    firstTimerTicks: 600,
    cycleTimerTicks: 240,
    deadlineTicks: 40,
    walls: 1,
    start: [
      { id: 1, type: 'laptop', range: [3, 8], required: true, ip: '192.168.1.10', subnet: '192.168.1.0/24', defaultGateway: '192.168.1.1' },
      { id: 2, type: 'laptop', range: [3, 8], required: true, ip: '192.168.1.10', subnet: '192.168.1.0/24', defaultGateway: '192.168.1.1' },
      { id: 3, type: 'laptop', range: [3, 8], required: true, ip: '192.168.1.12', subnet: '192.168.1.0/24', defaultGateway: '192.168.1.1' },
      { id: 4, type: 'classroom', range: [3, 8], required: true, ip: '192.168.1.20', subnet: '192.168.1.0/24', defaultGateway: '192.168.1.1' }
    ],
    spawns: [
      { tick: 900, type: 'laptop', range: [3, 8], required: true, ip: '192.168.1.15', subnet: '192.168.1.0/24', defaultGateway: '192.168.1.1' }
    ],
    goal: 'survive_3000',
    targetTicks: 3000,
    stars: ['reliability', 'speed']
  },
  {
    id: '3.7',
    title: '3.7 Two Routers',
    chapter: 3,
    concept: 'multi_hop_routers',
    learningMoment: 'Each hop is one router passing the packet to the next.',
    hint: 'Chain three networks together across two routers. Watch packets hop from router to router in Simulation Mode!',
    grid: { w: 32, h: 18 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber', 'single_mode_fiber'],
    devicesAllowed: ['server', 'switch', 'router'],
    coins: 120,
    firstTimerTicks: 600,
    cycleTimerTicks: 240,
    deadlineTicks: 50,
    walls: 3,
    start: [
      { id: 1, type: 'laptop', range: [3, 8], required: true, ip: '192.168.1.10', subnet: '192.168.1.0/24', defaultGateway: '192.168.1.1' },
      { id: 2, type: 'classroom', range: [3, 8], required: true, ip: '192.168.2.10', subnet: '192.168.2.0/24', defaultGateway: '192.168.2.1' },
      { id: 3, type: 'classroom', range: [3, 8], required: true, ip: '192.168.3.10', subnet: '192.168.3.0/24', defaultGateway: '192.168.3.1' }
    ],
    spawns: [
      { tick: 600, type: 'laptop', range: [3, 8], required: true, ip: '192.168.1.11', subnet: '192.168.1.0/24', defaultGateway: '192.168.1.1' },
      { tick: 1200, type: 'classroom', range: [3, 8], required: true, ip: '192.168.3.11', subnet: '192.168.3.0/24', defaultGateway: '192.168.3.1' }
    ],
    goal: 'connect_all',
    stars: ['cost', 'speed']
  },
  {
    id: '3.8',
    title: '3.8 Town Network (Chapter 3 Finale)',
    chapter: 3,
    concept: 'chapter_3_finale',
    learningMoment: 'The town is one network of networks.',
    hint: 'Connect homes, schools, and the central library across three routed networks with correct IP addressing and gateways!',
    grid: { w: 32, h: 18 },
    wiresAllowed: ['twisted_pair', 'coaxial', 'multimode_fiber', 'single_mode_fiber'],
    devicesAllowed: ['server', 'switch', 'router', 'access_point'],
    coins: 140,
    firstTimerTicks: 600,
    cycleTimerTicks: 240,
    deadlineTicks: 50,
    walls: 3,
    start: [
      { id: 1, type: 'home', range: [3, 8], required: true, ip: '192.168.1.10', subnet: '192.168.1.0/24', defaultGateway: '192.168.1.1' },
      { id: 2, type: 'home', range: [3, 8], required: true, ip: '192.168.1.11', subnet: '192.168.1.0/24', defaultGateway: '192.168.1.1' },
      { id: 3, type: 'classroom', range: [3, 8], required: true, ip: '192.168.2.10', subnet: '192.168.2.0/24', defaultGateway: '192.168.2.1' },
      { id: 4, type: 'classroom', range: [3, 8], required: true, ip: '192.168.2.11', subnet: '192.168.2.0/24', defaultGateway: '192.168.2.1' },
      { id: 5, type: 'library', range: [3, 8], required: true, ip: '192.168.3.10', subnet: '192.168.3.0/24', defaultGateway: '192.168.3.1', quota: 4 }
    ],
    spawns: [
      { tick: 500, type: 'home', range: [3, 8], required: true, ip: '192.168.1.12', subnet: '192.168.1.0/24', defaultGateway: '192.168.1.1' },
      { tick: 1000, type: 'classroom', range: [3, 8], required: true, ip: '192.168.2.12', subnet: '192.168.2.0/24', defaultGateway: '192.168.2.1' }
    ],
    goal: 'connect_all',
    stars: ['cost', 'calm']
  }
];

export const CHAPTER_4_LEVELS = [
  {
    id: '4.1',
    title: '4.1 DHCP: The Automatic Address Giver',
    chapter: 4,
    concept: 'dhcp_server',
    learningMoment: 'DHCP is like a hotel reception giving every guest a room number automatically.',
    hint: 'Tired of typing addresses manually? Place a DHCP server on the network to hand out IP addresses automatically!',
    grid: { w: 32, h: 18 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    devicesAllowed: ['server', 'switch', 'router', 'dhcp_server'],
    coins: 100,
    firstTimerTicks: 500,
    cycleTimerTicks: 220,
    deadlineTicks: 50,
    walls: 2,
    start: [
      { id: 1, type: 'laptop', range: [3, 8], required: true, ip: '192.168.1.10', subnet: '192.168.1.0/24', defaultGateway: '192.168.1.1' },
      { id: 2, type: 'laptop', range: [3, 8], required: true, ip: '192.168.1.11', subnet: '192.168.1.0/24', defaultGateway: '192.168.1.1' },
      { id: 3, type: 'laptop', range: [3, 8], required: true, ip: null, subnet: '192.168.1.0/24', defaultGateway: '192.168.1.1' }
    ],
    spawns: [
      { tick: 450, type: 'laptop', range: [3, 8], required: true, ip: null, subnet: '192.168.1.0/24' },
      { tick: 900, type: 'laptop', range: [3, 8], required: true, ip: null, subnet: '192.168.1.0/24' }
    ],
    goal: 'survive_3600',
    targetTicks: 3600,
    stars: ['cost', 'reliability']
  },
  {
    id: '4.2',
    title: '4.2 DNS: The Phone Book',
    chapter: 4,
    concept: 'dns_server',
    learningMoment: 'DNS turns human-friendly names into numerical IP addresses.',
    hint: 'Students remember names like "school.net", not numbers. Connect a DNS server to translate names to IP addresses!',
    grid: { w: 32, h: 18 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    devicesAllowed: ['server', 'switch', 'router', 'dns_server', 'web_server'],
    coins: 100,
    firstTimerTicks: 500,
    cycleTimerTicks: 220,
    deadlineTicks: 50,
    walls: 2,
    servers: [
      { id: 'web', type: 'web', name: 'Web Server', icon: '🌐', color: '#2ec4b6', hostname: 'school.net', ip: '192.168.2.50' }
    ],
    start: [
      { id: 1, type: 'laptop', range: [3, 8], required: true, targetHostname: 'school.net', ip: '192.168.1.10', defaultGateway: '192.168.1.1' },
      { id: 2, type: 'laptop', range: [3, 8], required: true, targetHostname: 'school.net', ip: '192.168.1.11', defaultGateway: '192.168.1.1' },
      { id: 3, type: 'classroom', range: [3, 8], required: true, targetHostname: 'school.net', ip: '192.168.1.12', defaultGateway: '192.168.1.1' }
    ],
    spawns: [
      { tick: 900, type: 'laptop', range: [3, 8], required: true, targetHostname: 'school.net', ip: '192.168.1.13', defaultGateway: '192.168.1.1' }
    ],
    goal: 'survive_3600',
    targetTicks: 3600,
    stars: ['reliability', 'speed']
  },
  {
    id: '4.3',
    title: '4.3 Web Servers and Requests',
    chapter: 4,
    concept: 'web_requests_roundtrip',
    learningMoment: 'Every webpage visit is a question and an answer. The reply must return before the deadline.',
    hint: 'From here on, requests must travel to the Web Server AND the response must travel all the way back to fulfill the request!',
    grid: { w: 32, h: 18 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    devicesAllowed: ['switch', 'web_server'],
    coins: 100,
    firstTimerTicks: 500,
    cycleTimerTicks: 220,
    deadlineTicks: 60,
    walls: 2,
    servers: [
      { id: 'web', type: 'web', name: 'Web Server', icon: '🌐', color: '#2ec4b6', ip: '192.168.1.100' }
    ],
    start: [
      { id: 1, type: 'laptop', range: [3, 8], required: true, targetServerId: 'web' },
      { id: 2, type: 'laptop', range: [3, 8], required: true, targetServerId: 'web' },
      { id: 3, type: 'classroom', range: [3, 8], required: true, targetServerId: 'web' }
    ],
    spawns: [
      { tick: 450, type: 'laptop', range: [3, 8], required: true, targetServerId: 'web' }
    ],
    goal: 'connect_all',
    stars: ['cost', 'speed']
  },
  {
    id: '4.4',
    title: '4.4 Email Servers',
    chapter: 4,
    concept: 'email_servers',
    learningMoment: 'Email moves from depot to depot like parcel delivery.',
    hint: 'Mail travels from laptop to local mail depot, across the router to the remote school depot, and down to the recipient!',
    grid: { w: 32, h: 18 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber', 'single_mode_fiber'],
    devicesAllowed: ['switch', 'router', 'email_server'],
    coins: 120,
    firstTimerTicks: 500,
    cycleTimerTicks: 220,
    deadlineTicks: 60,
    walls: 2,
    servers: [
      { id: 'mail_a', type: 'email', name: 'Mail Depot A', icon: '✉️', color: '#00b4d8', offset: [-6, 0] },
      { id: 'mail_b', type: 'email', name: 'Mail Depot B', icon: '✉️', color: '#0077b6', offset: [6, 0] }
    ],
    start: [
      { id: 1, type: 'laptop', range: [3, 7], required: true, targetServerId: 'mail_a' },
      { id: 2, type: 'laptop', range: [3, 7], required: true, targetServerId: 'mail_a' },
      { id: 3, type: 'laptop', range: [3, 7], required: true, targetServerId: 'mail_b' },
      { id: 4, type: 'laptop', range: [3, 7], required: true, targetServerId: 'mail_b' }
    ],
    spawns: [
      { tick: 900, type: 'laptop', range: [3, 7], required: true, targetServerId: 'mail_a' },
      { tick: 1800, type: 'laptop', range: [3, 7], required: true, targetServerId: 'mail_b' }
    ],
    goal: 'connect_all',
    stars: ['cost', 'reliability']
  },
  {
    id: '4.5',
    title: '4.5 Doors and Ports',
    chapter: 4,
    concept: 'service_ports',
    learningMoment: 'The IP address finds the building. The port number finds the room.',
    hint: 'One server can run multiple services on different ports: Port 80 (Web), Port 25 (Mail), Port 21 (Files). Route requests to the right port!',
    grid: { w: 32, h: 18 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    devicesAllowed: ['switch', 'router', 'web_server', 'email_server'],
    coins: 100,
    firstTimerTicks: 500,
    cycleTimerTicks: 220,
    deadlineTicks: 60,
    walls: 2,
    servers: [
      { id: 'multi', type: 'multi', name: 'Campus Server', icon: '🖥️', color: '#7209b7', portsOpen: [80, 25, 21] }
    ],
    start: [
      { id: 1, type: 'laptop', range: [3, 8], required: true, targetServerId: 'multi', targetPort: 80 },
      { id: 2, type: 'laptop', range: [3, 8], required: true, targetServerId: 'multi', targetPort: 25 },
      { id: 3, type: 'laptop', range: [3, 8], required: true, targetServerId: 'multi', targetPort: 21 },
      { id: 4, type: 'classroom', range: [3, 8], required: true, targetServerId: 'multi', targetPort: 80 }
    ],
    spawns: [
      { tick: 900, type: 'laptop', range: [3, 8], required: true, targetServerId: 'multi', targetPort: 80 },
      { tick: 1500, type: 'laptop', range: [3, 8], required: true, targetServerId: 'multi', targetPort: 25 }
    ],
    goal: 'connect_all',
    stars: ['reliability', 'speed']
  },
  {
    id: '4.6',
    title: '4.6 The Whole School (Chapter 4 Finale)',
    chapter: 4,
    concept: 'chapter_4_finale',
    learningMoment: 'The school network runs itself with automated routing and helper services.',
    hint: 'Build a comprehensive school network with switches, a router, Wi-Fi, DHCP, DNS, and Web servers!',
    grid: { w: 32, h: 18 },
    wiresAllowed: ['twisted_pair', 'coaxial', 'multimode_fiber', 'single_mode_fiber'],
    devicesAllowed: ['switch', 'router', 'access_point', 'dhcp_server', 'dns_server', 'web_server'],
    coins: 160,
    firstTimerTicks: 500,
    cycleTimerTicks: 220,
    deadlineTicks: 60,
    walls: 3,
    servers: [
      { id: 'web', type: 'web', name: 'Web Server', icon: '🌐', color: '#2ec4b6', hostname: 'school.net', ip: '192.168.2.50' }
    ],
    start: [
      { id: 1, type: 'classroom', range: [3, 8], required: true, targetHostname: 'school.net' },
      { id: 2, type: 'classroom', range: [3, 8], required: true, targetHostname: 'school.net' },
      { id: 3, type: 'laptop', range: [3, 8], required: true, targetHostname: 'school.net' },
      { id: 4, type: 'phone', range: [3, 8], required: true, targetHostname: 'school.net' }
    ],
    spawns: [
      { tick: 450, type: 'laptop', range: [3, 8], required: true, targetHostname: 'school.net' },
      { tick: 900, type: 'phone', range: [3, 8], required: true, targetHostname: 'school.net' }
    ],
    goal: 'connect_all',
    stars: ['cost', 'calm']
  }
];

export const CHAPTER_5_LEVELS = [
  {
    id: '5.1',
    title: '5.1 Colour Zones (VLANs)',
    chapter: 5,
    concept: 'color_zones',
    learningMoment: 'One physical network can be split into separate virtual groups. Students, teachers and guests share the same switch, but zones keep their traffic separate.',
    hint: 'Paint switch ports with zone colours! Traffic stays inside its zone. A request to a server in another zone is lost with wrong_zone.',
    grid: { w: 36, h: 20 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    devicesAllowed: ['switch'],
    coins: 100,
    firstTimerTicks: 600,
    cycleTimerTicks: 240,
    deadlineTicks: 50,
    walls: 2,
    servers: [
      { id: 'srv_student', name: 'Student Server', type: 'web', zone: 'blue', color: '#38bdf8', icon: '💻', square: 16 * 36 + 32, mac: '00:ST', ip: '192.168.10.50' },
      { id: 'srv_teacher', name: 'Teacher Server', type: 'web', zone: 'green', color: '#10b981', icon: '🏫', square: 4 * 36 + 32, mac: '00:TC', ip: '192.168.20.50' }
    ],
    start: [
      { id: 1, type: 'laptop', zone: 'blue', range: [3, 8], required: true, targetServerId: 'srv_student' },
      { id: 2, type: 'laptop', zone: 'blue', range: [3, 8], required: true, targetServerId: 'srv_student' },
      { id: 3, type: 'laptop', zone: 'blue', range: [3, 8], required: true, targetServerId: 'srv_student' },
      { id: 4, type: 'laptop', zone: 'blue', range: [3, 8], required: true, targetServerId: 'srv_student' },
      { id: 5, type: 'classroom', zone: 'green', range: [3, 8], required: true, targetServerId: 'srv_teacher' },
      { id: 6, type: 'classroom', zone: 'green', range: [3, 8], required: true, targetServerId: 'srv_teacher' }
    ],
    spawns: [
      { tick: 600, type: 'laptop', zone: 'blue', range: [3, 8], required: true, targetServerId: 'srv_student' },
      { tick: 1200, type: 'classroom', zone: 'green', range: [3, 8], required: true, targetServerId: 'srv_teacher' },
      { tick: 1800, type: 'laptop', zone: 'blue', range: [3, 8], required: true, targetServerId: 'srv_student' }
    ],
    events: [
      { tick: 2100, type: 'WrongZoneTest', targetBuildingId: 1, expectedZone: 'green' }
    ],
    goal: 'survive_3000',
    targetTicks: 3000,
    stars: ['reliability', 'calm']
  },
  {
    id: '5.2',
    title: '5.2 Zones Need a Door',
    chapter: 5,
    concept: 'zones_need_a_door',
    learningMoment: 'Separated zones can only communicate through a router that allows it. A door between zones is a router with a rule.',
    hint: 'Students need access to the library server in the teachers zone! Route traffic through a router with an allow rule. The gradebook server stays unreachable.',
    grid: { w: 36, h: 20 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    devicesAllowed: ['switch', 'router'],
    coins: 110,
    firstTimerTicks: 600,
    cycleTimerTicks: 240,
    deadlineTicks: 50,
    walls: 2,
    servers: [
      { id: 'srv_library', name: 'Library Server', type: 'web', zone: 'green', color: '#10b981', icon: '📚', square: 4 * 36 + 32, mac: '00:LB', ip: '192.168.20.10' },
      { id: 'srv_gradebook', name: 'Gradebook Server', type: 'web', zone: 'green', color: '#e63946', icon: '🔒', square: 16 * 36 + 32, mac: '00:GB', ip: '192.168.20.20' }
    ],
    start: [
      { id: 1, type: 'laptop', zone: 'blue', range: [3, 8], required: true, targetServerId: 'srv_library' },
      { id: 2, type: 'laptop', zone: 'blue', range: [3, 8], required: true, targetServerId: 'srv_library' },
      { id: 3, type: 'laptop', zone: 'blue', range: [3, 8], required: true, targetServerId: 'srv_library' },
      { id: 4, type: 'laptop', zone: 'blue', range: [3, 8], required: true, targetServerId: 'srv_library' },
      { id: 5, type: 'classroom', zone: 'green', range: [3, 8], required: false, targetServerId: 'srv_gradebook' },
      { id: 6, type: 'classroom', zone: 'green', range: [3, 8], required: false, targetServerId: 'srv_gradebook' }
    ],
    spawns: [
      { tick: 600, type: 'laptop', zone: 'blue', range: [3, 8], required: true, targetServerId: 'srv_library' },
      { tick: 1200, type: 'laptop', zone: 'blue', range: [3, 8], required: true, targetServerId: 'srv_library' },
      { tick: 1800, type: 'laptop', zone: 'blue', range: [3, 8], required: true, targetServerId: 'srv_library' }
    ],
    goal: 'connect_all',
    stars: ['cost', 'reliability']
  },
  {
    id: '5.3',
    title: '5.3 Maps for Routers (Static Routes)',
    chapter: 5,
    concept: 'static_routes',
    learningMoment: 'A router needs instructions for reaching networks it is not directly connected to. A static route is a hand-drawn map.',
    hint: 'Configure static routes so routers know how to forward cross-network traffic! To reach Network C, go via Router B.',
    grid: { w: 36, h: 20 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber', 'single_mode_fiber'],
    devicesAllowed: ['router', 'switch'],
    coins: 120,
    firstTimerTicks: 600,
    cycleTimerTicks: 240,
    deadlineTicks: 60,
    walls: 3,
    servers: [
      { id: 'srv_net_c', name: 'Network C Server', type: 'web', color: '#8338ec', icon: '🌐', square: 10 * 36 + 32, mac: '00:NC', subnet: '192.168.30.0/24', ip: '192.168.30.50' }
    ],
    start: [
      { id: 1, type: 'laptop', subnet: '192.168.10.0/24', ip: '192.168.10.2', gateway: '192.168.10.1', targetServerId: 'srv_net_c', required: true },
      { id: 2, type: 'classroom', subnet: '192.168.10.0/24', ip: '192.168.10.3', gateway: '192.168.10.1', targetServerId: 'srv_net_c', required: true },
      { id: 3, type: 'laptop', subnet: '192.168.20.0/24', ip: '192.168.20.2', gateway: '192.168.20.1', targetServerId: 'srv_net_c', required: true },
      { id: 4, type: 'classroom', subnet: '192.168.20.0/24', ip: '192.168.20.3', gateway: '192.168.20.1', targetServerId: 'srv_net_c', required: true },
      { id: 5, type: 'laptop', subnet: '192.168.20.0/24', ip: '192.168.20.5', gateway: '192.168.20.1', targetServerId: 'srv_net_c', required: true },
      { id: 6, type: 'classroom', subnet: '192.168.20.0/24', ip: '192.168.20.6', gateway: '192.168.20.1', targetServerId: 'srv_net_c', required: true }
    ],
    spawns: [
      { tick: 900, type: 'laptop', subnet: '192.168.10.0/24', ip: '192.168.10.4', gateway: '192.168.10.1', targetServerId: 'srv_net_c', required: true },
      { tick: 1200, type: 'laptop', subnet: '192.168.20.0/24', ip: '192.168.20.4', gateway: '192.168.20.1', targetServerId: 'srv_net_c', required: true },
      { tick: 1500, type: 'laptop', subnet: '192.168.10.0/24', ip: '192.168.10.5', gateway: '192.168.10.1', targetServerId: 'srv_net_c', required: true }
    ],
    goal: 'connect_all',
    stars: ['cost', 'speed']
  },
  {
    id: '5.4',
    title: '5.4 Routers That Share Maps (Dynamic Routing)',
    chapter: 5,
    concept: 'dynamic_routing',
    isChallenge: true,
    learningMoment: 'Routers gossip: I can reach this network, and I am this far from it. Dynamic routing recalculates paths when links cut.',
    hint: 'A ring of 4 networks and 4 routers. Enable dynamic routing so routers exchange maps and recover automatically from link cuts!',
    grid: { w: 36, h: 20 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber', 'single_mode_fiber'],
    devicesAllowed: ['router', 'switch'],
    coins: 130,
    firstTimerTicks: 600,
    cycleTimerTicks: 240,
    deadlineTicks: 60,
    walls: 2,
    servers: [
      { id: 'srv_hub', name: 'Ring Core Server', type: 'web', square: 10 * 36 + 18, mac: '00:RC', ip: '192.168.100.50' }
    ],
    start: [
      { id: 1, type: 'laptop', range: [3, 8], required: true, targetServerId: 'srv_hub' },
      { id: 2, type: 'classroom', range: [3, 8], required: true, targetServerId: 'srv_hub' },
      { id: 3, type: 'laptop', range: [3, 8], required: true, targetServerId: 'srv_hub' },
      { id: 4, type: 'classroom', range: [3, 8], required: true, targetServerId: 'srv_hub' },
      { id: 5, type: 'laptop', range: [3, 8], required: true, targetServerId: 'srv_hub' },
      { id: 6, type: 'classroom', range: [3, 8], required: true, targetServerId: 'srv_hub' },
      { id: 7, type: 'laptop', range: [3, 8], required: true, targetServerId: 'srv_hub' },
      { id: 8, type: 'classroom', range: [3, 8], required: true, targetServerId: 'srv_hub' }
    ],
    spawns: [
      { tick: 900, type: 'laptop', range: [3, 8], required: true, targetServerId: 'srv_hub' },
      { tick: 1500, type: 'classroom', range: [3, 8], required: true, targetServerId: 'srv_hub' }
    ],
    events: [
      { tick: 1200, type: 'LinkCut', routerPair: [2, 3] }
    ],
    goal: 'survive_3600',
    targetTicks: 3600,
    stars: ['reliability', 'speed']
  },
  {
    id: '5.5',
    title: '5.5 Growing Campus (Chapter 5 Finale)',
    chapter: 5,
    concept: 'growing_campus',
    learningMoment: 'Big networks are organised networks. Keep everything reachable as buildings keep opening.',
    hint: 'Organise 3 zones and 3 networks with routers and switches. 14 buildings will open sequentially!',
    grid: { w: 36, h: 20 },
    wiresAllowed: ['twisted_pair', 'coaxial', 'multimode_fiber', 'single_mode_fiber'],
    devicesAllowed: ['switch', 'router'],
    coins: 150,
    firstTimerTicks: 600,
    cycleTimerTicks: 240,
    deadlineTicks: 60,
    walls: 3,
    servers: [
      { id: 'srv_campus_web', name: 'Campus Portal', type: 'web', zone: 'blue', color: '#38bdf8', square: 3 * 36 + 32, mac: '00:CP', ip: '192.168.1.50' },
      { id: 'srv_campus_lib', name: 'Campus Library', type: 'web', zone: 'green', color: '#10b981', square: 10 * 36 + 32, mac: '00:CL', ip: '192.168.2.50' },
      { id: 'srv_campus_admin', name: 'Campus Admin', type: 'web', zone: 'orange', color: '#f59e0b', square: 17 * 36 + 32, mac: '00:CA', ip: '192.168.3.50' }
    ],
    start: [
      { id: 1, type: 'laptop', zone: 'blue', range: [3, 8], required: true, targetServerId: 'srv_campus_web' },
      { id: 2, type: 'classroom', zone: 'green', range: [3, 8], required: true, targetServerId: 'srv_campus_lib' },
      { id: 3, type: 'laptop', zone: 'orange', range: [3, 8], required: true, targetServerId: 'srv_campus_admin' },
      { id: 4, type: 'classroom', zone: 'blue', range: [3, 8], required: true, targetServerId: 'srv_campus_web' },
      { id: 5, type: 'laptop', zone: 'green', range: [3, 8], required: true, targetServerId: 'srv_campus_lib' },
      { id: 6, type: 'classroom', zone: 'orange', range: [3, 8], required: true, targetServerId: 'srv_campus_admin' }
    ],
    spawns: [
      { tick: 400, type: 'laptop', zone: 'blue', range: [3, 8], required: true, targetServerId: 'srv_campus_web' },
      { tick: 800, type: 'classroom', zone: 'green', range: [3, 8], required: true, targetServerId: 'srv_campus_lib' },
      { tick: 1200, type: 'laptop', zone: 'orange', range: [3, 8], required: true, targetServerId: 'srv_campus_admin' },
      { tick: 1600, type: 'classroom', zone: 'blue', range: [3, 8], required: true, targetServerId: 'srv_campus_web' },
      { tick: 2000, type: 'laptop', zone: 'green', range: [3, 8], required: true, targetServerId: 'srv_campus_lib' },
      { tick: 2400, type: 'classroom', zone: 'orange', range: [3, 8], required: true, targetServerId: 'srv_campus_admin' },
      { tick: 2800, type: 'laptop', zone: 'blue', range: [3, 8], required: true, targetServerId: 'srv_campus_web' },
      { tick: 3200, type: 'classroom', zone: 'green', range: [3, 8], required: true, targetServerId: 'srv_campus_lib' }
    ],
    goal: 'connect_all',
    stars: ['cost', 'calm']
  }
];

export const CHAPTER_6_LEVELS = [
  {
    id: '6.1',
    title: '6.1 Firewalls: The Bouncer',
    chapter: 6,
    concept: 'firewall',
    learningMoment: 'A firewall checks every packet against a guest list. It allows or blocks traffic based on rules.',
    hint: 'Place a firewall and configure rule cards (Allow/Block) to block rogue traffic while allowing legitimate student packets!',
    grid: { w: 36, h: 20 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    devicesAllowed: ['firewall', 'switch', 'router'],
    coins: 110,
    firstTimerTicks: 600,
    cycleTimerTicks: 240,
    deadlineTicks: 50,
    walls: 2,
    servers: [
      { id: 'srv_main', name: 'School Central Server', type: 'web', square: 10 * 36 + 32, mac: '00:CS', ip: '192.168.1.50' }
    ],
    start: [
      { id: 1, type: 'laptop', ip: '192.168.1.10', range: [3, 8], required: true, targetServerId: 'srv_main' },
      { id: 2, type: 'laptop', ip: '192.168.1.11', range: [3, 8], required: true, targetServerId: 'srv_main' },
      { id: 3, type: 'classroom', ip: '192.168.1.12', range: [3, 8], required: true, targetServerId: 'srv_main' },
      { id: 4, type: 'classroom', ip: '192.168.1.13', range: [3, 8], required: true, targetServerId: 'srv_main' },
      { id: 99, type: 'laptop', isRogue: true, ip: '10.99.99.99', name: 'Rogue Device', range: [3, 8], required: false, targetServerId: 'srv_main' }
    ],
    events: [
      { tick: 1000, type: 'TrafficFlood', sourceBuildingId: 99 }
    ],
    goal: 'survive_3600',
    targetTicks: 3600,
    stars: ['reliability', 'speed']
  },
  {
    id: '6.2',
    title: '6.2 Locked Envelopes (Encryption)',
    chapter: 6,
    concept: 'encryption',
    learningMoment: 'A plain packet is a postcard. An encrypted packet is a sealed, locked envelope.',
    hint: 'An eavesdropper (Snoop) sits on untrusted lines! Turn on link encryption so Snoop sees only scrambled symbols.',
    grid: { w: 36, h: 20 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber', 'single_mode_fiber'],
    devicesAllowed: ['switch', 'router'],
    coins: 100,
    firstTimerTicks: 600,
    cycleTimerTicks: 240,
    deadlineTicks: 50,
    walls: 2,
    snoopSquares: [10 * 36 + 18],
    servers: [
      { id: 'srv_secure', name: 'Secret Exam Server', type: 'web', square: 10 * 36 + 32, mac: '00:ES', ip: '192.168.1.50' }
    ],
    start: [
      { id: 1, type: 'laptop', range: [3, 8], required: true, targetServerId: 'srv_secure' },
      { id: 2, type: 'laptop', range: [3, 8], required: true, targetServerId: 'srv_secure' },
      { id: 3, type: 'classroom', range: [3, 8], required: true, targetServerId: 'srv_secure' },
      { id: 4, type: 'classroom', range: [3, 8], required: true, targetServerId: 'srv_secure' }
    ],
    goal: 'survive_3000',
    targetTicks: 3000,
    stars: ['reliability', 'calm']
  },
  {
    id: '6.3',
    title: '6.3 The Reception Desk (NAT)',
    chapter: 6,
    concept: 'nat',
    isChallenge: true,
    learningMoment: 'Like a school reception forwarding calls without sharing every classrooms direct number. NAT lets many private devices share one public address.',
    hint: 'Private addresses (192.168.x.x) cannot cross the open internet directly! Enable NAT on the border router so all devices share one public IP.',
    grid: { w: 36, h: 20 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber', 'single_mode_fiber'],
    devicesAllowed: ['router', 'switch'],
    coins: 120,
    firstTimerTicks: 600,
    cycleTimerTicks: 240,
    deadlineTicks: 50,
    walls: 3,
    servers: [
      { id: 'srv_public_cloud', name: 'Cloud Web Service', type: 'web', square: 10 * 36 + 33, mac: '00:CW', ip: '8.8.8.8', isPublic: true }
    ],
    start: [
      { id: 1, type: 'laptop', ip: '192.168.1.10', range: [3, 8], required: true, targetServerId: 'srv_public_cloud' },
      { id: 2, type: 'laptop', ip: '192.168.1.11', range: [3, 8], required: true, targetServerId: 'srv_public_cloud' },
      { id: 3, type: 'laptop', ip: '192.168.1.12', range: [3, 8], required: true, targetServerId: 'srv_public_cloud' },
      { id: 4, type: 'classroom', ip: '192.168.1.13', range: [3, 8], required: true, targetServerId: 'srv_public_cloud' },
      { id: 5, type: 'classroom', ip: '192.168.1.14', range: [3, 8], required: true, targetServerId: 'srv_public_cloud' },
      { id: 6, type: 'classroom', ip: '192.168.1.15', range: [3, 8], required: true, targetServerId: 'srv_public_cloud' }
    ],
    spawns: [
      { tick: 600, type: 'laptop', ip: '192.168.1.16', range: [3, 8], required: true, targetServerId: 'srv_public_cloud' },
      { tick: 1200, type: 'laptop', ip: '192.168.1.17', range: [3, 8], required: true, targetServerId: 'srv_public_cloud' },
      { tick: 1800, type: 'laptop', ip: '192.168.1.18', range: [3, 8], required: true, targetServerId: 'srv_public_cloud' }
    ],
    goal: 'connect_all',
    stars: ['cost', 'reliability']
  },
  {
    id: '6.4',
    title: '6.4 The Private Tunnel (VPN)',
    chapter: 6,
    concept: 'vpn',
    learningMoment: 'A VPN builds a protected path across an untrusted network. A tunnel keeps the journey private.',
    hint: 'Build a VPN tunnel across the untrusted network between two VPN gateways to protect remote teachers from Snoop!',
    grid: { w: 36, h: 20 },
    wiresAllowed: ['twisted_pair', 'single_mode_fiber'],
    devicesAllowed: ['vpn_gateway', 'router', 'switch'],
    coins: 130,
    firstTimerTicks: 600,
    cycleTimerTicks: 240,
    deadlineTicks: 60,
    walls: 2,
    snoopSquares: [10 * 36 + 18],
    servers: [
      { id: 'srv_school_db', name: 'School Internal DB', type: 'web', square: 10 * 36 + 32, mac: '00:ID', ip: '192.168.10.50' }
    ],
    start: [
      { id: 1, type: 'home', ip: '10.0.0.10', name: 'Teacher Home A', range: [3, 8], required: true, targetServerId: 'srv_school_db' },
      { id: 2, type: 'home', ip: '10.0.0.11', name: 'Teacher Home B', range: [3, 8], required: true, targetServerId: 'srv_school_db' },
      { id: 3, type: 'classroom', ip: '192.168.10.2', range: [3, 8], required: true, targetServerId: 'srv_school_db' },
      { id: 4, type: 'classroom', ip: '192.168.10.3', range: [3, 8], required: true, targetServerId: 'srv_school_db' }
    ],
    goal: 'survive_3600',
    targetTicks: 3600,
    stars: ['reliability', 'speed']
  },
  {
    id: '6.5',
    title: '6.5 Chapter Finale: Secure School',
    chapter: 6,
    concept: 'secure_school',
    learningMoment: 'Security protects without blocking learning. Keep legitimate traffic flowing while guarding against intrusions and eavesdropping.',
    hint: 'Defend the campus using firewalls, encryption, VPN gateways, and zones against combined security events!',
    grid: { w: 36, h: 20 },
    wiresAllowed: ['twisted_pair', 'coaxial', 'multimode_fiber', 'single_mode_fiber'],
    devicesAllowed: ['firewall', 'vpn_gateway', 'router', 'switch'],
    coins: 160,
    firstTimerTicks: 600,
    cycleTimerTicks: 240,
    deadlineTicks: 60,
    walls: 3,
    snoopSquares: [10 * 36 + 18],
    servers: [
      { id: 'srv_school_web', name: 'School Web', type: 'web', zone: 'blue', color: '#38bdf8', square: 4 * 36 + 32, mac: '00:SW', ip: '192.168.1.50' },
      { id: 'srv_admin', name: 'Admin Records', type: 'web', zone: 'green', color: '#10b981', square: 16 * 36 + 32, mac: '00:AR', ip: '192.168.2.50' }
    ],
    start: [
      { id: 1, type: 'laptop', zone: 'blue', range: [3, 8], required: true, targetServerId: 'srv_school_web' },
      { id: 2, type: 'laptop', zone: 'blue', range: [3, 8], required: true, targetServerId: 'srv_school_web' },
      { id: 3, type: 'classroom', zone: 'green', range: [3, 8], required: true, targetServerId: 'srv_admin' },
      { id: 4, type: 'classroom', zone: 'green', range: [3, 8], required: true, targetServerId: 'srv_admin' },
      { id: 5, type: 'home', ip: '10.0.0.10', name: 'Teacher Home', range: [3, 8], required: true, targetServerId: 'srv_admin' },
      { id: 99, type: 'laptop', isRogue: true, ip: '10.99.99.99', name: 'Rogue Device', range: [3, 8], required: false, targetServerId: 'srv_admin' }
    ],
    spawns: [
      { tick: 600, type: 'laptop', zone: 'blue', range: [3, 8], required: true, targetServerId: 'srv_school_web' },
      { tick: 1200, type: 'classroom', zone: 'green', range: [3, 8], required: true, targetServerId: 'srv_admin' },
      { tick: 1800, type: 'laptop', zone: 'blue', range: [3, 8], required: true, targetServerId: 'srv_school_web' }
    ],
    events: [
      { tick: 800, type: 'TrafficFlood', sourceBuildingId: 99 },
      { tick: 1800, type: 'CableCut', targetDescription: 'Primary Link' }
    ],
    goal: 'connect_all',
    stars: ['cost', 'calm']
  }
];

export const CHAPTER_7_LEVELS = [
  {
    id: '7.1',
    title: '7.1 Backup Roads (Redundancy)',
    chapter: 7,
    concept: 'redundancy',
    learningMoment: 'Extra paths keep the network alive when one fails.',
    hint: 'A single link connects the school to the internet. When it is cut, everything goes dark. Build a redundant backup link so traffic survives the cut!',
    grid: { w: 40, h: 22 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber', 'single_mode_fiber'],
    devicesAllowed: ['switch', 'router'],
    coins: 120,
    firstTimerTicks: 600,
    cycleTimerTicks: 240,
    deadlineTicks: 50,
    walls: 2,
    servers: [
      { id: 'srv_isp', name: 'Internet Gateway', type: 'web', square: 11 * 40 + 36, mac: '00:IG', ip: '203.0.113.1' }
    ],
    start: [
      { id: 1, type: 'laptop', range: [3, 8], required: true, targetServerId: 'srv_isp' },
      { id: 2, type: 'laptop', range: [3, 8], required: true, targetServerId: 'srv_isp' },
      { id: 3, type: 'classroom', range: [3, 8], required: true, targetServerId: 'srv_isp' },
      { id: 4, type: 'classroom', range: [3, 8], required: true, targetServerId: 'srv_isp' }
    ],
    events: [
      { tick: 1200, type: 'CableCut', targetDescription: 'Primary Uplink' },
      { tick: 2600, type: 'CableCut', targetDescription: 'Secondary Link' }
    ],
    goal: 'survive_4200',
    targetTicks: 4200,
    stars: ['reliability', 'cost']
  },
  {
    id: '7.2',
    title: '7.2 Too Many Roads (Loops)',
    chapter: 7,
    concept: 'loop_guard',
    learningMoment: 'A network can have backup roads, but not roads that go in circles. Loop Guard (Spanning Tree) blocks loops until needed.',
    hint: 'A triangle loop of switches creates a packet storm! Enable Loop Guard on switches to block the loop until an active link breaks.',
    grid: { w: 40, h: 22 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    devicesAllowed: ['switch'],
    coins: 110,
    firstTimerTicks: 600,
    cycleTimerTicks: 240,
    deadlineTicks: 50,
    walls: 2,
    servers: [
      { id: 'srv_core', name: 'Core Server', type: 'web', square: 11 * 40 + 36, mac: '00:CC', ip: '192.168.1.100' }
    ],
    start: [
      { id: 1, type: 'laptop', range: [3, 8], required: true, targetServerId: 'srv_core' },
      { id: 2, type: 'laptop', range: [3, 8], required: true, targetServerId: 'srv_core' },
      { id: 3, type: 'classroom', range: [3, 8], required: true, targetServerId: 'srv_core' },
      { id: 4, type: 'classroom', range: [3, 8], required: true, targetServerId: 'srv_core' }
    ],
    events: [
      { tick: 1500, type: 'CableCut', targetDescription: 'Primary Inter-Switch Trunk' }
    ],
    goal: 'survive_3000',
    targetTicks: 3000,
    stars: ['calm', 'reliability']
  },
  {
    id: '7.3',
    title: '7.3 Sharing the Load (Load Balancing)',
    chapter: 7,
    concept: 'load_balancing',
    learningMoment: 'Many hands make light work. Spreading traffic across several servers keeps things fast.',
    hint: 'A popular server is overwhelmed! Place a Load Balancer to share requests across dual servers. If one crashes, failover seamlessly!',
    grid: { w: 40, h: 22 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    devicesAllowed: ['load_balancer', 'switch', 'router'],
    coins: 130,
    firstTimerTicks: 500,
    cycleTimerTicks: 180,
    deadlineTicks: 40,
    walls: 2,
    servers: [
      { id: 'srv_cluster_1', name: 'Web Server A', type: 'web', square: 6 * 40 + 36, mac: '00:W1', ip: '192.168.1.11' },
      { id: 'srv_cluster_2', name: 'Web Server B', type: 'web', square: 16 * 40 + 36, mac: '00:W2', ip: '192.168.1.12' }
    ],
    start: [
      { id: 1, type: 'laptop', range: [3, 8], required: true, targetServerId: 'srv_cluster_1' },
      { id: 2, type: 'laptop', range: [3, 8], required: true, targetServerId: 'srv_cluster_1' },
      { id: 3, type: 'laptop', range: [3, 8], required: true, targetServerId: 'srv_cluster_1' },
      { id: 4, type: 'classroom', range: [3, 8], required: true, targetServerId: 'srv_cluster_2' },
      { id: 5, type: 'classroom', range: [3, 8], required: true, targetServerId: 'srv_cluster_2' },
      { id: 6, type: 'classroom', range: [3, 8], required: true, targetServerId: 'srv_cluster_2' }
    ],
    events: [
      { tick: 1800, type: 'ServerCrash', serverId: 'srv_cluster_1' }
    ],
    goal: 'survive_3600',
    targetTicks: 3600,
    stars: ['speed', 'reliability']
  },
  {
    id: '7.4',
    title: '7.4 Network Detective: Test and Trace',
    chapter: 7,
    concept: 'test_and_trace',
    learningMoment: 'Troubleshooting is a method, not a guess. Start at the device and work outward, one step at a time.',
    hint: 'Use Test Message and Packet Trace to locate silent faults and power cuts! Follow Bits checklist step-by-step.',
    grid: { w: 40, h: 22 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    devicesAllowed: ['backup_power', 'switch', 'router'],
    coins: 120,
    firstTimerTicks: 600,
    cycleTimerTicks: 240,
    deadlineTicks: 50,
    walls: 2,
    servers: [
      { id: 'srv_main_hub', name: 'District Portal', type: 'web', square: 11 * 40 + 36, mac: '00:DP', ip: '192.168.1.50' }
    ],
    start: [
      { id: 1, type: 'laptop', range: [3, 8], required: true, targetServerId: 'srv_main_hub' },
      { id: 2, type: 'laptop', range: [3, 8], required: true, targetServerId: 'srv_main_hub' },
      { id: 3, type: 'classroom', range: [3, 8], required: true, targetServerId: 'srv_main_hub' },
      { id: 4, type: 'classroom', range: [3, 8], required: true, targetServerId: 'srv_main_hub' }
    ],
    events: [
      { tick: 1400, type: 'PowerCut', deviceSquare: 11 * 40 + 20, targetDeviceType: 'switch' }
    ],
    goal: 'survive_3600',
    targetTicks: 3600,
    stars: ['calm', 'speed']
  },
  {
    id: '7.5',
    title: '7.5 Detective Cases',
    chapter: 7,
    concept: 'detective_cases',
    learningMoment: 'Every fault has a clue. Diagnose and fix each broken scenario using systematic network troubleshooting.',
    hint: 'Six short pre-broken networks, each with one fault. Diagnose and fix each one!',
    grid: { w: 40, h: 22 },
    wiresAllowed: ['twisted_pair', 'multimode_fiber'],
    devicesAllowed: ['switch', 'router', 'dns_server'],
    coins: 100,
    firstTimerTicks: 600,
    cycleTimerTicks: 240,
    deadlineTicks: 50,
    walls: 2,
    servers: [
      { id: 'srv_case', name: 'Case Server', type: 'web', square: 11 * 40 + 36, mac: '00:CS', ip: '192.168.1.100' }
    ],
    start: [
      { id: 1, type: 'laptop', ip: '192.168.1.10', gateway: '192.168.99.1', range: [3, 8], required: true, targetServerId: 'srv_case' },
      { id: 2, type: 'classroom', ip: '192.168.1.11', gateway: '192.168.1.1', range: [3, 8], required: true, targetServerId: 'srv_case' }
    ],
    detectiveCases: [
      { caseNum: 1, name: 'Wrong Gateway', fault: 'wrong_gateway', description: 'Device 1 has gateway set to 192.168.99.1 instead of 192.168.1.1.' },
      { caseNum: 2, name: 'Duplicate Address', fault: 'duplicate_ip', description: 'Two computers configured with the same IP address 192.168.1.10.' },
      { caseNum: 3, name: 'Cut Cable', fault: 'cut_cable', description: 'The server uplink cable is severed.' },
      { caseNum: 4, name: 'Missing Route', fault: 'missing_route', description: 'Router has no routing entry to reach Network C.' },
      { caseNum: 5, name: 'DNS Problem', fault: 'dns_problem', description: 'Host school.net cannot be resolved because DNS record is missing.' },
      { caseNum: 6, name: 'A Loop', fault: 'a_loop', description: 'Three switches connected in a triangle loop without Loop Guard.' }
    ],
    goal: 'connect_all',
    stars: ['speed', 'calm']
  },
  {
    id: '7.6',
    title: '7.6 Grand Finale: NetCity',
    chapter: 7,
    concept: 'netcity_grand_finale',
    learningMoment: 'You built NetCitys network. A resilient, scalable city network ready for anything!',
    hint: 'A large city network with 20 buildings, multiple zones, routers, servers, and backups. Maintain citizen Happiness >= 80% for 3,600 ticks!',
    grid: { w: 40, h: 22 },
    wiresAllowed: ['twisted_pair', 'coaxial', 'multimode_fiber', 'single_mode_fiber'],
    devicesAllowed: ['switch', 'router', 'access_point', 'load_balancer', 'firewall', 'vpn_gateway', 'backup_power', 'dhcp_server', 'dns_server', 'web_server'],
    coins: 250,
    firstTimerTicks: 600,
    cycleTimerTicks: 240,
    deadlineTicks: 60,
    walls: 4,
    servers: [
      { id: 'srv_city_web1', name: 'City Web Alpha', type: 'web', square: 4 * 40 + 36, mac: '00:C1', ip: '10.0.1.10' },
      { id: 'srv_city_web2', name: 'City Web Beta', type: 'web', square: 8 * 40 + 36, mac: '00:C2', ip: '10.0.1.11' },
      { id: 'srv_city_db', name: 'City Database', type: 'web', square: 16 * 40 + 36, mac: '00:CD', ip: '10.0.2.20' }
    ],
    start: [
      { id: 1, type: 'laptop', zone: 'blue', square: 2 * 40 + 4, range: [3, 8], required: true, targetServerId: 'srv_city_web1' },
      { id: 2, type: 'laptop', zone: 'blue', square: 4 * 40 + 6, range: [3, 8], required: true, targetServerId: 'srv_city_web2' },
      { id: 3, type: 'classroom', zone: 'green', square: 6 * 40 + 4, range: [3, 8], required: true, targetServerId: 'srv_city_web1' },
      { id: 4, type: 'classroom', zone: 'green', square: 8 * 40 + 6, range: [3, 8], required: true, targetServerId: 'srv_city_db' },
      { id: 5, type: 'home', ip: '10.0.3.1', square: 10 * 40 + 4, range: [3, 8], required: true, targetServerId: 'srv_city_web2' },
      { id: 6, type: 'home', ip: '10.0.3.2', square: 12 * 40 + 6, range: [3, 8], required: true, targetServerId: 'srv_city_db' },
      { id: 7, type: 'laptop', zone: 'orange', square: 14 * 40 + 4, range: [3, 8], required: true, targetServerId: 'srv_city_web1' },
      { id: 8, type: 'laptop', zone: 'orange', square: 16 * 40 + 6, range: [3, 8], required: false, targetServerId: 'srv_city_web2' },
      { id: 9, type: 'classroom', zone: 'green', square: 18 * 40 + 4, range: [3, 8], required: false, targetServerId: 'srv_city_db' },
      { id: 10, type: 'classroom', zone: 'blue', square: 20 * 40 + 6, range: [3, 8], required: true, targetServerId: 'srv_city_db' }
    ],
    spawns: [
      { tick: 300, type: 'laptop', zone: 'green', range: [3, 8], required: true, targetServerId: 'srv_city_web1' },
      { tick: 600, type: 'classroom', zone: 'blue', range: [3, 8], required: true, targetServerId: 'srv_city_web2' },
      { tick: 900, type: 'home', ip: '10.0.3.3', range: [3, 8], required: true, targetServerId: 'srv_city_db' },
      { tick: 1200, type: 'laptop', zone: 'orange', range: [3, 8], required: true, targetServerId: 'srv_city_web1' },
      { tick: 1500, type: 'phone', range: [3, 8], required: false, targetServerId: 'srv_city_web2' },
      { tick: 1800, type: 'tablet', range: [3, 8], required: false, targetServerId: 'srv_city_db' },
      { tick: 2100, type: 'classroom', zone: 'green', range: [3, 8], required: true, targetServerId: 'srv_city_web1' },
      { tick: 2400, type: 'laptop', zone: 'blue', range: [3, 8], required: true, targetServerId: 'srv_city_web2' },
      { tick: 2700, type: 'home', ip: '10.0.3.4', range: [3, 8], required: true, targetServerId: 'srv_city_db' },
      { tick: 3000, type: 'classroom', zone: 'orange', range: [3, 8], required: true, targetServerId: 'srv_city_web1' }
    ],
    goal: 'keep_happy',
    targetTicks: 3600,
    minHappiness: 80,
    stars: ['calm', 'reliability']
  }
];

export const ALL_LEVELS = [
  ...CHAPTER_1_LEVELS,
  ...CHAPTER_2_LEVELS,
  ...CHAPTER_3_LEVELS,
  ...CHAPTER_4_LEVELS,
  ...CHAPTER_5_LEVELS,
  ...CHAPTER_6_LEVELS,
  ...CHAPTER_7_LEVELS
];

export function getLevelById(id) {
  return ALL_LEVELS.find(l => l.id === id) || null;
}
