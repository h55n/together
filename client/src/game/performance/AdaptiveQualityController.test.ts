import { describe, expect, it } from 'vitest';
import { AdaptiveQualityController } from './AdaptiveQualityController';

const stableSnapshot = { fps: 60, cpuFrameMs: 16, p95FrameMs: 16, p99FrameMs: 17, framesOver33ms: 0, framesOver50ms: 0 };
const hitchSnapshot = { fps: 28, cpuFrameMs: 42, p95FrameMs: 42, p99FrameMs: 55, framesOver33ms: 30, framesOver50ms: 4 };

describe('AdaptiveQualityController', () => {
  it.each(['medium', 'high'] as const)('uses the measured Low visual workload at terminal %s fallback without changing gameplay', quality => {
    const controller = new AdaptiveQualityController(quality);
    for (let frame = 0; frame < 150; frame++) controller.sample(hitchSnapshot);
    expect(controller.sample(hitchSnapshot)).toMatchObject({ streamRadiusChunks: 3,
      vegetationScale: 0.65, shadowScale: 0.65, shadowsEnabled: false,
      pixelRatioCap: 1, resolutionScale: 0.85, gameplayScale: 1 });
    for (let frame = 0; frame < 300; frame++) controller.sample(stableSnapshot);
    expect(controller.sample(stableSnapshot).shadowsEnabled).toBe(false);
  });
  it.each(['medium', 'high'] as const)('reduces standard-density rendering at the strongest %s fallback and restores it after sustained recovery', quality => {
    const controller = new AdaptiveQualityController(quality);
    for (let index = 0; index < 150; index++) controller.sample(hitchSnapshot);
    const reduced = controller.sample(hitchSnapshot);
    expect(reduced).toHaveProperty('resolutionScale', 0.85);
    expect(reduced.gameplayScale).toBe(1);
    for (let index = 0; index < 7200; index++) controller.sample(stableSnapshot);
    expect(controller.sample(stableSnapshot)).toHaveProperty('resolutionScale', 1);
  });
  it('keeps Medium visuals at their selected baseline until repeated p95 hitches reduce only far work', () => {
    const controller = new AdaptiveQualityController('medium');
    expect(controller.sample(stableSnapshot)).toMatchObject({ streamRadiusChunks: 5, shadowsEnabled: true, gameplayScale: 1 });

    for (let index = 0; index < 30; index += 1) controller.sample(hitchSnapshot);

    expect(controller.sample(hitchSnapshot)).toMatchObject({ streamRadiusChunks: 4, gameplayScale: 1 });
  });

  it('reuses the same visual budget object until an adaptive threshold actually changes', () => {
    const controller = new AdaptiveQualityController('medium');
    const first = controller.sample(stableSnapshot);
    const second = controller.sample(stableSnapshot);
    expect(second).toBe(first);

    for (let index = 0; index < 30; index += 1) controller.sample(hitchSnapshot);
    const reduced = controller.sample(hitchSnapshot);
    expect(reduced).not.toBe(first);
    expect(reduced.streamRadiusChunks).toBeLessThan(first.streamRadiusChunks);
  });

  it('pins the explicit Low fallback instead of adapting gameplay', () => {
    const controller = new AdaptiveQualityController('low');
    for (let index = 0; index < 60; index += 1) controller.sample(hitchSnapshot);

    expect(controller.sample(hitchSnapshot)).toMatchObject({ streamRadiusChunks: 3, shadowsEnabled: false, gameplayScale: 1 });
  });
});
