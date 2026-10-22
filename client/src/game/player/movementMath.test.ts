import assert from 'node:assert/strict';
import test from 'node:test';
import { displacementLocomotion, movementVector } from './movementMath.js';

test('movement uses PRD walking and jogging speeds independent of camera yaw', () => {
  assert.deepEqual(movementVector({ moveX: 0, moveZ: 1, jog: false }, 0), { x: 0, z: -1.6 });
  const jogRight = movementVector({ moveX: 1, moveZ: 0, jog: true }, Math.PI / 2);
  assert.ok(Math.abs(jogRight.x) < 1e-8);
  assert.ok(Math.abs(jogRight.z + 3.2) < 1e-8);
});

test('camera-relative right and forward stay orthogonal through a full turn', () => {
  for (let step = 0; step < 16; step++) {
    const yaw = step * Math.PI / 8;
    const right = movementVector({ moveX: 1, moveZ: 0, jog: false }, yaw);
    const forward = movementVector({ moveX: 0, moveZ: 1, jog: false }, yaw);
    assert.ok(Math.abs(right.x * forward.x + right.z * forward.z) < 1e-8, `orthogonal at ${yaw}`);
    for (const moveX of [-1, 1]) {
      for (const moveZ of [-1, 1]) {
        const diagonal = movementVector({ moveX, moveZ, jog: false }, yaw);
        assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 1.6) < 1e-8, `diagonal speed at ${yaw}`);
      }
    }
  }
});

test('displacement gait follows Three.js body axes at every heading', () => {
  for (let step = 0; step < 16; step++) {
    const yaw = step * Math.PI / 8;
    // Three.js +Y rotation maps local +X to (cos, -sin), local -Z to (-sin, -cos).
    for (const [localRight, localForward] of [[0, 1], [1, 0], [0, -1], [-1, 0], [Math.SQRT1_2, Math.SQRT1_2]] as const) {
      const dx = (localRight * Math.cos(yaw) - localForward * Math.sin(yaw)) * 0.16;
      const dz = (-localRight * Math.sin(yaw) - localForward * Math.cos(yaw)) * 0.16;
      const gait = displacementLocomotion({ x: 0, z: 0 }, { x: dx, z: dz }, 0.1, yaw);
      assert.ok(Math.abs(gait.directionX - localRight) < 1e-8, `right gait at ${yaw}`);
      assert.ok(Math.abs(gait.directionZ - localForward) < 1e-8, `forward gait at ${yaw}`);
      assert.ok(Math.abs(gait.speed - 1.6) < 1e-8);
    }
  }
});

test('diagonal movement is normalized instead of faster', () => {
  const diagonal = movementVector({ moveX: 1, moveZ: 1, jog: false }, 0);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 1.6) < 1e-8);
});

test('transport movement can provide an explicit speed while keeping normalized direction', () => {
  const bicycle = movementVector({ moveX: 1, moveZ: 1, jog: false }, 0, 5.4);
  assert.ok(Math.abs(Math.hypot(bicycle.x, bicycle.z) - 5.4) < 1e-8);
});
