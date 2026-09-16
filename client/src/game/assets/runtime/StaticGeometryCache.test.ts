import { describe, expect, it } from 'vitest';
import { StaticGeometryCache } from './StaticGeometryCache';

describe('StaticGeometryCache', () => {
  it('reuses a shared box geometry for equal static dimensions', () => {
    const cache = new StaticGeometryCache();
    const first = cache.box(1.7, 0.12, 0.5);
    const second = cache.box(1.7, 0.12, 0.5);

    expect(second).toBe(first);
    expect(first.userData.togetherShared).toBe(true);
    expect(cache.metrics()).toEqual({ geometries: 1 });
  });
});
