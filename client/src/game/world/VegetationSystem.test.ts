import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { VegetationSystem } from './VegetationSystem';

const materialByKey = new Map<string, THREE.MeshStandardMaterial>();
const materials = { get: (key: string) => {
  let material = materialByKey.get(key);
  if (!material) { material = new THREE.MeshStandardMaterial(); materialByKey.set(key, material); }
  return material;
} } as never;

describe('VegetationSystem', () => {
  it('reuses compiled geometry for deterministic tree variants', () => {
    const vegetation = new VegetationSystem(materials);
    const first = vegetation.createTree({ species: 'rain_tree', seed: 1 });
    const second = vegetation.createTree({ species: 'rain_tree', seed: 9 });
    const firstGeometry = first.getObjectByProperty('isMesh', true) as THREE.Mesh;
    const secondGeometry = second.getObjectByProperty('isMesh', true) as THREE.Mesh;
    expect(firstGeometry.geometry).toBe(secondGeometry.geometry);
    expect(firstGeometry.geometry.userData.togetherShared).toBe(true);
  });

  it('reports one compiled registry asset for a reused variant', () => {
    const vegetation = new VegetationSystem(materials);
    vegetation.createTree({ species: 'rain_tree', seed: 1 });
    vegetation.createTree({ species: 'rain_tree', seed: 9 });

    expect(vegetation.metrics()).toMatchObject({ compiledAssets: 1 });
  });

  it('caps procedural geometry variants per species so first traversal does not compile every seed shape', () => {
    const vegetation = new VegetationSystem(materials);
    for (let seed = 0; seed < 8; seed += 1) vegetation.createTree({ species: 'rain_tree', seed });

    expect(vegetation.metrics().compiledAssets).toBeLessThanOrEqual(4);
  });

  it('builds a material-grouped tree cluster directly from placements', () => {
    const vegetation = new VegetationSystem(materials);
    const cluster = vegetation.createTreeCluster([
      { species: 'rain_tree', seed: 1, scale: 0.9, position: { x: 2, y: 0.4, z: 3 } },
      { species: 'rain_tree', seed: 5, scale: 1.1, position: { x: 7, y: 0.6, z: 8 } },
      { species: 'ficus', seed: 2, scale: 0.85, position: { x: -2, y: 0.2, z: 4 } },
    ], true);

    expect(cluster.children.length).toBeGreaterThan(0);
    expect(cluster.children.every((child) => child instanceof THREE.Mesh)).toBe(true);
    expect(cluster.children.length).toBeLessThanOrEqual(4);
    const firstMesh = cluster.children[0] as THREE.Mesh;
    expect(firstMesh.castShadow).toBe(true);
  });

  it('compiles a detailed tree variant into a small material-grouped runtime mesh set', () => {
    const vegetation = new VegetationSystem(materials);
    const tree = vegetation.createTree({ species: 'rain_tree', seed: 7 });
    let meshCount = 0;
    tree.traverse((object) => { if (object instanceof THREE.Mesh) meshCount += 1; });

    expect(meshCount).toBeLessThanOrEqual(4);
  });
});
