/**
 * NetCity v2.0 - Chief Juno Text Pack
 * Companion to NetCity Chief Juno Text Pack (Version 1.0)
 * Every line spoken by Chief Juno, the head network engineer and mentor.
 * Voice: calm, warm, plain, patient, honest. <= 110 chars per line.
 */

export const DEFAULT_PLAYER_NAME = 'Apprentice';

export const CHAPTER_FINALE_IDS = new Set(['1.9', '2.5', '3.8', '4.6', '5.5', '6.5', '7.6']);

export const JUNO_CHAPTER_VOCAB = {
  1: ['network', 'device', 'server', 'message', 'packet', 'cable', 'wire', 'twisted pair', 'coaxial', 'shield', 'fiber', 'wireless', 'Wi-Fi', 'bandwidth', 'coins'],
  2: ['hub', 'switch', 'collision', 'device ID', 'MAC address', 'star network'],
  3: ['router', 'address', 'IP address', 'street', 'gateway', 'hop'],
  4: ['DHCP', 'DNS', 'web server', 'email server', 'request', 'reply', 'door', 'port'],
  5: ['zone', 'VLAN', 'route', 'map', 'static route', 'dynamic routing'],
  6: ['firewall', 'rule', 'encryption', 'sealed envelope', 'public address', 'NAT', 'tunnel', 'VPN'],
  7: ['backup', 'redundancy', 'loop', 'load balancer', 'Test Message', 'Trace', 'checklist']
};

