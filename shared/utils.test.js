// shared/utils.test.js
import { describe, it, expect } from 'vitest';
import {
  weightedRandom, seededRandom, clamp, lerp, mapRange,
  getGameHour, getSeasonFromDate, generateInviteCode,
  formatCoins, formatGameTime, deepMerge, debounce, throttle,
} from './utils.js';

describe('weightedRandom', () => {
  it('returns a key from the weights object', () => {
    const result = weightedRandom({ sunny: 0.7, rainy: 0.3 });
    expect(['sunny', 'rainy']).toContain(result);
  });

  it('respects probabilities over many trials', () => {
    const counts = { sunny: 0, rainy: 0 };
    for (let i = 0; i < 1000; i++) {
      counts[weightedRandom({ sunny: 0.8, rainy: 0.2 })]++;
    }
    // sunny should win ~80% of the time (allow ±10%)
    expect(counts.sunny / 1000).toBeGreaterThan(0.65);
    expect(counts.sunny / 1000).toBeLessThan(0.95);
  });
});

describe('seededRandom', () => {
  it('produces the same sequence for the same seed', () => {
    const rng1 = seededRandom(42);
    const rng2 = seededRandom(42);
    for (let i = 0; i < 10; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = seededRandom(1);
    const rng2 = seededRandom(2);
    expect(rng1()).not.toBe(rng2());
  });

  it('returns values between 0 and 1', () => {
    const rng = seededRandom(99);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('clamp', () => {
  it('clamps below min', () => expect(clamp(-5, 0, 100)).toBe(0));
  it('clamps above max', () => expect(clamp(150, 0, 100)).toBe(100));
  it('passes through in-range values', () => expect(clamp(50, 0, 100)).toBe(50));
});

describe('lerp', () => {
  it('returns start at t=0', () => expect(lerp(0, 10, 0)).toBe(0));
  it('returns end at t=1',   () => expect(lerp(0, 10, 1)).toBe(10));
  it('returns midpoint at t=0.5', () => expect(lerp(0, 10, 0.5)).toBe(5));
  it('clamps t outside 0-1',  () => {
    expect(lerp(0, 10, -1)).toBe(0);
    expect(lerp(0, 10,  2)).toBe(10);
  });
});

describe('mapRange', () => {
  it('maps 0.5 in [0,1] to 50 in [0,100]', () => {
    expect(mapRange(0.5, 0, 1, 0, 100)).toBe(50);
  });
});

describe('generateInviteCode', () => {
  it('returns 6 characters', () => {
    expect(generateInviteCode()).toHaveLength(6);
  });

  it('uses only valid chars (no O, 0, I, 1)', () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    expect(code).not.toMatch(/[OI01]/);
  });

  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 100 }, generateInviteCode));
    expect(codes.size).toBeGreaterThan(90);
  });
});

describe('formatCoins', () => {
  it('formats coins with symbol', () => {
    expect(formatCoins(340)).toBe('340 ⌘');
  });
});

describe('formatGameTime', () => {
  it('formats midnight correctly', () => expect(formatGameTime(0)).toBe('12:00 AM'));
  it('formats noon correctly',     () => expect(formatGameTime(12)).toBe('12:00 PM'));
  it('formats 7am correctly',      () => expect(formatGameTime(7)).toBe('7:00 AM'));
  it('formats 7:30pm correctly',   () => expect(formatGameTime(19.5)).toBe('7:30 PM'));
});

describe('getSeasonFromDate', () => {
  it('returns summer for July', () => {
    expect(getSeasonFromDate(new Date('2025-07-15'))).toBe('summer');
  });
  it('returns winter for January', () => {
    expect(getSeasonFromDate(new Date('2025-01-15'))).toBe('winter');
  });
  it('returns spring for April', () => {
    expect(getSeasonFromDate(new Date('2025-04-01'))).toBe('spring');
  });
  it('returns autumn for October', () => {
    expect(getSeasonFromDate(new Date('2025-10-10'))).toBe('autumn');
  });
});

describe('deepMerge', () => {
  it('merges nested objects', () => {
    const result = deepMerge({ a: { b: 1 } }, { a: { c: 2 } });
    expect(result).toEqual({ a: { b: 1, c: 2 } });
  });

  it('overrides primitive values', () => {
    const result = deepMerge({ x: 1 }, { x: 2 });
    expect(result.x).toBe(2);
  });
});

describe('debounce', () => {
  it('only calls the function once after rapid calls', async () => {
    let count = 0;
    const fn  = debounce(() => count++, 50);
    fn(); fn(); fn();
    await new Promise(r => setTimeout(r, 100));
    expect(count).toBe(1);
  });
});

describe('throttle', () => {
  it('limits calls within the interval', () => {
    let count = 0;
    const fn  = throttle(() => count++, 100);
    fn(); fn(); fn();
    expect(count).toBe(1);
  });
});
