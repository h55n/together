import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultPlacementForRoom, rotatePlacement, snapPlacement } from './decorMode.js';

test('default furniture placement begins at the authored room centre', () => {
  assert.deepEqual(defaultPlacementForRoom({ minX: 0, maxX: 6, minZ: 0, maxZ: 4 }), { x: 3, z: 2, rotationY: 0 });
});

test('decorate snapping can align position to a subtle grid without forcing it', () => {
  const snapped = snapPlacement({ x: 1.13, z: 2.38, rotationY: 0.23 }, 0.25, 15);
  assert.equal(snapped.x, 1.25);
  assert.equal(snapped.z, 2.5);
  assert.ok(Math.abs(snapped.rotationY - Math.PI / 12) < 1e-12);
});

test('free placement preserves position and rotation', () => {
  const placement = { x: 1.13, z: 2.38, rotationY: 0.23 };
  assert.deepEqual(snapPlacement(placement, 0, 0), placement);
});

test('rotation increments wrap cleanly around a full turn', () => {
  const placement = rotatePlacement({ x: 0, z: 0, rotationY: Math.PI * 1.95 }, 45);
  assert.ok(placement.rotationY >= 0 && placement.rotationY < Math.PI * 2);
  assert.ok(Math.abs(placement.rotationY - (Math.PI * 0.2)) < 1e-9);
});