export const JUNO_TEXT = {
  // ── 4. Chapter openings and closings ───────────────────────────────────────
  'juno.open.1.1': "Welcome to NetCity, {name}. I'm Chief Juno, and I'll show you how a network is built.",
  'juno.open.1.2': "The new campus has power but no network. Let's fix that before the school opens.",
  'juno.close.1': "You can now choose the right connection for the job. That is where every network starts.",

  'juno.open.2.1': "The campus is growing and the cables are tangling. There has to be a tidier way.",
  'juno.open.2.2': "Today we learn how many devices can share the same wire.",
  'juno.close.2': "You've seen why switches win. Tidy networks grow, and shouting ones don't.",

  'juno.open.3.1': "Homes, the school, the library: each one is a little island.",
  'juno.open.3.2': "This chapter, we build the bridges between them.",
  'juno.close.3': "Three networks now talk as one town. Addresses and routers aren't a mystery any more.",

  'juno.open.4.1': "Hundreds of devices are arriving. Nobody can set up each one by hand.",
  'juno.open.4.2': "Let's teach the network to look after itself.",
  'juno.close.4': "The school runs itself now. Addresses, names, pages and mail are all looked after.",

  'juno.open.5.1': "A big campus works best when it's organised. Students, teachers and guests all need space.",
  'juno.open.5.2': "We'll learn to divide a network, and to give routers a map.",
  'juno.close.5': "A big network, organised and mapped. That is exactly how real ones are built.",

  'juno.open.6.1': "Someone has been reading our messages. A network has to protect what travels across it.",
  'juno.open.6.2': "Let's learn how to guard the gates.",
  'juno.close.6': "Safe, sealed and well guarded. You protected the school without blocking anyone who belonged.",

  'juno.open.7.1': "Things break. That isn't failure, that's networking. Good networks expect it.",
  'juno.open.7.2': "This chapter, we build to survive and learn to find faults fast.",
  'juno.close.7': "That's the last lesson, {name}. Everything from here is yours to build.",

  // ── 5. Level intros ────────────────────────────────────────────────────────
  'juno.lvl.1.1': "Welcome, {name}. A network is just devices that can talk. Let's connect your very first two.",
  'juno.lvl.1.2': "Twisted pair is cheap and everywhere. Let's see how far it can really go.",
  'juno.lvl.1.3': "Some cables wear a metal shield. Today we find out what that shield is for.",
  'juno.lvl.1.4': "Some places are too far for copper. Time to meet fiber: light inside glass.",
  'juno.lvl.1.5': "The new campus is across the river. For a trip this long, ordinary fiber isn't enough.",
  'juno.lvl.1.6': "Not every device needs a cable. Let's try a signal through the air.",
  'juno.lvl.1.7': "Ten laptops, one cable. Watch what happens, then we'll make room.",
  'juno.lvl.1.8': "Every wire has a best use. Choose well and the coins will stretch.",
  'juno.lvl.1.9': "Today is Campus Day One. Build it one building at a time, and stay calm.",

  'juno.lvl.2.1': "Wire everyone to everyone and see what happens. Then we'll tidy up.",
  'juno.lvl.2.2': "Let's meet the hub. It repeats every message to every device. Watch the crowd.",
  'juno.lvl.2.3': "A switch is smarter. It sends each message only where it needs to go.",
  'juno.lvl.2.4': "Every device has its own ID. Watch the switch write them down as it learns.",
  'juno.lvl.2.5': "The computer lab opens today, twenty machines. You know exactly what to use.",

  'juno.lvl.3.1': "Two networks, one river between them. Notice where the messages get stuck.",
  'juno.lvl.3.2': "A router joins networks together. Place one between the two sides.",
  'juno.lvl.3.3': "Every device needs its own address, like a house number. Hand them out.",
  'juno.lvl.3.4': "Same street or different street? The address tells devices which is which.",
  'juno.lvl.3.5': "To leave their own street, devices need to know the front door. That is the gateway.",
  'juno.lvl.3.6': "Two devices share one address, and messages get confused. Can you spot them?",
  'juno.lvl.3.7': "Messages can cross more than one router. Follow one and count the hops.",
  'juno.lvl.3.8': "The whole town is joining in. Addresses, gateways, routers. You've got this.",

  'juno.lvl.4.1': "Typing addresses by hand is tiring. Let's give the job to a server.",
  'juno.lvl.4.2': "People remember names, computers use numbers. Let's add a phone book.",
  'juno.lvl.4.3': "Every web page is a question and an answer. Watch both make the trip.",
  'juno.lvl.4.4': "Email travels from depot to depot. Follow one message across two schools.",
  'juno.lvl.4.5': "One server, many jobs, and each job has its own door. Send each message to the right one.",
  'juno.lvl.4.6': "The whole school is opening. Every service has to work together. Take your time.",

  'juno.lvl.5.1': "A big network can be split into zones, like classrooms in one building.",
  'juno.lvl.5.2': "Zones stay apart unless a door is opened. Open only the one that's needed.",
  'juno.lvl.5.3': "A router can only reach what it has a map for. Let's draw one.",
  'juno.lvl.5.4': "This one is a challenge. Routers can share maps, so paths update themselves. Skip it if you like.",
  'juno.lvl.5.5': "The campus keeps growing. Keep every zone, door and route tidy as it does.",

  'juno.lvl.6.1': "A firewall checks every message against a list. Decide who gets in.",
  'juno.lvl.6.2': "Someone is peeking at our messages. Let's put them in sealed envelopes.",
  'juno.lvl.6.3': "A challenge. Twenty devices can share one public address. Skip it if you like.",
  'juno.lvl.6.4': "A teacher is working from home. Let's give her a private tunnel to school.",
  'juno.lvl.6.5': "Everything we've learned about staying safe, all at once. Go carefully.",

  'juno.lvl.7.1': "One link is a risk. Expect it to fail, then make sure there's a second.",
  'juno.lvl.7.2': "Extra roads are good. Roads that loop back on themselves are not. Watch.",
  'juno.lvl.7.3': "A popular server can be overwhelmed. Let's share the work between two.",
  'juno.lvl.7.4': "When something breaks, work from the device outward, one step at a time.",
  'juno.lvl.7.5': "Six broken networks, one fault each. Look for the clue. Every fault leaves one.",
  'juno.lvl.7.6': "This is NetCity, the whole city. Keep it running, {name}. You're ready.",

  'juno.lvl.case_1': "Case one. A laptop reaches its neighbours but nobody else. What's different about it?",
  'juno.lvl.case_2': "Case two. Messages sometimes arrive and sometimes go astray. Check the addresses.",
  'juno.lvl.case_3': "Case three. Part of the network has gone quiet. Trace a message and see where it stops.",
  'juno.lvl.case_4': "Case four. Messages reach the middle, then vanish. Ask the router what it knows.",
  'juno.lvl.case_5': "Case five. The website works by number but not by name. Who looks up names?",
  'juno.lvl.case_6': "Case six. Everything is flooding with copies. Where does the road loop?",

  // ── 6. Tutorial script, level 1.1 ──────────────────────────────────────────
  'juno.tut.1': "This is your map. The square machine is the server. It holds the website.",
  'juno.tut.2': "That laptop wants to reach the server. Tap it to begin.",
  'juno.tut.3': "Pick a wire. Twisted pair is the one we have for now.",
  'juno.tut.4': "Drag from the laptop to the server, or tap the laptop and then the server.",
  'juno.tut.5': "See the little envelope? It's a message travelling along your wire.",
  'juno.tut.6': "When it arrives, the laptop smiles and you earn a coin. Coins pay for wires.",
  'juno.tut.7': "The ring around the laptop is its timer. Keep it fed with delivered messages.",
  'juno.tut.8': "Made a mistake? Undo takes the last wire back and refunds you.",
  'juno.tut.9': "That's it. You've built a network. Two devices, but it's a start.",

  // ── 7. Reactions: winning ──────────────────────────────────────────────────
  'juno.win.first_ever': "Your first network, {name}. I still remember mine.",
  'juno.win.1_star': "It works, and that's what counts. Want to see if you can make it a little tidier?",
  'juno.win.2_stars': "Well done, {name}. Nearly perfect. One small improvement is hiding in there.",
  'juno.win.3_stars': "Beautiful work, {name}. That's how a professional would have done it.",
  'juno.win.missing_cost': "A few coins could have been saved. Look for a shorter route or a cheaper wire.",
  'juno.win.missing_reliability': "Everything held, but not without a wobble. A backup or a quicker fix would help.",
  'juno.win.missing_speed': "Messages arrived, just slowly. Look at the long routes.",
  'juno.win.missing_calm': "The wires got crowded. Spreading the load would keep them calmer.",
  'juno.win.after_rewind': "You learned from what happened and fixed it. That's real engineering.",
  'juno.win.finale_1_9': "Campus Day One is open. That's a real network, and you built it.",
  'juno.win.finale_2_5': "Twenty machines, no jams. The lab is ready for its first class.",
  'juno.win.finale_3_8': "One town, three networks, no gaps. Well connected, {name}.",
  'juno.win.finale_4_6': "The school runs itself. Every device, every name, every page.",
  'juno.win.finale_5_5': "Zones, doors and routes, all in order. That's a well-run campus.",
  'juno.win.finale_6_5': "Safe and open at once. That's the hardest balance in networking.",
  'juno.win.finale_7_6': "The city is running, and it's running well. I'm proud of you, {name}.",
  'juno.win.detective_solved': "Case closed. You followed the clue and found the fault.",

  // ── 8. Reactions: level over ───────────────────────────────────────────────
  'juno.over.any': "That building ran out of time. It happens to every engineer. Let's see what went wrong.",
  'juno.over.no_link': "{building} never got a wire. New buildings always need attention first.",
  'juno.over.signal_faded': "That wire was too long, so the signal faded. Try a wire that goes further.",
  'juno.over.noise': "Electrical noise ate those messages. A shielded wire would have helped.",
  'juno.over.overflow': "The wire was overloaded. More capacity or another route would have helped.",
  'juno.over.event_active': "Something broke and wasn't fixed in time. Inspect first, next time.",
  'juno.over.missing_setting': "Something small was missing: an address, a gateway or a route. Check the basics first.",
  'juno.over.blocked_or_exposed': "The rules were too tight, or too loose. A good rule lets the right traffic through.",
  'juno.over.single_point': "One link carried everything, and it broke. A second path would have saved us.",
  'juno.over.offer_rewind': "We can go back thirty seconds. Take a breath and try again.",
  'juno.over.offer_retry': "Same city, fresh start. You know more now than you did a minute ago.",

  // ── 9. Random events ───────────────────────────────────────────────────────
  'juno.evt.cable_cut.warn': "Static has found a cable. Keep an eye on your links.",
  'juno.evt.cable_cut.fixed': "Mended. Cables get cut in real life too, all the time.",

  'juno.evt.slow_link.warn': "A lot of traffic is about to hit. Look for a wire that glows red.",
  'juno.evt.slow_link.fixed': "Smoothly done. More lanes for more traffic.",

  'juno.evt.wifi_interference.warn': "The airwaves are getting crowded. Watch your wireless devices.",
  'juno.evt.wifi_interference.fixed': "Signal restored. Radio is fussy about where it lives.",

  'juno.evt.hub_jam.warn': "The hub is getting very busy. Listen for the collisions.",
  'juno.evt.hub_jam.fixed': "Much quieter. That's why we use switches.",

  'juno.evt.moved_device.warn': "Someone is about to unplug a laptop and plug it in somewhere else.",
  'juno.evt.moved_device.fixed': "The switch is up to date again. Good detective work.",

  'juno.evt.duplicate_ip.warn': "Two devices may be about to claim the same address.",
  'juno.evt.duplicate_ip.fixed': "Every device has its own address again.",

  'juno.evt.missing_gateway.warn': "A device is about to lose its front door.",
  'juno.evt.missing_gateway.fixed': "The door is back. Messages can leave the street again.",

  'juno.evt.router_overload.warn': "A lot of messages are heading for one router.",
  'juno.evt.router_overload.fixed': "The router can breathe. Good call.",

  'juno.evt.dhcp_exhausted.warn': "New devices are arriving fast. Is there an address for each?",
  'juno.evt.dhcp_exhausted.fixed': "Everyone has an address. Nobody is left at the door.",

  'juno.evt.dns_down.warn': "The phone book may go offline. Remember, addresses still work.",
  'juno.evt.dns_down.fixed': "Names work again. A backup made all the difference.",

  'juno.evt.server_crash.warn': "A server is looking unwell. Think about what you'd do if it stopped.",
  'juno.evt.server_crash.fixed': "Service is running again. That's resilience.",

  'juno.evt.wrong_zone.warn': "Someone is about to wander into the wrong zone.",
  'juno.evt.wrong_zone.fixed': "Back where they belong. Zones only work when everyone is in the right one.",

  'juno.evt.missing_route.warn': "A router may be about to forget a way. Check its map.",
  'juno.evt.missing_route.fixed': "The map is complete again.",

  'juno.evt.link_failure.warn': "A link between routers is about to fail. Do your routers talk to each other?",
  'juno.evt.link_failure.fixed': "The routers found another way on their own. That's dynamic routing at work.",

  'juno.evt.traffic_flood.warn': "A flood of unwanted messages is coming. Who is sending them?",
  'juno.evt.traffic_flood.fixed': "The flood is stopped, and the right people still get through.",

  'juno.evt.eavesdropper.warn': "Snoop is sneaking around the wires. Whatever travels plain can be read.",
  'juno.evt.eavesdropper.fixed': "Snoop sees only scrambles. Sealed envelopes win again.",

  'juno.evt.rogue_device.warn': "An unknown device is about to plug itself in. Who invited it?",
  'juno.evt.rogue_device.fixed': "Locked out. Only invited devices belong here.",

  'juno.evt.packet_storm.warn': "Messages are starting to multiply. Look for the road that loops.",
  'juno.evt.packet_storm.fixed': "The loop is broken and the storm settles. Well spotted.",

  'juno.evt.power_cut.warn': "The lights are about to flicker in one building.",
  'juno.evt.power_cut.fixed': "Back online. Good networks plan for the power going out.",

  'juno.evt.mystery_fault.warn': "Something is wrong, but I can't tell you what. Test, trace, then think.",
  'juno.evt.mystery_fault.fixed': "You found it, step by step. That's how detectives work.",

  // ── 10. Special moments ────────────────────────────────────────────────────
  'juno.moment.building_opens': "A new building is opening. Welcome it with a connection.",
  'juno.moment.low_timer': "Quickly now, {name}. You can do this.",
  'juno.moment.off_screen': "Something is happening off screen. Look for the arrow at the edge.",
  'juno.moment.first_rewind': "Going back is allowed. Good engineers learn from what just happened.",
  'juno.moment.safety_net': "Here, a little help to get that building connected. Spend it wisely.",
  'juno.moment.first_level_over': "Everyone's first network breaks. This is where you start to learn.",
  'juno.moment.paused': "Take your time. The network will wait.",
  'juno.moment.returning_player': "Welcome back, {name}. Shall we pick up where we left off?",
  'juno.moment.under_the_hood': "Curious how it really works? Have a look under the hood.",
  'juno.moment.first_endless': "Endless has no finish line. Keep the city happy for as long as you can.",
  'juno.moment.first_sandbox': "This is your workshop. Build anything, break anything. Nothing here counts.",
  'juno.moment.chapter_finished': "That's a chapter finished. Rest for a moment, then we'll go on.",

  // ── 11. Ending ─────────────────────────────────────────────────────────────
  'juno.end.1': "{name}, I'd like to say something before the mayor speaks.",
  'juno.end.2': "When you arrived, you had never joined two devices. Now you've built a city.",
  'juno.end.3': "Every network starts with one cable and a person who asks how things connect.",
  'juno.end.4': "Keep asking. That's how every engineer begins.",
  'juno.end.5': "Chief Network Engineer. It suits you."
};

