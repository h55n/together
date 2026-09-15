import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGamepadAxes, readStandardGamepadButtons } from './gamepad.js';

test('gamepad axes apply a radial deadzone and preserve full-range direction', () => {
  assert.deepEqual(normalizeGamepadAxes(0.08, -0.05, 0.18), { x: 0, y: 0 });
  const diagonal = normalizeGamepadAxes(0.8, -0.8, 0.18);
  assert.ok(diagonal.x > 0.6 && diagonal.x <= 1);
  assert.ok(diagonal.y < -0.6 && diagonal.y >= -1);
});

test('standard gamepad mapping exposes interact, camera, jog and dismount without menu coupling', () => {
  const buttons = Array.from({ length: 16 }, () => false);
  buttons[0] = true;  // south face button
  buttons[5] = true;  // right shoulder
  buttons[9] = true;  // menu / camera-mode fallback
  buttons[2] = true;  // west face button -> dismount
  assert.deepEqual(readStandardGamepadButtons(buttons), {
    interact: true,
    jog: true,
    cameraToggle: true,
    dismount: true,
  });
});
