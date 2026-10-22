import * as THREE from 'three';
import { expect, it } from 'vitest';
import { addChunkDressing } from './NeighborhoodDressing';
import { MaterialLibrary } from './MaterialLibrary';
import { disposeGroup } from './WorldStreamer';

it('supports a generated bench seat and back on both sides without changing their heights or footprint', () => {
  const materials = new MaterialLibrary(), root = new THREE.Group();
  try {
    addChunkDressing(root, { buildings: [], props: [{ id: 'supported-seat', kind: 'bench', x: -150, z: 20, rotationY: 0, scale: 1 }] }, 0, 0, 'active', materials);
    const bench = root.getObjectByName('prop:bench:supported-seat') as THREE.Group;
    const wood = materials.get('wood');
    const meshes = bench.children as THREE.Mesh[];
    const woodenParts = meshes.filter(mesh => mesh.material === wood);
    expect(woodenParts.map(mesh => mesh.position.y)).toEqual([0.5, 0.85]);
    const backBounds = new THREE.Box3().setFromObject(woodenParts[1]!);
    const backSize = backBounds.getSize(new THREE.Vector3());
    expect(backSize.y).toBeCloseTo(0.5, 5);
    expect(backSize.z).toBeCloseTo(0.12, 5);
    const supports = meshes.filter(mesh => {
      if (mesh.material === wood) return false;
      mesh.geometry.computeBoundingBox();
      const bounds = mesh.geometry.boundingBox!;
      return bounds.min.y + mesh.position.y <= 0.01 && bounds.max.y + mesh.position.y >= 0.44 - 0.01;
    });
    expect(supports.some(mesh => mesh.position.x < -0.5)).toBe(true);
    expect(supports.some(mesh => mesh.position.x > 0.5)).toBe(true);
    // Rear uprights must connect the otherwise suspended back slat to a
    // grounded support, while staying inside its original plan footprint.
    const backSupports = supports.filter(mesh => {
      const bounds = mesh.geometry.boundingBox!;
      return bounds.max.y + mesh.position.y >= 0.79 && bounds.max.z + mesh.position.z >= 0.13;
    });
    expect(backSupports.some(mesh => mesh.position.x < -0.5)).toBe(true);
    expect(backSupports.some(mesh => mesh.position.x > 0.5)).toBe(true);
    for (const mesh of meshes) {
      mesh.geometry.computeBoundingBox();
      const bounds = mesh.geometry.boundingBox!;
      expect(bounds.min.x + mesh.position.x).toBeGreaterThanOrEqual(-0.851);
      expect(bounds.max.x + mesh.position.x).toBeLessThanOrEqual(0.851);
      expect(bounds.min.z + mesh.position.z).toBeGreaterThanOrEqual(-0.251);
      expect(bounds.max.z + mesh.position.z).toBeLessThanOrEqual(0.631);
    }
  } finally { disposeGroup(root); materials.dispose(); }
});