export const JUNO_TUTORIAL_STEPS = [
  { step: 1, key: 'juno.tut.1', highlight: 'server', label: 'The Server' },
  { step: 2, key: 'juno.tut.2', highlight: 'laptop', label: 'The Laptop' },
  { step: 3, key: 'juno.tut.3', highlight: 'wire_tray', label: 'The Wire Tray' },
  { step: 4, key: 'juno.tut.4', highlight: 'laptop_to_server', label: 'Laptop to Server' },
  { step: 5, key: 'juno.tut.5', highlight: 'packet', label: 'A Packet' },
  { step: 6, key: 'juno.tut.6', highlight: 'coin_counter', label: 'The Coin Counter' },
  { step: 7, key: 'juno.tut.7', highlight: 'timer_ring', label: 'The Timer Ring' },
  { step: 8, key: 'juno.tut.8', highlight: 'undo_button', label: 'The Undo Button' },
  { step: 9, key: 'juno.tut.9', highlight: 'nothing', label: 'Ready' }
];

export const SIM_EVENT_TO_JUNO_ID = {
  CableCut: 'cable_cut',
  SlowLink: 'slow_link',
  WifiInterference: 'wifi_interference',
  HubJam: 'hub_jam',
  MovedDevice: 'moved_device',
  DuplicateIP: 'duplicate_ip',
  MissingGateway: 'missing_gateway',
  RouterOverload: 'router_overload',
  DhcpExhausted: 'dhcp_exhausted',
  DNSDown: 'dns_down',
  DnsDown: 'dns_down',
  ServerCrash: 'server_crash',
  WrongZoneTest: 'wrong_zone',
  WrongZone: 'wrong_zone',
  MissingRoute: 'missing_route',
  LinkCut: 'link_failure',
  LinkFailure: 'link_failure',
  TrafficFlood: 'traffic_flood',
  Eavesdropper: 'eavesdropper',
  PacketSnooped: 'eavesdropper',
  RogueDevice: 'rogue_device',
  PacketStorm: 'packet_storm',
  PowerCut: 'power_cut',
  MysteryFault: 'mystery_fault'
};

