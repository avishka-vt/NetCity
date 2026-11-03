import fs from 'fs';
import path from 'path';

const baseDir = path.resolve('apps/client/public/assets/images');

const svgs = {
  // Buildings
  'buildings/classroom.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <polygon points="32,6 4,22 60,22" fill="#0284c7"/>
    <rect width="52" height="38" x="6" y="20" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="2.5"/>
    <rect width="12" height="18" x="26" y="40" rx="2" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
    <rect width="10" height="10" x="11" y="27" rx="2" fill="#38bdf8" opacity="0.8"/>
    <rect width="10" height="10" x="43" y="27" rx="2" fill="#38bdf8" opacity="0.8"/>
  </svg>`,
  'buildings/laptop.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="44" height="30" x="10" y="12" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5"/>
    <rect width="36" height="22" x="14" y="16" rx="2" fill="#1e293b"/>
    <polygon points="2,48 62,48 56,44 8,44" fill="#475569"/>
    <rect width="56" height="4" x="4" y="48" rx="2" fill="#334155" stroke="#38bdf8" stroke-width="1.5"/>
  </svg>`,
  'buildings/phone.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="28" height="52" x="18" y="6" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5"/>
    <rect width="22" height="40" x="21" y="11" rx="2" fill="#1e293b"/>
    <circle cx="32" cy="54" r="2" fill="#38bdf8"/>
    <rect width="8" height="2" x="28" y="8" rx="1" fill="#475569"/>
  </svg>`,
  'buildings/tablet.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="42" height="52" x="11" y="6" rx="5" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5"/>
    <rect width="34" height="40" x="15" y="11" rx="2" fill="#1e293b"/>
    <circle cx="32" cy="54" r="2" fill="#38bdf8"/>
  </svg>`,
  'buildings/library.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <polygon points="32,6 6,20 58,20" fill="#8b5cf6"/>
    <rect width="48" height="6" x="8" y="20" fill="#1e293b" stroke="#8b5cf6" stroke-width="1.5"/>
    <rect width="6" height="28" x="12" y="26" fill="#cbd5e1"/>
    <rect width="6" height="28" x="24" y="26" fill="#cbd5e1"/>
    <rect width="6" height="28" x="34" y="26" fill="#cbd5e1"/>
    <rect width="6" height="28" x="46" y="26" fill="#cbd5e1"/>
    <rect width="52" height="6" x="6" y="54" rx="2" fill="#1e293b" stroke="#8b5cf6" stroke-width="1.5"/>
  </svg>`,
  'buildings/sports_ground.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="54" height="42" x="5" y="11" rx="6" fill="#065f46" stroke="#10b981" stroke-width="2.5"/>
    <line x1="32" y1="11" x2="32" y2="53" stroke="#a7f3d0" stroke-width="1.5"/>
    <circle cx="32" cy="32" r="8" fill="none" stroke="#a7f3d0" stroke-width="1.5"/>
  </svg>`,
  'buildings/home.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <polygon points="32,8 6,28 58,28" fill="#f59e0b"/>
    <rect width="42" height="30" x="11" y="28" rx="3" fill="#1e293b" stroke="#f59e0b" stroke-width="2.5"/>
    <rect width="10" height="16" x="27" y="42" rx="1" fill="#0f172a" stroke="#f59e0b" stroke-width="1.5"/>
    <rect width="8" height="8" x="16" y="33" fill="#fef08a" opacity="0.9"/>
  </svg>`,
  'buildings/construction.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <polygon points="32,6 4,56 60,56" fill="#d97706" stroke="#f59e0b" stroke-width="2.5"/>
    <polygon points="32,20 18,48 46,48" fill="#0f172a"/>
    <rect width="6" height="16" x="29" y="28" rx="2" fill="#f59e0b"/>
    <circle cx="32" cy="48" r="3" fill="#f59e0b"/>
  </svg>`,

  // Devices
  'devices/switch.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="56" height="28" x="4" y="18" rx="5" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5"/>
    <rect width="8" height="8" x="10" y="28" rx="2" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
    <rect width="8" height="8" x="22" y="28" rx="2" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
    <rect width="8" height="8" x="34" y="28" rx="2" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
    <rect width="8" height="8" x="46" y="28" rx="2" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
    <circle cx="14" cy="23" r="1.8" fill="#10b981"/>
    <circle cx="26" cy="23" r="1.8" fill="#10b981"/>
    <circle cx="38" cy="23" r="1.8" fill="#10b981"/>
    <circle cx="50" cy="23" r="1.8" fill="#10b981"/>
  </svg>`,
  'devices/router.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="52" height="26" x="6" y="26" rx="6" fill="#0f172a" stroke="#ef4444" stroke-width="2.5"/>
    <line x1="16" y1="26" x2="16" y2="10" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
    <line x1="48" y1="26" x2="48" y2="10" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
    <circle cx="20" cy="39" r="2.5" fill="#38bdf8"/>
    <circle cx="32" cy="39" r="2.5" fill="#10b981"/>
    <circle cx="44" cy="39" r="2.5" fill="#f59e0b"/>
    <path d="M24,20 Q32,14 40,20" fill="none" stroke="#ef4444" stroke-width="2"/>
  </svg>`,
  'devices/hub.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="52" height="26" x="6" y="19" rx="5" fill="#0f172a" stroke="#a78bfa" stroke-width="2.5"/>
    <circle cx="16" cy="32" r="4" fill="#a78bfa"/>
    <circle cx="26" cy="32" r="4" fill="#a78bfa"/>
    <circle cx="38" cy="32" r="4" fill="#a78bfa"/>
    <circle cx="48" cy="32" r="4" fill="#a78bfa"/>
    <line x1="16" y1="32" x2="48" y2="32" stroke="#c4b5fd" stroke-width="1.5"/>
  </svg>`,
  'devices/access_point.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <circle cx="32" cy="36" r="14" fill="#0f172a" stroke="#06d6a0" stroke-width="2.5"/>
    <circle cx="32" cy="36" r="4" fill="#06d6a0"/>
    <path d="M20,24 A18,18 0 0,1 44,24" fill="none" stroke="#06d6a0" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M14,17 A26,26 0 0,1 50,17" fill="none" stroke="#06d6a0" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,
  'devices/cabinet.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="40" height="52" x="12" y="6" rx="4" fill="#1e293b" stroke="#94a3b8" stroke-width="2.5"/>
    <line x1="12" y1="20" x2="52" y2="20" stroke="#94a3b8" stroke-width="1.5"/>
    <line x1="12" y1="34" x2="52" y2="34" stroke="#94a3b8" stroke-width="1.5"/>
    <line x1="12" y1="48" x2="52" y2="48" stroke="#94a3b8" stroke-width="1.5"/>
    <circle cx="46" cy="27" r="2" fill="#38bdf8"/>
    <circle cx="46" cy="41" r="2" fill="#38bdf8"/>
  </svg>`,
  'devices/firewall.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path d="M32,6 L52,14 C52,38 32,54 32,54 C32,54 12,38 12,14 Z" fill="#1e293b" stroke="#f43f5e" stroke-width="2.5"/>
    <path d="M32,16 L44,22 C44,36 32,46 32,46 C32,46 20,36 20,22 Z" fill="#f43f5e" opacity="0.4"/>
    <polygon points="32,22 36,32 30,32 34,42 26,30 32,30" fill="#fef08a"/>
  </svg>`,
  'devices/vpn_gateway.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="42" height="32" x="11" y="24" rx="5" fill="#0f172a" stroke="#0ea5e9" stroke-width="2.5"/>
    <path d="M22,24 L22,16 C22,10.5 26.5,6 32,6 C37.5,6 42,10.5 42,16 L42,24" fill="none" stroke="#0ea5e9" stroke-width="3" stroke-linecap="round"/>
    <circle cx="32" cy="38" r="3.5" fill="#0ea5e9"/>
    <line x1="32" y1="41" x2="32" y2="47" stroke="#0ea5e9" stroke-width="3"/>
  </svg>`,
  'devices/load_balancer.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="48" height="28" x="8" y="18" rx="5" fill="#0f172a" stroke="#10b981" stroke-width="2.5"/>
    <line x1="32" y1="10" x2="32" y2="18" stroke="#10b981" stroke-width="2.5"/>
    <line x1="20" y1="46" x2="20" y2="54" stroke="#10b981" stroke-width="2.5"/>
    <line x1="44" y1="46" x2="44" y2="54" stroke="#10b981" stroke-width="2.5"/>
    <polygon points="32,24 22,38 42,38" fill="none" stroke="#10b981" stroke-width="2"/>
  </svg>`,
  'devices/backup_power.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="42" height="48" x="11" y="8" rx="4" fill="#0f172a" stroke="#eab308" stroke-width="2.5"/>
    <polygon points="34,16 22,32 32,32 28,48 42,30 32,30" fill="#fde047"/>
  </svg>`,

  // Servers
  'devices/server.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="52" height="46" x="6" y="9" rx="5" fill="#0f172a" stroke="#2ec4b6" stroke-width="2.5"/>
    <line x1="6" y1="24" x2="58" y2="24" stroke="#2ec4b6" stroke-width="1.5"/>
    <line x1="6" y1="39" x2="58" y2="39" stroke="#2ec4b6" stroke-width="1.5"/>
    <circle cx="15" cy="16" r="2" fill="#10b981"/>
    <circle cx="22" cy="16" r="2" fill="#10b981"/>
    <circle cx="15" cy="31" r="2" fill="#10b981"/>
    <circle cx="22" cy="31" r="2" fill="#10b981"/>
    <circle cx="15" cy="46" r="2" fill="#10b981"/>
    <circle cx="22" cy="46" r="2" fill="#10b981"/>
  </svg>`,
  'devices/web_server.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="52" height="46" x="6" y="9" rx="5" fill="#0f172a" stroke="#0284c7" stroke-width="2.5"/>
    <circle cx="42" cy="32" r="10" fill="none" stroke="#38bdf8" stroke-width="2"/>
    <line x1="32" y1="32" x2="52" y2="32" stroke="#38bdf8" stroke-width="1.5"/>
    <ellipse cx="42" cy="32" rx="5" ry="10" fill="none" stroke="#38bdf8" stroke-width="1.5"/>
    <circle cx="15" cy="18" r="2" fill="#10b981"/>
    <circle cx="15" cy="32" r="2" fill="#10b981"/>
    <circle cx="15" cy="46" r="2" fill="#10b981"/>
  </svg>`,
  'devices/email_server.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="52" height="46" x="6" y="9" rx="5" fill="#0f172a" stroke="#f59e0b" stroke-width="2.5"/>
    <rect width="22" height="15" x="30" y="25" rx="2" fill="none" stroke="#fbbf24" stroke-width="2"/>
    <polygon points="30,25 41,33 52,25" fill="none" stroke="#fbbf24" stroke-width="1.5"/>
    <circle cx="15" cy="18" r="2" fill="#10b981"/>
    <circle cx="15" cy="32" r="2" fill="#10b981"/>
    <circle cx="15" cy="46" r="2" fill="#10b981"/>
  </svg>`,
  'devices/dhcp_server.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="52" height="46" x="6" y="9" rx="5" fill="#0f172a" stroke="#10b981" stroke-width="2.5"/>
    <rect width="18" height="22" x="32" y="21" rx="2" fill="none" stroke="#34d399" stroke-width="2"/>
    <line x1="36" y1="27" x2="46" y2="27" stroke="#34d399" stroke-width="1.5"/>
    <line x1="36" y1="33" x2="46" y2="33" stroke="#34d399" stroke-width="1.5"/>
    <line x1="36" y1="39" x2="43" y2="39" stroke="#34d399" stroke-width="1.5"/>
  </svg>`,
  'devices/dns_server.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="52" height="46" x="6" y="9" rx="5" fill="#0f172a" stroke="#8b5cf6" stroke-width="2.5"/>
    <path d="M32,23 Q40,20 48,23 L48,43 Q40,40 32,43 Z" fill="none" stroke="#a78bfa" stroke-width="1.5"/>
    <path d="M32,23 Q24,20 16,23 L16,43 Q24,40 32,43 Z" fill="none" stroke="#a78bfa" stroke-width="1.5"/>
  </svg>`,

  // Chapters
  'chapters/ch1.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <polygon points="32,8 6,24 58,24" fill="#0284c7"/>
    <rect width="46" height="30" x="9" y="24" rx="4" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    <rect width="10" height="14" x="27" y="40" rx="2" fill="#0284c7"/>
    <circle cx="20" cy="32" r="3" fill="#38bdf8"/>
    <circle cx="44" cy="32" r="3" fill="#38bdf8"/>
  </svg>`,
  'chapters/ch2.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="50" height="38" x="7" y="13" rx="5" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5"/>
    <line x1="7" y1="26" x2="57" y2="26" stroke="#38bdf8" stroke-width="1.5"/>
    <circle cx="16" cy="20" r="2" fill="#10b981"/>
    <circle cx="24" cy="20" r="2" fill="#10b981"/>
    <circle cx="16" cy="32" r="2" fill="#10b981"/>
    <circle cx="24" cy="32" r="2" fill="#10b981"/>
    <rect width="8" height="6" x="34" y="30" rx="1" fill="#38bdf8"/>
    <rect width="8" height="6" x="44" y="30" rx="1" fill="#38bdf8"/>
  </svg>`,
  'chapters/ch3.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="18" height="44" x="4" y="10" rx="3" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
    <rect width="18" height="44" x="42" y="10" rx="3" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
    <path d="M22,32 L42,32" stroke="#ef4444" stroke-width="4" stroke-linecap="round"/>
    <rect width="14" height="12" x="25" y="26" rx="2" fill="#ef4444"/>
  </svg>`,
  'chapters/ch4.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="22" fill="#0f172a" stroke="#f59e0b" stroke-width="2.5"/>
    <polygon points="32,16 38,28 32,25 26,28" fill="#f59e0b"/>
    <polygon points="32,48 38,36 32,39 26,36" fill="#f59e0b"/>
    <polygon points="16,32 28,26 25,32 28,38" fill="#f59e0b"/>
    <polygon points="48,32 36,26 39,32 36,38" fill="#f59e0b"/>
    <circle cx="32" cy="32" r="4" fill="#f59e0b"/>
  </svg>`,
  'chapters/ch5.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="20" height="44" x="8" y="10" rx="3" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
    <rect width="20" height="44" x="36" y="10" rx="3" fill="#0f172a" stroke="#10b981" stroke-width="2"/>
    <circle cx="18" cy="22" r="3" fill="#38bdf8"/>
    <circle cx="18" cy="34" r="3" fill="#38bdf8"/>
    <circle cx="46" cy="22" r="3" fill="#10b981"/>
    <circle cx="46" cy="34" r="3" fill="#10b981"/>
  </svg>`,
  'chapters/ch6.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path d="M32,6 L54,16 C54,42 32,58 32,58 C32,58 10,42 10,16 Z" fill="#0f172a" stroke="#f43f5e" stroke-width="2.5"/>
    <polygon points="32,18 36,28 30,28 34,38 26,26 32,26" fill="#fef08a"/>
  </svg>`,
  'chapters/ch7.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <polygon points="32,6 38,22 54,22 41,32 46,48 32,38 18,48 23,32 10,22 26,22" fill="#eab308" stroke="#facc15" stroke-width="2"/>
  </svg>`,

  // UI
  'ui/logo.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <polygon points="32,6 56,19 56,45 32,58 8,45 8,19" fill="none" stroke="#38bdf8" stroke-width="3"/>
    <polygon points="32,18 46,26 46,38 32,46 18,38 18,26" fill="#0284c7" opacity="0.4"/>
    <circle cx="32" cy="32" r="4" fill="#38bdf8"/>
  </svg>`,
  'ui/lock.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="36" height="28" x="14" y="26" rx="4" fill="#1e293b" stroke="#94a3b8" stroke-width="2.5"/>
    <path d="M22,26 L22,18 C22,12.5 26.5,8 32,8 C37.5,8 42,12.5 42,18 L42,26" fill="none" stroke="#94a3b8" stroke-width="3"/>
    <circle cx="32" cy="38" r="3" fill="#94a3b8"/>
    <line x1="32" y1="41" x2="32" y2="46" stroke="#94a3b8" stroke-width="2.5"/>
  </svg>`
};

for (const [relPath, content] of Object.entries(svgs)) {
  const filePath = path.join(baseDir, relPath);
  fs.writeFileSync(filePath, content, 'utf8');
}

console.log('Successfully generated', Object.keys(svgs).length, 'high-DPI SVG assets.');
