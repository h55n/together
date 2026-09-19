import test from 'node:test';
import assert from 'node:assert/strict';
import type { MicroActionStep } from '@together/shared';
import type { PlayerController } from '../player/PlayerController';
import { MicroActionRuntime } from './MicroActionRuntime';

test('micro-action runtime publishes every explicit physical step exactly once', () => {
  const steps: readonly MicroActionStep[] = [
    { id: 'take_plate', primitive: 'pick_up', persistence: 'object', replicate: true },
    { id: 'tap_on', primitive: 'open', objectState: 'tap_on', soundEvent: 'tap_water', persistence: 'object', replicate: true },
  ];
  const published: Array<{ interactionId: string; stepId: string }> = [];
  const actions: string[] = [];
  const locks: boolean[] = [];
  const player = {
    setInteractionLock: (locked: boolean) => locks.push(locked),
    beginMicroAction: (action: string) => actions.push(action),
  } as unknown as PlayerController;

  const runtime = new MicroActionRuntime(
    undefined,
    (step, interactionId) => published.push({ interactionId, stepId: step.id }),
  );

  runtime.start({ id: 'couple_studio:dishes', label: 'Wash dishes', sequence: steps }, player);
  assert.deepEqual(published, [{ interactionId: 'couple_studio:dishes', stepId: 'take_plate' }]);
  assert.deepEqual(actions, ['pick_up']);
  assert.deepEqual(locks, [true]);

  runtime.update(1, true, player);
  assert.deepEqual(published, [
    { interactionId: 'couple_studio:dishes', stepId: 'take_plate' },
    { interactionId: 'couple_studio:dishes', stepId: 'tap_on' },
  ]);
  assert.deepEqual(actions, ['pick_up', 'hand_over']);
});