/**
 * Format a Chief Juno text entry by key (or direct template string) with placeholders.
 */
export function formatJunoLine(keyOrTemplate, vars = {}) {
  const template = JUNO_TEXT[keyOrTemplate] || keyOrTemplate || '';
  const name = (vars.name && String(vars.name).trim()) || DEFAULT_PLAYER_NAME;
  const building = (vars.building && String(vars.building).trim()) || 'That building';
  return template
    .replace(/\{name\}/g, name)
    .replace(/\{building\}/g, building);
}

/**
 * Get a chapter's 2-line opening lines and 1-line closing line.
 */
export function getJunoChapterOpenLines(chapterNum, vars = {}) {
  const line1 = JUNO_TEXT[`juno.open.${chapterNum}.1`];
  const line2 = JUNO_TEXT[`juno.open.${chapterNum}.2`];
  return [line1, line2].filter(Boolean).map(t => formatJunoLine(t, vars));
}

export function getJunoChapterCloseLine(chapterNum, vars = {}) {
  const key = `juno.close.${chapterNum}`;
  return JUNO_TEXT[key] ? formatJunoLine(key, vars) : '';
}

/**
 * Get the intro line for a level ID (e.g. '1.1', '7.6') or detective case ('case_1').
 */
export function getJunoLevelIntro(levelId, vars = {}) {
  const key = `juno.lvl.${levelId}`;
  return JUNO_TEXT[key] ? formatJunoLine(key, vars) : '';
}

