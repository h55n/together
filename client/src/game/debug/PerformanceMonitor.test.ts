import { describe, expect, it } from 'vitest';
import { PerformanceMonitor } from './PerformanceMonitor';

describe('PerformanceMonitor', () => {
  it('retains complete interval hitch totals after the rolling window expires and resets them', () => {
    const monitor = new PerformanceMonitor();
    monitor.recordFrame(120);
    for (let frame = 0; frame < 300; frame++) monitor.recordFrame(16);
    monitor.recordFrame(NaN);
    expect(monitor.read()).toMatchObject({ frameSampleCount: 240, framesOver50ms: 0,
      intervalFrameCount: 301, intervalElapsedMs: 4920, intervalFramesOver33ms: 1,
      intervalFramesOver50ms: 1, intervalMaxFrameMs: 120 });
    monitor.resetFrameSamples();
    expect(monitor.read()).toMatchObject({ intervalFrameCount: 0, intervalElapsedMs: 0,
      intervalFramesOver33ms: 0, intervalFramesOver50ms: 0, intervalMaxFrameMs: 0 });
    monitor.recordFrame(40);
    expect(monitor.read()).toMatchObject({ intervalFrameCount: 1, intervalElapsedMs: 40,
      intervalFramesOver33ms: 1, intervalFramesOver50ms: 0, intervalMaxFrameMs: 40 });
  });
  it('keeps frame cadence separate from CPU work', () => {
    const monitor = new PerformanceMonitor();
    for (let i = 0; i < 120; i += 1) {
      monitor.recordFrame(1000 / 30);
      monitor.recordCpuFrame(5);
    }
    expect(monitor.read().fps).toBeCloseTo(30, 1);
    expect(monitor.read().cpuFrameMs).toBeCloseTo(5, 1);
    expect(monitor.read().p95FrameMs).toBeCloseTo(1000 / 30);
    monitor.recordFrame(Number.NaN);
    expect(Number.isFinite(monitor.read().fps)).toBe(true);
  });
  it('records p95, p99, and hitch thresholds from frame samples', () => {
    const monitor = new PerformanceMonitor();
    [10, 16, 35, 55, 18].forEach((milliseconds) => monitor.recordFrame(milliseconds));
    expect(monitor.read()).toMatchObject({ framesOver33ms: 2, framesOver50ms: 1, p95FrameMs: 55, p99FrameMs: 55 });
  });

  it('records visible mesh, instance, geometry, material, and collider counts', () => {
    const monitor = new PerformanceMonitor();
    monitor.recordSceneResources({ meshes: 12, instancedMeshes: 3, instances: 48, geometries: 9, materials: 6, colliders: 17 });

    expect(monitor.read()).toMatchObject({ meshes: 12, instancedMeshes: 3, instances: 48, geometries: 9, materials: 6, activeColliders: 17 });
  });
  it('retains maximum system and streaming commit timings across startup work', () => {
    const monitor = new PerformanceMonitor();
    monitor.recordSystem('chunk-vegetation-merge', 2.5);
    monitor.recordSystem('chunk-vegetation-merge', 6.75);
    monitor.recordSystem('chunk-vegetation-merge', 1.25);
    monitor.recordStreaming(12, 0.2, 4.5);
    monitor.recordStreaming(8, 0.1, 9.25);
    monitor.recordStreaming(0, 0, 2.0);

    expect(monitor.read()).toMatchObject({
      systemTimings: { 'chunk-vegetation-merge': 1.25 },
      systemMaxTimings: { 'chunk-vegetation-merge': 6.75 },
      streamingCommitMs: 2.0,
      streamingMaxCommitMs: 9.25,
    });
  });

});
