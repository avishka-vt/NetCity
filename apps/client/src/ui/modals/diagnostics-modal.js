/**
 * NetCity v2.0 - Diagnostics Modal (Test & Trace)
 * Single Responsibility: Renders Bit's Network Detective diagnostic interface:
 * Ping test message injection, hop-by-hop packet trace output, and troubleshooting checklists.
 */

export function showDiagnosticsModal(ui) {
  if (!ui.modalEl) return;
  ui.modalEl.style.display = 'flex';

  let buildingOptions = '';
  for (const b of ui.sim.buildings) {
    buildingOptions += `<option value="${b.square}">[#${b.id}] ${b.name || b.type} (${b.ip || 'No IP'})</option>`;
  }

  let serverOptions = '';
  for (const s of (ui.sim.servers || [])) {
    serverOptions += `<option value="${s.square}">${s.name} (${s.ip})</option>`;
  }

  ui.modalEl.innerHTML = `
    <div class="nc-card" style="max-width:540px; text-align:left;">
      <h2 class="nc-card-title" style="margin-bottom:6px; color:#38bdf8; display:flex; align-items:center; gap:8px;">
        <span>🔍</span> Network Detective: Test & Trace
      </h2>
      <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:12px; line-height:1.4;">
        Troubleshooting is a method, not a guess. Follow Bit's checklist step-by-step from device outward to isolate faults!
      </p>

      <!-- Bit's Diagnostic Checklist -->
      <div style="background:#0d1b2a; border:1px solid #415a77; border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:0.8rem;">
        <h4 style="margin:0 0 6px 0; color:#cbd5e1; font-size:0.82rem;">Bit's Troubleshooting Checklist:</h4>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; color:#94a3b8; font-size:0.75rem;">
          <div>1. 🔌 Is physical cable connected?</div>
          <div>2. 🌐 Is IP address configured?</div>
          <div>3. 🧭 Is default gateway correct?</div>
          <div>4. 📖 Is DNS name resolving?</div>
          <div>5. 🚪 Is target service port open?</div>
          <div>6. 🛡️ Is zone/firewall permitted?</div>
        </div>
      </div>

      <div style="display:flex; gap:10px; margin-bottom:12px;">
        <div style="flex:1;">
          <label style="display:block; font-size:0.75rem; color:#94a3b8; margin-bottom:3px;">From Device:</label>
          <select id="nc-diag-from" style="width:100%; background:#1b263b; color:#fff; border:1px solid #415a77; border-radius:4px; padding:6px; font-size:0.78rem;">
            ${buildingOptions}
          </select>
        </div>
        <div style="flex:1;">
          <label style="display:block; font-size:0.75rem; color:#94a3b8; margin-bottom:3px;">To Server:</label>
          <select id="nc-diag-to" style="width:100%; background:#1b263b; color:#fff; border:1px solid #415a77; border-radius:4px; padding:6px; font-size:0.78rem;">
            ${serverOptions}
          </select>
        </div>
      </div>

      <div class="nc-card-actions" style="justify-content:flex-start; margin-bottom:12px; gap:8px;">
        <button class="nc-btn nc-btn-primary" id="nc-btn-run-ping">Send Test Message (Ping)</button>
        <button class="nc-btn nc-btn-secondary" id="nc-btn-run-trace">Packet Trace (Hop-by-Hop)</button>
      </div>

      <div id="nc-diag-results" style="background:#09121d; border-radius:6px; padding:10px; min-height:80px; font-family:monospace; font-size:0.78rem; color:#e2e8f0; max-height:160px; overflow-y:auto;">
        Select source and destination, then click Send Test Message or Packet Trace.
      </div>

      <div class="nc-card-actions" style="margin-top:12px;">
        <button class="nc-btn nc-btn-secondary" id="nc-modal-close">Close</button>
      </div>
    </div>
  `;

  const fromSel = ui.modalEl.querySelector('#nc-diag-from');
  const toSel = ui.modalEl.querySelector('#nc-diag-to');
  const resultsBox = ui.modalEl.querySelector('#nc-diag-results');

  ui.modalEl.querySelector('#nc-btn-run-ping').onclick = () => {
    const fromSq = parseInt(fromSel.value, 10);
    const toSq = parseInt(toSel.value, 10);
    const res = ui.sim.testMessage(fromSq, toSq);
    if (res.success) {
      resultsBox.innerHTML = `
        <div style="color:#10b981; font-weight:bold; margin-bottom:4px;">✅ PING SUCCESSFUL (0% packet loss)</div>
        <div style="color:#94a3b8;">Path: ${res.hops.join(' &rarr; ')}</div>
        <div style="color:#38bdf8;">Round-trip transit confirmed. All diagnostic checks passed!</div>
      `;
    } else {
      resultsBox.innerHTML = `
        <div style="color:#ef4444; font-weight:bold; margin-bottom:4px;">❌ PING FAILED</div>
        <div style="color:#ffd166;">Diagnosis: <strong>${res.failureReason}</strong></div>
        <div style="color:#94a3b8;">Packet stopped at square ${res.hops[res.hops.length - 1] || fromSq}.</div>
        <div style="color:#cbd5e1; margin-top:4px;">Recommendation: Check ${res.failureReason === 'no_wire' ? 'physical cable' : (res.failureReason === 'no_gateway' ? 'default gateway' : (res.failureReason === 'wrong_zone' ? 'port zone VLAN alignment' : 'network configuration'))}.</div>
      `;
    }
  };

  ui.modalEl.querySelector('#nc-btn-run-trace').onclick = () => {
    const fromSq = parseInt(fromSel.value, 10);
    const toSq = parseInt(toSel.value, 10);
    const res = ui.sim.traceRoute(fromSq, toSq);
    let traceHtml = `<div style="font-weight:bold; margin-bottom:6px; color:#38bdf8;">Hop-by-Hop Packet Trace:</div>`;
    if (res.detailedHops) {
      res.detailedHops.forEach((h, idx) => {
        traceHtml += `<div>Hop ${idx + 1}: Square ${h.square} [${h.type.toUpperCase()}: ${h.name}] &middot; <span style="color:#10b981;">OK</span></div>`;
      });
    }
    if (!res.success) {
      traceHtml += `<div style="color:#ef4444; font-weight:bold; margin-top:4px;">&times; Dropped at hop: ${res.failureReason}</div>`;
    } else {
      traceHtml += `<div style="color:#10b981; font-weight:bold; margin-top:4px;">&check; Trace complete (Destination reached).</div>`;
    }
    resultsBox.innerHTML = traceHtml;
  };

  ui.modalEl.querySelector('#nc-modal-close').onclick = () => ui._closeModal();
}
