import * as THREE from 'three';
import { CHUNK_SIZE_METRES, chunkDistance, chunkKey, residencyRing, worldToChunk, type ResidencyRing } from '@together/shared';
import type { PerformanceMonitor } from '../debug/PerformanceMonitor';

export type ChunkVisualFactory = (chunkX: number, chunkZ: number, ring: Exclude<ResidencyRing, 'unloaded'>) => THREE.Group;

type ResidentChunk = {
  key: string;
  x: number;
  z: number;
  ring: Exclude<ResidencyRing, 'unloaded'>;
  group: THREE.Group;
};

export class WorldStreamer {
  readonly root = new THREE.Group();
  private readonly residents = new Map<string, ResidentChunk>();
  private updateElapsed = Number.POSITIVE_INFINITY;
  private residencyRadiusChunks = 5;

  constructor(private readonly createVisual: ChunkVisualFactory, private readonly performance?: PerformanceMonitor) {
    this.root.name = 'amaya-bay-streamed-chunks';
  }

  update(deltaSeconds: number, playerPosition: THREE.Vector3): void {
    this.updateElapsed += deltaSeconds;
    if (this.updateElapsed < 0.3) return;
    this.updateElapsed = 0;

    const playerChunk = worldToChunk({ x: playerPosition.x, z: playerPosition.z });
    const required = new Map<string, { x: number; z: number; ring: Exclude<ResidencyRing, 'unloaded'> }>();
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
        required.set(chunkKey({ x, z }), { x, z, ring });
      }
    }

    for (const [key, resident] of this.residents) {
      if (!required.has(key)) {
        this.root.remove(resident.group);
        disposeGroup(resident.group);
        this.residents.delete(key);
      }
    }

    for (const [key, next] of required) {
      const current = this.residents.get(key);
      if (current?.ring === next.ring) continue;
      if (current) {
        this.root.remove(current.group);
        disposeGroup(current.group);
      }
      const group = this.createVisual(next.x, next.z, next.ring);
      group.name = `chunk:${key}:${next.ring}`;
      this.root.add(group);
      this.residents.set(key, { key, ...next, group });
    }

    if (this.performance) {
      let active = 0; let visual = 0; let horizon = 0;
      for (const resident of this.residents.values()) {
        if (resident.ring === 'active') active += 1;
        else if (resident.ring === 'visual') visual += 1;
        else horizon += 1;
      }
      this.performance.recordChunks(active, visual, horizon);
    }
  }

  setResidencyRadiusChunks(radius: number): void {
    this.residencyRadiusChunks = Math.max(3, Math.min(6, Math.round(radius)));
    this.updateElapsed = Number.POSITIVE_INFINITY;
  }

  dispose(): void {
    for (const resident of this.residents.values()) disposeGroup(resident.group);
    this.residents.clear();
    this.root.clear();
  }
}

function disposeGroup(root: THREE.Object3D): void {
  const disposeChunk = root.userData.disposeChunk;
  if (typeof disposeChunk === 'function') disposeChunk();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
    object.geometry.dispose();
    const material = object.material;
    if (Array.isArray(material)) material.forEach((entry) => { if (!entry.userData.togetherShared) entry.dispose(); });
    else if (!material.userData.togetherShared) material.dispose();
  });
}
