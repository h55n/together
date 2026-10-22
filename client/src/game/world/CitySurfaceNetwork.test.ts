import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { MaterialLibrary } from './MaterialLibrary';
import { createChunkSurfaceNetwork, prepareChunkSurfaceNetwork } from './CitySurfaceNetwork';
import { disposeGroup } from './WorldStreamer';

describe('staged roads and sidewalks', () => {
  it('samples paving and asphalt in world space across road pieces and caps', () => {
    const materials = new MaterialLibrary();
    const root = createChunkSurfaceNetwork(-1, 0, materials);
    try {
      let sampled = 0;
      root.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        const geometry = object.geometry, position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
        expect(uv, 'textured surface must have texture coordinates').toBeDefined();
        expect(uv.count).toBe(position.count);
        for (let index = 0; index < position.count; index++) {
          expect(uv.getX(index)).toBeCloseTo(position.getX(index) / 16, 5);
          expect(uv.getY(index)).toBeCloseTo(position.getZ(index) / 16, 5);
        }
        sampled++;
      });
      expect(sampled).toBeGreaterThan(0);
    } finally { disposeGroup(root); materials.dispose(); }
  });
  it.each([
    [-1, 0, 506, 792, 'c4e155d09ae2fd2589e2e73078f694505f7a07e8af1cb80e4fa30ab242607e23'],
    [0, -3, 568, 1050, '9d6108e8141063cdf5def6d8ee2514fe4364d36a6bf542b478be823ff82ecb3b'],
  ] as const)('preserves recorded road geometry in chunk %i,%i', (x, z, expectedVertices, expectedIndices, digest) => {
    const materials = new MaterialLibrary();
    const iterator = prepareChunkSurfaceNetwork(x, z, materials);
    const normals = vi.spyOn(THREE.BufferGeometry.prototype, 'computeVertexNormals');
    let step;
    try {
      do {
        const before = normals.mock.calls.length;
        step = iterator.next();
        expect(normals.mock.calls.length - before).toBeLessThanOrEqual(6);
      } while (!step.done);
      const hash = createHash('sha256'); let vertices = 0, indices = 0;
      step.value.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        const geometry = object.geometry;
        vertices += geometry.getAttribute('position').count; indices += geometry.index?.count ?? 0;
        // The original position/normal/index buffers remain the geometry reference as UVs are added.
        for (const name of ['normal', 'position']) hash.update(Buffer.from(geometry.getAttribute(name).array.buffer));
        if (geometry.index) hash.update(Buffer.from(geometry.index.array.buffer));
      });
      expect([vertices, indices, hash.digest('hex')]).toEqual([expectedVertices, expectedIndices, digest]);
      disposeGroup(step.value);
    } finally { iterator.return(new THREE.Group()); normals.mockRestore(); materials.dispose(); }
  });

  it.each([1, 30, 80])('cancels after %i preparation steps without leaking geometry or releasing borrowed materials', count => {
    const materials = new MaterialLibrary();
    const released = new Map<THREE.BufferGeometry, number>();
    const dispose = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose').mockImplementation(function(this: THREE.BufferGeometry) {
      released.set(this, (released.get(this) ?? 0) + 1);
    });
    const materialDispose = vi.spyOn(THREE.Material.prototype, 'dispose');
    const iterator = prepareChunkSurfaceNetwork(-1, 0, materials);
    try {
      for (let step = 0; step < count; step++) expect(iterator.next().done).toBe(false);
      iterator.return(new THREE.Group());
      expect(released.size).toBeGreaterThan(0);
      expect([...released.values()].every(value => value === 1)).toBe(true);
      expect(materialDispose).not.toHaveBeenCalled();
    } finally { iterator.return(new THREE.Group()); dispose.mockRestore(); materialDispose.mockRestore(); materials.dispose(); }
  });
});
