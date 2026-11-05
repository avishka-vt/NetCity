/**
 * NetCity v2.0 - Level Start Briefing Modal
 * Single Responsibility: Renders introductory briefing modal when a level starts.
 * Automatically pauses simulation, presents 🎯 Objective, 📖 Theory / Concept explanation,
 * and 💡 Initial Hint. On clicking "Start Level ▶", dismisses, populates the corner hint pill,
 * and starts simulation.
 */

export const CONCEPT_THEORY = {
  first_link: {
    badge: 'Basic Cabling',
    concept: 'Point-to-Point Connection & Delivery Quotas',
    theory: 'Computers communicate by sending data packets back and forth along cables. Every building has a <strong>Delivery Quota</strong> (number of packets it needs) and a timer. Fulfill the quota before the timer runs out to keep the building happy!'
  },
  twisted_pair_range: {
    badge: 'Physical Media',
    concept: 'Copper Cable & Maximum Distance Limit',
    theory: 'Twisted-pair copper cables (Ethernet) are inexpensive and flexible, but electrical resistance causes signals to fade over distance. In NetCity, twisted pair reaches up to <strong>10 squares (100 meters)</strong>. Beyond that, packets lose power and vanish! Direct wiring is key.'
  },
  coaxial_shielded: {
    badge: 'Shielded Cabling',
    concept: 'Electrical Noise & Coaxial Shielding',
    theory: 'Workshop equipment and generators emit electromagnetic interference ("noise") that scrambles signals on unshielded twisted pair wires. <strong>Coaxial cable</strong> features a braided metal shield that blocks noise and extends reach up to 185m!'
  },
  fiber_high_speed: {
    badge: 'Fiber Optics',
    concept: 'Light Pulses & High Bandwidth',
    theory: 'Fiber optic cables carry data as pulses of light through ultra-thin glass cores. They are completely immune to electrical noise and can carry huge amounts of data with virtually zero lag across campus.'
  },
  bandwidth_upgrades: {
    badge: 'Network Capacity',
    concept: 'Bandwidth: Thin Pipe vs. Fat Pipe',
    theory: 'Bandwidth is how many data packets can travel through a cable at the same instant (like lanes on a highway). A thin wire gets jammed under heavy packet traffic. Upgrading to higher-bandwidth cables clears traffic jams instantly!'
  },
  star_vs_mesh: {
    badge: 'Network Topology',
    concept: 'Star Network vs. Cable Spaghetti',
    theory: 'Connecting every computer directly to the server creates a messy spiderweb of wires that easily run out of ports. A <strong>Street Cabinet</strong> lets devices connect neatly to one central point (a Star Topology), saving cable and keeping the city organized.'
  },
  hub_collisions: {
    badge: 'Layer 1 Hardware',
    concept: 'The Hub: Broadcast & Packet Collisions',
    theory: 'A <strong>Hub</strong> is a simple repeater. When one device speaks, the Hub shouts that data out to <em>every single connected port</em>! If two devices transmit at the same time, packets crash into each other with a 💥 collision and are destroyed.'
  },
  switch_unicast: {
    badge: 'Layer 2 Hardware',
    concept: 'The Switch & Unicast Delivery',
    theory: 'Unlike a Hub, a <strong>Switch</strong> is intelligent! It inspects the destination of each packet and forwards it <em>only</em> to the wire connected to the intended recipient. Devices can talk simultaneously without collisions!'
  },
  mac_learning: {
    badge: 'Hardware Addressing',
    concept: 'MAC Addresses & The Switch Notebook',
    theory: 'Every network card in the world has a permanent physical fingerprint called a <strong>MAC Address</strong> (e.g. 00:1A:2B:3C). When a device transmits, the Switch notes its MAC address in its internal table ("The Notebook") so it knows exactly which port that device is on.'
  },
  vlan_segmentation: {
    badge: 'Network Security',
    concept: 'VLANs: Virtual Network Isolation',
    theory: 'A <strong>VLAN (Virtual LAN)</strong> divides one physical switch into separate color zones (Blue vs Green). Devices in the Blue zone cannot talk to the Green zone. This keeps sensitive office data isolated from classroom computers without buying separate switches!'
  },
  two_islands: {
    badge: 'Network Boundaries',
    concept: 'Local Islands & Network Boundaries',
    theory: 'Switches connect devices on the same local network. But when networks are physically separated across rivers or departments, local cables cannot connect everyone directly. Next, we unlock Routers to bridge the gap!'
  },
  the_router: {
    badge: 'Layer 3 Hardware',
    concept: 'The Router: Connecting Different Networks',
    theory: 'A Switch connects devices <em>inside</em> a network. A <strong>Router</strong> connects <em>networks to other networks</em>! Place a router near the border/bridge and plug the switches from both sides into it so packets can navigate across.'
  },
  ip_addresses: {
    badge: 'Logical Addressing',
    concept: 'IP Addresses: House Numbers for Data',
    theory: 'MAC addresses only work on a local cable. To route packets across multiple networks, every computer needs a logical <strong>IP Address</strong> (like 192.168.1.10). An IP tells routers both which neighborhood (subnet) and which specific computer to deliver to.'
  },
  subnets: {
    badge: 'IP Subnetting',
    concept: 'Subnet Masks: Street Names vs. House Numbers',
    theory: 'In an IP address like 192.168.1.10, the subnet mask defines which part is the "Street Name" (192.168.1) and which is the "House Number" (10). Computers on the same street talk directly; computers on different streets must send their packets through a router.'
  },
  default_gateway: {
    badge: 'Default Gateway',
    concept: 'The Exit Door to the Outside World',
    theory: 'When a computer wants to talk to a foreign network, it cannot send the packet directly. It must send it to its <strong>Default Gateway</strong> (the router IP on its local network, like 192.168.1.1). The gateway receives the packet and forwards it across.'
  },
  dhcp_server: {
    badge: 'Network Automation',
    concept: 'DHCP: Automatic IP Assignment',
    theory: 'Configuring IP addresses manually on hundreds of computers takes forever. A <strong>DHCP Server</strong> acts like a hotel front desk: as soon as a computer plugs into the switch, the DHCP server hands it an IP address and gateway configuration automatically!'
  },
  dns_server: {
    badge: 'Name Resolution',
    concept: 'DNS: The Internet Phonebook',
    theory: 'Humans remember friendly names like <strong>school.net</strong>, but computers and routers only understand numbers like 192.168.2.50. A <strong>DNS Server</strong> translates domain names into IP addresses. Without DNS, computers cannot find web servers!'
  },
  email_servers: {
    badge: 'Application Protocol',
    concept: 'Store-and-Forward Email Relays',
    theory: 'Email uses a store-and-forward depot system. A laptop sends mail to its local Mail Depot. The Mail Depot relays the message across the router to the recipient school mail depot, which stores it until the recipient logs on!'
  },
  firewall_security: {
    badge: 'Network Defense',
    concept: 'Firewall: Port & Packet Filtering',
    theory: 'A <strong>Firewall</strong> inspects every packet passing through it. It checks the port and IP against security rules, blocking malicious attacks while allowing safe web (Port 80) and mail (Port 25) traffic through.'
  }
};

