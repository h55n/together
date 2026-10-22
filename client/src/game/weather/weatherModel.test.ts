import { describe, expect, it } from 'vitest';
import { targetWetness, weatherAllowsKayak, weatherAtmosphere } from './weatherModel';

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

describe('weather atmosphere', () => {
  it('gives each non-rain state a distinct sky and light character', () => {
    const clear = weatherAtmosphere('clear'), overcast = weatherAtmosphere('overcast'), misty = weatherAtmosphere('misty_morning');
    expect(overcast.sunScale).toBeLessThan(clear.sunScale * 0.5);
    expect(overcast.cloudCover).toBeGreaterThan(clear.cloudCover);
    expect(misty.haze).toBeGreaterThan(overcast.haze);
    expect(weatherAtmosphere('hot_bright_afternoon').warmth).toBeGreaterThan(0);
    expect(weatherAtmosphere('windy_evening').wind).toBeGreaterThan(clear.wind);
  });
});
