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
    setTransform: () => undefined,
    updateMotion: () => undefined,
    setTransportMode: () => undefined,
  } as unknown as PlayerAvatar;
  return new PlayerController(physics, avatar, { x: 0, y: 1.1, z: 0 });
}

test('micro-action completion resolves only after its animated duration is consumed', async () => {
  const controller = controllerHarness();
  controller.beginMicroAction('cut', 1.0, true);
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
});

test('transport interruption resolves a pending micro-action so callers cannot hang', async () => {
  const controller = controllerHarness();
  controller.beginMicroAction('wash', 4, true);
  const completion = controller.waitForMicroActionCompletion();
  controller.setTransportMode('bicycle');
  await completion;
  assert.equal(controller.animationTag(), 'cycle');
});
