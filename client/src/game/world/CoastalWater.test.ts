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
