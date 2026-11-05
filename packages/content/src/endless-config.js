/**
 * NetCity v2.0 - Endless Mode Configuration & Tier Resolver
 * Single Responsibility: Translates campaign progress into an unlocked Endless configuration:
 * Grid dimensions, allowed wires, unlocked devices, eligible building types, timer pacing,
 * decay parameters, and eligible random events per Section 6.1, 5.9, and 9.7.
 */

import { ALL_LEVELS } from './levels.js';

/**
 * Determine the highest unlocked chapter tier (1 to 7) based on completed level IDs.
 * @param {Set<string>|Array<string>} completedLevels
 * @returns {number}
 */
export function getUnlockedTier(completedLevels = new Set()) {
  const completed = completedLevels instanceof Set ? completedLevels : new Set(completedLevels || []);
  let tier = 1;

  for (let ch = 1; ch <= 7; ch++) {
    const chLevels = ALL_LEVELS.filter(l => l.chapter === ch);
    const finishedCount = chLevels.filter(l => completed.has(l.id)).length;
    // If finished at least half of the chapter or its finale, unlock this tier
    if (finishedCount > 0) {
      tier = Math.max(tier, ch);
    }
  }

  return Math.min(7, Math.max(1, tier));
}

/**
 * Get Endless level setup for a given unlocked tier.
 * @param {number} tier
 * @returns {object}
 */
export function getEndlessSetup(tier = 1) {
  // Pacing parameters from Section 5.9
  const pacingByTier = {
    1: { firstTimer: 800, cycleTimer: 240, baseInterval: 600, minInterval: 220, deadline: 40 },
    2: { firstTimer: 700, cycleTimer: 240, baseInterval: 540, minInterval: 200, deadline: 40 },
    3: { firstTimer: 600, cycleTimer: 240, baseInterval: 480, minInterval: 180, deadline: 45 },
    4: { firstTimer: 500, cycleTimer: 220, baseInterval: 420, minInterval: 160, deadline: 50 },
    5: { firstTimer: 450, cycleTimer: 220, baseInterval: 380, minInterval: 150, deadline: 50 },
    6: { firstTimer: 400, cycleTimer: 200, baseInterval: 340, minInterval: 140, deadline: 55 },
    7: { firstTimer: 350, cycleTimer: 200, baseInterval: 300, minInterval: 120, deadline: 60 }
  };

  const pacing = pacingByTier[tier] || pacingByTier[1];

  // Unlocked wires
  const wiresAllowed = ['twisted_pair', 'coaxial', 'multimode_fiber', 'single_mode_fiber'];

  // Unlocked devices by tier
  const devicesAllowed = ['cabinet', 'access_point'];
  if (tier >= 2) devicesAllowed.push('hub', 'switch');
  if (tier >= 3) devicesAllowed.push('router');
  if (tier >= 4) devicesAllowed.push('dhcp_server', 'dns_server', 'web_server', 'mail_server');
  if (tier >= 6) devicesAllowed.push('firewall', 'vpn_gateway');
  if (tier >= 7) devicesAllowed.push('load_balancer', 'backup_power');

  // Building pool by tier
  const buildingPool = ['laptop', 'classroom'];
  if (tier >= 1) buildingPool.push('sports_ground', 'phone');
  if (tier >= 2) buildingPool.push('lab');
  if (tier >= 3) buildingPool.push('home', 'library');

  // Eligible events by tier
  const eligibleEvents = ['CableCut', 'SlowLink'];
  if (tier >= 2) eligibleEvents.push('HubJam');
  if (tier >= 3) eligibleEvents.push('DuplicateIP', 'MissingGateway');
  if (tier >= 4) eligibleEvents.push('ServerCrash', 'DNSDown');
  if (tier >= 5) eligibleEvents.push('WrongZoneTest');
  if (tier >= 6) eligibleEvents.push('TrafficFlood');
  if (tier >= 7) eligibleEvents.push('PowerCut');

  return {
    id: 'endless',
    title: 'Endless Metropolis',
    isEndless: true,
    tier,
    grid: { w: 32, h: 18 },
    server: 9 * 32 + 16,
    coins: 80,
    firstTimerTicks: pacing.firstTimer,
    cycleTimerTicks: pacing.cycleTimer,
    deadlineTicks: pacing.deadline,
    baseInterval: pacing.baseInterval,
    minInterval: pacing.minInterval,
    wiresAllowed,
    devicesAllowed,
    buildingPool,
    eligibleEvents,
    walls: 2
  };
}
