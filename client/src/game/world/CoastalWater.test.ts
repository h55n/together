import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { CoastalWater } from './CoastalWater';

it('faces shore foam upward so it is visible from the promenade', () => {
  const scene = new THREE.Scene();
  const water = new CoastalWater(scene, { get: () => new THREE.MeshStandardMaterial() } as never);
  const foam = scene.getObjectByName('coastal-shore-foam') as THREE.Mesh;
  const normals = foam.geometry.getAttribute('normal');
  for (let i = 0; i < normals.count; i += 1) expect(normals.getY(i)).toBeGreaterThan(0.99);
  water.dispose();
});

it('keeps wave time advancing when distant geometry updates are deferred', () => {
  const water = new CoastalWater(new THREE.Scene(), { get: () => new THREE.MeshStandardMaterial() } as never);
  const positions = water.mesh.geometry.getAttribute('position');
  const y = positions.getY(35), x = positions.getX(35), z = positions.getZ(35);
  water.update(2, 0, false);
  expect(positions.getY(35)).toBe(y);
  water.update(0.25, 0);
  expect(positions.getY(35)).toBeCloseTo(Math.sin(x * 0.095 + z * 0.16 + 2.25 * 0.7) * 0.045
    + Math.sin(z * 0.42 - 2.25 * 0.9) * 0.018, 6);
  water.dispose();
});

it('animates waves with analytic normals while preserving the shoreline', () => {
  const water = new CoastalWater(new THREE.Scene(), { get: () => new THREE.MeshStandardMaterial() } as never);
  const positions = water.mesh.geometry.getAttribute('position');
  const x = positions.getX(35), z = positions.getZ(35);
  const recompute = vi.spyOn(water.mesh.geometry, 'computeVertexNormals');
  water.update(0.25, 0.5);
  expect(recompute).not.toHaveBeenCalled();
  expect(positions.getX(35)).toBe(x);
  expect(positions.getZ(35)).toBe(z);
  const a = x * 0.095 + z * 0.16 + 0.25 * 0.7;
  const b = z * 0.42 - 0.25 * 0.9;
  const expected = new THREE.Vector3(-Math.cos(a) * 0.095 * 0.0575, 1,
    -Math.cos(a) * 0.16 * 0.0575 - Math.cos(b) * 0.42 * 0.018).normalize();
  const normal = water.mesh.geometry.getAttribute('normal');
  expect(normal.getX(35)).toBeCloseTo(expected.x, 6);
  expect(normal.getY(35)).toBeCloseTo(expected.y, 6);
  expect(normal.getZ(35)).toBeCloseTo(expected.z, 6);
  water.dispose();
});

it('retains finite surface coordinates after invalid elapsed-time and wetness inputs', () => {
  const water = new CoastalWater(new THREE.Scene(), { get: () => new THREE.MeshStandardMaterial() } as never);
  water.update(Number.NaN, Number.NaN);
  water.update(-1, Number.POSITIVE_INFINITY);
  const positions = water.mesh.geometry.getAttribute('position');
  const normals = water.mesh.geometry.getAttribute('normal');
  for (const index of [0, 35, positions.count - 1]) {
    expect(Number.isFinite(positions.getY(index))).toBe(true);
    expect(Number.isFinite(normals.getY(index))).toBe(true);
  }
  water.update(0.5, 0.25);
  const x = positions.getX(35), z = positions.getZ(35);
  expect(positions.getY(35)).toBeCloseTo(Math.sin(x * 0.095 + z * 0.16 + 0.5 * 0.7) * 0.05125
    + Math.sin(z * 0.42 - 0.5 * 0.9) * 0.018, 6);
  water.dispose();
});

it('preserves wave height and lighting normals across the full surface and changing weather', () => {
  const scene = new THREE.Scene();
  const water = new CoastalWater(scene, { get: () => new THREE.MeshStandardMaterial() } as never);
  const foam = scene.getObjectByName('coastal-shore-foam') as THREE.Mesh;
  let elapsed = 0;
  for (const [delta, wetness] of [[0.016, 0], [0.25, 0.4], [4.5, 1], [0.1, 0]] as const) {
    elapsed += delta; water.update(delta, wetness);
    for (const mesh of [water.mesh, foam]) {
      const positions = mesh.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i += 97) {
        const x = positions.getX(i), z = positions.getZ(i), amplitude = 0.045 + wetness * 0.025;
        const a = x * 0.095 + z * 0.16 + elapsed * 0.7, b = z * 0.42 - elapsed * 0.9;
        expect(positions.getY(i)).toBeCloseTo(Math.sin(a) * amplitude + Math.sin(b) * 0.018 + (mesh === foam ? -0.035 : 0), 6);
        if (mesh === water.mesh) {
          const expected = new THREE.Vector3(-Math.cos(a) * 0.095 * amplitude, 1, -Math.cos(a) * 0.16 * amplitude - Math.cos(b) * 0.42 * 0.018).normalize();
          const normals = mesh.geometry.getAttribute('normal');
          expect(normals.getX(i)).toBeCloseTo(expected.x, 6);
          expect(normals.getY(i)).toBeCloseTo(expected.y, 6);
          expect(normals.getZ(i)).toBeCloseTo(expected.z, 6);
        }
      }
    }
  }
  water.dispose();
});
