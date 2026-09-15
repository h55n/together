import assert from 'node:assert/strict';
import test from 'node:test';
import { selectInteraction } from './interactionSelection.js';

test('interaction selection prefers the closest valid anchor in front of the player', () => {
  const selected = selectInteraction(
    { x: 0, z: 0, yaw: 0 },
    [
      { id: 'behind', x: 0, z: 1, radius: 2, priority: 1 },
      { id: 'front-far', x: 0, z: -1.8, radius: 2.2, priority: 1 },
      { id: 'front-near', x: 0.2, z: -1.2, radius: 2.2, priority: 1 },
    ],
  );
  assert.equal(selected?.id, 'front-near');
});

test('high-priority contextual interaction wins when anchors overlap', () => {
  const selected = selectInteraction(
    { x: 0, z: 0, yaw: 0 },
    [
      { id: 'bench', x: 0, z: -1.1, radius: 2, priority: 1 },
      { id: 'story-object', x: 0.1, z: -1.2, radius: 2, priority: 4 },
    ],
  );
  assert.equal(selected?.id, 'story-object');
});

test('anchors outside proximity or view alignment do not create HUD prompts', () => {
  assert.equal(selectInteraction({ x: 0, z: 0, yaw: 0 }, [{ id: 'far', x: 0, z: -4, radius: 2, priority: 1 }]), undefined);
  assert.equal(selectInteraction({ x: 0, z: 0, yaw: 0 }, [{ id: 'side', x: 1.8, z: 0, radius: 2, priority: 1 }]), undefined);
});
