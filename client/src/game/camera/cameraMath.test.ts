import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampPitch,
  firstPersonEyeOffset,
  safeThirdPersonDistance,
  thirdPersonDesiredOffset,
} from './cameraMath.js';

test('first-person pitch stays inside a comfortable near-vertical range', () => {
  assert.ok(clampPitch(Math.PI) < Math.PI / 2);
  assert.ok(clampPitch(-Math.PI) > -Math.PI / 2);
});

test('third-person offset stays 3.5–4.5m behind the player', () => {
  const offset = thirdPersonDesiredOffset(0, 4);
  assert.ok(Math.abs(Math.hypot(offset.x, offset.z) - 4) < 1e-8);
  assert.equal(offset.z, 4);
});

test('first-person eye offset moves slightly forward using Three.js yaw semantics', () => {
  const forwardAtZero = firstPersonEyeOffset(0, 0.12);
  assert.ok(Math.abs(forwardAtZero.x) < 1e-8);
  assert.ok(Math.abs(forwardAtZero.z + 0.12) < 1e-8);

  const forwardAtHalfTurn = firstPersonEyeOffset(Math.PI, 0.12);
  assert.ok(Math.abs(forwardAtHalfTurn.x) < 1e-8);
  assert.ok(Math.abs(forwardAtHalfTurn.z - 0.12) < 1e-8);
});

test('third-person collision distance uses the nearest probe hit with padding', () => {
  assert.equal(safeThirdPersonDistance(4, [], 0.2, 0.65), 4);
  assert.ok(Math.abs(safeThirdPersonDistance(4, [3.1, 1.2, 2.4], 0.2, 0.65) - 1) < 1e-8);
  assert.equal(safeThirdPersonDistance(4, [0.1], 0.2, 0.65), 0.65);
});
