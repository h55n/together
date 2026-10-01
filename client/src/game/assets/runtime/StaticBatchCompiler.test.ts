import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { compileStaticMeshesByMaterial } from './StaticBatchCompiler';

describe('compileStaticMeshesByMaterial', () => {
  it('collapses compatible meshes into one draw submission per material', () => {
    const material = new THREE.MeshBasicMaterial();
    const root = new THREE.Group();
    const landmark = new THREE.Group();
    landmark.name = 'landmark:test';
    root.add(landmark);
    landmark.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material));
    const second = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), material);
    second.position.x = 3;
    landmark.add(second);

    const result = compileStaticMeshesByMaterial(root);
    let meshCount = 0;
    result.traverse((object) => { if (object instanceof THREE.Mesh) meshCount += 1; });

    expect(meshCount).toBe(1);
    expect(result.getObjectByName('landmark:test')).toBeTruthy();
  });

  it('keeps different materials in separate batches', () => {
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
    root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
    const result = compileStaticMeshesByMaterial(root);
    let meshCount = 0;
    result.traverse((object) => { if (object instanceof THREE.Mesh) meshCount += 1; });
    expect(meshCount).toBe(2);
  });

  it('leaves incompatible singleton batches visible instead of dropping geometry', () => {
    const material = new THREE.MeshBasicMaterial();
    const root = new THREE.Group();
    const withUv = new THREE.BoxGeometry(1, 1, 1);
    const withoutUv = new THREE.BoxGeometry(1, 1, 1);
    withoutUv.deleteAttribute('uv');
    root.add(new THREE.Mesh(withUv, material));
    root.add(new THREE.Mesh(withoutUv, material));

    const result = compileStaticMeshesByMaterial(root);
    let meshCount = 0;
    result.traverse((object) => { if (object instanceof THREE.Mesh) meshCount += 1; });

    expect(meshCount).toBe(2);
  });

  it('still merges the compatible subset when one mesh has a different attribute layout', () => {
    const material = new THREE.MeshBasicMaterial();
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material));
    const second = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), material);
    second.position.x = 3;
    root.add(second);
    const withoutUv = new THREE.BoxGeometry(1, 1, 1);
    withoutUv.deleteAttribute('uv');
    const incompatible = new THREE.Mesh(withoutUv, material);
    incompatible.position.x = 6;
    root.add(incompatible);

    const result = compileStaticMeshesByMaterial(root);
    const meshes: THREE.Mesh[] = [];
    result.traverse((object) => { if (object instanceof THREE.Mesh) meshes.push(object); });

    expect(meshes).toHaveLength(2);
    expect(meshes.some((mesh) => mesh.name.startsWith('static-batch:'))).toBe(true);
  });
});
