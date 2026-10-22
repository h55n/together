import { describe, expect, it } from 'vitest';
import { advancePersistedCityTime, TimeService } from './TimeService.js';

describe('persistent city time', () => {
  it('continues from the persisted clock across a server restart', () => {
    const restored = advancePersistedCityTime({ gameMinute: 23 * 60 + 58, day: 4, savedAt: 1_000 }, 61_000);
    expect(restored.day).toBe(5);
    expect(restored.gameMinute).toBe(10);
  });
});

describe('acceptance city clock', () => {
  it('starts from a configured minute without touching the persisted clock', async () => {
    const service = await TimeService.create(1_000, 600);
    expect(service.snapshot(1_000).gameMinute).toBe(600);
    await service.persist(2_000);
  });
});