/**
 * Resolve Chief Juno's win reaction lines based on Section 7 rules:
 * One primary line for stars/milestone earned, plus one optional line for the first missing star.
 */
export function getJunoWinReaction(context = {}, vars = {}) {
  const {
    isFirstWin = false,
    starsEarned = 3,
    missingStarKind = null,
    wonAfterRewind = false,
    levelId = null,
    isDetectiveSolved = false
  } = context;

  const lines = [];

  // Primary milestone / star line
  if (isFirstWin) {
    lines.push(formatJunoLine('juno.win.first_ever', vars));
  } else if (levelId && CHAPTER_FINALE_IDS.has(levelId)) {
    const finaleKey = `juno.win.finale_${levelId.replace('.', '_')}`;
    if (JUNO_TEXT[finaleKey]) {
      lines.push(formatJunoLine(finaleKey, vars));
    }
  } else if (isDetectiveSolved || levelId === '7.5') {
    lines.push(formatJunoLine('juno.win.detective_solved', vars));
  } else if (wonAfterRewind) {
    lines.push(formatJunoLine('juno.win.after_rewind', vars));
  } else if (starsEarned >= 3) {
    lines.push(formatJunoLine('juno.win.3_stars', vars));
  } else if (starsEarned === 2) {
    lines.push(formatJunoLine('juno.win.2_stars', vars));
  } else {
    lines.push(formatJunoLine('juno.win.1_star', vars));
  }

  // Optional line for the first missing star (when < 3 stars)
  if (starsEarned < 3 && missingStarKind) {
    const missingKey = `juno.win.missing_${missingStarKind}`;
    if (JUNO_TEXT[missingKey]) {
      lines.push(formatJunoLine(missingKey, vars));
    }
  }

  return lines;
}

