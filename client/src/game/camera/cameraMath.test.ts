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
  assert.ok(Math.hypot(offset.x, offset.z) >= 3.5 && Math.hypot(offset.x, offset.z) <= 4.5);
  assert.ok(offset.z > 0);
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
  assert.equal(safeThirdPersonDistance(4, [], 0.2), 4);
  assert.ok(Math.abs(safeThirdPersonDistance(4, [3.1, 1.2, 2.4], 0.2) - 1) < 1e-8);
});

test('a close wall takes precedence over the preferred camera distance', () => {
  assert.equal(safeThirdPersonDistance(4, [0.1], 0.2), 0);
  assert.ok(Math.abs(safeThirdPersonDistance(4, [0.4], 0.2) - 0.2) < 1e-8);
});

test('third-person pitch orbits around the shoulder instead of only tilting the aim', () => {
  const neutral = thirdPersonDesiredOffset(0, 4, 0);
  const down = thirdPersonDesiredOffset(0, 4, -0.5);
  const up = thirdPersonDesiredOffset(0, 4, 0.5);
  assert.ok(down.y > neutral.y);
  assert.ok(up.y < neutral.y);
  assert.ok(Math.abs(Math.hypot(down.x, down.y - 1.35, down.z) - 4) < 1e-8);
  assert.ok(thirdPersonDesiredOffset(0, 4, -Math.PI).z > 0);
  assert.ok(thirdPersonDesiredOffset(0, 4, Math.PI).z > 0);
});
