// shared/utils.js

/**
 * Weighted random selection from an object of { key: weight }
 * @param {Object} weights - e.g. { sunny: 0.7, rainy: 0.3 }
 * @param {Function} rng - random number generator (default: Math.random)
 */
export function weightedRandom(weights, rng = Math.random) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = rng() * total;
  for (const [key, weight] of entries) {
    r -= weight;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

/**
 * Seeded pseudo-random number generator (mulberry32)
 */
export function seededRandom(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Clamp a value between min and max
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation
 */
export function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Map a value from one range to another
 */
export function mapRange(value, inMin, inMax, outMin, outMax) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/**
 * Get current game hour from real timestamp
 * @param {number} startTimestamp - when game day started (ms)
 * @param {number} startHour - game hour at startTimestamp
 */
export function getGameHour(startTimestamp, startHour, realMsPerGameHour = 60000) {
  const elapsed = Date.now() - startTimestamp;
  const hoursElapsed = elapsed / realMsPerGameHour;
  return (startHour + hoursElapsed) % 24;
}

/**
 * Get season from real-world month
 */
export function getSeasonFromDate(date = new Date()) {
  const month = date.getMonth(); // 0-11
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

/**
 * Generate a 6-character invite code
 */
export function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/**
 * Format coins for display
 */
export function formatCoins(amount) {
  return `${amount.toLocaleString()} ⌘`;
}

/**
 * Format game time for display (e.g., "7:30 AM")
 */
export function formatGameTime(gameHour) {
  const h = Math.floor(gameHour);
  const m = Math.floor((gameHour % 1) * 60);
  const period = h < 12 ? 'AM' : 'PM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

/**
 * Deep merge two objects
 */
export function deepMerge(target, source) {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output;
}

/**
 * Debounce a function
 */
export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Throttle a function
 */
export function throttle(fn, ms) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      return fn(...args);
    }
  };
}
