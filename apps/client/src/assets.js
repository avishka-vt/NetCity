/**
 * AssetManager for NetCity v2.0
 * Handles preloading, caching, and crisp high-DPI rendering of SVG and PNG assets.
 */

export const ASSET_PATHS = {
  // Buildings
  'buildings/classroom': './assets/images/buildings/classroom.png',
  'buildings/classroom_normal': './assets/images/buildings/classroom.png',
  'buildings/classroom_blue': './assets/images/buildings/classroom_blue.png',
  'buildings/classroom_green': './assets/images/buildings/classroom_green.png',
  'buildings/classroom_orange': './assets/images/buildings/classroom_orange.png',
  'buildings/school': './assets/images/buildings/school.png',
  'buildings/school_blue': './assets/images/buildings/school_blue.png',
  'buildings/school_green': './assets/images/buildings/school_green.png',
  'buildings/school_orange': './assets/images/buildings/school_orange.png',
  'buildings/laptop': './assets/images/buildings/laptop.png',
  'buildings/laptop_normal': './assets/images/buildings/laptop.png',
  'buildings/laptop_blue': './assets/images/buildings/laptop_blue.png',
  'buildings/laptop_green': './assets/images/buildings/laptop_green.png',
  'buildings/laptop_orange': './assets/images/buildings/laptop_orange.png',
  'buildings/phone': './assets/images/buildings/phone.png',
  'buildings/phone_normal': './assets/images/buildings/phone.png',
  'buildings/tablet': './assets/images/buildings/tablet.svg',
  'buildings/library': './assets/images/buildings/library.png',
  'buildings/library_normal': './assets/images/buildings/library.png',
  'buildings/library_blue': './assets/images/buildings/library_blue.png',
  'buildings/library_green': './assets/images/buildings/library_green.png',
  'buildings/library_orange': './assets/images/buildings/library_orange.png',
  'buildings/sports_ground': './assets/images/buildings/sports_ground.png',
  'buildings/sports_ground_normal': './assets/images/buildings/sports_ground.png',
  'buildings/sports_ground_blue': './assets/images/buildings/sports_ground_blue.png',
  'buildings/sports_ground_green': './assets/images/buildings/sports_ground_green.png',
  'buildings/sports_ground_orange': './assets/images/buildings/sports_ground_orange.png',
  'buildings/home': './assets/images/buildings/home.png',
  'buildings/home_normal': './assets/images/buildings/home.png',
  'buildings/home_blue': './assets/images/buildings/home_blue.png',
  'buildings/home_green': './assets/images/buildings/home_green.png',
  'buildings/home_orange': './assets/images/buildings/home_orange.png',
  'buildings/lab': './assets/images/buildings/lab.png',
  'buildings/lab_normal': './assets/images/buildings/lab.png',
  'buildings/lab_blue': './assets/images/buildings/lab_blue.png',
  'buildings/lab_green': './assets/images/buildings/lab_green.png',
  'buildings/lab_orange': './assets/images/buildings/lab_orange.png',
  'buildings/computer_lab': './assets/images/buildings/computer_lab.png',
  'buildings/computer_lab_normal': './assets/images/buildings/computer_lab.png',
  'buildings/computer_lab_blue': './assets/images/buildings/computer_lab_blue.png',
  'buildings/computer_lab_green': './assets/images/buildings/computer_lab_green.png',
  'buildings/computer_lab_orange': './assets/images/buildings/computer_lab_orange.png',
  'buildings/construction': './assets/images/buildings/construction.svg',

  // Devices
  'devices/switch': './assets/images/devices/switch.png',
  'devices/router': './assets/images/devices/router.png',
  'devices/hub': './assets/images/devices/hub.png',
  'devices/access_point': './assets/images/devices/access_point.png',
  'devices/ap': './assets/images/devices/access_point.png',
  'devices/cabinet': './assets/images/devices/cabinet.png',
  'devices/firewall': './assets/images/devices/firewall.svg',
  'devices/vpn_gateway': './assets/images/devices/vpn_gateway.svg',
  'devices/load_balancer': './assets/images/devices/load_balancer.svg',
  'devices/backup_power': './assets/images/devices/backup_power.svg',

  // Servers
  'devices/server': './assets/images/devices/server.png',
  'devices/web_server': './assets/images/devices/web_server.png',
  'devices/database_server': './assets/images/devices/database_server.png',
  'devices/db_server': './assets/images/devices/database_server.png',
  'devices/email_server': './assets/images/devices/email_server.png',
  'devices/mail_server': './assets/images/devices/email_server.png',
  'devices/dhcp_server': './assets/images/devices/dhcp_server.png',
  'devices/dns_server': './assets/images/devices/dns_server.png',

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
  'ui/lock': './assets/images/ui/lock.svg',

  // Terrain / Background
  'background/grass': './assets/images/background-grass.png'
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

  drawBuilding(ctx, type, cx, cy, sz, zone = null) {
    let key = `buildings/${type}`;
    if (type === 'laptop' && zone) {
      if (zone === 'blue') key = 'buildings/laptop_blue';
      else if (zone === 'green') key = 'buildings/laptop_green';
      else if (zone === 'orange') key = 'buildings/laptop_orange';
    } else if ((type === 'classroom' || type === 'school') && zone) {
      if (zone === 'blue') key = 'buildings/classroom_blue';
      else if (zone === 'green') key = 'buildings/classroom_green';
      else if (zone === 'orange') key = 'buildings/classroom_orange';
    } else if ((type === 'sports_ground' || type === 'ground') && zone) {
      if (zone === 'blue') key = 'buildings/sports_ground_blue';
      else if (zone === 'green') key = 'buildings/sports_ground_green';
      else if (zone === 'orange') key = 'buildings/sports_ground_orange';
    } else if ((type === 'home' || type === 'house') && zone) {
      if (zone === 'blue') key = 'buildings/home_blue';
      else if (zone === 'green') key = 'buildings/home_green';
      else if (zone === 'orange') key = 'buildings/home_orange';
    } else if (type === 'library' && zone) {
      if (zone === 'blue') key = 'buildings/library_blue';
      else if (zone === 'green') key = 'buildings/library_green';
      else if (zone === 'orange') key = 'buildings/library_orange';
    } else if ((type === 'lab' || type === 'computer_lab') && zone) {
      if (zone === 'blue') key = 'buildings/lab_blue';
      else if (zone === 'green') key = 'buildings/lab_green';
      else if (zone === 'orange') key = 'buildings/lab_orange';
    }
    const img = this.get(key) ||
      this.get(`buildings/${type}`) ||
      (type.startsWith('laptop') ? this.get('buildings/laptop') : null) ||
      ((type.startsWith('classroom') || type.startsWith('school')) ? this.get('buildings/classroom') : null) ||
      ((type.startsWith('sports_ground') || type.startsWith('ground')) ? this.get('buildings/sports_ground') : null) ||
      ((type.startsWith('home') || type.startsWith('house')) ? this.get('buildings/home') : null) ||
      (type.startsWith('library') ? this.get('buildings/library') : null) ||
      ((type.startsWith('lab') || type.startsWith('computer_lab')) ? this.get('buildings/lab') : null) ||
      (type.startsWith('phone') ? this.get('buildings/phone') : null);
    if (!img) return false;
    const drawScale = (type.startsWith('sports_ground') || type.startsWith('ground'))
      ? 1.25
      : ((type.startsWith('school') || type.startsWith('classroom') || type.startsWith('library'))
          ? 1.15
          : ((type.startsWith('lab') || type.startsWith('computer_lab')) ? 1.10 : 0.98));
    return this.drawCrisp(ctx, img, cx, cy, sz * drawScale, sz * drawScale);
  }

  drawDevice(ctx, type, cx, cy, sz) {
    let key = `devices/${type}`;
    if (type === 'ap' || type === 'access_point') key = 'devices/access_point';
    const img = this.get(key) || (type.startsWith('router') ? this.get('devices/router') : null);
    if (!img) return false;
    const drawScale = (type === 'cabinet' || type.startsWith('cabinet')) ? 1.05 : 0.95;
    return this.drawCrisp(ctx, img, cx, cy, sz * drawScale, sz * drawScale);
  }

  drawServer(ctx, type, cx, cy, sz) {
    let key = 'devices/server';
    if (type === 'web' || type === 'web_server') key = 'devices/web_server';
    else if (type === 'email' || type === 'email_server' || type === 'mail' || type === 'mail_server') key = 'devices/email_server';
    else if (type === 'db' || type === 'database' || type === 'db_server' || type === 'database_server') key = 'devices/database_server';
    else if (type === 'dhcp' || type === 'dhcp_server') key = 'devices/dhcp_server';
    else if (type === 'dns' || type === 'dns_server') key = 'devices/dns_server';

    const img = this.get(key) || this.get('devices/server');
    if (!img) return false;
    return this.drawCrisp(ctx, img, cx, cy, sz * 1.05, sz * 1.05);
  }

  getChapterAssetPath(chNum) {
    return ASSET_PATHS[`chapters/ch${chNum}`] || null;
  }

  getLogoAssetPath() {
    return ASSET_PATHS['ui/logo'];
  }
}
