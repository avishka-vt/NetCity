/**
 * NetCity v2.0 - Level Start Briefing Modal
 * Single Responsibility: Renders introductory briefing modal when a level starts.
 * Automatically pauses simulation, presents 🎯 Objective, 📖 Theory / Concept explanation,
 * and 💡 Initial Hint. On clicking "Start Level ▶", dismisses, populates the corner hint pill,
 * and starts simulation.
 */

import { getJunoLevelIntro } from '../../../../../packages/content/src/juno-text.js';
import { CHIEF_JUNO_PORTRAIT } from '../juno-dialog.js';

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

/**
 * Break down large conceptual paragraphs into small, natural SMS / text-message bubbles
 */
export function splitTheoryIntoMessages(theoryHtml) {
  if (!theoryHtml) return [];
  const sentences = theoryHtml
    .split(/(?<=[.!?])\s+(?=[A-Z0-9<])/g)
    .map(s => s.trim())
    .filter(Boolean);

  if (sentences.length <= 1) {
    return [theoryHtml];
  }

  const result = [];
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    if (result.length > 0 && s.length < 32 && !s.includes('!') && !s.includes('?')) {
      result[result.length - 1] += ' ' + s;
    } else {
      result.push(s);
    }
  }
  return result;
}

/**
 * Generates HTML for an individual phone chat message bubble
 */
export function createPhoneMessageHtml(msg) {
  const isIntro = Boolean(msg.isIntro);
  const bubbleClass = isIntro ? 'nc-phone-bubble nc-phone-bubble-intro' : 'nc-phone-bubble';
  const timeLabel = isIntro ? '9:41 AM · Juno' : (msg.time ? `${msg.time} · Delivered ✓✓` : '9:42 AM · Delivered ✓✓');
  return `
    <div class="nc-phone-msg">
      <div class="${bubbleClass}">
        ${msg.text}
      </div>
      <span class="nc-phone-msg-time">${timeLabel}</span>
    </div>
  `;
}

