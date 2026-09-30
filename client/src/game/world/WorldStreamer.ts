import * as THREE from 'three';
import { CHUNK_SIZE_METRES, chunkDistance, chunkKey, residencyRing, worldToChunk, type ResidencyRing } from '@together/shared';
import type { PerformanceMonitor } from '../debug/PerformanceMonitor';
import { StreamingScheduler, type StreamingJob } from './StreamingScheduler';

export type ChunkVisualFactory = (chunkX: number, chunkZ: number, ring: Exclude<ResidencyRing, 'unloaded'>, vegetationDetail?: 'near' | 'far') => THREE.Group;

type ResidentChunk = {
  key: string;
  x: number;
  z: number;
  ring: Exclude<ResidencyRing, 'unloaded'>;
  vegetationDetail: 'near' | 'far' | undefined;
  group: THREE.Group;
};

type DesiredChunk = Omit<StreamingJob, 'priority'>;

export class WorldStreamer {
  readonly root = new THREE.Group();
  private readonly residents = new Map<string, ResidentChunk>();
  private readonly queued = new Map<string, Exclude<ResidencyRing, 'unloaded'>>();
  private readonly scheduler = new StreamingScheduler();
  private readonly retired: THREE.Group[] = [];
  private updateElapsed = Number.POSITIVE_INFINITY;
  private residencyRadiusChunks = 5;

  constructor(private readonly createVisual: ChunkVisualFactory, private readonly performance?: PerformanceMonitor) {
    this.root.name = 'amaya-bay-streamed-chunks';
  }

  update(deltaSeconds: number, playerPosition: THREE.Vector3): void {
    this.updateElapsed += deltaSeconds;
    let generationMs = 0;
    if (this.updateElapsed >= 0.3) {
      this.updateElapsed = 0;
      const generationStarted = performance.now();
      this.queueResidency(playerPosition);
      generationMs = performance.now() - generationStarted;
    }
    const commitStarted = performance.now();
    this.scheduler.takeFrameBudget(8, (job) => this.commitJob(job), 1);
    const commitMs = performance.now() - commitStarted;
    const retireStarted = performance.now();
    const retired = this.retired.shift();
    if (retired) disposeGroup(retired);
    this.performance?.recordSystem('streaming-disposal', performance.now() - retireStarted);
    this.recordMetrics(generationMs, commitMs);
  }

  refreshNow(playerPosition: THREE.Vector3): void {
    this.scheduler.clear();
    this.queued.clear();
    this.updateElapsed = Number.POSITIVE_INFINITY;
    this.update(0, playerPosition);
    // Physics callers need the occupied chunk now, even when another
    // queued job won the single-job frame budget.
    const center = worldToChunk({ x: playerPosition.x, z: playerPosition.z });
    const key = chunkKey(center);
    if (this.residents.get(key)?.ring !== 'active' || this.residents.get(key)?.vegetationDetail !== 'near') {
      this.queued.set(key, 'active');
      this.commitJob({ key, x: center.x, z: center.z, ring: 'active', vegetationDetail: 'near', priority: -1 });
      this.recordMetrics(0, 0);
    }
  }

  setResidencyRadiusChunks(radius: number): void {
    const nextRadius = Math.max(3, Math.min(6, Math.round(radius)));
    if (nextRadius === this.residencyRadiusChunks) return;
    this.residencyRadiusChunks = nextRadius;
    this.updateElapsed = Number.POSITIVE_INFINITY;
  }

  dispose(): void {
    for (const resident of this.residents.values()) disposeGroup(resident.group);
    for (const retired of this.retired) disposeGroup(retired);
    this.retired.length = 0;
    this.residents.clear();
    this.queued.clear();
    this.scheduler.clear();
    this.root.clear();
  }

