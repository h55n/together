import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { MaterialLibrary } from './MaterialLibrary';
import * as chunkFactoryModule from './AmayaBayChunkFactory';
import type { ChunkVisualFactory } from './WorldStreamer';
import { disposeGroup } from './WorldStreamer';
import { PerformanceMonitor } from '../debug/PerformanceMonitor';
import { CHUNK_SIZE_METRES } from '@together/shared';

const { createAmayaBayChunkFactory } = chunkFactoryModule;

type BoundaryCuboid = {
  center: { x: number; y: number; z: number };
  halfExtents: { x: number; y: number; z: number };
};

describe('createAmayaBayChunkFactory', () => {
  it('keeps ground texture scale and phase continuous across chunk seams and detail rings', () => {
    const materials = new MaterialLibrary();
    const factory = createAmayaBayChunkFactory(materials);
    const edgeSamples: number[][] = [];
    try {
      for (const ring of ['active', 'visual', 'horizon'] as const) {
        for (const chunkX of [-1, 0]) {
          const chunk = factory(chunkX, 0, ring, 'far');
          try {
            const terrain = chunk.children[0] as THREE.Mesh;
            const positions = terrain.geometry.getAttribute('position');
            const uv = terrain.geometry.getAttribute('uv');
            expect(uv.count).toBe(positions.count);
            const samples: number[] = [];
            for (let i = 0; i < positions.count; i += 1) {
              const wx = terrain.position.x + positions.getX(i);
              const wz = terrain.position.z + positions.getZ(i);
              expect(uv.getX(i)).toBeCloseTo(wx / 16, 5);
              expect(uv.getY(i)).toBeCloseTo(wz / 16, 5);
              if (wx === 0 && (wz === 0 || wz === CHUNK_SIZE_METRES)) {
                samples.push(uv.getX(i), uv.getY(i));
              }
            }
            expect(samples).toHaveLength(4);
            edgeSamples.push(samples);
            // Repeating eight times per 16 metres yields a two-metre tile,
            // matching the authored road/sidewalk texture scale.
            expect((terrain.material as THREE.MeshStandardMaterial).map?.repeat.x).toBe(8);
          } finally { disposeGroup(chunk); }
        }
      }
      for (const samples of edgeSamples) expect(samples).toEqual(edgeSamples[0]);
    } finally { materials.dispose(); }
  // Six complete chunks exercise every detail ring; this is a correctness
  // regression, while browser benchmarks separately enforce frame cadence.
  }, 15_000);
  it('bounds roadside vegetation draw submissions while retaining world-space planting', () => {
    const materials = new MaterialLibrary();
    const factory = createAmayaBayChunkFactory(materials);
    const root = factory(-2, 1, 'active', 'far');
    try {
      const roadside = root.getObjectByName('street-planting')!;
      const meshes: THREE.Mesh[] = [];
      roadside.traverse(object => { if (object instanceof THREE.Mesh) meshes.push(object); });
      expect(meshes.length).toBeGreaterThan(0);
      expect(meshes.length).toBeLessThanOrEqual(8);
      const bounds = new THREE.Box3().setFromObject(roadside);
      expect(Number.isFinite(bounds.min.x)).toBe(true);
      expect(bounds.max.x - bounds.min.x).toBeGreaterThan(1);
    } finally { disposeGroup(root); materials.dispose(); }
  });
  it('discards later construction stages without disposing cached shared geometry', () => {
    const materials = new MaterialLibrary();
    const disposed: THREE.BufferGeometry[] = [];
    const originalDispose = THREE.BufferGeometry.prototype.dispose;
    const spy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose').mockImplementation(function(this: THREE.BufferGeometry) {
      disposed.push(this); originalDispose.call(this);
    });
    try {
      for (const extraSteps of [0, 100]) {
        const monitor = new PerformanceMonitor();
        const factory = createAmayaBayChunkFactory(materials, undefined, monitor);
        const iterator = factory.prepare!(0, 0, 'active');
        let step = iterator.next();
        while (!step.done && !('chunk-dressing-merge' in monitor.read().systemTimings)) step = iterator.next();
        expect(step.done).toBe(false);
        for (let i = 0; i < extraSteps && !step.done; i++) step = iterator.next();
        expect(step.done).toBe(false);
        iterator.return?.();
        expect(disposed.every(geometry => !geometry.userData.togetherShared)).toBe(true);
      }
      const chunk = createAmayaBayChunkFactory(materials)(0, 0, 'active');
      expect(chunk.getObjectByName('chunk-vegetation')).toBeDefined();
      disposeGroup(chunk);
      expect(disposed.every(geometry => !geometry.userData.togetherShared)).toBe(true);
    } finally { spy.mockRestore(); materials.dispose(); }
  });

  it('cleans earlier colliders when activation fails part way through', () => {
    const materials = new MaterialLibrary();
    const first = {};
    const removeCollider = vi.fn();
    const physics = { createFixedCuboid: vi.fn().mockReturnValueOnce(first).mockImplementation(() => { throw new Error('Collider allocation failed'); }), createFixedTrimesh: vi.fn(), removeCollider } as unknown as PhysicsWorld;
    try {
      const iterator = createAmayaBayChunkFactory(materials, physics).prepare!(0, 0, 'active');
      let step = iterator.next();
      while (!step.done) step = iterator.next();
      const chunk = step.value!;
      expect(() => chunk.userData.activateChunk()).toThrow('Collider allocation failed');
      disposeGroup(chunk);
      expect(removeCollider).toHaveBeenCalledExactlyOnceWith(first);
    } finally { materials.dispose(); }
  });
  it('prepares in stages without activating invisible collision and can discard partial terrain', () => {
    const materials = new MaterialLibrary();
    const physics = { createFixedCuboid: vi.fn(), createFixedTrimesh: vi.fn(), removeCollider: vi.fn() } as unknown as PhysicsWorld;
    try {
      const factory = createAmayaBayChunkFactory(materials, physics) as ChunkVisualFactory;
      expect(factory.prepare).toBeTypeOf('function');
      const dispose = vi.spyOn(materials.get('grass'), 'dispose');
      const disposeGeometry = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
      const iterator = factory.prepare!(0, 0, 'active');
      expect(iterator.next().done).toBe(false);
      expect(physics.createFixedCuboid).not.toHaveBeenCalled();
      expect(physics.createFixedTrimesh).not.toHaveBeenCalled();
      iterator.return?.();
      expect(disposeGeometry).toHaveBeenCalledTimes(1);
      expect(dispose).not.toHaveBeenCalled();
      expect(iterator.next().done).toBe(true);
      disposeGeometry.mockRestore();
    } finally { materials.dispose(); }
  });
  it('activates completed staged collision only on commit and releases it once', () => {
    const materials = new MaterialLibrary();
    const physics = { createFixedCuboid: vi.fn(() => ({})), createFixedTrimesh: vi.fn(() => ({})), removeCollider: vi.fn() } as unknown as PhysicsWorld;
    try {
      const factory = createAmayaBayChunkFactory(materials, physics) as ChunkVisualFactory;
      const iterator = factory.prepare!(0, 0, 'active');
      let step = iterator.next();
      let stages = 0;
      while (!step.done) { stages += 1; step = iterator.next(); }
      expect(stages).toBeGreaterThan(5);
      expect(physics.createFixedTrimesh).not.toHaveBeenCalled();
      const chunk = step.value!;
      chunk.userData.activateChunk();
      chunk.userData.activateChunk();
      expect(physics.createFixedTrimesh).toHaveBeenCalledTimes(1);
      const count = (physics.createFixedCuboid as ReturnType<typeof vi.fn>).mock.calls.length + 1;
      chunk.userData.disposeChunk();
      chunk.userData.disposeChunk();
      expect(physics.removeCollider).toHaveBeenCalledTimes(count);
    } finally { materials.dispose(); }
  });
  it('gives active visual terrain a matching disposable physics collider', () => {
    const terrainCollider = { kind: 'terrain' };
    let buildingIndex = 0;
    const buildingColliders: Array<{ kind: string; index: number }> = [];
    const createFixedTrimesh = vi.fn((_vertices: Float32Array, _indices: Uint32Array) => terrainCollider);
    const removeCollider = vi.fn();
    const physics = {
      createFixedCuboid: vi.fn(() => {
        const collider = { kind: 'building', index: buildingIndex };
        buildingIndex += 1;
        buildingColliders.push(collider);
        return collider;
      }),
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
      expect(buildingColliders.length).toBeGreaterThan(0);

      const disposeChunk = chunk.userData.disposeChunk as (() => void) | undefined;
      expect(disposeChunk).toBeTypeOf('function');
      disposeChunk?.();
      expect(removeCollider).toHaveBeenCalledWith(terrainCollider);
      for (const collider of buildingColliders) expect(removeCollider).toHaveBeenCalledWith(collider);
    } finally {
      materials.dispose();
    }
  });

  it('compiles streamed structural dressing into compatible static batches', () => {
    const materials = new MaterialLibrary();
    try {
      const createChunk = createAmayaBayChunkFactory(materials);
      const chunk = createChunk(0, 0, 'visual');
      const staticDressing = chunk.getObjectByName('chunk-static-dressing');

      expect(staticDressing).toBeTruthy();
      expect(staticDressing?.children.some((child) => child.name.startsWith('static-batch:'))).toBe(true);
    } finally {
      materials.dispose();
    }
  });

  it('renders the shared world-space surface network in traversable chunks', () => {
    const materials = new MaterialLibrary();
    try {
      const createChunk = createAmayaBayChunkFactory(materials);
      const chunk = createChunk(-1, 0, 'visual');
      const surfaces = chunk.getObjectByName('chunk-surface-network');

      expect(surfaces).toBeTruthy();
      expect(surfaces?.children.some((child) => child.name.startsWith('static-batch:'))).toBe(true);
    } finally {
      materials.dispose();
    }
  });

  it('compiles placed vegetation into per-chunk static material batches', () => {
    const materials = new MaterialLibrary();
    try {
      const createChunk = createAmayaBayChunkFactory(materials);
      const chunk = createChunk(0, 0, 'visual');
      const vegetation = chunk.getObjectByName('chunk-vegetation');

      expect(vegetation).toBeTruthy();
      expect(vegetation?.children.some((child) => child.name.startsWith('static-batch:'))).toBe(true);
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
