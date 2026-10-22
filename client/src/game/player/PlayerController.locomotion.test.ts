import assert from 'node:assert/strict';
import test from 'node:test';
import type { PhysicsWorld, PlayerPhysicsHandle } from '../physics/PhysicsWorld';
import type { InputSnapshot } from '../core/InputManager';
import { PlayerAvatar } from './PlayerAvatar';
import { PlayerController } from './PlayerController';
import type { LocomotionSample } from './movementMath';

const input: InputSnapshot = { moveX: 0, moveZ: 1, jog: false, lookDeltaX: 0, lookDeltaY: 0, interactPressed: false, cameraTogglePressed: false, transportDismountPressed: false };

function harness() {
  const position = { x: 0, y: 1.1, z: 0 };
  let grounded = true;
  const body = { translation: () => ({ ...position }), setTranslation: (next: typeof position) => Object.assign(position, next), setNextKinematicTranslation() {} };
  const physics = { createPlayer: () => ({ body, controller: { computedGrounded: () => grounded } } as unknown as PlayerPhysicsHandle), disposePlayer() {} } as unknown as PhysicsWorld;
  const avatar = new PlayerAvatar();
  const controller = new PlayerController(physics, avatar, position);
  controller.syncVisual(0, 0);
  return { position, avatar, controller, setGrounded: (value: boolean) => { grounded = value; }, dispose: () => { controller.dispose(); avatar.dispose(); } };
}

test('footfall feedback follows real grounded movement and stays silent at walls, in the air and after teleporting', () => {
  const h = harness();
  let steps = 0;
  try {
    h.controller.setFootfallListener(() => { steps++; });
    h.controller.setInput(input);
    for (let frame = 0; frame < 60; frame++) h.controller.syncVisual(0, 1 / 60);
    assert.equal(steps, 0);
    for (let frame = 0; frame < 60; frame++) { h.position.z -= 1.6 / 60; h.controller.syncVisual(0, 1 / 60); }
    assert.ok(steps >= 2 && steps <= 3);
    const onGround = steps;
    h.setGrounded(false);
    for (let frame = 0; frame < 60; frame++) { h.position.z -= 1.6 / 60; h.controller.syncVisual(0, 1 / 60); }
    assert.equal(steps, onGround);
    h.setGrounded(true);
    h.controller.setWorldPosition({ x: 100, y: 1.1, z: 100 }); h.controller.syncVisual(0, 1 / 60);
    assert.equal(steps, onGround);
  } finally { h.dispose(); }
});

test('holding walk against an obstacle does not animate a full-speed gait', () => {
  const h = harness();
  try {
    h.controller.setInput(input);
    h.controller.syncVisual(0, 0.1);
    assert.equal(h.controller.isMoving(), false);
    assert.equal(h.controller.animationTag(), 'idle');
  } finally { h.dispose(); }
});

test('measured sideways displacement animates lateral legs instead of a forward stride', () => {
  const h = harness();
  try {
    for (let i = 0; i < 12; i++) {
      h.controller.setInput({ ...input, moveX: 1, moveZ: 0 });
      h.position.x += 1.6 / 60;
      h.controller.syncVisual(0, 1 / 60);
    }
    const leg = h.avatar.root.getObjectByName('avatar:left-hip')!;
    assert.ok(Math.abs(leg.rotation.z) > 0.05);
    assert.ok(Math.abs(leg.rotation.x) < 0.01);
  } finally { h.dispose(); }
});

test('teleportation does not create a walking stride or a moving camera state', () => {
  const h = harness();
  try {
    h.controller.setWorldPosition({ x: 100, y: 1.1, z: 100 });
    h.controller.syncVisual(0, 1 / 60);
    assert.equal(h.controller.isMoving(), false);
    assert.equal(h.controller.animationTag(), 'idle');
  } finally { h.dispose(); }
});

test('action transitions blend instead of snapping the shoulder in one small frame', () => {
  const avatar = new PlayerAvatar();
  try {
    avatar.updateMotion(0.2, 'idle');
    const shoulder = avatar.root.getObjectByName('avatar:right-shoulder')!;
    const before = shoulder.rotation.x;
    avatar.updateMotion(0.001, 'cut');
    assert.ok(Math.abs(shoulder.rotation.x - before) < 0.03);
    avatar.updateMotion(0.4, 'cut');
    assert.ok(Math.abs(shoulder.rotation.x - before) > 0.1);
  } finally { avatar.dispose(); }
});

test('gait follows the rendered body frame while it catches up with a fast camera turn', () => {
  const h = harness();
  const samples: LocomotionSample[] = [];
  const updateMotion = h.avatar.updateMotion.bind(h.avatar);
  h.avatar.updateMotion = (delta, action, sample) => { if (sample) samples.push(sample); updateMotion(delta, action, sample); };
  try {
    h.controller.setInput(input);
    h.position.x -= 1.6 * 0.01;
    h.controller.syncVisual(Math.PI / 2, 0.01);
    const sample = samples.at(-1)!;
    assert.ok(Math.abs(sample.directionX) > 0.9);
    assert.ok(Math.abs(sample.directionZ) < 0.2);
  } finally { h.dispose(); }
});

test('straight walking at a diagonal body heading does not introduce a strafe pose', () => {
  const h = harness();
  try {
    const yaw = Math.PI / 4;
    h.avatar.root.rotation.y = yaw;
    h.controller.setInput(input);
    for (let i = 0; i < 12; i++) {
      h.position.x -= Math.sin(yaw) * 1.6 / 60;
      h.position.z -= Math.cos(yaw) * 1.6 / 60;
      h.controller.syncVisual(yaw, 1 / 60);
    }
    const leg = h.avatar.root.getObjectByName('avatar:left-hip')!;
    assert.ok(Math.abs(leg.rotation.x) > 0.05);
    assert.ok(Math.abs(leg.rotation.z) < 0.01);
  } finally { h.dispose(); }
});
