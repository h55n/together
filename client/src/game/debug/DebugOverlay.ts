import type { PerformanceMonitor } from './PerformanceMonitor';
import type { RendererRuntimeInfo } from '../core/Renderer';

export class DebugOverlay {
  readonly element: HTMLDivElement;
  private elapsed = 0;

  constructor(parent: HTMLElement, private readonly performanceMonitor: PerformanceMonitor, private readonly rendererInfo: RendererRuntimeInfo) {
    this.element = document.createElement('div');
    this.element.dataset.testid = 'debug-overlay';
    this.element.style.cssText = [
      'position:absolute', 'left:12px', 'bottom:12px', 'padding:8px 10px',
      'background:rgba(22,28,25,.62)', 'color:#e8ece7', 'font:11px/1.5 ui-monospace,monospace',
      'border:1px solid rgba(255,255,255,.12)', 'border-radius:8px', 'pointer-events:none',
      'backdrop-filter:blur(8px)', 'white-space:pre', 'z-index:10',
    ].join(';');
    parent.appendChild(this.element);
  }

  update(deltaSeconds: number, extras: {
    weather: string;
    gameTime: string;
    cameraMode: 'first_person' | 'third_person';
    playerPosition: { x: number; y: number; z: number };
    remotePlayers: readonly { userId: string; position: { x: number; y: number; z: number } }[];
  }): void {
    this.elapsed += deltaSeconds;
    if (this.elapsed < 0.25) return;
    this.elapsed = 0;
    const p = this.performanceMonitor.read();
    this.element.dataset.performanceSnapshot = JSON.stringify({
      renderer: this.rendererInfo.backend,
      ...p,
    });
    this.element.dataset.controlSnapshot = JSON.stringify({
      cameraMode: extras.cameraMode,
      playerPosition: extras.playerPosition,
    });
    this.element.dataset.networkSnapshot = JSON.stringify({
      remotePlayers: extras.remotePlayers,
    });
    this.element.textContent = [
      `${this.rendererInfo.backend.toUpperCase()} · ${p.fps.toFixed(0)} fps · ${p.cpuFrameMs.toFixed(1)} ms CPU`,
      `p95 ${p.p95FrameMs.toFixed(1)} · p99 ${p.p99FrameMs.toFixed(1)} ms · hitches 33/50 ${p.framesOver33ms}/${p.framesOver50ms}`,
      `${p.drawCalls} draws · ${(p.triangles / 1000).toFixed(0)}k tris`,
      `${p.meshes} meshes · ${p.instancedMeshes} instanced · ${p.instances} instances`,
      `${p.geometries} geoms · ${p.materials} mats · ${p.activeColliders} colliders`,
      `chunks A/V/H ${p.activeChunks}/${p.visualChunks}/${p.horizonChunks} · queue ${p.pendingStreamingJobs}`,
      `stream gen/commit ${p.streamingGenerationMs.toFixed(1)}/${p.streamingCommitMs.toFixed(1)} ms`,
      `${extras.gameTime} · ${extras.weather.replaceAll('_', ' ')} · ${extras.remotePlayers.length} peer${extras.remotePlayers.length === 1 ? '' : 's'}`,
      `V camera · E interact · Shift jog`,
    ].join('\n');
  }

  dispose(): void {
    this.element.remove();
  }
}
