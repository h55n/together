import { describe, expect, it } from 'vitest';
import { lightingProfileAt } from './lightingProfile';

describe('lightingProfileAt', () => {
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
