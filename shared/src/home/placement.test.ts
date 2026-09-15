import assert from 'node:assert/strict';
import test from 'node:test';
import { validateFurniturePlacement } from './placement.js';

const room = { minX: 0, maxX: 5, minZ: 0, maxZ: 4 };
const footprint = { width: 1, depth: 2, clearance: 0.05 };

test('furniture placement stays inside authored room bounds', () => {
  assert.equal(validateFurniturePlacement(room, footprint, { x: 2.5, z: 2, rotationY: 0 }, []).valid, true);
  assert.deepEqual(validateFurniturePlacement(room, footprint, { x: 0.2, z: 2, rotationY: 0 }, []), { valid: false, reason: 'outside_room' });
});

test('placement uses rotated footprints and rejects overlap', () => {
  const existing = [{ id: 'table', footprint: { width: 1.4, depth: 0.8, clearance: 0.05 }, placement: { x: 2.5, z: 2, rotationY: Math.PI / 2 } }];
  assert.deepEqual(validateFurniturePlacement(room, footprint, { x: 2.5, z: 2, rotationY: 0 }, existing), { valid: false, reason: 'overlap' });
  assert.equal(validateFurniturePlacement(room, footprint, { x: 3.8, z: 0.65, rotationY: Math.PI / 2 }, existing).valid, true);
});