export function showLevelBriefingModal(ui, levelDef) {
  if (!ui || !ui.modalEl || !levelDef) return;

  // Retrieve theory definition or fall back to sensible defaults
  const conceptKey = levelDef.concept || '';
  const theoryMeta = CONCEPT_THEORY[conceptKey] || {
    badge: `Chapter ${levelDef.chapter || 1} Network Architecture`,
    concept: levelDef.title || 'Network Architecture',
    theory: levelDef.learningMoment || 'Fulfill building quotas through proper cabling, topology, and device configurations.'
  };

  const playerName = (ui.stateManager && ui.stateManager.playerName) || 'Apprentice';
  const junoIntroKey = levelDef.id === '7.5' && ui.sim && ui.sim.detectiveCaseNum
    ? `case_${ui.sim.detectiveCaseNum}`
    : levelDef.id;
  const junoIntroLine = getJunoLevelIntro(junoIntroKey, { name: playerName });

  // Clean title: remove redundant level ID prefix if title already starts with e.g. "1.2"
  const cleanTitle = (levelDef.title || '').replace(new RegExp(`^${levelDef.id}[\\s—–-]+`, 'i'), '').trim();
  const displayTitle = `${levelDef.id} — ${cleanTitle || levelDef.title}`;
  const theoryMessages = splitTheoryIntoMessages(theoryMeta.theory);

  // Compile sequential message list: Juno greeting/intro first, then theory sentences
  const allMessages = [];
  if (junoIntroLine) {
    allMessages.push({ text: `"${junoIntroLine}"`, isIntro: true, time: '9:41 AM' });
  }
  theoryMessages.forEach(msg => {
    allMessages.push({ text: msg, isIntro: false, time: '9:42 AM' });
  });

  // Clean up any previously active briefing timers
  if (ui._briefingTimers) {
    ui._briefingTimers.forEach(t => clearTimeout(t));
  }
  ui._briefingTimers = [];

  const clearAllTimers = () => {
    if (ui._briefingTimers) {
      ui._briefingTimers.forEach(t => clearTimeout(t));
      ui._briefingTimers = [];
    }
  };

  ui.modalEl.style.display = 'flex';
  if (ui && typeof ui._pauseForModal === 'function') {
    ui._pauseForModal();
  }
  ui.modalEl.innerHTML = `
    <div class="nc-phone-frame" id="nc-briefing-phone">
      <!-- Status Bar with Time, Dynamic Island, Signal, Battery -->
      <div class="nc-phone-status-bar">
        <span class="nc-phone-time-clock">9:41</span>
        <div class="nc-phone-island"></div>
        <div class="nc-phone-status-icons">
          <span>5G</span>
          <span>📶</span>
          <span>100%</span>
          <span>🔋</span>
        </div>
      </div>

      <!-- Phone Messenger Contact Header -->
      <div class="nc-phone-header">
        <div class="nc-phone-contact">
          <div class="nc-phone-avatar-wrap">
            <img src="${CHIEF_JUNO_PORTRAIT}" alt="Chief Juno" class="nc-phone-avatar" />
            <span class="nc-phone-online-dot"></span>
          </div>
          <div class="nc-phone-contact-info">
            <div class="nc-phone-contact-name">
              Chief Juno <span style="font-size:0.78rem;">🛡️</span>
            </div>
            <div class="nc-phone-contact-status">
              CHIEF JUNO · THE CONCEPT
            </div>
          </div>
        </div>
        <button class="nc-phone-close-btn" id="nc-briefing-x-close" title="Close & Start">✕</button>
      </div>

      <!-- Phone Chat Canvas / Messages Scroll Area -->
      <div class="nc-phone-chat-body" id="nc-phone-chat-body">
        <div class="nc-phone-date-pill">
          📖 ${theoryMeta.badge} · ${displayTitle}
        </div>
        <div class="nc-phone-concept-banner">
          💡 THE CONCEPT: ${theoryMeta.concept}
        </div>

        ${allMessages.length > 1 ? `
          <div class="nc-phone-tap-hint" id="nc-phone-tap-hint" title="Tap to show all messages">
            Tap chat to reveal all ⏩
          </div>
        ` : ''}

        <!-- Message Thread -->
        <div class="nc-phone-messages" id="nc-phone-messages"></div>

        <!-- Animated Typing Indicator -->
        <div class="nc-phone-typing" id="nc-phone-typing" style="display: none;">
          <div class="nc-phone-typing-bubble">
            <span class="nc-typing-dot"></span>
            <span class="nc-typing-dot"></span>
            <span class="nc-typing-dot"></span>
          </div>
          <span class="nc-phone-typing-status">Chief Juno is typing...</span>
        </div>

        <!-- Completion Stamp -->
        <div class="nc-phone-end-stamp" id="nc-phone-end-stamp" style="display: ${allMessages.length <= 1 ? 'block' : 'none'};">
          All messages received · Ready to build!
        </div>
      </div>

      <!-- Phone Bottom Bar: Quick-Reply Action Button & Home Bar -->
      <div class="nc-phone-footer">
        <button class="nc-btn nc-phone-action-btn ${allMessages.length <= 1 ? 'nc-btn-ready' : ''}" id="nc-btn-start-level">
          <span>Start Level ▶</span>
        </button>
        <div class="nc-phone-home-indicator"></div>
      </div>
    </div>
  `;

  const chatBody = ui.modalEl.querySelector('#nc-phone-chat-body') || ui.modalEl.querySelector('.nc-phone-chat-body');
  const messagesContainer = ui.modalEl.querySelector('#nc-phone-messages');
  const typingEl = ui.modalEl.querySelector('#nc-phone-typing');
  const endStamp = ui.modalEl.querySelector('#nc-phone-end-stamp');
  const tapHint = ui.modalEl.querySelector('#nc-phone-tap-hint');
  const startBtn = ui.modalEl.querySelector('#nc-btn-start-level');
  const xBtn = ui.modalEl.querySelector('#nc-briefing-x-close');

  const scrollToBottom = () => {
    if (chatBody) {
      try {
        if (typeof chatBody.scrollTo === 'function') {
          chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: 'smooth' });
        } else {
          chatBody.scrollTop = chatBody.scrollHeight;
        }
      } catch {
        chatBody.scrollTop = chatBody.scrollHeight;
      }
    }
  };

  const appendMessage = (msg) => {
    if (!messagesContainer) return;
    const html = createPhoneMessageHtml(msg);
    if (typeof messagesContainer.insertAdjacentHTML === 'function') {
      messagesContainer.insertAdjacentHTML('beforeend', html);
    } else {
      messagesContainer.innerHTML = (messagesContainer.innerHTML || '') + html;
    }
  };

  let currentIndex = 0;
  if (allMessages.length > 0) {
    appendMessage(allMessages[0]);
    currentIndex = 1;
  }

  // Reveal all messages immediately (used when skipping or in testMode)
  const revealAll = () => {
    clearAllTimers();
    if (typingEl) typingEl.style.display = 'none';
    if (tapHint) tapHint.style.display = 'none';

    while (currentIndex < allMessages.length) {
      appendMessage(allMessages[currentIndex]);
      currentIndex++;
    }

    if (endStamp) endStamp.style.display = 'block';
    if (startBtn && startBtn.classList) startBtn.classList.add('nc-btn-ready');
    scrollToBottom();
  };

  // Expose revealAll method on ui for external trigger or tests
  ui._revealAllBriefingMessages = revealAll;

  // If in automated test mode or only 1 message, reveal everything immediately
  if (ui.testMode) {
    revealAll();
  } else if (allMessages.length > 1) {
    // Sequential delivery: first message is visible immediately, schedule subsequent messages
    const scheduleNext = () => {
      if (currentIndex >= allMessages.length) {
        if (typingEl) typingEl.style.display = 'none';
        if (tapHint) tapHint.style.display = 'none';
        if (endStamp) endStamp.style.display = 'block';
        if (startBtn && startBtn.classList) startBtn.classList.add('nc-btn-ready');
        scrollToBottom();
        return;
      }

      // Show typing indicator
      if (typingEl) {
        typingEl.style.display = 'flex';
        scrollToBottom();
      }

      // After typing indicator delay (~1.3s), deliver the message
      const typingTimer = setTimeout(() => {
        if (typingEl) typingEl.style.display = 'none';

        if (currentIndex < allMessages.length) {
          appendMessage(allMessages[currentIndex]);
          currentIndex++;
          scrollToBottom();
        }

        if (currentIndex < allMessages.length) {
          // Pause briefly (~800ms) before Juno starts typing the next message
          const pauseTimer = setTimeout(() => {
            scheduleNext();
          }, 800);
          ui._briefingTimers.push(pauseTimer);
        } else {
          // All delivered
          if (tapHint) tapHint.style.display = 'none';
          if (endStamp) endStamp.style.display = 'block';
          if (startBtn && startBtn.classList) startBtn.classList.add('nc-btn-ready');
          scrollToBottom();
        }
      }, 1300);

      ui._briefingTimers.push(typingTimer);
    };

    // Begin typing the second message after ~800ms
    const initialTimer = setTimeout(() => {
      scheduleNext();
    }, 800);
    ui._briefingTimers.push(initialTimer);
  }

  // Tap-to-reveal-all: tapping anywhere on the chat body fast-forwards all messages
  if (tapHint) {
    tapHint.onclick = (e) => {
      if (e && e.stopPropagation) e.stopPropagation();
      revealAll();
    };
  }

  if (chatBody) {
    chatBody.onclick = (e) => {
      if (e && e.target && e.target.closest && (e.target.closest('button') || e.target.closest('a'))) {
        return;
      }
      if (currentIndex < allMessages.length) {
        revealAll();
      }
    };
  }

  const onStart = () => {
    clearAllTimers();
    ui._closeModal();
    if (ui.sim) {
      ui.sim.paused = false;
    }
    if (ui.btnPause) {
      ui.btnPause.textContent = 'Pause';
      ui.btnPause.style.backgroundColor = '';
    }
    ui._setHint(levelDef.hint);
    if (levelDef.id === '1.1' && ui.tutorialController) {
      ui.tutorialController.start();
    } else if (ui.junoComms && junoIntroLine) {
      ui.junoComms.show(junoIntroLine, {
        badge: 'CHIEF JUNO · MENTOR',
        variant: 'info',
        durationMs: 12000,
        dismissible: true
      });
    }
  };

  if (startBtn) startBtn.onclick = onStart;
  if (xBtn) xBtn.onclick = onStart;
}
