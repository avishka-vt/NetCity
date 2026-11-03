/**
 * AssetManager for NetCity v2.0
 * Handles preloading, caching, and crisp high-DPI rendering of SVG and PNG assets.
 */

export const ASSET_PATHS = {
  // Buildings
  'buildings/classroom': './assets/images/buildings/classroom.svg',
  'buildings/laptop': './assets/images/buildings/laptop.svg',
  'buildings/phone': './assets/images/buildings/phone.svg',
  'buildings/tablet': './assets/images/buildings/tablet.svg',
  'buildings/library': './assets/images/buildings/library.svg',
  'buildings/sports_ground': './assets/images/buildings/sports_ground.svg',
  'buildings/home': './assets/images/buildings/home.svg',
  'buildings/construction': './assets/images/buildings/construction.svg',

  // Devices
  'devices/switch': './assets/images/devices/switch.svg',
  'devices/router': './assets/images/devices/router.svg',
  'devices/hub': './assets/images/devices/hub.svg',
  'devices/access_point': './assets/images/devices/access_point.svg',
  'devices/cabinet': './assets/images/devices/cabinet.svg',
  'devices/firewall': './assets/images/devices/firewall.svg',
  'devices/vpn_gateway': './assets/images/devices/vpn_gateway.svg',
  'devices/load_balancer': './assets/images/devices/load_balancer.svg',
  'devices/backup_power': './assets/images/devices/backup_power.svg',

  // Servers
  'devices/server': './assets/images/devices/server.svg',
  'devices/web_server': './assets/images/devices/web_server.svg',
  'devices/email_server': './assets/images/devices/email_server.svg',
  'devices/dhcp_server': './assets/images/devices/dhcp_server.svg',
  'devices/dns_server': './assets/images/devices/dns_server.svg',

  // Chapters
  'chapters/ch1': './assets/images/chapters/ch1.png',
  'chapters/ch2': './assets/images/chapters/ch2.png',
  'chapters/ch3': './assets/images/chapters/ch3.png',
  'chapters/ch4': './assets/images/chapters/ch4.png',
  'chapters/ch5': './assets/images/chapters/ch5.png',
  'chapters/ch6': './assets/images/chapters/ch6.png',
  'chapters/ch7': './assets/images/chapters/ch7.png',

  // UI
  'ui/logo': './assets/images/ui/logo.svg',
  'ui/lock': './assets/images/ui/lock.svg'
};

export class AssetManager {
  constructor(basePath = './assets/images') {
    this.basePath = basePath;
    this.images = new Map();
    this.loaded = new Set();
    this.failed = new Set();
  }

  preloadAll() {
    if (typeof window === 'undefined' || typeof window.Image === 'undefined') {
      return;
    }

    for (const [key, relPath] of Object.entries(ASSET_PATHS)) {
      if (this.images.has(key)) continue;

      const img = new Image();
      img.onload = () => {
        this.loaded.add(key);
      };
      img.onerror = () => {
        this.failed.add(key);
      };
      img.src = relPath;
      this.images.set(key, img);
    }
  }

  get(key) {
    const img = this.images.get(key);
    if (img && img.complete && img.naturalWidth > 0) {
      return img;
    }
    return null;
  }

  /**
   * Draw an image crisply onto canvas:
   * - Integer coordinates to eliminate anti-aliasing blur
   * - High smoothing quality
   * - Aspect-ratio preservation
   */
  drawCrisp(ctx, img, cx, cy, maxW, maxH) {
    if (!img || !ctx) return false;

    const natW = img.naturalWidth || 64;
    const natH = img.naturalHeight || 64;
    const scale = Math.min(maxW / natW, maxH / natH);

    const destW = Math.round(natW * scale);
    const destH = Math.round(natH * scale);
    const destX = Math.round(cx - destW / 2);
    const destY = Math.round(cy - destH / 2);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) {
      ctx.imageSmoothingQuality = 'high';
    }
    ctx.drawImage(img, destX, destY, destW, destH);
    ctx.restore();
    return true;
  }

  drawBuilding(ctx, type, cx, cy, sz) {
    const key = `buildings/${type}`;
    const img = this.get(key);
    if (!img) return false;
    return this.drawCrisp(ctx, img, cx, cy, sz * 0.70, sz * 0.70);
  }

  drawDevice(ctx, type, cx, cy, sz) {
    const key = `devices/${type}`;
    const img = this.get(key);
    if (!img) return false;
    return this.drawCrisp(ctx, img, cx, cy, sz * 0.75, sz * 0.75);
  }

  drawServer(ctx, type, cx, cy, sz) {
    let key = 'devices/server';
    if (type === 'web' || type === 'web_server') key = 'devices/web_server';
    else if (type === 'email' || type === 'email_server') key = 'devices/email_server';
    else if (type === 'dhcp' || type === 'dhcp_server') key = 'devices/dhcp_server';
    else if (type === 'dns' || type === 'dns_server') key = 'devices/dns_server';

    const img = this.get(key) || this.get('devices/server');
    if (!img) return false;
    return this.drawCrisp(ctx, img, cx, cy, sz * 0.75, sz * 0.75);
  }

  getChapterAssetPath(chNum) {
    return ASSET_PATHS[`chapters/ch${chNum}`] || null;
  }

  getLogoAssetPath() {
    return ASSET_PATHS['ui/logo'];
  }
}
