import assert from 'node:assert/strict';
import test from 'node:test';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import type { InputSnapshot } from '../core/InputManager';
import { PlayerAvatar } from './PlayerAvatar';
import { PlayerController } from './PlayerController';

const input: InputSnapshot = { moveX: 0, moveZ: 0, jog: false, lookDeltaX: 0, lookDeltaY: 0, interactPressed: false, cameraTogglePressed: false, transportDismountPressed: false };
// Rendered mean waterline -0.05, authored hull centre relative to body -0.70.
const supportY = 0.65;

for (const throttle of [0, 1]) {
  test(`actual Rapier kayak stays afloat for 600 ${throttle ? 'paddling' : 'idle'} fixed updates`, async () => {
    const physics = await PhysicsWorld.create();
    const avatar = new PlayerAvatar();
    const controller = new PlayerController(physics, avatar, { x: 135, y: supportY, z: -350 });
    try {
      physics.createFixedCuboid({ x: 135, y: -3.5, z: -390 }, { x: 80, y: 0.5, z: 80 });
      controller.setTransportMode('kayak');
      controller.setInput({ ...input, moveZ: throttle });
      for (let frame = 0; frame < 600; frame++) {
        controller.fixedUpdate(1 / 60, 0);
        physics.step();
        assert.ok(Math.abs(controller.getPosition().y - supportY) < 0.03, `kayak sank at frame ${frame}: ${controller.getPosition().y}`);
      }
      if (throttle) assert.ok(controller.getPosition().z < -368, 'paddling must produce actual forward movement');
      else assert.ok(Math.abs(controller.getPosition().z + 350) < 0.01);
    } finally { controller.dispose(); avatar.dispose(); physics.dispose(); }
  });
}

test('on-foot Rapier gravity and seabed collision remain unchanged after kayak dismount', async () => {
  const physics = await PhysicsWorld.create();
  const avatar = new PlayerAvatar();
  const controller = new PlayerController(physics, avatar, { x: 135, y: supportY, z: -350 });
  try {
    physics.createFixedCuboid({ x: 135, y: -3.5, z: -350 }, { x: 20, y: 0.5, z: 20 });
    controller.setTransportMode('kayak');
    controller.setTransportMode('on_foot');
    controller.setInput(input);
    for (let frame = 0; frame < 180; frame++) { controller.fixedUpdate(1 / 60, 0); physics.step(); }
    const settled = controller.getPosition().y;
    assert.ok(settled < -1.8 && settled > -2.2, `walking must settle on the seabed, got ${settled}`);
    for (let frame = 0; frame < 60; frame++) { controller.fixedUpdate(1 / 60, 0); physics.step(); }
    assert.ok(Math.abs(controller.getPosition().y - settled) < 0.02);
  } finally { controller.dispose(); avatar.dispose(); physics.dispose(); }
});

test('kayak support recovers older launch or submerged heights gradually through Rapier', async () => {
  for (const initialY of [1.1, -1]) {
    const physics = await PhysicsWorld.create();
    const avatar = new PlayerAvatar();
    const controller = new PlayerController(physics, avatar, { x: 135, y: initialY, z: -350 });
    try {
      physics.createFixedCuboid({ x: 135, y: -3.5, z: -350 }, { x: 20, y: 0.5, z: 20 });
      controller.setTransportMode('kayak');
      controller.setInput(input);
      controller.fixedUpdate(1 / 60, 0); physics.step();
      const firstY = controller.getPosition().y;
      assert.ok(Math.abs(firstY - initialY) <= 0.076, 'support recovery must avoid teleporting');
      assert.ok(Math.abs(firstY - supportY) < Math.abs(initialY - supportY), 'support must converge toward the hull waterline');
      for (let frame = 0; frame < 120; frame++) { controller.fixedUpdate(1 / 60, 0); physics.step(); }
      assert.ok(Math.abs(controller.getPosition().y - supportY) < 0.03);
    } finally { controller.dispose(); avatar.dispose(); physics.dispose(); }
  }
});
