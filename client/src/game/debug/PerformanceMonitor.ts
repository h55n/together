export type PerformanceSnapshot = {
  fps: number;
  cpuFrameMs: number;
  drawCalls: number;
  triangles: number;
  activeChunks: number;
  visualChunks: number;
  horizonChunks: number;
};

export class PerformanceMonitor {
  private smoothedFrameMs = 16.67;
  private snapshot: PerformanceSnapshot = {
    fps: 60,
    cpuFrameMs: 16.67,
    drawCalls: 0,
    triangles: 0,
    activeChunks: 0,
    visualChunks: 0,
    horizonChunks: 0,
  };

  recordFrame(frameMs: number): void {
    this.smoothedFrameMs = this.smoothedFrameMs * 0.9 + frameMs * 0.1;
    this.snapshot.fps = this.smoothedFrameMs > 0 ? 1000 / this.smoothedFrameMs : 0;
    this.snapshot.cpuFrameMs = this.smoothedFrameMs;
  }

  recordRenderer(drawCalls: number, triangles: number): void {
    this.snapshot.drawCalls = drawCalls;
    this.snapshot.triangles = triangles;
  }

  recordChunks(active: number, visual: number, horizon: number): void {
    this.snapshot.activeChunks = active;
    this.snapshot.visualChunks = visual;
    this.snapshot.horizonChunks = horizon;
  }

  read(): Readonly<PerformanceSnapshot> {
    return this.snapshot;
  }
}
