/**
 * NetCity v2.0 - Interaction Controller
 * Single Responsibility: Manages pointer, mouse, touch, and keyboard events,
 * routes tool activations, device placement/movement, inspector triggers,
 * and tracks registered event listeners for clean disposal.
 */

import { DEVICE_CATALOG } from '../../../../packages/content/src/devices.js';
import { REFUSAL_MESSAGES } from '../../../../packages/content/src/wires.js';

export class InteractionController {
  constructor(ui) {
    this.ui = ui;
    this.listeners = [];
    this.resizeObserver = null;
  }

  /**
   * Register an event listener and record it for cleanup
   */
  addListener(target, type, fn, opts) {
    if (!target) return;
    target.addEventListener(type, fn, opts);
    this.listeners.push({ target, type, fn, opts });
  }

  /**
   * Remove all registered event listeners
   */
  removeAllListeners() {
    for (const { target, type, fn, opts } of this.listeners) {
      target.removeEventListener(type, fn, opts);
    }
    this.listeners = [];

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  /**
   * Bind all game input events
   */
  bindEvents() {
    const ui = this.ui;

    // 1. Tool buttons (cables)
    for (const [key, btn] of Object.entries(ui.wireBtns)) {
      this.addListener(btn, 'click', () => {
        if (ui.levelDef.wiresAllowed.includes(key)) {
          ui.activeTool = key;
          ui._updateToolButtons();
          if (ui.tutorialController) {
            ui.tutorialController.handleEvent('wire_tool_selected');
          }
        }
      });
    }

    // 2. Tool buttons (devices)
    for (const [key, btn] of Object.entries(ui.deviceBtns)) {
      this.addListener(btn, 'click', () => {
        if (ui.levelDef.devicesAllowed && ui.levelDef.devicesAllowed.includes(key)) {
          ui.activeTool = key;
          ui._updateToolButtons();
        }
      });
    }

    // 3. Pickup / Move button
    if (ui.pickupBtn) {
      this.addListener(ui.pickupBtn, 'click', () => {
        ui.activeTool = 'pickup';
        ui._updateToolButtons();
        ui._setHint('Move tool selected: Click an existing device to pick it up and relocate it.');
      });
    }

    // 4. Segmented Category Switch (Cables vs Devices)
    const catCables = ui.container.querySelector('#nc-cat-cables');
    if (catCables) {
      this.addListener(catCables, 'click', () => {
        ui.dockTab = 'cables';
        const allowedWires = ui.levelDef.wiresAllowed || [];
        if (!allowedWires.includes(ui.activeTool)) {
          ui.activeTool = allowedWires[0] || 'twisted_pair';
        }
        ui._updateToolButtons();
      });
    }

    const catDevices = ui.container.querySelector('#nc-cat-devices');
    if (catDevices) {
      this.addListener(catDevices, 'click', () => {
        ui.dockTab = 'devices';
        const allowedDevs = (ui.levelDef.devicesAllowed || []).filter(d => d !== 'server');
        if (!allowedDevs.includes(ui.activeTool)) {
          ui.activeTool = allowedDevs[0] || 'switch';
        }
        ui._updateToolButtons();
      });
    }

    // 4.5. Dock Collapse / Expand Toggle Button
    const dockToggle = ui.container.querySelector('#nc-dock-toggle');
    const dockCard = ui.container.querySelector('#nc-dock-card');
    if (dockToggle && dockCard) {
      this.addListener(dockToggle, 'click', (e) => {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        const isCollapsed = dockCard.classList.toggle('nc-dock-collapsed');
        dockToggle.textContent = isCollapsed ? '▲' : '▼';
        dockToggle.title = isCollapsed ? 'Expand Toolbar' : 'Collapse Toolbar';
      });
    }

    // 5. Simulation Speed Toggle (1x -> 2x -> 4x)
    const btnSpeed = ui.container.querySelector('#nc-btn-speed');
    if (btnSpeed) {
      this.addListener(btnSpeed, 'click', () => {
        const speeds = [1, 2, 4];
        const nextIdx = (speeds.indexOf(ui.gameSpeed || 1) + 1) % speeds.length;
        ui.gameSpeed = speeds[nextIdx];
        if (ui.gameLoop) ui.gameLoop.setSpeed(ui.gameSpeed);
        btnSpeed.textContent = `${ui.gameSpeed}×`;
        btnSpeed.classList.toggle('nc-speed-active', ui.gameSpeed > 1);
        if (typeof btnSpeed.blur === 'function') btnSpeed.blur();
      });
    }

    // 6. Chief Juno Mentor button
    const btnJuno = ui.btnJuno || ui.container.querySelector('#nc-btn-juno');
    if (btnJuno) {
      this.addListener(btnJuno, 'click', () => {
        if (typeof ui.showJunoComms === 'function') {
          ui.showJunoComms();
        }
        if (typeof btnJuno.blur === 'function') btnJuno.blur();
      });
    }

    // 7. Tutorial / Guide button
    if (ui.btnTutorial) {
      this.addListener(ui.btnTutorial, 'click', () => {
        ui._showTutorialModal();
      });
    }

    // 8. Diagnostics button
    if (ui.btnDiagnostics) {
      this.addListener(ui.btnDiagnostics, 'click', () => {
        ui._showDiagnosticsModal();
      });
    }

    // 9. Pause button
    if (ui.btnPause) {
      this.addListener(ui.btnPause, 'click', () => {
        if (ui.sim) {
          ui.sim.paused = !ui.sim.paused;
          ui.btnPause.textContent = ui.sim.paused ? 'Resume' : 'Pause';
          ui.btnPause.style.backgroundColor = ui.sim.paused ? '#b91c1c' : '';
          if (ui.sim.paused && typeof ui._triggerJunoMoment === 'function') {
            ui._triggerJunoMoment('paused');
          }
          if (typeof ui.btnPause.blur === 'function') ui.btnPause.blur();
        }
      });
    }

    // 8.5 Undo Last Wire button
    const btnUndo = ui.btnUndo || ui.container.querySelector('#nc-btn-undo');
    if (btnUndo) {
      this.addListener(btnUndo, 'click', () => {
        if (ui.sim && typeof ui.sim.undoLastWire === 'function') {
          const undone = ui.sim.undoLastWire();
          if (undone && undone.success) {
            ui._updateCoinsDisplay();
            if (ui._render) ui._render();
          }
        }
        if (ui.tutorialController) {
          ui.tutorialController.handleEvent('undo_clicked');
        }
        if (typeof btnUndo.blur === 'function') btnUndo.blur();
      });
    }

    // 9. Reset button
    const btnReset = ui.container.querySelector('#nc-btn-reset');
    if (btnReset) {
      this.addListener(btnReset, 'click', () => {
        ui._loadLevel(ui.currentLevelId, ui.currentSeed);
      });
    }

    // 10. Levels modal button
    const btnLevels = ui.container.querySelector('#nc-btn-levels');
    if (btnLevels) {
      this.addListener(btnLevels, 'click', () => {
        ui._showLevelsModal();
      });
    }

    // 11. Zoom controls
    const btnZoomIn = ui.container.querySelector('#nc-btn-zoom-in');
    if (btnZoomIn) {
      this.addListener(btnZoomIn, 'click', () => {
        ui.camera.adjustZoom(1.25);
      });
    }

    const btnZoomOut = ui.container.querySelector('#nc-btn-zoom-out');
    if (btnZoomOut) {
      this.addListener(btnZoomOut, 'click', () => {
        ui.camera.adjustZoom(1 / 1.25);
      });
    }

    const btnFit = ui.container.querySelector('#nc-btn-fit');
    if (btnFit) {
      this.addListener(btnFit, 'click', () => {
        ui._fitCamera();
      });
    }

    // 12. Keyboard shortcuts
    this.addListener(window, 'keydown', (e) => {
      if (e.key === '1' && ui.levelDef.wiresAllowed.includes('twisted_pair')) {
        ui.activeTool = 'twisted_pair';
        ui._updateToolButtons();
      } else if (e.key === '2' && ui.levelDef.wiresAllowed.includes('coaxial')) {
        ui.activeTool = 'coaxial';
        ui._updateToolButtons();
      } else if (e.key === '3' && ui.levelDef.wiresAllowed.includes('multimode_fiber')) {
        ui.activeTool = 'multimode_fiber';
        ui._updateToolButtons();
      } else if (e.key === '4' && ui.levelDef.wiresAllowed.includes('single_mode_fiber')) {
        ui.activeTool = 'single_mode_fiber';
        ui._updateToolButtons();
      } else if (e.key === '5' && ui.levelDef.devicesAllowed && ui.levelDef.devicesAllowed.includes('access_point')) {
        ui.activeTool = 'access_point';
        ui._updateToolButtons();
      } else if (e.key === '6' && ui.levelDef.devicesAllowed && ui.levelDef.devicesAllowed.includes('cabinet')) {
        ui.activeTool = 'cabinet';
        ui._updateToolButtons();
      } else if (e.key === '7' && ui.levelDef.devicesAllowed && ui.levelDef.devicesAllowed.includes('hub')) {
        ui.activeTool = 'hub';
        ui._updateToolButtons();
      } else if (e.key === '8' && ui.levelDef.devicesAllowed && ui.levelDef.devicesAllowed.includes('switch')) {
        ui.activeTool = 'switch';
        ui._updateToolButtons();
      } else if (e.key === '9' && ui.levelDef.devicesAllowed && ui.levelDef.devicesAllowed.includes('router')) {
        ui.activeTool = 'router';
        ui._updateToolButtons();
      } else if ((e.key === 'm' || e.key === 'M' || e.key === '0') && ui.pickupBtn && ui.pickupBtn.style.display !== 'none') {
        ui.activeTool = 'pickup';
        ui._updateToolButtons();
        ui._setHint('Move tool selected: Click an existing device to pick it up and relocate it.');
      } else if (e.key === 'Escape') {
        if (ui.heldItem) {
          const orig = ui.heldItem.originalSquare;
          ui.sim.placeDevice(ui.heldItem.type, orig);
          ui.heldItem = null;
          const defaultWire = (ui.levelDef.wiresAllowed && ui.levelDef.wiresAllowed[0]) || 'twisted_pair';
          ui.activeTool = defaultWire;
          ui._updateToolButtons();
          ui._updateCoinsDisplay();
          ui._setHint('Canceled moving.');
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        if (document.activeElement === ui.btnPause) return;
        if (ui.btnPause) ui.btnPause.click();
      }
    });

    // 13. Window and canvas resizing
    this.addListener(window, 'resize', () => ui._updateCanvasSize());
    if (typeof ResizeObserver !== 'undefined' && ui.canvasWrapper) {
      this.resizeObserver = new ResizeObserver(() => {
        ui._updateCanvasSize();
      });
      this.resizeObserver.observe(ui.canvasWrapper);
    }

    // 14. Pointer interaction logic
    const getGridPos = (clientX, clientY) => {
      const rect = ui.canvas.getBoundingClientRect();
      const sz = ui.baseSquareSize * ui.camera.zoom;
      const x = Math.floor((clientX - rect.left - ui.camera.x) / sz);
      const y = Math.floor((clientY - rect.top - ui.camera.y) / sz);
      return { x, y, square: y * ui.sim.width + x };
    };

    const onPointerDown = (e) => {
      if (e.button !== 0 || !ui.sim) return;

      // 0. Check click on screen-edge indicators to auto-center camera on building
      if (ui.canvasRenderer && Array.isArray(ui.canvasRenderer.edgeIndicators) && ui.canvas) {
        const rect = ui.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        for (const ind of ui.canvasRenderer.edgeIndicators) {
          const d2 = (clickX - ind.x) ** 2 + (clickY - ind.y) ** 2;
          if (d2 <= (ind.radius + 10) ** 2) {
            ui.centerOnSquare(ind.square);
            return;
          }
        }
      }

      const { x, y, square } = getGridPos(e.clientX, e.clientY);

      // 0. Move tool placement
      if (ui.heldItem) {
        const canPlace = (
          x >= 0 && x < ui.sim.width && y >= 0 && y < ui.sim.height &&
          square !== ui.sim.server &&
          !ui.sim.walls.has(square) &&
          !(ui.sim.riverSquares && ui.sim.riverSquares.has(square)) &&
          !ui.sim.getBuildingAt(square) &&
          !ui.sim.getDeviceAt(square) &&
          !ui.sim.occupiedSquares.has(square)
        );

        if (canPlace) {
          const res = ui.sim.placeDevice(ui.heldItem.type, square);
          if (res.success) {
            ui._updateCoinsDisplay();
            const defaultWire = (ui.levelDef.wiresAllowed && ui.levelDef.wiresAllowed[0]) || 'twisted_pair';
            ui.activeTool = defaultWire;
            ui._updateToolButtons();
            ui._setHint(`Placed ${ui.heldItem.name}! Cable tool selected — drag from device to server to connect.`);
            ui.heldItem = null;
            return;
          } else {
            ui._setHint(res.message, true);
            return;
          }
        } else {
          ui._setHint('Cannot place here: square is occupied or blocked.', true);
          return;
        }
      }

      // 0.5. Move tool pick up
      if (ui.activeTool === 'pickup') {
        const device = ui.sim.getDeviceAt(square);
        if (device) {
          const type = device.type;
          const devName = DEVICE_CATALOG[type]?.name || 'Device';
          const cost = device.cost;
          const origSq = device.square;
          ui.sim.removeDevice(device.id);
          ui.heldItem = {
            type,
            name: devName,
            cost,
            originalSquare: origSq
          };
          ui._updateCoinsDisplay();
          ui._setHint(`Moving ${devName}. Move cursor to position and click to place (right-click to cancel).`);
          return;
        } else {
          ui._setHint('Move Tool: Click on an existing device (AP, Cabinet, Hub, Switch, Router, Server) to pick it up.', true);
          return;
        }
      }

      // 1. Device placement mode
      const isDeviceTool = Boolean(ui.deviceBtns[ui.activeTool]);
      if (isDeviceTool) {
        const canPlace = (
          x >= 0 && x < ui.sim.width && y >= 0 && y < ui.sim.height &&
          square !== ui.sim.server &&
          !ui.sim.walls.has(square) &&
          !(ui.sim.riverSquares && ui.sim.riverSquares.has(square)) &&
          !ui.sim.getBuildingAt(square) &&
          !ui.sim.getDeviceAt(square) &&
          !ui.sim.occupiedSquares.has(square)
        );

        if (!canPlace) {
          ui._setHint(`${DEVICE_CATALOG[ui.activeTool]?.name || 'Device'} is selected. Click an empty square to place it, or select a cable tool to connect wires.`, true);
          return;
        }

        const res = ui.sim.placeDevice(ui.activeTool, square);
        if (res.success) {
          ui._updateCoinsDisplay();
          const defaultWire = (ui.levelDef.wiresAllowed && ui.levelDef.wiresAllowed[0]) || 'twisted_pair';
          ui.activeTool = defaultWire;
          ui._updateToolButtons();
          ui._setHint(`Placed ${DEVICE_CATALOG[res.device.type]?.name || 'Device'}! Cable tool selected — drag from device to server to connect.`);
          return;
        } else {
          ui._setHint(res.message, true);
          return;
        }
      }

      // 2. Device interaction (drag wire or inspect)
      const device = ui.sim.getDeviceAt(square);
      if (device) {
        const isWireTool = ['twisted_pair', 'coaxial', 'multimode_fiber', 'single_mode_fiber'].includes(ui.activeTool);
        if (isWireTool) {
          ui.isDragging = true;
          if (typeof document !== 'undefined' && document.body) document.body.classList.add('nc-dragging');
          ui.dragSourceType = 'device';
          ui.dragSourceId = device.id;
          ui.dragPath = [square];
          ui._checkDragValidity();
          return;
        } else {
          ui._showDeviceInspector(device);
          return;
        }
      }

      // 3. Building interaction
      const building = ui.sim.getBuildingAt(square);
      if (building) {
        if (building.state === 'construction') {
          ui._setHint('This site is under construction! Wires cannot connect until it opens.', true);
          return;
        }

        if (building.type === 'phone' || building.type === 'tablet') {
          ui._showBuildingInspector(building);
          ui._setHint('Phones and tablets connect wirelessly! Place an Access Point nearby instead of dragging a wire.', true);
          return;
        }

        const isWireTool = ['twisted_pair', 'coaxial', 'multimode_fiber', 'single_mode_fiber'].includes(ui.activeTool);
        if (!isWireTool) {
          ui._showBuildingInspector(building);
          return;
        }

        ui.isDragging = true;
        if (typeof document !== 'undefined' && document.body) document.body.classList.add('nc-dragging');
        ui.dragSourceType = 'building';
        ui.dragSourceId = building.id;
        ui.dragBuildingId = building.id;
        ui.dragPath = [square];
        ui._checkDragValidity();
        return;
      }

      // 3.5 Server interaction
      if (ui.sim.isServer(square)) {
        const srv = (ui.sim.servers && ui.sim.servers.find(s => s.square === square)) || {
          square: ui.sim.server,
          name: 'Server',
          icon: '🖥️',
          mac: '00:FE',
          ip: '192.168.2.50',
          portsOpen: [80]
        };
        ui._showServerInspector(srv);
        return;
      }

      // 3.6 Wire interaction
      if (ui.sim.occupiedSquares && ui.sim.occupiedSquares.has(square)) {
        const wireId = ui.sim.occupiedSquares.get(square);
        const wire = ui.sim.wires.get(wireId);
        if (wire) {
          ui._showWireInspector(wire);
          return;
        }
      }

      // 4. Start camera panning
      ui.isPanning = true;
      ui.panStart = { x: e.clientX - ui.camera.x, y: e.clientY - ui.camera.y };
    };

    const onPointerMove = (e) => {
      const { x, y, square } = getGridPos(e.clientX, e.clientY);
      ui.cursorSquare = (x >= 0 && x < ui.sim.width && y >= 0 && y < ui.sim.height) ? square : null;
      ui.cursorPos = { x: e.clientX, y: e.clientY };

      // Edge indicator hover cursor
      if (ui.canvas && ui.canvasRenderer && Array.isArray(ui.canvasRenderer.edgeIndicators)) {
        const rect = ui.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        const isHovering = ui.canvasRenderer.edgeIndicators.some(ind => ((clickX - ind.x) ** 2 + (clickY - ind.y) ** 2) <= (ind.radius + 8) ** 2);
        if (isHovering) {
          ui.canvas.style.cursor = 'pointer';
        } else if (!ui.isDragging && !ui.isPanning) {
          ui.canvas.style.cursor = 'default';
        }
      }

      if (ui.isPanning) {
        ui.camera.x = e.clientX - ui.panStart.x;
        ui.camera.y = e.clientY - ui.panStart.y;
        return;
      }

      if (!ui.isDragging || !ui.sim) return;
      if (x < 0 || x >= ui.sim.width || y < 0 || y >= ui.sim.height) return;

      const path = ui.dragPath;
      const lastSq = path[path.length - 1];
      if (square === lastSq) return;

      // Backtracking
      if (path.length > 1 && square === path[path.length - 2]) {
        path.pop();
        ui._checkDragValidity();
        return;
      }

      // Adjacent cardinal step
      const lx = lastSq % ui.sim.width;
      const ly = Math.floor(lastSq / ui.sim.width);
      if (Math.abs(x - lx) + Math.abs(y - ly) === 1) {
        if (!path.includes(square)) {
          path.push(square);
          ui._checkDragValidity();
        }
      }
    };

    const onPointerUp = (e) => {
      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.remove('nc-dragging');
      }

      if (ui.isPanning) {
        ui.isPanning = false;
        return;
      }

      if (!ui.isDragging || !ui.sim) return;
      ui.isDragging = false;
      if (ui.tooltipEl) ui.tooltipEl.style.display = 'none';

      const lastSq = ui.dragPath[ui.dragPath.length - 1];
      const destBuilding = ui.sim.getBuildingAt(lastSq);
      if (destBuilding && destBuilding.state === 'construction') {
        ui._setHint('This site is under construction! Wires cannot connect until it opens.', true);
        ui.dragPath = [];
        ui.dragBuildingId = null;
        ui.dragSourceId = null;
        ui.dragSourceType = 'building';
        return;
      }

      if (ui.dragPath.length === 1 && ui.dragSourceType === 'device') {
        const clickedDev = ui.sim.getDevice(ui.dragSourceId);
        if (clickedDev) {
          ui._showDeviceInspector(clickedDev);
        }
        ui.dragPath = [];
        ui.dragBuildingId = null;
        ui.dragSourceId = null;
        ui.dragSourceType = 'building';
        return;
      }

      if (ui.dragPath.length === 1 && ui.dragSourceType === 'building') {
        const clickedB = ui.sim.getBuilding(ui.dragBuildingId);
        if (clickedB) {
          ui._showBuildingInspector(clickedB);
        }
        ui.dragPath = [];
        ui.dragBuildingId = null;
        ui.dragSourceId = null;
        ui.dragSourceType = 'building';
        return;
      }

      const isServer = ui.sim.isServer(lastSq);
      const isDevice = (ui.sim.getDeviceAt(lastSq) !== null);

      if (isServer || isDevice) {
        const sourceId = ui.dragSourceType === 'device' ? ui.dragSourceId : ui.dragBuildingId;
        const wireType = ui._getActiveWireType();
        const res = ui.sim.connectWire(sourceId, ui.dragPath, wireType, ui.dragSourceType || 'building');
        if (res.success) {
          ui._updateCoinsDisplay();
          ui._setHint(ui.levelDef.hint);
          if (ui.tutorialController) {
            ui.tutorialController.handleEvent('wire_connected');
          }
        } else {
          ui._setHint(res.message, true);
        }
      } else {
        ui._setHint(REFUSAL_MESSAGES.releasedAwayFromDestination, true);
      }

      ui.dragPath = [];
      ui.dragBuildingId = null;
      ui.dragSourceId = null;
      ui.dragSourceType = 'building';
    };

    this.addListener(ui.canvas, 'pointerdown', onPointerDown);
    this.addListener(window, 'pointermove', onPointerMove);
    this.addListener(window, 'pointerup', onPointerUp);
    this.addListener(ui.canvas, 'contextmenu', (e) => {
      e.preventDefault();
      if (ui.heldItem) {
        const orig = ui.heldItem.originalSquare;
        ui.sim.placeDevice(ui.heldItem.type, orig);
        ui._setHint(`Canceled moving ${ui.heldItem.name}.`);
        ui.heldItem = null;
        const defaultWire = (ui.levelDef.wiresAllowed && ui.levelDef.wiresAllowed[0]) || 'twisted_pair';
        ui.activeTool = defaultWire;
        ui._updateToolButtons();
        ui._updateCoinsDisplay();
      }
    });
  }
}
