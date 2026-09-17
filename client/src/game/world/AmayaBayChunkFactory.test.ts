import { describe, expect, it, vi } from 'vitest';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { MaterialLibrary } from './MaterialLibrary';
import * as chunkFactoryModule from './AmayaBayChunkFactory';

const { createAmayaBayChunkFactory } = chunkFactoryModule;

type BoundaryCuboid = {
  center: { x: number; y: number; z: number };
  halfExtents: { x: number; y: number; z: number };
};

describe('createAmayaBayChunkFactory', () => {
  it('gives active visual terrain a matching disposable physics collider', () => {
    const terrainCollider = { kind: 'terrain' };
    const createFixedTrimesh = vi.fn((_vertices: Float32Array, _indices: Uint32Array) => terrainCollider);
    const removeCollider = vi.fn();
    const physics = {
      createFixedCuboid: vi.fn(() => ({ kind: 'building' })),
      createFixedTrimesh,
      removeCollider,
    } as unknown as PhysicsWorld;
    const materials = new MaterialLibrary();

    try {
      const createChunk = createAmayaBayChunkFactory(materials, physics);
      const chunk = createChunk(0, 0, 'active');

      expect(createFixedTrimesh).toHaveBeenCalledTimes(1);
      const [vertices, indices] = createFixedTrimesh.mock.calls[0] ?? [];
      expect(vertices).toBeInstanceOf(Float32Array);
      expect(indices).toBeInstanceOf(Uint32Array);
      expect(vertices?.length).toBeGreaterThan(0);
      expect(indices?.length).toBeGreaterThan(0);

      const disposeChunk = chunk.userData.disposeChunk as (() => void) | undefined;
      expect(disposeChunk).toBeTypeOf('function');
      disposeChunk?.();
      expect(removeCollider).toHaveBeenCalledWith(terrainCollider);
    } finally {
      materials.dispose();
    }
  });

  it('uses perimeter walls for static city safety instead of a flat world floor', () => {
    const boundaryLayout = (chunkFactoryModule as unknown as {
      amayaBayBoundaryCuboids?: () => readonly BoundaryCuboid[];
    }).amayaBayBoundaryCuboids;

    expect(boundaryLayout).toBeTypeOf('function');
    const colliders = boundaryLayout?.() ?? [];
    expect(colliders).toHaveLength(4);
    expect(colliders.every(({ halfExtents }) => halfExtents.x <= 1 || halfExtents.z <= 1)).toBe(true);
    expect(colliders.every(({ halfExtents }) => halfExtents.y >= 25)).toBe(true);
    expect(colliders.every(({ center }) => Math.abs(center.x) >= 449 || Math.abs(center.z) >= 449)).toBe(true);
  });
});
