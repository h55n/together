import { describe, expect, it, vi } from 'vitest';
import type { PhysicsWorld, PlayerPhysicsHandle } from '../physics/PhysicsWorld';
import type { PlayerAvatar } from './PlayerAvatar';
import { PlayerController } from './PlayerController';

function controllerHarness() {
  const body = {
    translation: vi.fn(() => ({ x: 0, y: 1.1, z: 0 })),
    setTranslation: vi.fn(),
    setNextKinematicTranslation: vi.fn(),
  };
  const handle = { body } as unknown as PlayerPhysicsHandle;
  const physics = {
    createPlayer: vi.fn(() => handle),
    moveCharacter: vi.fn(),
    disposePlayer: vi.fn(),
  } as unknown as PhysicsWorld;
  const avatar = {
    setTransform: vi.fn(),
    updateMotion: vi.fn(),
    setTransportMode: vi.fn(),
  } as unknown as PlayerAvatar;
  return { controller: new PlayerController(physics, avatar, { x: 0, y: 1.1, z: 0 }), physics, avatar };
}

describe('PlayerController embodied action completion', () => {
  it('resolves an action only after its animated duration is actually consumed', async () => {
    const { controller } = controllerHarness();
    controller.beginMicroAction('cut', 1.0, true);
    let resolved = false;
    void controller.waitForMicroActionCompletion().then(() => { resolved = true; });

    controller.syncVisual(0, 0.4);
    await Promise.resolve();
    expect(resolved).toBe(false);
    expect(controller.animationTag()).toBe('cut');

    controller.syncVisual(0, 0.61);
    await Promise.resolve();
    expect(resolved).toBe(true);
    expect(controller.animationTag()).toBe('idle');
  });

  it('resolves a pending action when transport interrupts it so callers cannot hang', async () => {
    const { controller } = controllerHarness();
    controller.beginMicroAction('wash', 4, true);
    const completion = controller.waitForMicroActionCompletion();
    controller.setTransportMode('bicycle');
    await expect(completion).resolves.toBeUndefined();
    expect(controller.animationTag()).toBe('cycle');
  });
});
