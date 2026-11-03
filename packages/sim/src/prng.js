/**
 * Deterministic PRNG streams (Mulberry32 & 32-bit FNV-1a)
 * Section 7.2 & 9.5
 */

export function fnv1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function mulberry32(seedUint32) {
  let a = seedUint32 >>> 0;
  return function next() {
    let t = (a = (a + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createStreamRng(masterSeed, streamName) {
  const hash = fnv1a(`${streamName}:${masterSeed}`);
  return mulberry32(hash);
}
