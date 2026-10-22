import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { compileStaticMeshesByMaterial, prepareStaticMeshesByMaterial } from './StaticBatchCompiler';

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

  it('partitions transformed geometry into local spatial cells without changing world bounds', () => {
    const root = new THREE.Group();
    root.position.set(300, 2, -180); root.rotation.y = 0.7; root.scale.set(1.2, 1, 0.8);
    const material = new THREE.MeshBasicMaterial();
    for (const offset of [2, 5, 80, 83]) {
      const nested = new THREE.Group();
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1).translate(offset, 0, 3), material);
      nested.add(mesh); root.add(nested);
    }
    const expected = new THREE.Box3().setFromObject(root);
    compileStaticMeshesByMaterial(root, { cellSize: 64 });
    const meshes: THREE.Mesh[] = [];
    root.traverse(object => { if (object instanceof THREE.Mesh) meshes.push(object); });
    expect(meshes).toHaveLength(2);
    expect(meshes.every(mesh => mesh.geometry.boundingBox!.getSize(new THREE.Vector3()).x < 5)).toBe(true);
    const actual = new THREE.Box3().setFromObject(root);
    for (const axis of ['x', 'y', 'z'] as const) {
      expect(actual.min[axis]).toBeCloseTo(expected.min[axis], 4);
      expect(actual.max[axis]).toBeCloseTo(expected.max[axis], 4);
    }
    expect(meshes.reduce((sum, mesh) => sum + mesh.geometry.index!.count, 0)).toBe(144);
  });

  it('releases temporary geometry when spatial bounds preparation is cancelled, retaining shared sources', () => {
    const root = new THREE.Group();
    const source = new THREE.BoxGeometry(1, 1, 1);
    source.userData.togetherShared = true;
    const sourceDisposed = vi.fn(); source.addEventListener('dispose', sourceDisposed);
    const temporaryDisposed = vi.fn();
    const clone = source.clone.bind(source);
    vi.spyOn(source, 'clone').mockImplementation(() => {
      const temporary = clone(); temporary.addEventListener('dispose', temporaryDisposed); return temporary;
    });
    root.add(new THREE.Mesh(source, new THREE.MeshBasicMaterial()));
    const preparation = prepareStaticMeshesByMaterial(root, { cellSize: 64 });
    expect(preparation.next().done).toBe(false);
    preparation.return(root);
    expect(temporaryDisposed).toHaveBeenCalledOnce();
    expect(sourceDisposed).not.toHaveBeenCalled();
    expect(root.children).toHaveLength(1);
  });

  it('keeps small geometry in broad batches when a density threshold is specified', () => {
    const root = new THREE.Group(), material = new THREE.MeshBasicMaterial();
    for (const offset of [2, 5, 80, 83]) root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1).translate(offset, 0, 3), material));
    compileStaticMeshesByMaterial(root, { cellSize: 64, minVertices: 100 });
    expect(root.children).toHaveLength(1);
    expect((root.children[0] as THREE.Mesh).geometry.index!.count).toBe(144);
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
