/**
 * NetCity v2.0 - Hardware & Entity Inspectors
 * Single Responsibility: Renders configuration and telemetry modal cards for all in-game hardware:
 * Switch Notebook (learned MAC table & forget button), Router Inspector (routing tables & dynamic RIP gossip),
 * Firewall Inspector (ACL rules & packet filters), VPN Gateway, Load Balancer (round-robin pools),
 * Backup Power UPS, DHCP & DNS Servers, Web & Mail Servers, Wire Inspector, and Individual 4-Port Disconnects.
 */

import { WIRE_CATALOG } from '../../../../../packages/content/src/wires.js';
import { DEVICE_CATALOG } from '../../../../../packages/content/src/devices.js';

/**
 * Collect all active wire links connected to a device
 */
export function getDeviceConnections(ui, device) {
  if (!device || !ui.sim) return [];
  const conns = [];
  const isSrv = device.type === 'server' || ui.sim.isServer(device.square);

  if (isSrv) {
    for (const wire of ui.sim.wires.values()) {
      if (wire.path[wire.path.length - 1] === device.square) {
        let peerName = 'Connected Link';
        let peerIcon = '🔗';
        if (wire.buildingId) {
          const b = ui.sim.getBuilding(wire.buildingId);
          if (b) {
            peerName = b.name || `${b.type.charAt(0).toUpperCase() + b.type.slice(1)} #${b.id}`;
            peerIcon = b.type === 'classroom' ? '🏫' : (b.type === 'laptop' ? '💻' : '🏢');
          }
        } else if (wire.deviceId) {
          const d = ui.sim.getDevice(wire.deviceId);
          if (d) {
            const spec = DEVICE_CATALOG[d.type];
            peerName = spec?.name || `Device #${d.id}`;
            peerIcon = spec?.icon || '📦';
          }
        }
        conns.push({
          wireId: wire.id,
          direction: 'downstream',
          peerName,
          peerIcon,
          wireType: wire.wireType,
          length: wire.length,
          cost: wire.cost
        });
      }
    }
    return conns;
  }

  if (device.wireIds) {
    for (const wId of device.wireIds) {
      const wire = ui.sim.wires.get(wId);
      if (!wire) continue;
      let peerName = 'Connected Link';
      let peerIcon = '🔗';
      if (wire.buildingId) {
        const b = ui.sim.getBuilding(wire.buildingId);
        if (b) {
          peerName = b.name || `${b.type.charAt(0).toUpperCase() + b.type.slice(1)} #${b.id}`;
          peerIcon = b.type === 'classroom' ? '🏫' : (b.type === 'laptop' ? '💻' : '🏢');
        }
      } else if (wire.deviceId) {
        const d = ui.sim.getDevice(wire.deviceId);
        if (d) {
          const spec = DEVICE_CATALOG[d.type];
          peerName = spec?.name || `Device #${d.id}`;
          peerIcon = spec?.icon || '📦';
        }
      }
      conns.push({
        wireId: wire.id,
        direction: 'downstream',
        peerName,
        peerIcon,
        wireType: wire.wireType,
        length: wire.length,
        cost: wire.cost
      });
    }
  }

  const outgoingIds = new Set();
  if (device.uplinkWireId) outgoingIds.add(device.uplinkWireId);
  if (device.outgoingWireIds) {
    for (const id of device.outgoingWireIds) outgoingIds.add(id);
  }

  for (const wId of outgoingIds) {
    const wire = ui.sim.wires.get(wId);
    if (!wire) continue;
    let peerName = 'Central Server';
    let peerIcon = '🖥️';
    if (wire.targetDeviceId) {
      const d = ui.sim.getDevice(wire.targetDeviceId);
      if (d) {
        const spec = DEVICE_CATALOG[d.type];
        peerName = spec?.name || `Device #${d.id}`;
        peerIcon = spec?.icon || '📦';
      }
    } else {
      const srv = ui.sim.getServerAt(wire.path[wire.path.length - 1]);
      if (srv) {
        peerName = srv.name || 'Server';
        peerIcon = srv.icon || '🖥️';
      }
    }
    conns.push({
      wireId: wire.id,
      direction: 'uplink',
      peerName,
      peerIcon,
      wireType: wire.wireType,
      length: wire.length,
      cost: wire.cost
    });
  }

  return conns;
}

/**
 * Render physical 4-port panel HTML with individual disconnect actions and VLAN color selects
 */
export function renderDevicePortsHtml(ui, device) {
  const conns = getDeviceConnections(ui, device);
  const maxPorts = device.ports || 4;
  let portsHtml = '';

  for (let i = 0; i < maxPorts; i++) {
    if (i < conns.length) {
      const c = conns[i];
      let zoneSelector = '';
      if (device.type === 'switch') {
        const currentZone = device.portZones ? (device.portZones.get(c.wireId) || '') : '';
        zoneSelector = `
          <select class="nc-port-zone-select" data-wire-id="${c.wireId}" style="background:var(--color-surface-subtle); color:#fff; border:1px solid var(--color-border-subtle); border-radius:4px; font-size:0.75rem; padding:2px 4px; margin-right:6px;">
            <option value="" ${currentZone === '' ? 'selected' : ''}>Zone: None</option>
            <option value="blue" ${currentZone === 'blue' ? 'selected' : ''} style="color:#38bdf8;">Zone: Blue</option>
            <option value="green" ${currentZone === 'green' ? 'selected' : ''} style="color:#10b981;">Zone: Green</option>
            <option value="orange" ${currentZone === 'orange' ? 'selected' : ''} style="color:#f59e0b;">Zone: Orange</option>
          </select>
        `;
      }

      portsHtml += `
        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--color-surface-elevated); padding:6px 10px; border-radius:6px; margin-bottom:6px; font-size:0.8rem; border-left:3px solid #38bdf8;">
          <div>
            <strong style="color:#38bdf8;">Port ${i + 1}:</strong> <span>${c.peerIcon} ${c.peerName}</span>
            <div style="font-size:0.72rem; color:#94a3b8;">${WIRE_CATALOG[c.wireType]?.name || c.wireType} &middot; ${c.length}m &middot; $${c.cost}</div>
          </div>
          <div style="display:flex; align-items:center;">
            ${zoneSelector}
            <button class="nc-btn nc-btn-danger nc-btn-disconnect-single" data-wire-id="${c.wireId}" style="padding:4px 8px; font-size:0.75rem;">Disconnect (+$${c.cost})</button>
          </div>
        </div>
      `;
    } else {
      portsHtml += `
        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--color-surface-subtle); padding:6px 10px; border-radius:6px; margin-bottom:6px; font-size:0.8rem; border:1px dashed #334155;">
          <span style="color:#64748b;"><strong style="color:#94a3b8;">Port ${i + 1}:</strong> <em>Available / Empty</em></span>
        </div>
      `;
    }
  }

  return `
    <div style="margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <strong style="font-size:0.82rem; color:#e2e8f0;">Physical Ports (${conns.length}/${maxPorts} in use):</strong>
      </div>
      ${portsHtml}
    </div>
  `;
}

export function bindDisconnectButtons(ui, device) {
  ui.modalEl.querySelectorAll('.nc-btn-disconnect-single').forEach(btn => {
    btn.onclick = () => {
      const wireId = parseInt(btn.dataset.wireId, 10);
      ui.sim.removeWireById(wireId);
      ui._updateCoinsDisplay();
      ui._setHint('Disconnected cable. Cost refunded.');
      reopenCurrentDeviceInspector(ui, device);
    };
  });

  ui.modalEl.querySelectorAll('.nc-port-zone-select').forEach(sel => {
    sel.onchange = (e) => {
      const wireId = parseInt(sel.dataset.wireId, 10);
      ui.sim.setSwitchPortZone(device.id, wireId, e.target.value || null);
      ui._setHint(`Set switch port zone to ${e.target.value || 'None'}`);
      if (ui.renderer) ui.renderer.render(ui.sim);
    };
  });
}

