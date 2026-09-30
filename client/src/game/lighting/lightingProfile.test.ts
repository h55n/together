import { describe, expect, it } from 'vitest';
import { lightingProfileAt } from './lightingProfile';

describe('lightingProfileAt', () => {
  it('changes lighting continuously at each time period boundary', () => {
    for (const hour of [5, 7, 10, 15, 17, 18.75, 19.5, 22.5, 24]) {
      const before = lightingProfileAt(hour * 60 - 0.01);
      const after = lightingProfileAt(hour * 60 + 0.01);
      for (const key of ['sunIntensity', 'skyIntensity', 'warmth', 'sunElevationDegrees', 'fogDensity'] as const) {
        expect(Math.abs(after[key] - before[key])).toBeLessThan(0.01);
      }
    }
  });
  it('makes golden hour warmer and lower-key than midday', () => {
    const midday = lightingProfileAt(13 * 60);
    const golden = lightingProfileAt(17.5 * 60);
    expect(golden.sunIntensity).toBeLessThan(midday.sunIntensity);
    expect(golden.warmth).toBeGreaterThan(midday.warmth);
  });

  it('wraps smoothly across midnight', () => {
    expect(lightingProfileAt(24 * 60 + 60).period).toBe('late_night');
  });
});
