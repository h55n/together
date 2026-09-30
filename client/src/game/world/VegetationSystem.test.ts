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

  it('compiles a detailed tree variant into a small material-grouped runtime mesh set', () => {
    const vegetation = new VegetationSystem(materials);
    const tree = vegetation.createTree({ species: 'rain_tree', seed: 7 });
    let meshCount = 0;
    tree.traverse((object) => { if (object instanceof THREE.Mesh) meshCount += 1; });

    expect(meshCount).toBeLessThanOrEqual(4);
  });

  it('packs leaf and flower colors into one shared foliage draw per species', () => {
    const vegetation = new VegetationSystem(materials);
    for (const species of ['rain_tree', 'gulmohar', 'ficus', 'palm', 'ornamental'] as const) {
      const tree = vegetation.createTree({ species, seed: 2 });
      const meshes = tree.children as THREE.Mesh[];
      expect(meshes).toHaveLength(2);
      const foliage = meshes.find(mesh => mesh.geometry.hasAttribute('color'))!;
      expect(foliage).toBeDefined();
      const colors = foliage.geometry.getAttribute('color');
      expect(new Set(Array.from(colors.array)).size).toBeGreaterThan(3);
    }
  });

  it('reduces distant canopy geometry without changing the tree silhouette bounds', () => {
    const vegetation = new VegetationSystem(materials);
    const near = vegetation.createTree({ species: 'rain_tree', seed: 4 });
    const far = vegetation.createTree({ species: 'rain_tree', seed: 4, lod: 'far' });
    const vertices = (root: THREE.Group) => root.children.reduce((sum, mesh) => sum + (mesh as THREE.Mesh).geometry.getAttribute('position').count, 0);
    expect(vertices(far)).toBeLessThan(vertices(near) * 0.55);
    const nearSize = new THREE.Box3().setFromObject(near).getSize(new THREE.Vector3());
    const farSize = new THREE.Box3().setFromObject(far).getSize(new THREE.Vector3());
    expect(farSize.distanceTo(nearSize)).toBeLessThan(1.5);
    expect((far.children[1] as THREE.Mesh).geometry).not.toBe((near.children[1] as THREE.Mesh).geometry);
  });

  it('shares shrub geometry across repeated placements and applies scale on the root', () => {
    const vegetation = new VegetationSystem(materials);
    const first = vegetation.createShrub(3, 0.8);
    const second = vegetation.createShrub(27, 1.2);
    expect((first.children[0] as THREE.Mesh).geometry === (second.children[0] as THREE.Mesh).geometry).toBe(true);
    expect(first.scale.x).toBe(0.8); expect(second.scale.x).toBe(1.2);
  });
});