export function showLevelBriefingModal(ui, levelDef) {
  if (!ui || !ui.modalEl || !levelDef) return;

  // Retrieve theory definition or fall back to sensible defaults
  const conceptKey = levelDef.concept || '';
  const theoryMeta = CONCEPT_THEORY[conceptKey] || {
    badge: `Chapter ${levelDef.chapter || 1} Network Architecture`,
    concept: levelDef.title || 'Network Architecture',
    theory: levelDef.learningMoment || 'Fulfill building quotas through proper cabling, topology, and device configurations.'
  };

  const reqBuildings = (levelDef.start || []).filter(b => b.required !== false).length +
                       (levelDef.spawns || []).filter(b => b.required !== false).length;
  const buildingLabel = reqBuildings > 0 ? `${reqBuildings} required buildings` : 'all required campus buildings';

  ui.modalEl.style.display = 'flex';
  ui.modalEl.innerHTML = `
    <div class="nc-card nc-briefing-card">
      <button class="nc-modal-close-icon" id="nc-briefing-x-close" title="Close & Start">✕</button>

      <div>
        <div class="nc-briefing-badge">📖 ${theoryMeta.badge}</div>
        <h2 class="nc-card-title" style="color:#ffffff; font-size:1.45rem; margin-top:2px;">
          ${levelDef.id} — ${levelDef.title}
        </h2>
      </div>

      <!-- 1. Objective Box -->
      <div class="nc-briefing-section nc-briefing-objective">
        <div style="font-weight:700; color:#34d399; font-size:0.82rem; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">
          🎯 Mission Objective
        </div>
        <div>
          Connect ${buildingLabel} and fulfill their <strong>Packet Delivery Quotas</strong> before timers run out!
        </div>
      </div>

      <!-- 2. Concept & Theory Box -->
      <div class="nc-briefing-section nc-briefing-theory">
        <div style="font-weight:700; color:#38bdf8; font-size:0.82rem; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">
          💡 The Concept: ${theoryMeta.concept}
        </div>
        <div style="color:#cbd5e1; font-size:0.86rem; line-height:1.5;">
          ${theoryMeta.theory}
        </div>
      </div>

      <!-- 3. Initial Hint / Tip -->
      <div class="nc-briefing-section nc-briefing-hint">
        <div style="font-weight:700; color:#f59e0b; font-size:0.82rem; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">
          ⚡ First Step
        </div>
        <div style="color:#fef3c7; font-size:0.86rem;">
          ${levelDef.hint}
        </div>
      </div>

      <div class="nc-card-actions" style="margin-top:6px; justify-content:center;">
        <button class="nc-btn nc-btn-primary" id="nc-btn-start-level" style="padding:10px 32px; font-size:1.02rem; font-weight:700; box-shadow:0 4px 18px rgba(16,185,129,0.4);">
          Start Level ▶
        </button>
      </div>
    </div>
  `;

  const onStart = () => {
    ui._closeModal();
    if (ui.sim) {
      ui.sim.paused = false;
    }
    if (ui.btnPause) {
      ui.btnPause.textContent = 'Pause';
      ui.btnPause.style.backgroundColor = '';
    }
    ui._setHint(levelDef.hint);
  };

  const startBtn = ui.modalEl.querySelector('#nc-btn-start-level');
  if (startBtn) startBtn.onclick = onStart;

  const xBtn = ui.modalEl.querySelector('#nc-briefing-x-close');
  if (xBtn) xBtn.onclick = onStart;
}
