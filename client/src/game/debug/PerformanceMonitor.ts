export type PerformanceSnapshot = {
  fps: number;
  cpuFrameMs: number;
  p95FrameMs: number;
  p99FrameMs: number;
  framesOver33ms: number;
  framesOver50ms: number;
  drawCalls: number;
  triangles: number;
  meshes: number;
  instancedMeshes: number;
  instances: number;
  geometries: number;
  materials: number;
  activeColliders: number;
  activeChunks: number;
  visualChunks: number;
  horizonChunks: number;
  pendingStreamingJobs: number;
  streamingGenerationMs: number;
  streamingCommitMs: number;
  streamingMaxCommitMs: number;
  systemTimings: Readonly<Record<string, number>>;
  systemMaxTimings: Readonly<Record<string, number>>;
};

const MAX_FRAME_SAMPLES = 240;

export class PerformanceMonitor {
  private smoothedFrameMs = 16.67;
  private readonly frameSamples: number[] = [];
  private sampleMetricsDirty = false;
  private snapshot: PerformanceSnapshot = {
    fps: 60,
    cpuFrameMs: 16.67,
    p95FrameMs: 16.67,
    p99FrameMs: 16.67,
    framesOver33ms: 0,
    framesOver50ms: 0,
    drawCalls: 0,
    triangles: 0,
    meshes: 0,
    instancedMeshes: 0,
    instances: 0,
    geometries: 0,
    materials: 0,
    activeColliders: 0,
    activeChunks: 0,
    visualChunks: 0,
    horizonChunks: 0,
    pendingStreamingJobs: 0,
    streamingGenerationMs: 0,
    streamingCommitMs: 0,
    streamingMaxCommitMs: 0,
    systemTimings: {},
    systemMaxTimings: {},
  };

  recordFrame(frameMs: number): void {
    const normalized = Math.max(0, frameMs);
    this.smoothedFrameMs = this.smoothedFrameMs * 0.9 + normalized * 0.1;
    this.frameSamples.push(normalized);
    if (this.frameSamples.length > MAX_FRAME_SAMPLES) this.frameSamples.shift();
    this.snapshot.fps = this.smoothedFrameMs > 0 ? 1000 / this.smoothedFrameMs : 0;
    this.snapshot.cpuFrameMs = this.smoothedFrameMs;
    this.sampleMetricsDirty = true;
  }

  recordRenderer(drawCalls: number, triangles: number): void {
    this.snapshot.drawCalls = drawCalls;
    this.snapshot.triangles = triangles;
  }

  recordSceneResources(resources: { meshes: number; instancedMeshes: number; instances: number; geometries: number; materials: number; colliders: number }): void {
    this.snapshot.meshes = resources.meshes;
    this.snapshot.instancedMeshes = resources.instancedMeshes;
    this.snapshot.instances = resources.instances;
    this.snapshot.geometries = resources.geometries;
    this.snapshot.materials = resources.materials;
    this.snapshot.activeColliders = resources.colliders;
  }

  recordChunks(active: number, visual: number, horizon: number): void {
    this.snapshot.activeChunks = active;
    this.snapshot.visualChunks = visual;
    this.snapshot.horizonChunks = horizon;
  }

  recordStreaming(pendingStreamingJobs: number, generationMs: number, commitMs: number): void {
    const normalizedCommit = Math.max(0, commitMs);
    this.snapshot.pendingStreamingJobs = pendingStreamingJobs;
    this.snapshot.streamingGenerationMs = Math.max(0, generationMs);
    this.snapshot.streamingCommitMs = normalizedCommit;
    this.snapshot.streamingMaxCommitMs = Math.max(this.snapshot.streamingMaxCommitMs, normalizedCommit);
  }

  recordSystem(name: string, milliseconds: number): void {
    const normalized = Math.max(0, milliseconds);
    this.snapshot.systemTimings = { ...this.snapshot.systemTimings, [name]: normalized };
    this.snapshot.systemMaxTimings = {
      ...this.snapshot.systemMaxTimings,
      [name]: Math.max(this.snapshot.systemMaxTimings[name] ?? 0, normalized),
    };
  }

  read(): Readonly<PerformanceSnapshot> {
    this.updateSampleMetrics();
    return this.snapshot;
  }

  private updateSampleMetrics(): void {
    if (!this.sampleMetricsDirty) return;
    const sorted = [...this.frameSamples].sort((left, right) => left - right);
    this.snapshot.p95FrameMs = percentile(sorted, 0.95);
    this.snapshot.p99FrameMs = percentile(sorted, 0.99);
    this.snapshot.framesOver33ms = this.frameSamples.filter((sample) => sample > 33).length;
    this.snapshot.framesOver50ms = this.frameSamples.filter((sample) => sample > 50).length;
    this.sampleMetricsDirty = false;
  }
}

function percentile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)]!;
}
