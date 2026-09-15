import { describe, expect, it } from 'vitest';
import { AdaptiveQualityController } from './AdaptiveQualityController';

const stableSnapshot = { fps: 60, cpuFrameMs: 16, p95FrameMs: 16, p99FrameMs: 17, framesOver33ms: 0, framesOver50ms: 0 };
const hitchSnapshot = { fps: 28, cpuFrameMs: 42, p95FrameMs: 42, p99FrameMs: 55, framesOver33ms: 30, framesOver50ms: 4 };

describe('AdaptiveQualityController', () => {
  it('keeps Medium visuals at their selected baseline until repeated p95 hitches reduce only far work', () => {
    const controller = new AdaptiveQualityController('medium');
    expect(controller.sample(stableSnapshot)).toMatchObject({ streamRadiusChunks: 5, shadowsEnabled: true, gameplayScale: 1 });

    for (let index = 0; index < 30; index += 1) controller.sample(hitchSnapshot);

    expect(controller.sample(hitchSnapshot)).toMatchObject({ streamRadiusChunks: 4, gameplayScale: 1 });
  });

  it('pins the explicit Low fallback instead of adapting gameplay', () => {
    const controller = new AdaptiveQualityController('low');
    for (let index = 0; index < 60; index += 1) controller.sample(hitchSnapshot);

    expect(controller.sample(hitchSnapshot)).toMatchObject({ streamRadiusChunks: 3, shadowsEnabled: false, gameplayScale: 1 });
  });
});
