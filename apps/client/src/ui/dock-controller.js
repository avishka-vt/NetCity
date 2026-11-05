/**
 * NetCity v2.0 - Dock Controller
 * Single Responsibility: Manages the bottom palette dock:
 * category switching (Cables vs Hardware Devices), tool button visibility based on level unlocks,
 * active selection highlights, and Move tool toggling.
 */

export class DockController {
  constructor(container, wireBtns = {}, deviceBtns = {}, pickupBtn = null) {
    this.container = container;
    this.wireBtns = wireBtns;
    this.deviceBtns = deviceBtns;
    this.pickupBtn = pickupBtn;
  }

  /**
   * Update all dock buttons to match activeTool and level allowances
   */
  updateToolButtons(activeTool, dockTab, levelDef) {
    if (!levelDef) return;

    const isDeviceTool = Boolean(this.deviceBtns[activeTool]);
    let currentTab = dockTab;
    if (isDeviceTool && currentTab !== 'devices') {
      currentTab = 'devices';
    } else if (['twisted_pair', 'coaxial', 'multimode_fiber', 'single_mode_fiber'].includes(activeTool) && currentTab !== 'cables') {
      currentTab = 'cables';
    }

    const catCablesBtn = this.container.querySelector('#nc-cat-cables');
    const catDevicesBtn = this.container.querySelector('#nc-cat-devices');
    const dockCables = this.container.querySelector('#nc-dock-cables');
    const dockDevices = this.container.querySelector('#nc-dock-devices');

    if (catCablesBtn && catDevicesBtn && dockCables && dockDevices) {
      const isCables = currentTab === 'cables';
      catCablesBtn.classList.toggle('nc-dock-cat-active', isCables);
      catDevicesBtn.classList.toggle('nc-dock-cat-active', !isCables);
      dockCables.style.display = isCables ? 'flex' : 'none';
      dockDevices.style.display = isCables ? 'none' : 'flex';
    }

    const allowedWires = levelDef.wiresAllowed || [];
    for (const [key, btn] of Object.entries(this.wireBtns)) {
      if (!btn) continue;
      const isAllowed = allowedWires.includes(key);
      btn.style.display = isAllowed ? 'inline-flex' : 'none';
      btn.className = `nc-tool-btn ${activeTool === key ? `nc-active-${key}` : ''}`;
    }

    const allowedDevices = levelDef.devicesAllowed || [];
    for (const [key, btn] of Object.entries(this.deviceBtns)) {
      if (!btn) continue;
      const isAllowed = allowedDevices.includes(key);
      btn.style.display = isAllowed ? 'inline-flex' : 'none';
      btn.className = `nc-tool-btn ${activeTool === key ? `nc-active-${key}` : ''}`;
    }

    if (this.pickupBtn) {
      const hasDevices = (levelDef.devicesAllowed || []).some(d => d !== 'server');
      this.pickupBtn.style.display = hasDevices ? 'inline-flex' : 'none';
      this.pickupBtn.className = `nc-tool-btn ${activeTool === 'pickup' ? 'nc-active-pickup' : ''}`;
    }

    return currentTab;
  }
}