/**
 * Resolve Chief Juno's calm level-over explanation from the simulation's recorded failure reason.
 */
export function getJunoOverReaction(cause, vars = {}) {
  const map = {
    no_link: 'juno.over.no_link',
    no_wire: 'juno.over.no_link',
    signal_faded: 'juno.over.signal_faded',
    noise: 'juno.over.noise',
    electrical_noise: 'juno.over.noise',
    overflow: 'juno.over.overflow',
    congestion: 'juno.over.overflow',
    hub_collision: 'juno.over.overflow',
    event_active: 'juno.over.event_active',
    server_down: 'juno.over.event_active',
    power_off: 'juno.over.event_active',
    packet_storm: 'juno.over.event_active',
    missing_setting: 'juno.over.missing_setting',
    no_address: 'juno.over.missing_setting',
    no_gateway: 'juno.over.missing_setting',
    wrong_gateway: 'juno.over.missing_setting',
    no_route: 'juno.over.missing_setting',
    dns_failed: 'juno.over.missing_setting',
    port_closed: 'juno.over.missing_setting',
    wrong_zone: 'juno.over.missing_setting',
    duplicate_ip: 'juno.over.missing_setting',
    private_address_outside: 'juno.over.missing_setting',
    blocked_or_exposed: 'juno.over.blocked_or_exposed',
    blocked_by_rule: 'juno.over.blocked_or_exposed',
    security_breach: 'juno.over.blocked_or_exposed',
    single_point: 'juno.over.single_point'
  };

  const key = map[cause] || 'juno.over.any';
  return formatJunoLine(key, vars);
}

/**
 * Get ending cards sequence (Section 11) for after level 7.6.
 */
export function getJunoEndingCards(vars = {}) {
  return [1, 2, 3, 4, 5].map(n => formatJunoLine(`juno.end.${n}`, vars));
}
