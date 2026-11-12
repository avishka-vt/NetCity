/**
 * NetCity v2.0 - Canvas Renderer
 * Single Responsibility: Renders the complete game scene to the HTML5 Canvas context:
 * grid lines, terrain (river & bridges), obstacles (walls, noisy zones, snoop zones),
 * cables with drop shadows, in-flight animated packets, buildings with countdown timer rings
 * and delivery quota dots, devices with 4-port LED indicators, AP wireless range fields,
 * drag preview lines, placement cursor previews, and collision burst effects.
 */

import { WIRE_CATALOG } from '../../../../packages/content/src/wires.js';
import { DEVICE_CATALOG } from '../../../../packages/content/src/devices.js';
import { drawWirePath, getPathPoint } from './draw-utils.js';

export class CanvasRenderer {
  constructor(canvas, ctx, assets = null) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.assets = assets;
  }

  /**
   * Render the complete game viewport
   * @param {Object} state - current frame state
   */
  render(state) {
    const {
      sim,
      camera,
      levelDef,
      isDragging = false,
      dragPath = [],
      dragValidity = { valid: true, isFaded: false },
      activeWireType = 'twisted_pair',
      collisionBursts = [],
      cursorSquare = null,
      heldItem = null,
      activeTool = null,
      deviceBtns = {}
    } = state;

    if (!this.ctx || !sim) return;

    try {
      const ctx = this.ctx;
      const sz = camera.baseSquareSize * camera.zoom;

      // Clear Canvas & Draw Stylized Grass Field (Image 1 & Image 2)
      const grassImg = this.assets ? this.assets.get('background/grass') : null;
      if (grassImg) {
        ctx.drawImage(grassImg, 0, 0, this.canvas.width, this.canvas.height);
      } else {
        ctx.fillStyle = '#65a30d';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }

      ctx.save();
      ctx.translate(camera.x, camera.y);

      // 1. Grid Background - subtle pasture chalk grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= sim.width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * sz, 0);
        ctx.lineTo(x * sz, sim.height * sz);
        ctx.stroke();
      }
      for (let y = 0; y <= sim.height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * sz);
        ctx.lineTo(sim.width * sz, y * sz);
        ctx.stroke();
      }

      // 1.5. Noisy squares (visual hint — faint red overlay)
      if (sim.noisySquares && sim.noisySquares.size > 0) {
        ctx.fillStyle = 'rgba(239,68,68,0.10)';
        for (const sq of sim.noisySquares) {
          const nx = (sq % sim.width) * sz;
          const ny = Math.floor(sq / sim.width) * sz;
          ctx.fillRect(nx, ny, sz, sz);
        }
      }

      // 1.7. Ponds & Obstacles (replacing walls/grey grids with shapes 1-6)
      if (sim.walls && sim.walls.size > 0) {
        const renderedSquares = new Set();
        const blocks = (sim.wallBlocks && sim.wallBlocks.length > 0)
          ? sim.wallBlocks
          : this._detectWallBlocks(sim.walls, sim.width, sim.height);

        for (const block of blocks) {
          const imgKey = `terrain/pond_${block.shape}`;
          const img = this.assets ? this.assets.get(imgKey) : null;
          const bx = block.x * sz;
          const by = block.y * sz;
          const bw = block.w * sz;
          const bh = block.h * sz;

          for (let dy = 0; dy < block.h; dy++) {
            for (let dx = 0; dx < block.w; dx++) {
              renderedSquares.add((block.y + dy) * sim.width + (block.x + dx));
            }
          }

          if (img) {
            // Draw stylized organic pond with soft natural bleed over grid lines
            const bleedX = Math.round(sz * 0.08);
            const bleedY = Math.round(sz * 0.08);
            ctx.drawImage(img, bx - bleedX, by - bleedY, bw + bleedX * 2, bh + bleedY * 2);
          } else {
            this._drawVectorPondFallback(ctx, bx, by, bw, bh);
          }
        }

        // Fallback for any standalone squares in sim.walls not covered by a block
        for (const sq of sim.walls) {
          if (!renderedSquares.has(sq)) {
            const wx = (sq % sim.width) * sz;
            const wy = Math.floor(sq / sim.width) * sz;
            const img1 = this.assets ? this.assets.get('terrain/pond_1x1') : null;
            if (img1) {
              const bleed = Math.round(sz * 0.08);
              ctx.drawImage(img1, wx - bleed, wy - bleed, sz + bleed * 2, sz + bleed * 2);
            } else {
              this._drawVectorPondFallback(ctx, wx, wy, sz, sz);
            }
          }
        }
      }

      // 1.8. River (Chapter 3: Two Islands)
      if (sim.riverSquares && sim.riverSquares.size > 0) {
        for (const sq of sim.riverSquares) {
          const rx = (sq % sim.width) * sz;
          const ry = Math.floor(sq / sim.width) * sz;
          ctx.fillStyle = '#0284c7'; // vibrant azure blue
          ctx.fillRect(rx, ry, sz, sz);
          ctx.fillStyle = '#38bdf8'; // light ripple highlight
          ctx.fillRect(rx + 2, ry + Math.floor(sz * 0.45), sz - 4, Math.max(1, Math.floor(sz * 0.08)));
        }
      }

      // 1.9. Bridges (Mini Motorways style bridge decks over river)
      if (sim.riverSquares && sim.riverSquares.size > 0) {
        const bridgeSquares = new Set();
        for (const wire of sim.wires.values()) {
          for (const sq of wire.path) {
            if (sim.riverSquares.has(sq)) bridgeSquares.add(sq);
          }
        }
        if (isDragging && dragPath) {
          for (const sq of dragPath) {
            if (sim.riverSquares.has(sq)) bridgeSquares.add(sq);
          }
        }

        for (const bsq of bridgeSquares) {
          const bx = (bsq % sim.width) * sz;
          const by = Math.floor(bsq / sim.width) * sz;
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(bx, by + Math.floor(sz * 0.15), sz, Math.floor(sz * 0.7));
          ctx.fillStyle = '#475569';
          ctx.fillRect(bx, by + Math.floor(sz * 0.15), sz, Math.max(1, Math.floor(sz * 0.05)));
          ctx.fillRect(bx, by + Math.floor(sz * 0.82), sz, Math.max(1, Math.floor(sz * 0.05)));
          ctx.fillStyle = '#334155';
          ctx.fillRect(bx + 2, by + Math.floor(sz * 0.22), Math.max(2, Math.floor(sz * 0.08)), Math.floor(sz * 0.56));
          ctx.fillRect(bx + sz - Math.max(2, Math.floor(sz * 0.08)) - 2, by + Math.floor(sz * 0.22), Math.max(2, Math.floor(sz * 0.08)), Math.floor(sz * 0.56));
        }
      }

      // 1.85. Snoop Squares (Chapter 6: Eavesdropper)
      if (sim.snoopSquares && sim.snoopSquares.size > 0) {
        for (const sq of sim.snoopSquares) {
          const sx = (sq % sim.width) * sz;
          const sy = Math.floor(sq / sim.width) * sz;
          ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
          ctx.fillRect(sx, sy, sz, sz);
          ctx.font = `${Math.floor(sz * 0.6)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🕵️', sx + sz / 2, sy + sz / 2);
        }
      }

      // 2. Connected Wires
      for (const wire of sim.wires.values()) {
        const spec = WIRE_CATALOG[wire.wireType];
        if (spec) {
          drawWirePath(ctx, wire.path, spec.color, sz, wire.isFaded, sim.width);
        }
        if (wire.encrypted && wire.path.length >= 2) {
          const midIdx = Math.floor(wire.path.length / 2);
          const midSq = wire.path[midIdx];
          const mx = (midSq % sim.width) * sz + sz / 2;
          const my = Math.floor(midSq / sim.width) * sz + sz / 2;
          ctx.font = `${Math.floor(sz * 0.4)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🔒', mx, my);
        }
      }

      // 3. Drag Preview Wire
      if (isDragging && dragPath.length > 1) {
        const wireSpec = WIRE_CATALOG[activeWireType] || WIRE_CATALOG.twisted_pair;
        const color = !dragValidity.valid ? '#ff5d73' : wireSpec.color;
        drawWirePath(ctx, dragPath, color, sz, dragValidity.isFaded, sim.width);
      }

      // 4. In-flight Packets
      for (const pkt of sim.inFlightPackets) {
        const progress = Math.min(1, (sim.tickNumber - pkt.startTick) / pkt.travelTicks);
        const pos = getPathPoint(pkt.path, progress, sz, sim.width);

        ctx.save();
        const pColor = pkt.kind === 'reply' ? '#ffd166' : (pkt.color || '#38bdf8');

        // Wake line
        if (progress > 0.05) {
          const tailPos = getPathPoint(pkt.path, progress - 0.04, sz, sim.width);
          ctx.strokeStyle = pColor;
          ctx.globalAlpha = 0.3;
          ctx.lineWidth = Math.max(1.5, sz * 0.08);
          ctx.beginPath();
          ctx.moveTo(tailPos.x, tailPos.y);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
        }

        ctx.globalAlpha = 1.0;
        ctx.fillStyle = pColor;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, Math.max(3.5, sz * 0.16), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, Math.max(1.5, sz * 0.07), 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 5. Servers
      const serversToRender = sim.servers || [{ square: sim.server, color: '#2ec4b6', icon: '🖥️', name: 'Server' }];
      const showMac = Boolean(levelDef && (levelDef.concept === 'mac_learning' || (levelDef.chapter >= 2 && parseFloat(levelDef.id) >= 2.4)));
      for (const srv of serversToRender) {
        const sx = (srv.square % sim.width) * sz;
        const sy = Math.floor(srv.square / sim.width) * sz;
        const cx = sx + sz / 2;
        const cy = sy + sz / 2 - (showMac && srv.mac ? sz * 0.12 : 0);

        // Radiant cyan circular pedestal pad (Image 1 target aesthetic)
        ctx.save();
        const padR = sz * 0.46;
        const glow = ctx.createRadialGradient(cx, cy, padR * 0.2, cx, cy, padR * 1.5);
        glow.addColorStop(0, 'rgba(0, 229, 255, 0.45)');
        glow.addColorStop(0.5, 'rgba(0, 229, 255, 0.18)');
        glow.addColorStop(1, 'rgba(0, 229, 255, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, padR * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // 3D base platform disc
        ctx.fillStyle = '#0369a1';
        ctx.beginPath();
        ctx.ellipse(cx, cy + sz * 0.05, padR, padR * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();

        // Platform surface top disc
        const platGrad = ctx.createLinearGradient(cx, cy - padR * 0.65, cx, cy + padR * 0.65);
        platGrad.addColorStop(0, '#00e5ff');
        platGrad.addColorStop(1, '#0284c7');
        ctx.fillStyle = platGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, padR, padR * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Branching 4-way network nodes symbol
        const armLen = padR * 0.50;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(2, sz * 0.06);
        ctx.lineCap = 'round';
        const diag = armLen * 0.707;
        ctx.beginPath();
        ctx.moveTo(cx - diag, cy - diag * 0.65);
        ctx.lineTo(cx + diag, cy + diag * 0.65);
        ctx.moveTo(cx + diag, cy - diag * 0.65);
        ctx.lineTo(cx - diag, cy + diag * 0.65);
        ctx.stroke();

        // Terminal nodes
        ctx.fillStyle = '#ffffff';
        const nodeR = Math.max(2, sz * 0.05);
        const nodePositions = [
          [cx - diag, cy - diag * 0.65],
          [cx + diag, cy + diag * 0.65],
          [cx + diag, cy - diag * 0.65],
          [cx - diag, cy + diag * 0.65],
          [cx, cy]
        ];
        for (const [nx, ny] of nodePositions) {
          ctx.beginPath();
          ctx.arc(nx, ny, nodeR, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        const srvDrawn = this.assets ? this.assets.drawServer(ctx, srv.type || 'server', cx, cy, sz) : false;
        if (!srvDrawn) {
          ctx.font = `${Math.floor(sz * 0.60)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(srv.icon || '🖥️', cx, cy);
        }

        if (showMac && srv.mac) {
          ctx.font = `bold ${Math.max(9, Math.floor(sz * 0.22))}px monospace`;
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(srv.mac, sx + sz / 2, sy + sz - 2);
        }

        // Floating pill badge above server (multi-server identification)
        if (sz >= 20 && srv.name) {
          const zoneIcon = srv.zone === 'blue' ? '🔵' : (srv.zone === 'green' ? '🟢' : (srv.zone === 'orange' ? '🟠' : (srv.icon || '🖥️')));
          const badgeText = `${zoneIcon}  ${srv.name}`;
          const fontSize = Math.max(9, Math.floor(sz * 0.22));
          ctx.save();
          ctx.font = `bold ${fontSize}px sans-serif`;
          const textW = ctx.measureText ? ctx.measureText(badgeText).width : badgeText.length * fontSize * 0.6;
          const badgeW = textW + fontSize * 1.5;
          const badgeH = Math.max(16, fontSize * 1.6);
          const badgeX = sx + sz / 2 - badgeW / 2;
          const badgeY = sy - badgeH * 0.85;

          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetY = 2;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2);
          } else {
            ctx.rect(badgeX, badgeY, badgeW, badgeH);
          }
          ctx.fill();

          ctx.shadowColor = 'transparent';
          ctx.strokeStyle = srv.color || '#38bdf8';
          ctx.lineWidth = 1.6;
          ctx.stroke();

          ctx.fillStyle = '#0f172a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(badgeText, sx + sz / 2, badgeY + badgeH / 2);
          ctx.restore();
        }
      }

      // 5.5 Hardware Devices
      for (const dev of sim.devices.values()) {
        const dx = (dev.square % sim.width) * sz;
        const dy = Math.floor(dev.square / sim.width) * sz;

        if (dev.type === 'access_point') {
          ctx.save();
          ctx.fillStyle = 'rgba(6, 214, 160, 0.06)';
          ctx.strokeStyle = 'rgba(6, 214, 160, 0.35)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(dx + sz / 2, dy + sz / 2, 6 * sz, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          const hasApAsset = Boolean(this.assets && (this.assets.get('devices/access_point') || this.assets.get('devices/ap')));
          if (!hasApAsset) {
            // Fallback beacon if image asset is not loaded
            const beaconR = Math.max(8, sz * 0.32);
            const beaconX = dx + sz / 2;
            const beaconY = dy + sz / 2;
            const bGlow = ctx.createRadialGradient(beaconX, beaconY, beaconR * 0.4, beaconX, beaconY, beaconR * 1.6);
            bGlow.addColorStop(0, 'rgba(0, 229, 255, 0.5)');
            bGlow.addColorStop(1, 'rgba(0, 229, 255, 0)');
            ctx.fillStyle = bGlow;
            ctx.beginPath();
            ctx.arc(beaconX, beaconY, beaconR * 1.6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.arc(beaconX, beaconY, beaconR, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.font = `${Math.floor(beaconR * 1.1)}px sans-serif`;
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('📶', beaconX, beaconY);
          }
          ctx.restore();
        }

        const spec = DEVICE_CATALOG[dev.type] || { color: '#3a86ff', icon: '📦' };
        const isMultiPort = ['switch', 'hub', 'router', 'cabinet'].includes(dev.type);

        const devDrawn = this.assets ? this.assets.drawDevice(ctx, dev.type, dx + sz / 2, dy + (isMultiPort ? sz * 0.44 : sz / 2), sz) : false;
        if (!devDrawn) {
          ctx.font = `${Math.floor(sz * 0.70)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(spec.icon, dx + sz / 2, dy + (isMultiPort ? sz * 0.44 : sz / 2));
        }

        if (isMultiPort) {
          const portCount = 4;
          const usedPorts = Math.min(portCount, (dev.connectedWires || []).length);
          const ledR = Math.max(1.5, sz * 0.04);
          const startX = dx + sz / 2 - ((portCount - 1) * ledR * 2.5) / 2;
          const ledY = dy + sz - ledR * 2.2;
          for (let p = 0; p < portCount; p++) {
            ctx.fillStyle = p < usedPorts ? '#10b981' : '#334155';
            ctx.beginPath();
            ctx.arc(startX + p * ledR * 2.5, ledY, ledR, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 6. Buildings & Timers
      for (const b of sim.buildings) {
        const bx = (b.square % sim.width) * sz;
        const by = Math.floor(b.square / sim.width) * sz;

        // Subnet & VLAN color group (Blue, Green, Orange) styling
        let buildingZone = b.zone || b.colorGroup || null;
        if (!buildingZone && b.wireId) {
          const w = sim.wires.get(b.wireId);
          if (w && w.targetDeviceId) {
            const d = sim.getDevice(w.targetDeviceId);
            if (d && d.type === 'switch' && d.portZones) {
              buildingZone = d.portZones.get(w.id) || null;
            }
          }
        }
        if (!buildingZone && levelDef && (levelDef.id === '3.4' || levelDef.concept === 'subnets') && b.subnet) {
          if (b.subnet.includes('.1.')) buildingZone = 'blue';
          else if (b.subnet.includes('.2.')) buildingZone = 'green';
        }

        const isBlueZone = buildingZone === 'blue';
        const isGreenZone = buildingZone === 'green';
        const isOrangeZone = buildingZone === 'orange';

        // Draw ground colored ring under the building in zone / subnet levels
        if ((isBlueZone || isGreenZone || isOrangeZone) && b.state !== 'gave_up') {
          ctx.save();
          ctx.beginPath();
          ctx.arc(bx + sz / 2, by + sz * 0.54, sz * 0.44, 0, Math.PI * 2);
          if (isBlueZone) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
            ctx.strokeStyle = '#38bdf8';
          } else if (isGreenZone) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
            ctx.strokeStyle = '#10b981';
          } else if (isOrangeZone) {
            ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
            ctx.strokeStyle = '#f59e0b';
          }
          ctx.fill();
          ctx.lineWidth = 1.8;
          ctx.setLineDash([4, 3]);
          ctx.stroke();
          ctx.restore();
        }

        if (b.state === 'construction') {
          const constDrawn = this.assets ? this.assets.drawBuilding(ctx, 'construction', bx + sz / 2, by + sz / 2, sz) : false;
          if (!constDrawn) {
            ctx.font = `${Math.floor(sz * 0.65)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🚧', bx + sz / 2, by + sz / 2);
          }
        } else {
          let bldgType = b.type;
          if (b.type === 'laptop') {
            if (isBlueZone) bldgType = 'laptop_blue';
            else if (isGreenZone) bldgType = 'laptop_green';
            else if (isOrangeZone) bldgType = 'laptop_orange';
            else bldgType = 'laptop';
          } else if (b.type === 'classroom' || b.type === 'school') {
            if (isBlueZone) bldgType = 'classroom_blue';
            else if (isGreenZone) bldgType = 'classroom_green';
            else if (isOrangeZone) bldgType = 'classroom_orange';
            else bldgType = 'classroom';
          } else if (b.type === 'sports_ground' || b.type === 'ground') {
            if (isBlueZone) bldgType = 'sports_ground_blue';
            else if (isGreenZone) bldgType = 'sports_ground_green';
            else if (isOrangeZone) bldgType = 'sports_ground_orange';
            else bldgType = 'sports_ground';
          } else if (b.type === 'home' || b.type === 'house') {
            if (isBlueZone) bldgType = 'home_blue';
            else if (isGreenZone) bldgType = 'home_green';
            else if (isOrangeZone) bldgType = 'home_orange';
            else bldgType = 'home';
          } else if (b.type === 'library') {
            if (isBlueZone) bldgType = 'library_blue';
            else if (isGreenZone) bldgType = 'library_green';
            else if (isOrangeZone) bldgType = 'library_orange';
            else bldgType = 'library';
          } else if (b.type === 'lab' || b.type === 'computer_lab') {
            if (isBlueZone) bldgType = 'lab_blue';
            else if (isGreenZone) bldgType = 'lab_green';
            else if (isOrangeZone) bldgType = 'lab_orange';
            else bldgType = 'lab';
          }
          const bldgDrawn = this.assets ? this.assets.drawBuilding(ctx, bldgType, bx + sz / 2, by + (showMac && b.mac ? sz * 0.42 : sz * 0.48), sz, buildingZone) : false;
          if (!bldgDrawn) {
            let icon = '🏫';
            if (b.state === 'gave_up') {
              icon = '🏚️';
            } else if (b.type === 'laptop') {
              icon = '💻';
            } else if (b.type === 'phone' || b.type === 'tablet') {
              icon = '📱';
            } else if (b.type === 'sports_ground') {
              icon = '⚽';
            } else if (b.type === 'home') {
              icon = '🏠';
            } else if (b.type === 'library') {
              icon = '📚';
            } else if (b.type === 'lab' || b.type === 'computer_lab') {
              icon = '🖥️';
            }

            ctx.font = `${Math.floor(sz * 0.58)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icon, bx + sz / 2, by + (showMac && b.mac ? sz * 0.42 : sz * 0.48));
          }
        }

        // Tags removed from top of end devices (kept for servers). Alert only for rogue intruder devices.
        if (b.isRogue && b.state !== 'gave_up' && sz >= 20) {
          const badgeText = '🚨  Rogue (10.99.99.99)';
          const fontSize = Math.max(9, Math.floor(sz * 0.22));

          ctx.save();
          ctx.font = `bold ${fontSize}px sans-serif`;
          const textW = ctx.measureText ? ctx.measureText(badgeText).width : badgeText.length * fontSize * 0.6;
          const badgeW = textW + fontSize * 1.5;
          const badgeH = Math.max(16, fontSize * 1.6);
          const badgeX = bx + sz / 2 - badgeW / 2;
          const badgeY = by - badgeH * 0.85;

          ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetY = 2;
          ctx.fillStyle = '#fef2f2';
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2);
          } else {
            ctx.rect(badgeX, badgeY, badgeW, badgeH);
          }
          ctx.fill();

          ctx.shadowColor = 'transparent';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.6;
          ctx.stroke();

          ctx.fillStyle = '#991b1b';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(badgeText, bx + sz / 2, badgeY + badgeH / 2);
          ctx.restore();
        }

        if (b.state === 'construction') {
          continue;
        }

        if (b.state === 'open') {
          ctx.font = `${Math.floor(sz * 0.32)}px sans-serif`;
          const destIcon = b.targetType === 'web' ? '🌐' : (b.targetType === 'db' ? '🗄️' : '📍');
          ctx.fillText(destIcon, bx + sz * 0.20, by + sz * 0.20);
        }

        if (levelDef && levelDef.chapter >= 3 && b.subnet && b.state === 'open') {
          const dotColor = b.subnet.includes('192.168.1') ? '#38bdf8' : (b.subnet.includes('192.168.2') ? '#10b981' : '#a78bfa');
          ctx.fillStyle = dotColor;
          ctx.beginPath();
          ctx.arc(bx + sz * 0.82, by + sz * 0.82, Math.max(3, sz * 0.12), 0, Math.PI * 2);
          ctx.fill();
        }

        if (b.zone && b.state === 'open') {
          const zoneColors = { blue: '#38bdf8', green: '#10b981', orange: '#f59e0b', red: '#ef4444' };
          ctx.fillStyle = zoneColors[b.zone] || '#38bdf8';
          ctx.beginPath();
          ctx.arc(bx + sz * 0.82, by + sz * 0.18, Math.max(3, sz * 0.12), 0, Math.PI * 2);
          ctx.fill();
        }

        if (levelDef && levelDef.chapter >= 3 && b.state === 'open' && (levelDef.concept === 'ip_addresses' || levelDef.concept === 'duplicate_ip' || levelDef.concept === 'default_gateway')) {
          ctx.font = `bold ${Math.max(8, Math.floor(sz * 0.20))}px monospace`;
          ctx.fillStyle = b.ip ? '#38bdf8' : '#ef4444';
          const displayIp = b.ip ? (sz < 36 ? `.${b.ip.split('.').pop()}` : b.ip) : 'NO IP';
          ctx.fillText(displayIp, bx + sz / 2, by + sz * 0.86);
        }

        if ((b.type === 'phone' || b.type === 'tablet') && b.state === 'open') {
          const cov = sim.getWirelessCoverage(b.id);
          if (cov && cov.connected) {
            ctx.font = `${Math.floor(sz * 0.35)}px sans-serif`;
            ctx.fillText('📶', bx + sz * 0.80, by + sz * 0.20);
          }
        }

        if (b.mac && showMac && b.state === 'open') {
          ctx.font = `bold ${Math.max(8, Math.floor(sz * 0.22))}px monospace`;
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(b.mac, bx + sz / 2, by + sz * 0.84);
        }

        if (b.state === 'open') {
          const totalTimer = b.timerPhase === 'first' ? b.firstTimerTicks : b.cycleTimerTicks;
          const frac = Math.max(0, Math.min(1, b.timerTicksLeft / totalTimer));

          let ringColor = '#10b981';
          if (frac < 0.25) ringColor = '#ef4444';
          else if (frac < 0.5) ringColor = '#f59e0b';

          ctx.strokeStyle = ringColor;
          ctx.lineWidth = Math.max(2, sz * 0.08);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(bx + sz / 2, by + sz / 2, sz * 0.44, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
          ctx.stroke();

          const dotRadius = Math.max(2, sz * 0.05);
          const startDotX = bx + sz / 2 - ((b.quota - 1) * dotRadius * 2.5) / 2;
          for (let q = 0; q < b.quota; q++) {
            ctx.fillStyle = q < b.fulfilledInCycle ? '#2ec4b6' : '#334155';
            ctx.beginPath();
            ctx.arc(startDotX + q * dotRadius * 2.5, by + sz - dotRadius * 2, dotRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 7. Device Placement or Move Preview
      const isDeviceTool = Boolean(deviceBtns[activeTool]);
      const previewType = heldItem ? heldItem.type : (isDeviceTool ? activeTool : null);

      if (previewType && cursorSquare !== null) {
        const hx = (cursorSquare % sim.width) * sz;
        const hy = Math.floor(cursorSquare / sim.width) * sz;

        const canPlace = (
          cursorSquare >= 0 && cursorSquare < sim.width * sim.height &&
          cursorSquare !== sim.server &&
          !sim.walls.has(cursorSquare) &&
          !(sim.riverSquares && sim.riverSquares.has(cursorSquare)) &&
          !sim.getBuildingAt(cursorSquare) &&
          !sim.getDeviceAt(cursorSquare) &&
          !sim.occupiedSquares.has(cursorSquare)
        );

        ctx.save();
        if (previewType === 'access_point') {
          ctx.fillStyle = canPlace ? 'rgba(6, 214, 160, 0.14)' : 'rgba(239, 68, 68, 0.14)';
          ctx.strokeStyle = canPlace ? 'rgba(6, 214, 160, 0.75)' : 'rgba(239, 68, 68, 0.75)';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(hx + sz / 2, hy + sz / 2, 6 * sz, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        ctx.strokeStyle = canPlace ? '#06d6a0' : '#ef4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(hx + 2, hy + 2, sz - 4, sz - 4);

        const spec = DEVICE_CATALOG[previewType] || { color: '#3a86ff', icon: '📦' };
        ctx.fillStyle = spec.color;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(hx + 3, hy + 3, sz - 6, sz - 6);
        ctx.font = `${Math.floor(sz * 0.55)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(spec.icon, hx + sz / 2, hy + sz / 2);
        ctx.restore();
      }

      // 8. Collision Bursts
      if (collisionBursts && collisionBursts.length > 0) {
        for (const burst of collisionBursts) {
          const bx = (burst.square % sim.width) * sz + sz / 2;
          const by = Math.floor(burst.square / sim.width) * sz + sz / 2;
          const progress = burst.age / 24;
          const radius = sz * (0.3 + progress * 0.7);
          const alpha = Math.max(0, 1 - progress);

          ctx.save();
          ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(bx, by, radius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.font = `${Math.floor(sz * 0.75)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('💥', bx, by);
          ctx.restore();
        }
      }

      ctx.restore();
    } catch (err) {
      console.error('Render error:', err);
    }
  }

  /**
   * Decompose arbitrary wall squares into standard rectangular block shapes (3x2, 2x2, 3x1, 1x2, 2x1, 1x1)
   */
  _detectWallBlocks(wallsSet, width, height) {
    if (!wallsSet || wallsSet.size === 0) return [];
    const remaining = new Set(wallsSet);
    const blocks = [];

    // Prioritize larger shapes: 3x2, 2x2, 3x1, 1x2, 2x1, 1x1
    const candidateShapes = [
      { w: 3, h: 2, shape: '3x2' },
      { w: 2, h: 2, shape: '2x2' },
      { w: 3, h: 1, shape: '3x1' },
      { w: 1, h: 2, shape: '1x2' },
      { w: 2, h: 1, shape: '2x1' },
      { w: 1, h: 1, shape: '1x1' }
    ];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const sq = y * width + x;
        if (!remaining.has(sq)) continue;

        let matched = false;
        for (const s of candidateShapes) {
          if (x + s.w > width || y + s.h > height) continue;
          let allPresent = true;
          for (let dy = 0; dy < s.h; dy++) {
            for (let dx = 0; dx < s.w; dx++) {
              if (!remaining.has((y + dy) * width + (x + dx))) {
                allPresent = false;
                break;
              }
            }
            if (!allPresent) break;
          }

          if (allPresent) {
            for (let dy = 0; dy < s.h; dy++) {
              for (let dx = 0; dx < s.w; dx++) {
                remaining.delete((y + dy) * width + (x + dx));
              }
            }
            blocks.push({ x, y, w: s.w, h: s.h, shape: s.shape });
            matched = true;
            break;
          }
        }

        if (!matched && remaining.has(sq)) {
          remaining.delete(sq);
          blocks.push({ x, y, w: 1, h: 1, shape: '1x1' });
        }
      }
    }
    return blocks;
  }

  /**
   * Stylized organic vector pond fallback when raster images are loading or in mock environments
   */
  _drawVectorPondFallback(ctx, x, y, w, h) {
    ctx.save();
    const r = Math.min(10, Math.min(w, h) * 0.22);

    // Sandy stone border
    ctx.fillStyle = '#ca8a04';
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, w - 2, h - 2, r);
      ctx.fill();
    } else {
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    }

    // Azure blue water
    ctx.fillStyle = '#0284c7';
    const inset = Math.max(3, Math.min(w, h) * 0.12);
    const innerR = Math.max(2, r - 2);
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x + inset, y + inset, w - inset * 2, h - inset * 2, innerR);
      ctx.fill();
    } else {
      ctx.fillRect(x + inset, y + inset, w - inset * 2, h - inset * 2);
    }

    // Water ripple highlight
    ctx.fillStyle = '#38bdf8';
    const ripW = Math.max(4, Math.floor(w * 0.35));
    const ripH = Math.max(1, Math.floor(h * 0.08));
    ctx.fillRect(x + inset + 2, y + Math.floor(h * 0.45), ripW, ripH);

    // Green lily pad
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    const lcx = x + w * 0.38;
    const lcy = y + h * 0.42;
    const lr = Math.min(7, Math.min(w, h) * 0.14);
    ctx.arc(lcx, lcy, lr, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
