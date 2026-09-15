import assert from 'node:assert/strict';
import test from 'node:test';
import { movementVector } from './movementMath.js';

test('movement uses PRD walking and jogging speeds independent of camera yaw', () => {
  assert.deepEqual(movementVector({ moveX: 0, moveZ: 1, jog: false }, 0), { x: 0, z: -1.6 });
  const jogRight = movementVector({ moveX: 1, moveZ: 0, jog: true }, Math.PI / 2);
  assert.ok(Math.abs(jogRight.x) < 1e-8);
  assert.ok(Math.abs(jogRight.z - 3.2) < 1e-8);
});

test('diagonal movement is normalized instead of faster', () => {
  const diagonal = movementVector({ moveX: 1, moveZ: 1, jog: false }, 0);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 1.6) < 1e-8);
});

test('transport movement can provide an explicit speed while keeping normalized direction', () => {
  const bicycle = movementVector({ moveX: 1, moveZ: 1, jog: false }, 0, 5.4);
  assert.ok(Math.abs(Math.hypot(bicycle.x, bicycle.z) - 5.4) < 1e-8);
});
