import assert from 'node:assert/strict';
import test from 'node:test';
import type { PhysicsWorld, PlayerPhysicsHandle } from '../physics/PhysicsWorld';
import type { PlayerAvatar } from './PlayerAvatar';
import { PlayerController } from './PlayerController';

function controllerHarness() {
  const body = {
    translation: () => ({ x: 0, y: 1.1, z: 0 }),
    setTranslation: () => undefined,
    setNextKinematicTranslation: () => undefined,
  };
  const handle = { body } as unknown as PlayerPhysicsHandle;
  const physics = {
    createPlayer: () => handle,
    moveCharacter: () => undefined,
    disposePlayer: () => undefined,
  } as unknown as PhysicsWorld;
  const avatar = {
    root: { rotation: { y: 0 } },
    setTransform: () => undefined,
    updateMotion: () => undefined,
    getFootfallSerial: () => 0,
    setTransportMode: () => undefined,
  } as unknown as PlayerAvatar;
  return new PlayerController(physics, avatar, { x: 0, y: 1.1, z: 0 });
}

test('micro-action completion resolves only after its animated duration is consumed', async () => {
  const controller = controllerHarness();
  controller.beginMicroAction('cut', 1.0, true);
  const completion = controller.waitForMicroActionCompletion();
  let resolved = false;
  void controller.waitForMicroActionCompletion().then(() => { resolved = true; });

  controller.syncVisual(0, 0.4);
  await Promise.resolve();
  assert.equal(resolved, false);
  assert.equal(controller.animationTag(), 'cut');

  controller.syncVisual(0, 0.61);
  await Promise.resolve();
  assert.equal(resolved, true);
  assert.equal(controller.animationTag(), 'idle');
  assert.equal(await completion, true);
});

test('transport interruption resolves a pending micro-action so callers cannot hang', async () => {
  const controller = controllerHarness();
  controller.beginMicroAction('wash', 4, true);
  const completion = controller.waitForMicroActionCompletion();
  controller.setTransportMode('bicycle');
  assert.equal(await completion, false);
  assert.equal(controller.animationTag(), 'cycle');
});

test('disposing or replacing an action reports interruption rather than success', async () => {
  const controller = controllerHarness();
  controller.beginMicroAction('wash', 4, true);
  const first = controller.waitForMicroActionCompletion();
  controller.beginMicroAction('cut', 4, true);
  assert.equal(await first, false);
  const second = controller.waitForMicroActionCompletion();
  controller.dispose();
  assert.equal(await second, false);
});

test('an action rejected during transport cannot report successful completion', async () => {
  const controller = controllerHarness();
  controller.setTransportMode('bicycle');
  assert.equal(controller.beginMicroAction('wash', 4, true), false);
  assert.equal(await controller.waitForMicroActionCompletion(), false);
});
