import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import type { BuildingLot } from '@together/shared';
import { addChunkDressing } from './NeighborhoodDressing';
import { MaterialLibrary } from './MaterialLibrary';

const lot: BuildingLot = { id: 'frontage-test', x: 0, z: 0, width: 8, depth: 12, height: 7.2, rotationY: Math.PI / 4, style: 'pg_veranda', facadeLayers: 4, balconyCount: 1 };

it('aligns building collision with its rotated street-facing facade', () => {
  const materials = new MaterialLibrary();
  const createFixedCuboid = vi.fn((_position: unknown, _halfExtents: unknown, _yaw?: number) => ({}));
  addChunkDressing(new THREE.Group(), { buildings: [lot], props: [] }, -440, 420, 'active', materials, { createFixedCuboid, removeCollider: vi.fn() } as never);
  expect(createFixedCuboid.mock.calls[0]?.[2]).toBe(lot.rotationY + Math.PI / 2);
  materials.dispose();
});

it('reuses compiled facade geometry for equal building dimensions without sharing placement transforms', () => {
  const materials = new MaterialLibrary();
  const first = new THREE.Group(), second = new THREE.Group();
  addChunkDressing(first, { buildings: [lot], props: [] }, -440, 420, 'active', materials);
  addChunkDressing(second, { buildings: [{ ...lot, id: 'second' }], props: [] }, -420, 420, 'active', materials);
  const meshA = first.getObjectByProperty('isMesh', true) as THREE.Mesh;
  const meshB = second.getObjectByProperty('isMesh', true) as THREE.Mesh;
  expect(meshA.geometry === meshB.geometry).toBe(true);
  const meshes: THREE.Mesh[] = [];
  first.traverse(object => { if (object instanceof THREE.Mesh) meshes.push(object); });
  expect(meshes.length).toBeLessThanOrEqual(12);
  expect(first.children[0]?.position.x).not.toBe(second.children[0]?.position.x);
  materials.dispose();
});