export function reopenCurrentDeviceInspector(ui, device) {
  if (!device) return;
  if (device.type === 'switch') showSwitchNotebook(ui, device);
  else if (device.type === 'router') showRouterInspector(ui, device);
  else if (device.type === 'firewall') showFirewallInspector(ui, device);
  else if (device.type === 'vpn_gateway') showVpnInspector(ui, device);
  else if (device.type === 'load_balancer') showLoadBalancerInspector(ui, device);
  else if (device.type === 'backup_power') showBackupPowerInspector(ui, device);
  else if (device.type === 'dhcp_server') showDhcpInspector(ui, device);
  else if (device.type === 'dns_server') showDnsInspector(ui, device);
  else if (device.type === 'web_server') showWebServerInspector(ui, device);
  else if (device.type === 'email_server') showEmailServerInspector(ui, device);
  else if (device.type === 'server' || (device.square && ui.sim.isServer(device.square))) showServerInspector(ui, device);
  else showDeviceInspector(ui, device);
}

export function showSwitchNotebook(ui, device) {
  if (!device || device.type !== 'switch' || !ui.modalEl) return;
  ui.modalEl.style.display = 'flex';

  let rowsHtml = '';
  if (device.macTable && device.macTable.size > 0) {
    let portIdx = 1;
    for (const [mac, entry] of device.macTable.entries()) {
      rowsHtml += `
        <tr style="border-bottom:1px solid #334155;">
          <td style="padding:6px 10px; font-weight:600; color:#38bdf8;">Port ${portIdx++}</td>
          <td style="padding:6px 10px; color:#ffffff;">${entry.deviceName || 'Device'}</td>
          <td style="padding:6px 10px; font-family:monospace; color:#ffd166; font-weight:bold;">${mac}</td>
        </tr>
      `;
    }
  } else {
    rowsHtml = `
      <tr>
        <td colspan="3" style="text-align:center; padding:16px; color:#94a3b8; font-style:italic;">
          The notebook is empty!<br>As computers send packets, the Switch learns their MAC addresses.
        </td>
      </tr>
    `;
  }

  ui.modalEl.innerHTML = `
    <div class="nc-card" style="max-width:480px; text-align:left;">
      <button class="nc-modal-close-icon" id="nc-modal-x-close" title="Close">✕</button>
      <h2 class="nc-card-title" style="margin-bottom:6px; color:#38bdf8;">📦 Switch Inspector ("The Notebook")</h2>
      
      <div style="background:rgba(56, 189, 248, 0.08); border:1px solid rgba(56, 189, 248, 0.28); border-radius:10px; padding:10px 14px; margin-bottom:12px; font-size:0.8rem; line-height:1.45; color:#cbd5e1;">
        <strong style="color:#38bdf8; display:block; margin-bottom:4px; font-size:0.84rem;">🧠 What is a Switch?</strong>
        Unlike a Hub that blindly shouts data to everyone (causing packet collisions), a <strong>Switch</strong> is intelligent. It inspects where each packet is headed and forwards it <em>only</em> down the specific wire to that device.
        <div style="margin-top:6px; font-size:0.77rem; color:#94a3b8; line-height:1.4;">
          <strong style="color:#ffd166;">• MAC Address:</strong> A permanent hardware fingerprint (like <code>00:1A:2B:3C</code>) burned into each device's network card.<br>
          <strong style="color:#2ec4b6;">• The Notebook:</strong> The switch learns which MAC is on which port by watching packets arrive.<br>
          <strong style="color:#34d399;">• VLAN Zones:</strong> Virtual boundaries that isolate ports (e.g. Blue vs Green) so private devices cannot eavesdrop on each other.
        </div>
      </div>

      ${renderDevicePortsHtml(ui, device)}

      <div style="background:var(--color-surface-subtle); border-radius:6px; padding:8px 12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong style="color:#e2e8f0; font-size:0.82rem;">Loop Guard (Spanning Tree)</strong>
          <div style="font-size:0.72rem; color:#94a3b8;">Blocks redundant loops to prevent broadcast packet storms.</div>
        </div>
        <input type="checkbox" id="nc-toggle-loop-guard" ${device.loopGuardActive ? 'checked' : ''} style="transform:scale(1.2); cursor:pointer;" />
      </div>

      <h4 style="margin:0 0 6px 0; color:#cbd5e1; font-size:0.82rem;">Switch MAC Address Table ("The Notebook")</h4>
      <table style="width:100%; border-collapse:collapse; font-size:0.8rem; margin-bottom:14px; background:var(--color-surface-subtle); border-radius:6px; overflow:hidden;">
        <thead>
          <tr style="border-bottom:1px solid var(--color-border-subtle); color:#2ec4b6; text-align:left; background:var(--color-surface-elevated);">
            <th style="padding:6px 8px;">Port</th>
            <th style="padding:6px 8px;">Device</th>
            <th style="padding:6px 8px;">MAC Address</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div class="nc-card-actions" style="justify-content:space-between;">
        <button class="nc-btn nc-btn-secondary" id="nc-switch-forget" style="background:#b45309; color:#fff;">Forget (Clear Table)</button>
        <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
      </div>
    </div>
  `;

  bindDisconnectButtons(ui, device);

  const loopGuardToggle = ui.modalEl.querySelector('#nc-toggle-loop-guard');
  if (loopGuardToggle) {
    loopGuardToggle.onchange = (e) => {
      ui.sim.setSwitchLoopGuard(device.id, e.target.checked);
      ui._setHint(`Loop Guard ${e.target.checked ? 'Enabled' : 'Disabled'}.`);
    };
  }

  const forgetBtn = ui.modalEl.querySelector('#nc-switch-forget');
  if (forgetBtn) {
    forgetBtn.onclick = () => {
      if (device.macTable) device.macTable.clear();
      showSwitchNotebook(ui, device);
      ui._setHint('Switch MAC table cleared (Forget).');
    };
  }

  const xClose = ui.modalEl.querySelector('#nc-modal-x-close');
  if (xClose) xClose.onclick = () => ui._closeModal();
  ui.modalEl.querySelector('#nc-modal-close').onclick = () => ui._closeModal();
}

