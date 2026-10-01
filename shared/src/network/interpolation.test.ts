import assert from 'node:assert/strict';
import test from 'node:test';
import { interpolationAlpha, lerpAngle } from './interpolation.js';

test('remote interpolation is frame-rate independent and converges smoothly', () => {
  const a60 = interpolationAlpha(12, 1 / 60);
  const a30 = interpolationAlpha(12, 1 / 30);
  assert.ok(a60 > 0 && a60 < 1);
  assert.ok(a30 > a60);
  const two60 = 1 - (1 - a60) ** 2;
  assert.ok(Math.abs(two60 - a30) < 1e-9);
});

test('angle interpolation follows the shortest wrap-around path', () => {
  const from = Math.PI - 0.1;
  const to = -Math.PI + 0.1;
  const halfway = lerpAngle(from, to, 0.5);
  assert.ok(Math.abs(Math.abs(halfway) - Math.PI) < 1e-9);
});

test('angle interpolation normalizes enormous finite angles in constant-time arithmetic', () => {
  const result = lerpAngle(0, 1e12, 0.5);
  assert.equal(Number.isFinite(result), true);
  assert.ok(Math.abs(result) <= Math.PI);
});
