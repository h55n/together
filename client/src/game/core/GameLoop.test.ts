import { describe, expect, it } from 'vitest';
import { clampFrameDelta, consumeFixedSteps } from './GameLoop';

describe('GameLoop helpers', () => {
  it('clamps long tab-resume frames to avoid simulation explosions', () => {
    expect(clampFrameDelta(0.5)).toBe(0.1);
    expect(clampFrameDelta(1 / 60)).toBeCloseTo(1 / 60);
  });

  it('caps fixed simulation work per render frame', () => {
    expect(consumeFixedSteps(0.2, 1 / 60, 4)).toEqual({ steps: 4, remainder: 0 });
    const normal = consumeFixedSteps(1 / 30, 1 / 60, 4);
    expect(normal.steps).toBe(2);
    expect(normal.remainder).toBeCloseTo(0);
  });
});
