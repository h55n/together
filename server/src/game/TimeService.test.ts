import { describe, expect, it } from 'vitest';
import { advancePersistedCityTime } from './TimeService.js';

describe('persistent city time', () => {
  it('continues from the persisted clock across a server restart', () => {
    const restored = advancePersistedCityTime({ gameMinute: 23 * 60 + 58, day: 4, savedAt: 1_000 }, 61_000);
    expect(restored.day).toBe(5);
    expect(restored.gameMinute).toBe(10);
  });
});
