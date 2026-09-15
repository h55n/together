import assert from 'node:assert/strict';
import test from 'node:test';
import { clampPitch, thirdPersonDesiredOffset } from './cameraMath.js';

test('first-person pitch stays inside a comfortable near-vertical range', () => {
  assert.ok(clampPitch(Math.PI) < Math.PI / 2);
  assert.ok(clampPitch(-Math.PI) > -Math.PI / 2);
});

test('third-person offset stays 3.5–4.5m behind the player', () => {
  const offset = thirdPersonDesiredOffset(0, 4);
  assert.ok(Math.abs(Math.hypot(offset.x, offset.z) - 4) < 1e-8);
  assert.equal(offset.z, 4);
});
