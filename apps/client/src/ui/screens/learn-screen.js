/**
 * NetCity v2.0 - Learn Screen
 * Single Responsibility: Renders the interactive Field Manual and concept documentation:
 * MAC vs IP addressing, 4-Port Rule & Cable Management, Goals & Quotas, Hardware Catalog,
 * Security & VLANs, and Resilience & Loop Guard.
 */

export class LearnScreen {
  constructor(ui) {
    this.ui = ui;
  }

  render(topic = null) {
    const ui = this.ui;
    if (!ui.screenLearnEl) return;
    if (topic) ui._learnTopic = topic;
    const active = ui._learnTopic || 'mac_ip';

    let contentHtml = '';
    if (active === 'mac_ip') {
      contentHtml = `
        <div class="nc-learn-header">
          <div class="nc-learn-topic-tag">LAYER 2 & LAYER 3 ADDRESSING</div>
          <h1 class="nc-learn-topic-title">MAC vs IP Addresses</h1>
          <p class="nc-learn-lead">Every packet on a network needs to know both who you are locally (MAC) and where you live logically (IP). Here is why both addresses are essential.</p>
        </div>

        <div class="nc-learn-callout">
          <strong style="color: #38bdf8; font-size: 1.05rem;">The Postal Analogy</strong><br>
          Think of a <strong>MAC Address</strong> as a person's permanent social security number or fingerprint (who they are). Think of an <strong>IP Address</strong> as their mailing street address and apartment number (where they are currently living).
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
          <div class="nc-learn-card">
            <h3 style="color: #ffd166; margin: 0 0 8px 0; display:flex; align-items:center; gap:8px;">
              <span>🏷️</span> MAC Address (Layer 2)
            </h3>
            <p style="color: #cbd5e1; font-size: 0.9rem; line-height: 1.5; margin-bottom: 12px;">
              A 48-bit unique hardware identifier burned directly into the Network Interface Card (NIC) at the factory.
            </p>
            <ul style="color: #94a3b8; font-size: 0.86rem; padding-left: 20px; line-height: 1.6; margin: 0;">
              <li><strong>Format:</strong> Hexadecimal string, e.g. <code style="color:#ffd166;">00:A1:C2</code>.</li>
              <li><strong>Scope:</strong> Local physical link only (never crosses a router).</li>
              <li><strong>Forwarding:</strong> Switches inspect the destination MAC address to decide which physical port to send a frame through.</li>
            </ul>
          </div>

          <div class="nc-learn-card">
            <h3 style="color: #06d6a0; margin: 0 0 8px 0; display:flex; align-items:center; gap:8px;">
              <span>📫</span> IP Address (Layer 3)
            </h3>
            <p style="color: #cbd5e1; font-size: 0.9rem; line-height: 1.5; margin-bottom: 12px;">
              A 32-bit logical address assigned to a device so it can be located across multiple interconnected networks.
            </p>
            <ul style="color: #94a3b8; font-size: 0.86rem; padding-left: 20px; line-height: 1.6; margin: 0;">
              <li><strong>Format:</strong> Dotted decimal, e.g. <code style="color:#06d6a0;">192.168.1.10</code>.</li>
              <li><strong>Subnets:</strong> Hierarchical network part + host part.</li>
              <li><strong>Default Gateway:</strong> The local IP address of the router used to exit your local subnet and reach distant networks.</li>
            </ul>
          </div>
        </div>

        <div class="nc-learn-card">
          <h3 style="color: #38bdf8; margin: 0 0 10px 0;">Why can't we route the internet with MAC addresses alone?</h3>
          <p style="color: #94a3b8; font-size: 0.88rem; line-height: 1.6; margin: 0;">
            MAC addresses are completely flat and random based on manufacturer serial numbers. If the internet used MAC addresses, every single router on Earth would need a routing table containing billions of hardware IDs! IP addresses solve this with <strong>hierarchical subnets</strong>: routers only need to know how to route to a subnet block (like postal zip codes).
          </p>
        </div>
      `;
    } else if (active === 'ports_wiring') {
      contentHtml = `
        <div class="nc-learn-header">
          <div class="nc-learn-topic-tag">PHYSICAL INFRASTRUCTURE</div>
          <h1 class="nc-learn-topic-title">The 4-Port Rule & Cable Management</h1>
          <p class="nc-learn-lead">Every concentrator device in NetCity has physical capacity limits, just like real-world hardware patch panels.</p>
        </div>

        <div class="nc-learn-callout" style="border-color: #f59e0b; background: rgba(245, 158, 11, 0.08);">
          <strong style="color: #f59e0b; font-size: 1.05rem;">The 4-Port Capacity Law</strong><br>
          Network Switches, Hubs, Street Cabinets, Routers, and Servers all feature <strong>strictly 4 physical ports</strong>. No more than 4 cables can ever be connected simultaneously to a single device.
        </div>

        <div class="nc-learn-card" style="margin-bottom: 18px;">
          <h3 style="color: #38bdf8; margin: 0 0 8px 0;">How to connect more than 4 devices (Switch Cascading)</h3>
          <p style="color: #cbd5e1; font-size: 0.88rem; line-height: 1.5; margin-bottom: 12px;">
            If your campus server has 10 computers that need access, you cannot plug them directly into the 4-port server. Instead, daisy-chain switches:
          </p>
          <ol style="color: #94a3b8; font-size: 0.86rem; padding-left: 20px; line-height: 1.6; margin: 0;">
            <li>Run 1 cable from Port 1 of Switch A to the Server (Uplink).</li>
            <li>Connect computers to Ports 2, 3, and 4 of Switch A.</li>
            <li>Need more capacity? Connect Port 4 of Switch A to Port 1 of Switch B!</li>
            <li>Switches automatically forward frames across the cascade without configuration.</li>
          </ol>
        </div>

        <div class="nc-learn-card">
          <h3 style="color: #ef4444; margin: 0 0 8px 0;">Removing a Single Wire (No Total Teardown)</h3>
          <p style="color: #94a3b8; font-size: 0.88rem; line-height: 1.5;">
            In NetCity, you never need to delete or move a switch just to replace one wire. Simply:
          </p>
          <ul style="color: #94a3b8; font-size: 0.86rem; padding-left: 20px; line-height: 1.6; margin: 0;">
            <li><strong>Click any device:</strong> Open its port manager panel and click <code>[ Disconnect ]</code> on the specific port.</li>
            <li><strong>Click any cable line:</strong> Click directly on a cable square to inspect and disconnect just that single wire.</li>
            <li><strong>100% Coin Refund:</strong> Cable cost is immediately refunded back to your wallet!</li>
          </ul>
        </div>
      `;
    } else if (active === 'win_conditions') {
      contentHtml = `
        <div class="nc-learn-header">
          <div class="nc-learn-topic-tag">GAMEPLAY & EVALUATION</div>
          <h1 class="nc-learn-topic-title">Level Goals, Quotas & Timers</h1>
          <p class="nc-learn-lead">Understand how levels evaluate your network designs and what triggers victory or sudden failure.</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
          <div class="nc-learn-card">
            <h3 style="color: #38bdf8; margin: 0 0 8px 0;">🎯 Connect All (connect_all)</h3>
            <p style="color: #94a3b8; font-size: 0.88rem; line-height: 1.5; margin: 0;">
              The standard architectural objective. Every required building (laptop, classroom, clinic) that opens must have its quota fulfilled (e.g. 2/2 or 3/3 requests successfully completed) for at least one full cycle. Once all active required buildings are satisfied, you immediately win the level!
            </p>
          </div>

          <div class="nc-learn-card">
            <h3 style="color: #f59e0b; margin: 0 0 8px 0;">⏱️ Survive (survive_XXXX)</h3>
            <p style="color: #94a3b8; font-size: 0.88rem; line-height: 1.5; margin: 0;">
              The endurance objective. The simulation runs continuously as traffic grows and unexpected events (cable cuts, server loads) occur. Keep every required building's timer alive until the simulation reaches the target tick count (e.g. 3,000 ticks).
            </p>
          </div>
        </div>

        <div class="nc-learn-card">
          <h3 style="color: #10b981; margin: 0 0 8px 0;">Building Radial Timers & Sudden Failure</h3>
          <p style="color: #94a3b8; font-size: 0.88rem; line-height: 1.5; margin-bottom: 10px;">
            Every open building displays a circular timer ring showing how much time remains before it expects network service:
          </p>
          <ul style="color: #94a3b8; font-size: 0.86rem; padding-left: 20px; line-height: 1.6; margin: 0;">
            <li><span style="color:#10b981; font-weight:700;">Green:</span> More than 50% time remaining. Network healthy.</li>
            <li><span style="color:#f59e0b; font-weight:700;">Amber:</span> Between 25% and 50% time remaining. Attention needed.</li>
            <li><span style="color:#ef4444; font-weight:700;">Pulsing Red:</span> Less than 25% remaining. Imminent timeout!</li>
            <li><strong>Sudden Failure:</strong> If any <em>required</em> building's timer hits zero, the level ends. You can hit <strong>Rewind (30s)</strong> to undo and re-wire before failure!</li>
          </ul>
        </div>
      `;
    } else if (active === 'hardware') {
      contentHtml = `
        <div class="nc-learn-header">
          <div class="nc-learn-topic-tag">HARDWARE CATALOG</div>
          <h1 class="nc-learn-topic-title">Concentrators, Servers & Services</h1>
          <p class="nc-learn-lead">Reference guide to every physical appliance and specialized server in NetCity.</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <div class="nc-learn-card">
            <strong style="color: #ffd166; font-size: 1rem;">📦 Ethernet Switch ($12)</strong>
            <p style="color: #94a3b8; font-size: 0.85rem; margin: 6px 0 0 0; line-height: 1.4;">Layer 2 intelligent concentrator. 4 ports. Learns MAC addresses to forward packets directly without collision.</p>
          </div>
          <div class="nc-learn-card">
            <strong style="color: #ef4444; font-size: 1rem;">⚠️ Unmanaged Hub ($6)</strong>
            <p style="color: #94a3b8; font-size: 0.85rem; margin: 6px 0 0 0; line-height: 1.4;">Layer 1 repeating box. Blasts incoming packets out to all other ports simultaneously, causing collisions under heavy load.</p>
          </div>
          <div class="nc-learn-card">
            <strong style="color: #06d6a0; font-size: 1rem;">🌉 Router ($25)</strong>
            <p style="color: #94a3b8; font-size: 0.85rem; margin: 6px 0 0 0; line-height: 1.4;">Layer 3 gateway. Connects different IP subnets across rivers and borders. Inspects destination IP addresses to route packets.</p>
          </div>
          <div class="nc-learn-card">
            <strong style="color: #38bdf8; font-size: 1rem;">📡 Wireless Access Point ($8)</strong>
            <p style="color: #94a3b8; font-size: 0.85rem; margin: 6px 0 0 0; line-height: 1.4;">Provides Wi-Fi coverage within a 6-tile radius. Connects mobile tablets and laptops to a wired switch uplink.</p>
          </div>
          <div class="nc-learn-card">
            <strong style="color: #f4a261; font-size: 1rem;">📋 DHCP Server ($15)</strong>
            <p style="color: #94a3b8; font-size: 0.85rem; margin: 6px 0 0 0; line-height: 1.4;">Automatically leases IP addresses, subnet masks, and default gateways to newly arriving campus client computers.</p>
          </div>
          <div class="nc-learn-card">
            <strong style="color: #9b5de5; font-size: 1rem;">📖 DNS Server ($15)</strong>
            <p style="color: #94a3b8; font-size: 0.85rem; margin: 6px 0 0 0; line-height: 1.4;">Translates domain names (e.g. <code>campus.lib</code>) into numeric IP addresses (e.g. <code>192.168.2.10</code>).</p>
          </div>
        </div>
      `;
    } else if (active === 'security_vlans') {
      contentHtml = `
        <div class="nc-learn-header">
          <div class="nc-learn-topic-tag">CHAPTER 5 & 6 SECURITY</div>
          <h1 class="nc-learn-topic-title">VLAN Color Zones & Firewalls</h1>
          <p class="nc-learn-lead">Isolate departmental traffic, prevent rogue snooping, and filter unwanted packets with policy firewalls.</p>
        </div>

        <div class="nc-learn-card" style="margin-bottom: 16px;">
          <h3 style="color: #38bdf8; margin: 0 0 8px 0;">🎨 VLANs (Virtual Local Area Networks)</h3>
          <p style="color: #94a3b8; font-size: 0.88rem; line-height: 1.5; margin-bottom: 10px;">
            A VLAN partitions a physical switch into distinct virtual domains (e.g. Students in Blue, Teachers in Green, Guests in Yellow). Traffic cannot cross between colors on the switch without passing through a router door with an explicit Allow Rule.
          </p>
        </div>

        <div class="nc-learn-card">
          <h3 style="color: #ef4444; margin: 0 0 8px 0;">🛡️ Stateful Firewalls & Access Lists</h3>
          <p style="color: #94a3b8; font-size: 0.88rem; line-height: 1.5; margin-bottom: 10px;">
            A firewall inspects packet headers (source IP, destination IP, port) and compares them against security cards:
          </p>
          <ul style="color: #94a3b8; font-size: 0.86rem; padding-left: 20px; line-height: 1.6; margin: 0;">
            <li><strong>Allow Rules:</strong> Permit approved traffic (e.g. Student laptops to Library Web Server on Port 80).</li>
            <li><strong>Block Rules:</strong> Drop malicious flood packets and rogue scanning devices before they reach critical grade servers.</li>
          </ul>
        </div>
      `;
    } else if (active === 'resilience') {
      contentHtml = `
        <div class="nc-learn-header">
          <div class="nc-learn-topic-tag">CHAPTER 7 FAULT TOLERANCE</div>
          <h1 class="nc-learn-topic-title">Resilience, Loops & Load Balancing</h1>
          <p class="nc-learn-lead">Design networks that survive fiber cuts and hardware crashes without drowning in broadcast storms.</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="nc-learn-card">
            <h3 style="color: #06d6a0; margin: 0 0 8px 0;">🔄 Loop Guard (Spanning Tree)</h3>
            <p style="color: #94a3b8; font-size: 0.88rem; line-height: 1.5; margin: 0;">
              Redundant cables create loops. If two switches are connected with multiple wires, packets cycle endlessly in a packet storm! Loop Guard detects cycles and temporarily puts backup links on standby until the main link is cut.
            </p>
          </div>

          <div class="nc-learn-card">
            <h3 style="color: #38bdf8; margin: 0 0 8px 0;">⚖️ Server Load Balancer</h3>
            <p style="color: #94a3b8; font-size: 0.88rem; line-height: 1.5; margin: 0;">
              When hundreds of clients request exam results, a single server crashes from queue overflow. Place a Load Balancer at the entrance to distribute incoming requests across redundant server pools.
            </p>
          </div>
        </div>
      `;
    }

    const topics = [
      { id: 'mac_ip', icon: '🏷️', label: 'MAC vs IP' },
      { id: 'ports_wiring', icon: '🔌', label: '4-Port Rule & Cables' },
      { id: 'win_conditions', icon: '🎯', label: 'Goals & Quotas' },
      { id: 'hardware', icon: '🌐', label: 'Hardware & Servers' },
      { id: 'security_vlans', icon: '🛡️', label: 'Security & VLANs' },
      { id: 'resilience', icon: '⚡', label: 'Resilience & Loops' }
    ];

    let navButtonsHtml = '';
    for (const t of topics) {
      const isTopicActive = t.id === active;
      navButtonsHtml += `
        <button class="nc-learn-nav-btn ${isTopicActive ? 'active' : ''}" data-topic="${t.id}">
          <span style="font-size:1.1rem;">${t.icon}</span>
          <span>${t.label}</span>
        </button>
      `;
    }

    const lastScreen = (ui.lastScreenBeforeLearn && ui.lastScreenBeforeLearn.screen) || 'campaign';
    let backLabel = '← Back';
    if (lastScreen === 'game') {
      backLabel = '← Back to Game';
    } else if (lastScreen === 'endless') {
      backLabel = '← Back to Endless';
    } else if (lastScreen === 'campaign') {
      backLabel = (ui.lastScreenBeforeLearn && ui.lastScreenBeforeLearn.campaignView === 'chapter_levels') ? '← Back to Levels' : '← Back to Play';
    }

    ui.screenLearnEl.innerHTML = `
      <header class="nc-app-nav">
        <div class="nc-app-nav-left">
          <button class="nc-action-btn nc-btn-back" id="nc-learn-btn-back" title="Back" style="margin-right:8px;">←</button>
          <div class="nc-app-brand">
            <div class="nc-app-brand-bars">
              <span class="nc-bar bar-1"></span>
              <span class="nc-bar bar-2"></span>
              <span class="nc-bar bar-3"></span>
            </div>
            <span class="nc-app-brand-title">NetCity</span>
          </div>
          <nav class="nc-app-nav-tabs">
            <button class="nc-app-nav-tab" id="nc-learn-nav-play">
              <span class="nc-play-icon">▶</span> Play
            </button>
            <button class="nc-app-nav-tab" id="nc-learn-nav-endless">
              <span style="font-size:1.1rem; line-height:1;">♾️</span> Endless
            </button>
            <button class="nc-app-nav-tab active" id="nc-learn-nav-learn">Learn</button>
          </nav>
        </div>
        <div class="nc-app-nav-right"></div>
      </header>

      <div class="nc-learn-container">
        <aside class="nc-learn-sidebar">
          <div style="font-size:0.75rem; font-weight:800; color:#64748b; letter-spacing:0.08em; margin-bottom:12px; padding-left:4px;">
            FIELD MANUAL TOPICS
          </div>
          <nav class="nc-learn-nav-list">
            ${navButtonsHtml}
          </nav>

          <div style="margin-top:auto; padding-top:24px;">
            <button class="nc-btn nc-btn-primary" id="nc-learn-back-play" style="width:100%; display:flex; align-items:center; justify-content:center; gap:8px;">
              <span>${backLabel}</span>
            </button>
          </div>
        </aside>

        <main class="nc-learn-article-pane">
          ${contentHtml}
        </main>
      </div>
    `;

    const handleBack = () => {
      ui._returnFromLearn();
    };

    const navBackBtn = ui.screenLearnEl.querySelector('#nc-learn-btn-back');
    if (navBackBtn) {
      navBackBtn.onclick = handleBack;
    }

    const navPlay = ui.screenLearnEl.querySelector('#nc-learn-nav-play');
    if (navPlay) {
      navPlay.onclick = () => {
        if (ui.lastScreenBeforeLearn && ui.lastScreenBeforeLearn.screen === 'game') {
          ui._returnFromLearn();
        } else {
          ui._campaignView = 'chapters';
          ui._setScreen('campaign');
          ui._renderCampaignScreen();
        }
      };
    }

    const navEndless = ui.screenLearnEl.querySelector('#nc-learn-nav-endless');
    if (navEndless) {
      navEndless.onclick = () => {
        ui._setScreen('endless');
        ui._renderEndlessScreen();
      };
    }

    const backPlay = ui.screenLearnEl.querySelector('#nc-learn-back-play');
    if (backPlay) {
      backPlay.onclick = handleBack;
    }

    ui.screenLearnEl.querySelectorAll('.nc-learn-nav-btn').forEach(btn => {
      btn.onclick = () => {
        const tId = btn.getAttribute('data-topic');
        if (tId) this.render(tId);
      };
    });
  }
}
