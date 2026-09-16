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
});
