export const CHUNK_SIZE_METRES = 128;

export type ChunkCoordinate = { x: number; z: number };
export type WorldXZ = { x: number; z: number };
export type ResidencyRing = 'active' | 'visual' | 'horizon' | 'unloaded';

export function worldToChunk(position: WorldXZ): ChunkCoordinate {
  return {
    x: Math.floor(position.x / CHUNK_SIZE_METRES),
    z: Math.floor(position.z / CHUNK_SIZE_METRES),
  };
}

export function chunkDistance(a: ChunkCoordinate, b: ChunkCoordinate): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z));
}

export function residencyRing(distance: number): ResidencyRing {
  if (distance <= 2) return 'active';
  if (distance <= 4) return 'visual';
  if (distance <= 6) return 'horizon';
  return 'unloaded';
}

export function chunkKey(chunk: ChunkCoordinate): string {
  return `${chunk.x}:${chunk.z}`;
}
