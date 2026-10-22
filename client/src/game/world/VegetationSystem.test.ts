import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { VegetationSystem } from './VegetationSystem';

const materialByKey = new Map<string, THREE.MeshStandardMaterial>();
const getMaterial = (key: string) => {
  let material = materialByKey.get(key);
  if (!material) { material = new THREE.MeshStandardMaterial(); materialByKey.set(key, material); }
  return material;
};
const materials = { get: getMaterial } as never;

describe('VegetationSystem', () => {
  it('smooths duplicate leaf-spray normals without changing authored geometry or detail counts', () => {
    const originalClone = THREE.BufferGeometry.prototype.clone;
    const samples: Array<{ geometry: THREE.BufferGeometry; radius: number }> = [];
    const clone = vi.spyOn(THREE.BufferGeometry.prototype, 'clone').mockImplementation(function(this: THREE.BufferGeometry) {
      if (this instanceof THREE.IcosahedronGeometry && this.parameters.detail === 0) {
        samples.push({ geometry: originalClone.call(this), radius: this.parameters.radius });
      }
      return originalClone.call(this);
    });
    try {
      const vegetation = new VegetationSystem({ get: getMaterial } as never);
      vegetation.createTree({ species: 'rain_tree', seed: 2, lod: 'near' });
      const nearCount = samples.length;
      vegetation.createTree({ species: 'rain_tree', seed: 2, lod: 'far' });
      expect(nearCount).toBe(13 * 18);
      expect(samples.length - nearCount).toBe(13 * 6);
      const radial = new THREE.Vector3(), normal = new THREE.Vector3();
      for (const { geometry, radius } of samples) {
        const authored = new THREE.IcosahedronGeometry(radius, 0);
        try {
          const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal');
          expect(Array.from(positions.array)).toEqual(Array.from(authored.getAttribute('position').array));
          expect(geometry.index?.array).toEqual(authored.index?.array);
          expect(normals.count).toBe(positions.count);
          for (let i = 0; i < positions.count; i += 1) {
            radial.fromBufferAttribute(positions, i).normalize();
            normal.fromBufferAttribute(normals, i);
            expect(normal.length()).toBeCloseTo(1, 5);
            expect(normal.dot(radial)).toBeGreaterThan(0.99999);
          }
        } finally { authored.dispose(); }
      }
    } finally { clone.mockRestore(); for (const sample of samples) sample.geometry.dispose(); }
  });
  it('can cancel cold tree preparation without publishing a partial shared asset', () => {
    const freshMaterials = { get: getMaterial } as never;
    const vegetation = new VegetationSystem(freshMaterials);
    const preparation = vegetation.prepareTree({ species: 'rain_tree', seed: 3 });
    expect(preparation.next().done).toBe(false);
    expect(vegetation.metrics().compiledAssets).toBe(0);
    preparation.return(undefined as never);
    expect(vegetation.metrics().compiledAssets).toBe(0);
    const retry = vegetation.prepareTree({ species: 'rain_tree', seed: 3 });
    let step = retry.next();
    while (!step.done) step = retry.next();
    expect(vegetation.metrics().compiledAssets).toBe(1);
    expect(step.value.children).toHaveLength(2);
  });
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

  it('keeps whole trees in tighter spatial batches while preserving their geometry and shared source ownership', () => {
    const vegetation = new VegetationSystem(materials);
    const placements = [2, 5, 80, 83].map(x => ({ species: 'rain_tree' as const, seed: 1, position: { x, y: 0, z: 3 } }));
    const baseline = vegetation.createTreeCluster(placements, true);
    const source = vegetation.createTree({ species: 'rain_tree', seed: 1 });
    const disposed = vi.fn();
    for (const child of source.children as THREE.Mesh[]) child.geometry.addEventListener('dispose', disposed);
    const cluster = vegetation.createTreeCluster(placements, true, { cellSize: 64 });
    expect(cluster.children).toHaveLength(4);
    const vertexCount = (root: THREE.Group) => (root.children as THREE.Mesh[]).reduce((sum, mesh) => sum + mesh.geometry.attributes.position!.count, 0);
    expect(vertexCount(cluster)).toBe(vertexCount(baseline));
    const bounds = new THREE.Box3().setFromObject(cluster), expected = new THREE.Box3().setFromObject(baseline);
    expect(bounds.min.distanceTo(expected.min)).toBeLessThan(0.0001);
    expect(bounds.max.distanceTo(expected.max)).toBeLessThan(0.0001);
    for (const mesh of cluster.children as THREE.Mesh[]) {
      expect(mesh.geometry.boundingBox!.getSize(new THREE.Vector3()).x).toBeLessThan(20);
      mesh.geometry.dispose();
    }
    expect(disposed).not.toHaveBeenCalled();
  });

  it('splits dense crowns while keeping their sparse trunks in one batch', () => {
    const vegetation = new VegetationSystem(materials);
    const placements = [2, 5, 80, 83].map(x => ({ species: 'rain_tree' as const, seed: 1, position: { x, y: 0, z: 3 } }));
    const cluster = vegetation.createTreeCluster(placements, true, { cellSize: 64, minVertices: 8192 });
    const meshes = cluster.children as THREE.Mesh[];
    expect(meshes).toHaveLength(3);
    expect(meshes.filter(mesh => mesh.geometry.hasAttribute('color'))).toHaveLength(2);
    expect(meshes.filter(mesh => !mesh.geometry.hasAttribute('color'))).toHaveLength(1);
  });

  it('batches mixed indexed and non-indexed species without Three.js merge errors', () => {
    const vegetation = new VegetationSystem(materials);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const cluster = vegetation.createTreeCluster([
        { species: 'rain_tree', seed: 11, scale: 1, position: { x: 0, y: 0, z: 0 } },
        { species: 'palm', seed: 22, scale: 1, position: { x: 6, y: 0, z: 0 } },
        { species: 'ornamental', seed: 33, scale: 1, position: { x: -6, y: 0, z: 0 } },
      ], true);

      expect(consoleError).not.toHaveBeenCalled();
      expect(cluster.children.length).toBeGreaterThan(0);
      expect(cluster.children.every((child) => child.name.startsWith('static-batch:vegetation:'))).toBe(true);
    } finally {
      consoleError.mockRestore();
    }
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
