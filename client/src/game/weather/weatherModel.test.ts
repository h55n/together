import { describe, expect, it } from 'vitest';
import { targetWetness, weatherAllowsKayak } from './weatherModel';

describe('weather model', () => {
  it('drives surface wetness by rain severity', () => {
    expect(targetWetness('clear')).toBe(0);
    expect(targetWetness('light_rain')).toBeGreaterThan(0.3);
    expect(targetWetness('monsoon_rain')).toBe(1);
  });

  it('closes kayak only in dangerous weather', () => {
    expect(weatherAllowsKayak('light_rain')).toBe(true);
    expect(weatherAllowsKayak('monsoon_rain')).toBe(false);
    expect(weatherAllowsKayak('thunderstorm')).toBe(false);
  });
});
