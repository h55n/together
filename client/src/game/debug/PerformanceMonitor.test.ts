import { describe, expect, it } from 'vitest';
import { PerformanceMonitor } from './PerformanceMonitor';

describe('PerformanceMonitor', () => {
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
