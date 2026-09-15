import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { VegetationSystem } from './VegetationSystem';

const materials = { get: () => new THREE.MeshStandardMaterial() } as never;

describe('VegetationSystem', () => {
  it('reuses compiled geometry for deterministic tree variants', () => {
    const vegetation = new VegetationSystem(materials);
    const first = vegetation.createTree({ species: 'rain_tree', seed: 1 });
    const second = vegetation.createTree({ species: 'rain_tree', seed: 9 });
    const firstGeometry = first.getObjectByProperty('isMesh', true) as THREE.Mesh;
    const secondGeometry = second.getObjectByProperty('isMesh', true) as THREE.Mesh;
    expect(firstGeometry.geometry).toBe(secondGeometry.geometry);
  });
});
