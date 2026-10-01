import * as THREE from 'three';
import { expect, it } from 'vitest';
import { instanceSharedMeshes } from './SharedMeshInstancer';

it('instances shared placements without copying geometry or losing nested transforms', () => {
  const root = new THREE.Group(); root.position.set(100, 0, -50);
  const geometry = new THREE.BoxGeometry(); geometry.userData.togetherShared = true;
  const material = new THREE.MeshStandardMaterial();
  for (const x of [2, 5, 8]) {
    const placement = new THREE.Group(); placement.position.set(x, 1, 3); placement.scale.setScalar(2);
    const mesh = new THREE.Mesh(geometry, material); mesh.position.y = 4; mesh.castShadow = true;
    placement.add(mesh); root.add(placement);
  }
  instanceSharedMeshes(root);
  const batch = root.children.find(child => child instanceof THREE.InstancedMesh) as THREE.InstancedMesh;
  expect(batch).toBeDefined(); expect(batch.count).toBe(3); expect(batch.geometry).toBe(geometry);
  expect(batch.castShadow).toBe(true);
  const matrix = new THREE.Matrix4(); batch.getMatrixAt(1, matrix);
  expect(new THREE.Vector3().setFromMatrixPosition(matrix).toArray()).toEqual([5, 9, 3]);
  expect(batch.boundingSphere).not.toBeNull();
  expect(geometry.userData.togetherShared).toBe(true);
});

it('keeps unique geometry and different shadow policies separate', () => {
  const root = new THREE.Group();
  const geometry = new THREE.BoxGeometry(); geometry.userData.togetherShared = true;
  const material = new THREE.MeshStandardMaterial();
  const first = new THREE.Mesh(geometry, material); first.castShadow = true;
  const second = new THREE.Mesh(geometry, material);
  const unique = new THREE.Mesh(new THREE.BoxGeometry(), material);
  root.add(first, second, unique);
  instanceSharedMeshes(root);
  expect(root.children).toEqual([first, second, unique]);
});
