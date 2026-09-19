import { describe, expect, it } from 'vitest';
import { DebugOverlay } from './DebugOverlay';
import { PerformanceMonitor } from './PerformanceMonitor';

describe('DebugOverlay', () => {
  it('publishes a structured performance snapshot for browser diagnostics', () => {
    const monitor = new PerformanceMonitor();
    monitor.recordFrame(20);
    monitor.recordRenderer(42, 123_456);
    monitor.recordSceneResources({
      meshes: 75,
      instancedMeshes: 2,
      instances: 32,
      geometries: 28,
      materials: 14,
      colliders: 19,
    });
    monitor.recordChunks(9, 12, 4);
    monitor.recordStreaming(3, 1.2, 2.4);
    monitor.recordSystem('render', 3.1);

    const parent = document.createElement('div');
    const overlay = new DebugOverlay(parent, monitor, {
      requestedBackend: 'webgl2',
      backend: 'webgl2',
      webgpuDetected: false,
      webgl2Detected: true,
      universalRendererLoaded: false,
    });

    overlay.update(0.3, {
      weather: 'clear',
      gameTime: '17:20',
      cameraMode: 'first_person',
      playerPosition: { x: -235, y: 3.2, z: 175 },
    });

    const snapshot = JSON.parse(overlay.element.dataset.performanceSnapshot ?? '{}') as Record<string, unknown>;
    expect(snapshot).toMatchObject({
      renderer: 'webgl2',
      drawCalls: 42,
      triangles: 123_456,
      meshes: 75,
      instancedMeshes: 2,
      instances: 32,
      activeColliders: 19,
      activeChunks: 9,
      visualChunks: 12,
      horizonChunks: 4,
      pendingStreamingJobs: 3,
    });
    const controls = JSON.parse(overlay.element.dataset.controlSnapshot ?? '{}') as Record<string, unknown>;
    expect(controls).toMatchObject({
      cameraMode: 'first_person',
      playerPosition: { x: -235, y: 3.2, z: 175 },
    });
    expect(overlay.element.textContent).toContain('p95');
    expect(overlay.element.textContent).toContain('75 meshes');
    overlay.dispose();
  });
});