export function showBuildingInspector(ui, b) {
  if (!b || !ui.modalEl) return;
  ui.modalEl.style.display = 'flex';

  const ch = (ui.levelDef && ui.levelDef.chapter) || 1;
  const isIpLevel = ch >= 3;
  const hasWire = Boolean(b.wireId);
  const wire = hasWire ? ui.sim.wires.get(b.wireId) : null;
  const wireTypeLabel = wire ? (WIRE_CATALOG[wire.wireType]?.name || wire.wireType) : 'None';
  const wireCost = wire ? wire.cost : 0;

  let icon = '🏫';
  const effectiveZone = b.zone || b.colorGroup || null;
  if (b.type === 'laptop') {
    if (effectiveZone === 'blue') icon = '💻 🔵';
    else if (effectiveZone === 'green') icon = '💻 🟢';
    else if (effectiveZone === 'orange') icon = '💻 🟠';
    else icon = '💻';
  } else if (b.type === 'classroom' || b.type === 'school') {
    if (effectiveZone === 'blue') icon = '🏫 🔵';
    else if (effectiveZone === 'green') icon = '🏫 🟢';
    else if (effectiveZone === 'orange') icon = '🏫 🟠';
    else icon = '🏫';
  } else if (b.type === 'phone' || b.type === 'tablet') icon = '📱';
  else if (b.type === 'home') icon = '🏠';
  else if (b.type === 'library') icon = '📚';
  else if (b.type === 'sports_ground') icon = '⚽';

  let ipSection = '';
  if (isIpLevel) {
    ipSection = `
      <div style="background:var(--color-surface-subtle); border:1px solid var(--color-border-subtle); border-radius:6px; padding:12px; margin-bottom:12px;">
        <h4 style="margin:0 0 8px 0; color:#38bdf8; font-size:0.88rem;">🌐 Network Configuration</h4>
        <div style="margin-bottom:8px;">
          <label style="display:block; font-size:0.75rem; color:#94a3b8; margin-bottom:3px;">IP Address:</label>
          <input type="text" id="nc-input-ip" class="nc-input" value="${b.ip || ''}" placeholder="e.g. 192.168.1.10" />
        </div>
        <div style="margin-bottom:8px;">
          <label style="display:block; font-size:0.75rem; color:#94a3b8; margin-bottom:3px;">Subnet Mask / Range:</label>
          <div style="font-family:monospace; color:#e2e8f0; font-size:0.85rem; padding:4px 0;">${b.subnet || '192.168.1.0/24'}</div>
        </div>
        <div style="margin-bottom:8px;">
          <label style="display:block; font-size:0.75rem; color:#94a3b8; margin-bottom:3px;">Default Gateway:</label>
          <input type="text" id="nc-input-gw" class="nc-input" value="${b.defaultGateway || ''}" placeholder="e.g. 192.168.1.1" />
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; color:#94a3b8; margin-bottom:3px;">Color / VLAN Zone:</label>
          <select id="nc-input-zone" class="nc-input" style="background:var(--color-surface-subtle); color:#fff; border:1px solid var(--color-border-subtle); border-radius:4px; font-size:0.8rem; padding:4px 6px; width:100%;">
            <option value="" ${(!b.zone && !b.colorGroup) ? 'selected' : ''}>Normal / None</option>
            <option value="blue" ${(b.zone === 'blue' || b.colorGroup === 'blue') ? 'selected' : ''} style="color:#38bdf8;">🔵 Blue Zone</option>
            <option value="green" ${(b.zone === 'green' || b.colorGroup === 'green') ? 'selected' : ''} style="color:#10b981;">🟢 Green Zone</option>
            <option value="orange" ${(b.zone === 'orange' || b.colorGroup === 'orange') ? 'selected' : ''} style="color:#f59e0b;">🟠 Orange Zone</option>
          </select>
        </div>
      </div>
    `;
  }

  let zoneSection = '';
  if (!isIpLevel && (b.zone !== undefined || b.colorGroup !== undefined || (ui.levelDef && ui.levelDef.chapter >= 5))) {
    zoneSection = `
      <div style="background:var(--color-surface-subtle); border:1px solid var(--color-border-subtle); border-radius:6px; padding:12px; margin-bottom:12px;">
        <h4 style="margin:0 0 8px 0; color:#38bdf8; font-size:0.88rem;">🎨 VLAN / Color Zone</h4>
        <div>
          <label style="display:block; font-size:0.75rem; color:#94a3b8; margin-bottom:3px;">Assigned Zone:</label>
          <select id="nc-input-zone" class="nc-input" style="background:var(--color-surface-subtle); color:#fff; border:1px solid var(--color-border-subtle); border-radius:4px; font-size:0.8rem; padding:4px 6px; width:100%;">
            <option value="" ${(!b.zone && !b.colorGroup) ? 'selected' : ''}>Normal / None</option>
            <option value="blue" ${(b.zone === 'blue' || b.colorGroup === 'blue') ? 'selected' : ''} style="color:#38bdf8;">🔵 Blue Zone</option>
            <option value="green" ${(b.zone === 'green' || b.colorGroup === 'green') ? 'selected' : ''} style="color:#10b981;">🟢 Green Zone</option>
            <option value="orange" ${(b.zone === 'orange' || b.colorGroup === 'orange') ? 'selected' : ''} style="color:#f59e0b;">🟠 Orange Zone</option>
          </select>
        </div>
      </div>
    `;
  }

  let wireSection = '';
  if (hasWire) {
    const isFaded = Boolean(wire && wire.isFaded);
    wireSection = `
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--color-surface-subtle); border:1px solid ${isFaded ? '#ef4444' : 'var(--color-border-subtle)'}; border-radius:6px; padding:10px 12px; margin-bottom:12px;">
        <div>
          <div style="color:#ffffff; font-weight:600; font-size:0.85rem;">Connected Cable</div>
          <div style="color:${isFaded ? '#f87171' : '#94a3b8'}; font-size:0.75rem;">${wireTypeLabel} (${wire ? wire.path.length - 1 : 0} squares)${isFaded ? ' ⚠️ Faded' : ''}</div>
        </div>
        <button class="nc-btn nc-btn-danger" id="nc-btn-disconnect" style="padding:6px 12px; font-size:0.8rem;">Disconnect (+$${wireCost})</button>
      </div>
      ${isFaded ? `
        <div style="background:rgba(239, 68, 68, 0.15); border:1px solid #ef4444; border-radius:6px; padding:8px 10px; margin-bottom:12px; font-size:0.78rem; color:#fca5a5;">
          ⚠️ <strong>Signal Faded:</strong> Cable exceeds max length (${WIRE_CATALOG[wire.wireType]?.maxRunSquares || 10} squares)! Packets will fade and drop before arriving. Use a shorter path or place an intermediate switch.
        </div>
      ` : ''}
    `;
  }

  ui.modalEl.innerHTML = `
    <div class="nc-card" style="max-width:440px; text-align:left;">
      <button class="nc-modal-close-icon" id="nc-modal-x-close" title="Close">✕</button>
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
        <span style="font-size:1.8rem;">${icon}</span>
        <div>
          <h2 class="nc-card-title" style="font-size:1.2rem; color:#ffffff;">${b.name || `${b.type.toUpperCase()} #${b.id}`}</h2>
          <div style="font-size:0.78rem; color:#94a3b8;">MAC: <code style="color:#ffd166;">${b.mac || '00:00'}</code> • State: <strong style="color:${b.state === 'open' ? '#10b981' : '#f59e0b'};">${b.state}</strong></div>
        </div>
      </div>

      <div style="background:var(--color-surface-subtle); border-radius:6px; padding:8px 12px; margin-bottom:12px; font-size:0.8rem; color:#cbd5e1; display:flex; justify-content:space-between;">
        <span>Target: <strong style="color:#38bdf8;">${b.targetHostname || (b.targetPort ? `Port ${b.targetPort}` : b.targetName || 'Server')}</strong></span>
        <span>Quota: <strong style="color:#2ec4b6;">${b.fulfilledInCycle} / ${b.quota}</strong></span>
      </div>

      ${ipSection}
      ${zoneSection}
      ${wireSection}

      <div class="nc-card-actions" style="margin-top:4px;">
        ${(isIpLevel || zoneSection) ? '<button class="nc-btn nc-btn-primary" id="nc-btn-save-ip">Save Config</button>' : ''}
        <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
      </div>
    </div>
  `;

  const zoneSelect = ui.modalEl.querySelector('#nc-input-zone');
  if (zoneSelect) {
    zoneSelect.onchange = (e) => {
      const newZone = e.target.value || null;
      ui.sim.setBuildingZone(b.id, newZone);
      ui._setHint(`Switched ${b.name || 'Building ' + b.id} to ${newZone ? newZone.toUpperCase() + ' Zone' : 'Normal'}.`);
      if (ui.renderer) ui.renderer.render(ui.sim);
    };
  }

  const saveBtn = ui.modalEl.querySelector('#nc-btn-save-ip');
  if (saveBtn) {
    saveBtn.onclick = () => {
      const ipVal = ui.modalEl.querySelector('#nc-input-ip')?.value?.trim() || b.ip || null;
      const gwVal = ui.modalEl.querySelector('#nc-input-gw')?.value?.trim() || b.defaultGateway || null;
      const zoneVal = ui.modalEl.querySelector('#nc-input-zone')?.value?.trim() || null;
      ui.sim.setBuildingIp(b.id, ipVal, gwVal, zoneVal);
      ui._setHint(`Saved settings for ${b.name || 'Building ' + b.id}: Zone=${zoneVal ? zoneVal.toUpperCase() : 'Normal'}`);
      if (ui.renderer) ui.renderer.render(ui.sim);
      ui._closeModal();
    };
  }

  const disBtn = ui.modalEl.querySelector('#nc-btn-disconnect');
  if (disBtn) {
    disBtn.onclick = () => {
      ui.sim.removeWire(b.id);
      ui._updateCoinsDisplay();
      ui._setHint(`Disconnected wire from ${b.name || 'Building ' + b.id}. Coins refunded.`);
      ui._closeModal();
    };
  }

  ui.modalEl.querySelector('#nc-modal-close').onclick = () => ui._closeModal();
}

export function showRouterInspector(ui, device) {
  if (!device || !ui.modalEl) return;
  ui.modalEl.style.display = 'flex';

  const hasWire = Boolean(device.uplinkWireId);
  const wire = hasWire ? ui.sim.wires.get(device.uplinkWireId) : null;
  const wireCost = wire ? wire.cost : 0;

  let staticRoutesRows = '';
  if (device.staticRoutes && device.staticRoutes.size > 0) {
    for (const [subnet, nextHop] of device.staticRoutes.entries()) {
      staticRoutesRows += `
        <tr style="border-bottom:1px solid #334155;">
          <td style="padding:5px 8px; font-family:monospace; color:#ffd166;">${subnet}</td>
          <td style="padding:5px 8px; font-family:monospace; color:#38bdf8;">Hop: ${nextHop}</td>
          <td style="padding:5px 8px; color:#34d399;">Static</td>
        </tr>
      `;
    }
  }

  let allowRulesRows = '';
  if (device.allowRules && device.allowRules.length > 0) {
    for (const r of device.allowRules) {
      allowRulesRows += `
        <tr style="border-bottom:1px solid #334155;">
          <td style="padding:5px 8px; font-weight:bold; color:#10b981;">ALLOW</td>
          <td style="padding:5px 8px; color:#38bdf8;">Zone: ${r.fromZone || 'ANY'}</td>
          <td style="padding:5px 8px; color:#ffd166;">Target: ${r.toServerId || r.toZone}</td>
        </tr>
      `;
    }
  }

  ui.modalEl.innerHTML = `
    <div class="nc-card" style="max-width:520px; text-align:left;">
      <button class="nc-modal-close-icon" id="nc-modal-x-close" title="Close">✕</button>
      <h2 class="nc-card-title" style="margin-bottom:6px; color:#e63946; display:flex; align-items:center; gap:8px;">
        <span>🧭</span> Router Inspector
      </h2>
      
      <div style="background:rgba(239, 68, 68, 0.08); border:1px solid rgba(239, 68, 68, 0.25); border-radius:10px; padding:10px 14px; margin-bottom:12px; font-size:0.8rem; line-height:1.45; color:#cbd5e1;">
        <strong style="color:#f87171; display:block; margin-bottom:4px; font-size:0.84rem;">🌐 How a Router Works:</strong>
        A Switch connects computers <em>within</em> the same neighborhood. A <strong>Router connects different neighborhoods (subnets)</strong> across rivers, borders, and the world using <strong>IP Addresses</strong>!
        <div style="margin-top:6px; font-size:0.77rem; color:#94a3b8; line-height:1.4;">
          <strong style="color:#ffd166;">• Default Gateway:</strong> The router IP address that local devices send foreign packets to.<br>
          <strong style="color:#38bdf8;">• Routing Table:</strong> The router's street map telling it which port/direction to forward each subnet.<br>
          <strong style="color:#34d399;">• Inter-Subnet Bridge:</strong> Connect the switches of two separate islands into one router to unite them!
        </div>
      </div>

      <div style="background:var(--color-surface-subtle); border-radius:6px; padding:8px 12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong style="color:#e2e8f0; font-size:0.82rem;">Dynamic Routing (RIP Gossip)</strong>
          <div style="font-size:0.72rem; color:#94a3b8;">Exchanges maps every 100 ticks and automatically recalculates alternate paths.</div>
        </div>
        <input type="checkbox" id="nc-toggle-dynamic-routing" ${device.dynamicRouting ? 'checked' : ''} style="transform:scale(1.2); cursor:pointer;" />
      </div>

      <div style="background:var(--color-surface-subtle); border-radius:6px; padding:8px 12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong style="color:#e2e8f0; font-size:0.82rem;">Network Address Translation (NAT)</strong>
          <div style="font-size:0.72rem; color:#94a3b8;">Translates private internal IPs (192.168.x.x) into a shared public IP.</div>
        </div>
        <input type="checkbox" id="nc-toggle-nat" ${device.natEnabled ? 'checked' : ''} style="transform:scale(1.2); cursor:pointer;" />
      </div>

      <h4 style="margin:0 0 6px 0; color:#cbd5e1; font-size:0.85rem;">Routing Table</h4>
      <table style="width:100%; border-collapse:collapse; font-size:0.78rem; margin-bottom:10px; background:var(--color-surface-subtle); border-radius:6px; overflow:hidden;">
        <thead>
          <tr style="border-bottom:1px solid var(--color-border-subtle); color:#38bdf8; text-align:left; background:var(--color-surface-elevated);">
            <th style="padding:6px 8px;">Destination</th>
            <th style="padding:6px 8px;">Gateway</th>
            <th style="padding:6px 8px;">Type</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid #334155;">
            <td style="padding:5px 8px; font-family:monospace; color:#ffd166;">192.168.1.0/24</td>
            <td style="padding:5px 8px; font-family:monospace;">Direct</td>
            <td style="padding:5px 8px; color:#34d399;">Connected</td>
          </tr>
          <tr style="border-bottom:1px solid #334155;">
            <td style="padding:5px 8px; font-family:monospace; color:#ffd166;">192.168.2.0/24</td>
            <td style="padding:5px 8px; font-family:monospace;">Direct</td>
            <td style="padding:5px 8px; color:#34d399;">Connected</td>
          </tr>
          ${staticRoutesRows}
        </tbody>
      </table>

      <div style="background:var(--color-surface-subtle); border-radius:6px; padding:8px 10px; margin-bottom:12px; display:flex; gap:6px; align-items:center;">
        <input type="text" id="nc-input-static-subnet" placeholder="Subnet (e.g. 192.168.30.0/24)" style="flex:1; background:var(--color-surface-elevated); color:#fff; border:1px solid var(--color-border-subtle); border-radius:4px; padding:4px 6px; font-size:0.75rem;" />
        <button class="nc-btn nc-btn-primary" id="nc-btn-add-static-route" style="padding:4px 8px; font-size:0.75rem;">Add Route</button>
      </div>

      ${allowRulesRows ? `
        <h4 style="margin:0 0 6px 0; color:#cbd5e1; font-size:0.85rem;">Inter-VLAN Permission Rules</h4>
        <table style="width:100%; border-collapse:collapse; font-size:0.78rem; margin-bottom:12px; background:var(--color-surface-subtle); border-radius:6px; overflow:hidden;">
          <tbody>${allowRulesRows}</tbody>
        </table>
      ` : ''}

      <div style="background:var(--color-surface-subtle); border-radius:6px; padding:8px 12px; font-size:0.78rem; color:#94a3b8; margin-bottom:12px;">
        Max Ports: 4 • Status: Active & Forwarding
      </div>

      ${renderDevicePortsHtml(ui, device)}

      <div class="nc-card-actions" style="justify-content:space-between;">
        ${hasWire ? `<button class="nc-btn nc-btn-danger" id="nc-btn-disconnect" style="padding:6px 12px; font-size:0.8rem;">Disconnect Uplink (+$${wireCost})</button>` : '<span></span>'}
        <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
      </div>
    </div>
  `;

  bindDisconnectButtons(ui, device);

  const dynToggle = ui.modalEl.querySelector('#nc-toggle-dynamic-routing');
  if (dynToggle) {
    dynToggle.onchange = (e) => {
      ui.sim.setRouterDynamicRouting(device.id, e.target.checked);
      ui._setHint(`Dynamic Routing (RIP Gossip) ${e.target.checked ? 'Enabled' : 'Disabled'}.`);
    };
  }

  const natToggle = ui.modalEl.querySelector('#nc-toggle-nat');
  if (natToggle) {
    natToggle.onchange = (e) => {
      ui.sim.setRouterNat(device.id, e.target.checked);
      ui._setHint(`NAT Translation ${e.target.checked ? 'Enabled' : 'Disabled'}.`);
    };
  }

  const addRouteBtn = ui.modalEl.querySelector('#nc-btn-add-static-route');
  if (addRouteBtn) {
    addRouteBtn.onclick = () => {
      const sub = ui.modalEl.querySelector('#nc-input-static-subnet')?.value?.trim() || '192.168.30.0/24';
      ui.sim.setRouterStaticRoute(device.id, sub, device.square);
      showRouterInspector(ui, device);
      ui._setHint(`Added static route to ${sub}`);
    };
  }

  if (hasWire) {
    ui.modalEl.querySelector('#nc-btn-disconnect').onclick = () => {
      ui.sim.removeWireById(device.uplinkWireId);
      ui._updateCoinsDisplay();
      ui._setHint('Disconnected uplink wire from router.');
      ui._closeModal();
    };
  }
  ui.modalEl.querySelector('#nc-modal-close').onclick = () => ui._closeModal();
}

export function showFirewallInspector(ui, device) {
  if (!device || !ui.modalEl) return;
  ui.modalEl.style.display = 'flex';

  let rulesHtml = '';
  if (device.rules && device.rules.length > 0) {
    for (const r of device.rules) {
      rulesHtml += `
        <tr style="border-bottom:1px solid #334155;">
          <td style="padding:5px 8px; font-weight:bold; color:${r.action === 'block' ? '#ef4444' : '#10b981'};">${r.action.toUpperCase()}</td>
          <td style="padding:5px 8px; font-family:monospace; color:#ffd166;">${r.sourceIp || 'ANY'}</td>
          <td style="padding:5px 8px; color:#38bdf8;">${r.port ? `Port ${r.port}` : 'ANY'}</td>
          <td style="padding:5px 8px;"><button class="nc-btn nc-btn-danger nc-btn-del-rule" data-rule-id="${r.id}" style="padding:2px 6px; font-size:0.7rem;">Delete</button></td>
        </tr>
      `;
    }
  } else {
    rulesHtml = `
      <tr>
        <td colspan="4" style="text-align:center; padding:12px; color:#94a3b8; font-style:italic;">
          No rules configured. Default policy: Allow normal traffic.
        </td>
      </tr>
    `;
  }

  ui.modalEl.innerHTML = `
    <div class="nc-card" style="max-width:500px; text-align:left;">
      <button class="nc-modal-close-icon" id="nc-modal-x-close" title="Close">✕</button>
      <h2 class="nc-card-title" style="margin-bottom:6px; color:#ef4444; display:flex; align-items:center; gap:8px;">
        <span>🛡️</span> Firewall Inspector ("The Bouncer")
      </h2>
      <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:12px; line-height:1.4;">
        The Firewall checks incoming packets against rule cards. Block rogue devices or traffic floods by sender IP or port!
      </p>

      <h4 style="margin:0 0 6px 0; color:#cbd5e1; font-size:0.85rem;">Access Control List (Rule Cards)</h4>
      <table style="width:100%; border-collapse:collapse; font-size:0.78rem; margin-bottom:12px; background:var(--color-surface-subtle); border-radius:6px; overflow:hidden;">
        <thead>
          <tr style="border-bottom:1px solid var(--color-border-subtle); color:#38bdf8; text-align:left; background:var(--color-surface-elevated);">
            <th style="padding:6px 8px;">Action</th>
            <th style="padding:6px 8px;">Source IP</th>
            <th style="padding:6px 8px;">Port</th>
            <th style="padding:6px 8px;"></th>
          </tr>
        </thead>
        <tbody>
          ${rulesHtml}
        </tbody>
      </table>

      <div style="background:var(--color-surface-subtle); border-radius:6px; padding:10px; margin-bottom:12px; display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; gap:8px; align-items:center;">
          <select id="nc-fw-action" style="background:var(--color-surface-elevated); color:#fff; border:1px solid var(--color-border-subtle); border-radius:4px; padding:4px 6px; font-size:0.78rem;">
            <option value="block">BLOCK</option>
            <option value="allow">ALLOW</option>
          </select>
          <input type="text" id="nc-fw-ip" placeholder="Source IP (e.g. 10.99.99.99)" value="10.99.99.99" style="flex:1; background:var(--color-surface-elevated); color:#fff; border:1px solid var(--color-border-subtle); border-radius:4px; padding:4px 6px; font-size:0.78rem;" />
          <button class="nc-btn nc-btn-primary" id="nc-fw-add-btn" style="padding:4px 10px; font-size:0.78rem;">Add Rule</button>
        </div>
        <div style="display:flex; gap:6px; align-items:center; font-size:0.75rem; color:#94a3b8;">
          <span>Quick fill:</span>
          <button type="button" class="nc-btn nc-btn-secondary" id="nc-fw-quick-rogue" style="padding:2px 8px; font-size:0.72rem; cursor:pointer;">🚫 10.99.99.99 (Rogue)</button>
        </div>
      </div>

      ${renderDevicePortsHtml(ui, device)}

      <div class="nc-card-actions">
        <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
      </div>
    </div>
  `;

  bindDisconnectButtons(ui, device);

  const xClose = ui.modalEl.querySelector('#nc-modal-x-close');
  if (xClose) xClose.onclick = () => ui._closeModal();

  const quickRogueBtn = ui.modalEl.querySelector('#nc-fw-quick-rogue');
  if (quickRogueBtn) {
    quickRogueBtn.onclick = () => {
      const ipInput = ui.modalEl.querySelector('#nc-fw-ip');
      if (ipInput) ipInput.value = '10.99.99.99';
    };
  }

  ui.modalEl.querySelectorAll('.nc-btn-del-rule').forEach(btn => {
    btn.onclick = () => {
      const rId = parseInt(btn.dataset.ruleId, 10);
      ui.sim.removeFirewallRule(device.id, rId);
      showFirewallInspector(ui, device);
    };
  });

  const addBtn = ui.modalEl.querySelector('#nc-fw-add-btn');
  if (addBtn) {
    addBtn.onclick = () => {
      const action = ui.modalEl.querySelector('#nc-fw-action')?.value || 'block';
      const ip = ui.modalEl.querySelector('#nc-fw-ip')?.value?.trim() || null;
      ui.sim.addFirewallRule(device.id, { action, sourceIp: ip });
      showFirewallInspector(ui, device);
      ui._setHint(`Added firewall rule: ${action.toUpperCase()} ${ip || 'ALL'}`);
    };
  }

  ui.modalEl.querySelector('#nc-modal-close').onclick = () => ui._closeModal();
}

export function showVpnInspector(ui, device) {
  if (!device || !ui.modalEl) return;
  ui.modalEl.style.display = 'flex';

  ui.modalEl.innerHTML = `
    <div class="nc-card" style="max-width:440px; text-align:left;">
      <h2 class="nc-card-title" style="margin-bottom:6px; color:#5a189a; display:flex; align-items:center; gap:8px;">
        <span>🔒</span> VPN Gateway Inspector
      </h2>
      <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:12px; line-height:1.4;">
        The VPN Gateway encapsulates network traffic inside an encrypted tunnel across untrusted public networks. Eavesdroppers (Snoop) cannot inspect payload data.
      </p>

      <div style="background:var(--color-surface-subtle); border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:0.8rem;">
        <div style="margin-bottom:6px;">Tunnel Status: <strong style="color:#10b981;">Active & Encrypted (AES-256)</strong></div>
        <div style="margin-bottom:6px;">Encapsulation: <strong style="color:#38bdf8;">IPsec / WireGuard Tunnel</strong></div>
        <div>Payload Protection: <strong style="color:#ffd166;">Snoop-proof</strong></div>
      </div>

      ${renderDevicePortsHtml(ui, device)}

      <div class="nc-card-actions">
        <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
      </div>
    </div>
  `;

  bindDisconnectButtons(ui, device);
  ui.modalEl.querySelector('#nc-modal-close').onclick = () => ui._closeModal();
}

export function showLoadBalancerInspector(ui, device) {
  if (!device || !ui.modalEl) return;
  ui.modalEl.style.display = 'flex';

  let backendsHtml = '';
  const servers = ui.sim.servers || [];
  for (const s of servers) {
    const isCrashed = ui.sim.crashedServers && ui.sim.crashedServers.has(s.id);
    backendsHtml += `
      <tr style="border-bottom:1px solid #334155;">
        <td style="padding:6px 10px; color:#ffffff;">${s.name}</td>
        <td style="padding:6px 10px; font-family:monospace; color:#ffd166;">${s.ip}</td>
        <td style="padding:6px 10px; font-weight:bold; color:${isCrashed ? '#ef4444' : '#10b981'};">${isCrashed ? 'CRASHED' : 'HEALTHY'}</td>
      </tr>
    `;
  }

  ui.modalEl.innerHTML = `
    <div class="nc-card" style="max-width:480px; text-align:left;">
      <h2 class="nc-card-title" style="margin-bottom:6px; color:#0077b6; display:flex; align-items:center; gap:8px;">
        <span>⚖️</span> Load Balancer Inspector
      </h2>
      <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:12px; line-height:1.4;">
        The Hardware Load Balancer distributes incoming web requests evenly across server backends. If a server crashes, traffic automatically fails over to healthy nodes!
      </p>

      <div style="background:var(--color-surface-subtle); border-radius:6px; padding:8px 12px; margin-bottom:10px; font-size:0.8rem; display:flex; justify-content:space-between;">
        <span>Strategy: <strong style="color:#38bdf8;">Round-Robin</strong></span>
        <span>Health Check: <strong style="color:#10b981;">Active Probe (TCP/80)</strong></span>
      </div>

      <h4 style="margin:0 0 6px 0; color:#cbd5e1; font-size:0.85rem;">Backend Server Cluster</h4>
      <table style="width:100%; border-collapse:collapse; font-size:0.78rem; margin-bottom:12px; background:var(--color-surface-subtle); border-radius:6px; overflow:hidden;">
        <thead>
          <tr style="border-bottom:1px solid var(--color-border-subtle); color:#38bdf8; text-align:left; background:var(--color-surface-elevated);">
            <th style="padding:6px 8px;">Node Name</th>
            <th style="padding:6px 8px;">IP Address</th>
            <th style="padding:6px 8px;">Health Status</th>
          </tr>
        </thead>
        <tbody>
          ${backendsHtml}
        </tbody>
      </table>

      ${renderDevicePortsHtml(ui, device)}

      <div class="nc-card-actions">
        <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
      </div>
    </div>
  `;

  bindDisconnectButtons(ui, device);
  ui.modalEl.querySelector('#nc-modal-close').onclick = () => ui._closeModal();
}

export function showBackupPowerInspector(ui, device) {
  if (!device || !ui.modalEl) return;
  ui.modalEl.style.display = 'flex';

  ui.modalEl.innerHTML = `
    <div class="nc-card" style="max-width:440px; text-align:left;">
      <h2 class="nc-card-title" style="margin-bottom:6px; color:#ffb703; display:flex; align-items:center; gap:8px;">
        <span>🔋</span> Backup Power UPS Inspector
      </h2>
      <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:12px; line-height:1.4;">
        The Uninterruptible Power Supply (UPS) provides emergency battery backup during municipal power cuts, preventing switches and routers from going dark.
      </p>

      <div style="background:var(--color-surface-subtle); border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:0.8rem;">
        <div style="margin-bottom:6px;">Battery State: <strong style="color:#10b981;">100% Charged</strong></div>
        <div style="margin-bottom:6px;">Runtime: <strong style="color:#ffd166;">3,600 ticks</strong></div>
        <div>Inverter Status: <strong style="color:#38bdf8;">Online & Ready</strong></div>
      </div>

      ${renderDevicePortsHtml(ui, device)}

      <div class="nc-card-actions">
        <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
      </div>
    </div>
  `;

  bindDisconnectButtons(ui, device);
  ui.modalEl.querySelector('#nc-modal-close').onclick = () => ui._closeModal();
}

export function showDhcpInspector(ui, device) {
  if (!device || !ui.modalEl) return;
  ui.modalEl.style.display = 'flex';

  let leasesRows = '';
  if (device.leases && device.leases.size > 0) {
    for (const [mac, ip] of device.leases.entries()) {
      leasesRows += `
        <tr style="border-bottom:1px solid #334155;">
          <td style="padding:5px 8px; font-family:monospace; color:#ffd166;">${mac}</td>
          <td style="padding:5px 8px; font-family:monospace; color:#34d399;">${ip}</td>
          <td style="padding:5px 8px; color:#94a3b8;">Active</td>
        </tr>
      `;
    }
  } else {
    leasesRows = `
      <tr>
        <td colspan="3" style="text-align:center; padding:12px; color:#94a3b8; font-style:italic;">
          No active leases yet. As computers connect, DHCP assigns them IPs automatically!
        </td>
      </tr>
    `;
  }

  const hasWire = Boolean(device.uplinkWireId);
  const wire = hasWire ? ui.sim.wires.get(device.uplinkWireId) : null;
  const wireCost = wire ? wire.cost : 0;

  ui.modalEl.innerHTML = `
    <div class="nc-card" style="max-width:480px; text-align:left;">
      <button class="nc-modal-close-icon" id="nc-modal-x-close" title="Close">✕</button>
      <h2 class="nc-card-title" style="margin-bottom:6px; color:#10b981; display:flex; align-items:center; gap:8px;">
        <span>📋</span> DHCP Server Inspector
      </h2>
      <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:12px; line-height:1.4;">
        The DHCP server automatically hands out IP addresses and default gateways to computers as they open!
      </p>

      <div style="background:var(--color-surface-subtle); border-radius:6px; padding:8px 12px; margin-bottom:10px; font-size:0.8rem; display:flex; justify-content:space-between;">
        <span>IP Pool: <strong style="color:#38bdf8;">192.168.1.100 - .200</strong></span>
        <span>Gateway: <strong style="color:#ffd166;">192.168.1.1</strong></span>
      </div>

      <h4 style="margin:0 0 6px 0; color:#cbd5e1; font-size:0.85rem;">Active Leases Table</h4>
      <table style="width:100%; border-collapse:collapse; font-size:0.78rem; margin-bottom:12px; background:var(--color-surface-subtle); border-radius:6px; overflow:hidden;">
        <thead>
          <tr style="border-bottom:1px solid var(--color-border-subtle); color:#38bdf8; text-align:left; background:var(--color-surface-elevated);">
            <th style="padding:6px 8px;">Client MAC</th>
            <th style="padding:6px 8px;">Leased IP</th>
            <th style="padding:6px 8px;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${leasesRows}
        </tbody>
      </table>

      ${renderDevicePortsHtml(ui, device)}

      <div class="nc-card-actions" style="justify-content:space-between;">
        ${hasWire ? `<button class="nc-btn nc-btn-danger" id="nc-btn-disconnect" style="padding:6px 12px; font-size:0.8rem;">Disconnect Uplink (+$${wireCost})</button>` : '<span></span>'}
        <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
      </div>
    </div>
  `;

  bindDisconnectButtons(ui, device);

  if (hasWire) {
    ui.modalEl.querySelector('#nc-btn-disconnect').onclick = () => {
      ui.sim.removeWireById(device.uplinkWireId);
      ui._updateCoinsDisplay();
      ui._setHint('Disconnected uplink wire from DHCP server.');
      ui._closeModal();
    };
  }
  ui.modalEl.querySelector('#nc-modal-close').onclick = () => ui._closeModal();
}

export function showDnsInspector(ui, device) {
  if (!device || !ui.modalEl) return;
  ui.modalEl.style.display = 'flex';

  const hasWire = Boolean(device.uplinkWireId);
  const wire = hasWire ? ui.sim.wires.get(device.uplinkWireId) : null;
  const wireCost = wire ? wire.cost : 0;

  ui.modalEl.innerHTML = `
    <div class="nc-card" style="max-width:480px; text-align:left;">
      <button class="nc-modal-close-icon" id="nc-modal-x-close" title="Close">✕</button>
      <h2 class="nc-card-title" style="margin-bottom:6px; color:#8b5cf6; display:flex; align-items:center; gap:8px;">
        <span>📖</span> DNS Server Inspector
      </h2>
      <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:12px; line-height:1.4;">
        The Domain Name System translates human-friendly names (e.g. <code>school.net</code>) into numerical IP addresses.
      </p>

      <h4 style="margin:0 0 6px 0; color:#cbd5e1; font-size:0.85rem;">Zone Records Table</h4>
      <table style="width:100%; border-collapse:collapse; font-size:0.78rem; margin-bottom:12px; background:var(--color-surface-subtle); border-radius:6px; overflow:hidden;">
        <thead>
          <tr style="border-bottom:1px solid var(--color-border-subtle); color:#a78bfa; text-align:left; background:var(--color-surface-elevated);">
            <th style="padding:6px 8px;">Domain Name</th>
            <th style="padding:6px 8px;">Type</th>
            <th style="padding:6px 8px;">Target IP</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid #334155;">
            <td style="padding:5px 8px; font-weight:600; color:#ffffff;">school.net</td>
            <td style="padding:5px 8px; color:#38bdf8;">A</td>
            <td style="padding:5px 8px; font-family:monospace; color:#ffd166;">192.168.2.50</td>
          </tr>
          <tr style="border-bottom:1px solid #334155;">
            <td style="padding:5px 8px; font-weight:600; color:#ffffff;">mail.school.net</td>
            <td style="padding:5px 8px; color:#38bdf8;">MX</td>
            <td style="padding:5px 8px; font-family:monospace; color:#ffd166;">192.168.2.55</td>
          </tr>
          <tr>
            <td style="padding:5px 8px; font-weight:600; color:#ffffff;">web.town</td>
            <td style="padding:5px 8px; color:#38bdf8;">A</td>
            <td style="padding:5px 8px; font-family:monospace; color:#ffd166;">192.168.2.60</td>
          </tr>
        </tbody>
      </table>

      ${renderDevicePortsHtml(ui, device)}

      <div class="nc-card-actions" style="justify-content:space-between;">
        ${hasWire ? `<button class="nc-btn nc-btn-danger" id="nc-btn-disconnect" style="padding:6px 12px; font-size:0.8rem;">Disconnect Uplink (+$${wireCost})</button>` : '<span></span>'}
        <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
      </div>
    </div>
  `;

  bindDisconnectButtons(ui, device);

  if (hasWire) {
    ui.modalEl.querySelector('#nc-btn-disconnect').onclick = () => {
      ui.sim.removeWireById(device.uplinkWireId);
      ui._updateCoinsDisplay();
      ui._setHint('Disconnected uplink wire from DNS server.');
      ui._closeModal();
    };
  }
  ui.modalEl.querySelector('#nc-modal-close').onclick = () => ui._closeModal();
}

export function showWebServerInspector(ui, device) {
  if (!device || !ui.modalEl) return;
  ui.modalEl.style.display = 'flex';

  const hasWire = Boolean(device.uplinkWireId);
  const wire = hasWire ? ui.sim.wires.get(device.uplinkWireId) : null;
  const wireCost = wire ? wire.cost : 0;

  ui.modalEl.innerHTML = `
    <div class="nc-card" style="max-width:440px; text-align:left;">
      <button class="nc-modal-close-icon" id="nc-modal-x-close" title="Close">✕</button>
      <h2 class="nc-card-title" style="margin-bottom:6px; color:#0284c7; display:flex; align-items:center; gap:8px;">
        <span>🌐</span> Web Server Inspector
      </h2>
      <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:12px; line-height:1.4;">
        Hosts web pages and serves HTTP requests. Generates reply packets back to requesting clients!
      </p>

      <div style="background:var(--color-surface-subtle); border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:0.8rem;">
        <div style="margin-bottom:6px;">Hostname: <strong style="color:#38bdf8;">school.net</strong></div>
        <div style="margin-bottom:6px;">IP Address: <code style="color:#ffd166;">192.168.2.50</code></div>
        <div>Open Ports: <span style="background:#1e293b; color:#34d399; padding:2px 6px; border-radius:4px; font-family:monospace;">Port 80 (HTTP)</span></div>
      </div>

      ${renderDevicePortsHtml(ui, device)}

      <div class="nc-card-actions" style="justify-content:space-between;">
        ${hasWire ? `<button class="nc-btn nc-btn-danger" id="nc-btn-disconnect" style="padding:6px 12px; font-size:0.8rem;">Disconnect Uplink (+$${wireCost})</button>` : '<span></span>'}
        <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
      </div>
    </div>
  `;

  bindDisconnectButtons(ui, device);

  if (hasWire) {
    ui.modalEl.querySelector('#nc-btn-disconnect').onclick = () => {
      ui.sim.removeWireById(device.uplinkWireId);
      ui._updateCoinsDisplay();
      ui._setHint('Disconnected uplink wire from Web server.');
      ui._closeModal();
    };
  }
  ui.modalEl.querySelector('#nc-modal-close').onclick = () => ui._closeModal();
}

export function showEmailServerInspector(ui, device) {
  if (!device || !ui.modalEl) return;
  ui.modalEl.style.display = 'flex';

  const hasWire = Boolean(device.uplinkWireId);
  const wire = hasWire ? ui.sim.wires.get(device.uplinkWireId) : null;
  const wireCost = wire ? wire.cost : 0;

  ui.modalEl.innerHTML = `
    <div class="nc-card" style="max-width:440px; text-align:left;">
      <button class="nc-modal-close-icon" id="nc-modal-x-close" title="Close">✕</button>
      <h2 class="nc-card-title" style="margin-bottom:6px; color:#f59e0b; display:flex; align-items:center; gap:8px;">
        <span>✉️</span> Email Server Inspector
      </h2>
      <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:12px; line-height:1.4;">
        Store-and-forward depot for electronic messages between school branches.
      </p>

      <div style="background:var(--color-surface-subtle); border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:0.8rem;">
        <div style="margin-bottom:6px;">Hostname: <strong style="color:#38bdf8;">mail.school.net</strong></div>
        <div style="margin-bottom:6px;">IP Address: <code style="color:#ffd166;">192.168.2.55</code></div>
        <div>Open Ports: <span style="background:#1e293b; color:#34d399; padding:2px 6px; border-radius:4px; font-family:monospace;">Port 25 (SMTP)</span></div>
      </div>

      ${renderDevicePortsHtml(ui, device)}

      <div class="nc-card-actions" style="justify-content:space-between;">
        ${hasWire ? `<button class="nc-btn nc-btn-danger" id="nc-btn-disconnect" style="padding:6px 12px; font-size:0.8rem;">Disconnect Uplink (+$${wireCost})</button>` : '<span></span>'}
        <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
      </div>
    </div>
  `;

  bindDisconnectButtons(ui, device);

  if (hasWire) {
    ui.modalEl.querySelector('#nc-btn-disconnect').onclick = () => {
      ui.sim.removeWireById(device.uplinkWireId);
      ui._updateCoinsDisplay();
      ui._setHint('Disconnected uplink wire from Email server.');
      ui._closeModal();
    };
  }
  ui.modalEl.querySelector('#nc-modal-close').onclick = () => ui._closeModal();
}

export function showDeviceInspector(ui, device) {
  if (!device || !ui.modalEl) return;
  ui.modalEl.style.display = 'flex';

  const spec = DEVICE_CATALOG[device.type] || { name: 'Device', icon: '📦' };
  const hasWire = Boolean(device.uplinkWireId);
  const wire = hasWire ? ui.sim.wires.get(device.uplinkWireId) : null;
  const wireCost = wire ? wire.cost : 0;

  ui.modalEl.innerHTML = `
    <div class="nc-card" style="max-width:440px; text-align:left;">
      <button class="nc-modal-close-icon" id="nc-modal-x-close" title="Close">✕</button>
      <h2 class="nc-card-title" style="margin-bottom:6px; color:#38bdf8; display:flex; align-items:center; gap:8px;">
        <span>${spec.icon}</span> ${spec.name} Inspector
      </h2>
      <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:12px; line-height:1.4;">
        ${spec.concept || 'Network distribution hardware.'}
      </p>

      <div style="background:var(--color-surface-subtle); border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:0.8rem;">
        <div style="margin-bottom:6px;">Type: <strong style="color:#ffffff;">${spec.name}</strong></div>
        <div style="margin-bottom:6px;">Capacity: <strong style="color:#38bdf8;">${device.ports || 4} ports</strong></div>
        <div>Uplink Status: <strong style="color:${hasWire ? '#10b981' : '#f59e0b'};">${hasWire ? 'Connected' : 'Unwired'}</strong></div>
      </div>

      ${renderDevicePortsHtml(ui, device)}

      <div class="nc-card-actions" style="justify-content:space-between;">
        ${hasWire ? `<button class="nc-btn nc-btn-danger" id="nc-btn-disconnect" style="padding:6px 12px; font-size:0.8rem;">Disconnect Uplink (+$${wireCost})</button>` : '<span></span>'}
        <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
      </div>
    </div>
  `;

  bindDisconnectButtons(ui, device);

  if (hasWire) {
    ui.modalEl.querySelector('#nc-btn-disconnect').onclick = () => {
      ui.sim.removeWireById(device.uplinkWireId);
      ui._updateCoinsDisplay();
      ui._setHint(`Disconnected uplink wire from ${spec.name}.`);
      ui._closeModal();
    };
  }
  ui.modalEl.querySelector('#nc-modal-close').onclick = () => ui._closeModal();
}

export function showServerInspector(ui, server) {
  if (!server || !ui.modalEl) return;
  ui.modalEl.style.display = 'flex';

  ui.modalEl.innerHTML = `
    <div class="nc-card" style="max-width:440px; text-align:left;">
      <button class="nc-modal-close-icon" id="nc-modal-x-close" title="Close">✕</button>
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
        <span style="font-size:1.8rem;">${server.icon || '🖥️'}</span>
        <div>
          <h2 class="nc-card-title" style="font-size:1.2rem; color:${server.color || '#2ec4b6'};">${server.name || 'Central Server'}</h2>
          <div style="font-size:0.78rem; color:#94a3b8;">MAC: <code style="color:#ffd166;">${server.mac || '00:FE'}</code></div>
        </div>
      </div>

      <div style="background:var(--color-surface-subtle); border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:0.8rem;">
        <div style="margin-bottom:6px;">Hostname: <strong style="color:#38bdf8;">${server.hostname || 'server.school.net'}</strong></div>
        <div style="margin-bottom:6px;">IP Address: <code style="color:#ffd166;">${server.ip || '192.168.2.50'}</code></div>
        <div>Open Services: <span style="background:#1e293b; color:#34d399; padding:2px 6px; border-radius:4px; font-family:monospace;">Ports: ${(server.portsOpen || [80]).join(', ')}</span></div>
      </div>

      ${renderDevicePortsHtml(ui, server)}

      <div class="nc-card-actions">
        <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
      </div>
    </div>
  `;

  bindDisconnectButtons(ui, server);
  ui.modalEl.querySelector('#nc-modal-close').onclick = () => ui._closeModal();
}

export function showWireInspector(ui, wire) {
  if (!wire || !ui.modalEl) return;
  ui.modalEl.style.display = 'flex';

  let fromLabel = 'Building';
  if (wire.buildingId) {
    const b = ui.sim.getBuilding(wire.buildingId);
    fromLabel = b ? (b.name || `${b.type.charAt(0).toUpperCase() + b.type.slice(1)} #${b.id}`) : 'Building';
  } else if (wire.deviceId) {
    const d = ui.sim.getDevice(wire.deviceId);
    fromLabel = d ? (DEVICE_CATALOG[d.type]?.name || 'Device') : 'Device';
  }

  let toLabel = 'Server';
  if (wire.targetDeviceId) {
    const d = ui.sim.getDevice(wire.targetDeviceId);
    toLabel = d ? (DEVICE_CATALOG[d.type]?.name || 'Device') : 'Device';
  } else {
    const srv = ui.sim.getServerAt(wire.path[wire.path.length - 1]);
    toLabel = srv ? (srv.name || 'Server') : 'Server';
  }

  const spec = WIRE_CATALOG[wire.wireType];

  const isEncryptionUnlocked = Boolean(
    (ui.levelDef && (ui.levelDef.concept === 'encryption' || ui.levelDef.chapter > 6 || (ui.levelDef.chapter === 6 && parseFloat(ui.levelDef.id) >= 6.2))) ||
    (ui.sim && ui.sim.isEndless && ui.sim.mapData && ui.sim.mapData.tier >= 6)
  );

  ui.modalEl.innerHTML = `
    <div class="nc-card" style="max-width:380px; text-align:left;">
      <button class="nc-modal-close-icon" id="nc-modal-x-close" title="Close">✕</button>
      <h2 class="nc-card-title" style="margin-bottom:8px; color:${spec?.color || '#38bdf8'}; display:flex; align-items:center; gap:8px;">
        <span>🧵</span> Cable Inspector
      </h2>
      <div style="background:var(--color-surface-subtle); border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:0.82rem;">
        <div style="margin-bottom:6px;">Type: <strong style="color:${spec?.color || '#ffd166'};">${spec?.name || wire.wireType}</strong></div>
        <div style="margin-bottom:6px;">Route: <strong style="color:#ffffff;">${fromLabel} &rarr; ${toLabel}</strong></div>
        <div style="margin-bottom:6px;">Length: <strong style="color:${wire.isFaded ? '#f87171' : '#38bdf8'};">${wire.length} squares (${wire.length * 10}m)${wire.isFaded ? ' ⚠️ (Exceeds ' + (spec?.maxRunSquares || 10) + ' max)' : ''}</strong></div>
        ${isEncryptionUnlocked ? `<div style="margin-bottom:6px;">Encryption: <strong style="color:${wire.encrypted ? '#10b981' : '#94a3b8'};">${wire.encrypted ? '🔒 Active (Scrambled, +2 latency)' : 'None (Plaintext)'}</strong></div>` : ''}
        <div>Refund Value: <strong style="color:#ffd166;">$${wire.cost} coins</strong></div>
      </div>
      ${wire.isFaded ? `
        <div style="background:rgba(239, 68, 68, 0.15); border:1px solid #ef4444; border-radius:6px; padding:8px 10px; margin-bottom:12px; font-size:0.78rem; color:#fca5a5;">
          ⚠️ <strong>Signal Faded:</strong> Cable exceeds maximum length (${spec?.maxRunSquares || 10} squares)! Packets traveling along this cable will fade out and drop before arriving. Use a shorter run, upgrade cable type, or place an intermediate switch.
        </div>
      ` : ''}
      <div class="nc-card-actions" style="justify-content:space-between; gap:6px;">
        ${isEncryptionUnlocked ? `<button class="nc-btn nc-btn-secondary" id="nc-btn-toggle-encrypt" style="padding:6px 12px; font-size:0.8rem;">${wire.encrypted ? '🔓 Decrypt' : '🔒 Encrypt'}</button>` : ''}
        <button class="nc-btn nc-btn-danger" id="nc-btn-disconnect-wire" style="padding:6px 12px; font-size:0.8rem;">Disconnect (+$${wire.cost})</button>
        <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
      </div>
    </div>
  `;

  const xCloseWire = ui.modalEl.querySelector('#nc-modal-x-close');
  if (xCloseWire) xCloseWire.onclick = () => ui._closeModal();

  const toggleEncryptBtn = ui.modalEl.querySelector('#nc-btn-toggle-encrypt');
  if (toggleEncryptBtn) {
    toggleEncryptBtn.onclick = () => {
      ui.sim.setWireEncrypted(wire.id, !wire.encrypted);
      showWireInspector(ui, wire);
      ui._setHint(wire.encrypted ? 'Link encrypted! Snoop sees scrambled symbols.' : 'Link encryption disabled.');
    };
  }

  ui.modalEl.querySelector('#nc-btn-disconnect-wire').onclick = () => {
    ui.sim.removeWireById(wire.id);
    ui._updateCoinsDisplay();
    ui._setHint(`Disconnected ${spec?.name || 'wire'}. Refunded $${wire.cost} coins.`);
    ui._closeModal();
  };
  ui.modalEl.querySelector('#nc-modal-close').onclick = () => ui._closeModal();
}