  private queueResidency(playerPosition: THREE.Vector3): void {
    const playerChunk = worldToChunk({ x: playerPosition.x, z: playerPosition.z });
    const required = new Map<string, DesiredChunk>();
    const radius = this.residencyRadiusChunks;
    for (let dz = -radius; dz <= radius; dz += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const x = playerChunk.x + dx;
        const z = playerChunk.z + dz;
        const centerX = (x + 0.5) * CHUNK_SIZE_METRES;
        const centerZ = (z + 0.5) * CHUNK_SIZE_METRES;
        if (Math.abs(centerX) > 520 || Math.abs(centerZ) > 520) continue;
        const ring = residencyRing(chunkDistance(playerChunk, { x, z }));
        if (ring === 'unloaded') continue;
        const vegetationDetail = ring === 'active' && chunkDistance(playerChunk, { x, z }) <= 1 ? 'near' : 'far';
        required.set(chunkKey({ x, z }), { key: chunkKey({ x, z }), x, z, ring, vegetationDetail });
      }
    }

    for (const [key, resident] of this.residents) {
      if (!required.has(key)) {
        this.root.remove(resident.group);
        // Release collision immediately; retire visual GPU resources gradually.
        const release = resident.group.userData.disposeChunk;
        if (typeof release === 'function') release();
        delete resident.group.userData.disposeChunk;
        this.retired.push(resident.group);
        this.residents.delete(key);
      }
    }

    const jobs: StreamingJob[] = [];
    this.queued.clear();
    for (const desired of required.values()) {
      const current = this.residents.get(desired.key);
      if (current?.ring === desired.ring && current.vegetationDetail === desired.vegetationDetail) continue;
      this.queued.set(desired.key, desired.ring);
      const distance = chunkDistance(playerChunk, desired);
      jobs.push({ ...desired, priority: priorityFor(desired.ring, distance, playerChunk, desired) });
    }
    this.scheduler.reconcile(jobs);
  }

  private commitJob(job: StreamingJob): number {
    const started = performance.now();
    const expectedRing = this.queued.get(job.key);
    if (expectedRing !== job.ring) return performance.now() - started;
    const group = this.createVisual(job.x, job.z, job.ring, job.vegetationDetail);
    group.name = `chunk:${job.key}:${job.ring}`;
    const current = this.residents.get(job.key);
    if (current) {
      this.root.remove(current.group);
      disposeGroup(current.group);
    }
    this.root.add(group);
    this.residents.set(job.key, { key: job.key, x: job.x, z: job.z, ring: job.ring, vegetationDetail: job.vegetationDetail, group });
    this.queued.delete(job.key);
    return performance.now() - started;
  }

  private recordMetrics(generationMs: number, commitMs: number): void {
    let active = 0; let visual = 0; let horizon = 0;
    for (const resident of this.residents.values()) {
      if (resident.ring === 'active') active += 1;
      else if (resident.ring === 'visual') visual += 1;
      else horizon += 1;
    }
    this.performance?.recordChunks(active, visual, horizon);
    this.performance?.recordStreaming(this.scheduler.metrics().pendingJobs + this.retired.length, generationMs, commitMs);
  }
}

function priorityFor(ring: Exclude<ResidencyRing, 'unloaded'>, distance: number, player: { x: number; z: number }, chunk: { x: number; z: number }): number {
  const ringWeight = ring === 'active' ? 0 : ring === 'visual' ? 100 : 200;
  const directionBias = (chunk.x - player.x) + (chunk.z - player.z);
  return ringWeight + distance * 10 - directionBias * 0.01;
}

function disposeGroup(root: THREE.Object3D): void {
  const disposeChunk = root.userData.disposeChunk;
  if (typeof disposeChunk === 'function') disposeChunk();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
    if (object instanceof THREE.InstancedMesh) object.dispose();
    if (!object.geometry.userData.togetherShared) object.geometry.dispose();
    const material = object.material;
    if (Array.isArray(material)) material.forEach((entry) => { if (!entry.userData.togetherShared) entry.dispose(); });
    else if (!material.userData.togetherShared) material.dispose();
  });
}
