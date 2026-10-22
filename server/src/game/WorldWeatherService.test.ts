import { describe, expect, it } from 'vitest';
import { naturalWeatherAt } from '@together/shared';
import { WorldWeatherService } from './WorldWeatherService.js';

describe('server-owned world weather', () => {
  it('shares current conditions and rejects invalid states without changing the world', () => {
    const weather = new WorldWeatherService();
    expect(weather.weather()).toBe('clear');
    weather.setState('monsoon_rain');
    expect(weather.snapshot()).toEqual({ state: 'monsoon_rain' });
    expect(() => weather.setState('hurricane')).toThrow();
    expect(weather.weather()).toBe('monsoon_rain');
    const snapshot = weather.snapshot();
    snapshot.state = 'clear';
    expect(weather.weather()).toBe('monsoon_rain');
  });

  it('follows the deterministic forecast and lets an override hold only for its block', () => {
    const weather = new WorldWeatherService();
    const morning = { day: 4, gameMinute: 6 * 60 };
    expect(weather.advance(morning)).toBe(naturalWeatherAt(4, 6 * 60));
    weather.setState('thunderstorm', morning);
    expect(weather.advance({ day: 4, gameMinute: 7 * 60 })).toBe('thunderstorm');
    expect(weather.advance({ day: 4, gameMinute: 9 * 60 + 5 })).toBe(naturalWeatherAt(4, 9 * 60 + 5));
  });

  it('produces mostly calm, varied weather where storms only follow rain', () => {
    const seen = new Map<string, number>();
    let previous: string | null = null, sudden = 0;
    for (let day = 0; day < 60; day++) for (let block = 0; block < 8; block++) {
      const state = naturalWeatherAt(day, block * 180 + 30);
      seen.set(state, (seen.get(state) ?? 0) + 1);
      if (state === 'thunderstorm' && previous !== null && !['light_rain', 'monsoon_rain', 'thunderstorm'].includes(previous)) sudden++;
      previous = state;
    }
    expect(seen.size).toBeGreaterThanOrEqual(6);
    const dangerous = (seen.get('thunderstorm') ?? 0) + (seen.get('monsoon_rain') ?? 0);
    expect(dangerous / 480).toBeLessThan(0.15);
    expect(sudden).toBe(0);
    expect(naturalWeatherAt(12, 600)).toBe(naturalWeatherAt(12, 600));
  });
});

