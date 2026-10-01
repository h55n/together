import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDomesticInteractionStep } from './domesticInteraction.js';

test('domestic interaction progress follows the canonical embodied sequence', () => {
  let state = applyDomesticInteractionStep(undefined, 'couple_studio:dishes', 'take_plate', 'user-a', '2026-09-19T00:00:00.000Z');
  assert.deepEqual(state.completedStepIds, ['take_plate']);
  assert.equal(state.sequenceComplete, false);

  state = applyDomesticInteractionStep(state, 'couple_studio:dishes', 'tap_on', 'user-a', '2026-09-19T00:00:01.000Z');
  assert.equal(state.objectState, 'tap_on');
  assert.equal(state.soundEvent, 'tap_water');
  assert.equal(state.replicate, true);

  assert.throws(
    () => applyDomesticInteractionStep(state, 'couple_studio:dishes', 'scrub_plate', 'user-a', '2026-09-19T00:00:02.000Z'),
    /Expected domestic step wet_plate/,
  );
});

test('a completed domestic interaction can restart from its first physical step', () => {
  const steps = ['take_plate', 'tap_on', 'wet_plate', 'scrub_plate', 'rinse_plate', 'rack_plate', 'tap_off'];
  let state = undefined;
  for (let index = 0; index < steps.length; index += 1) {
    state = applyDomesticInteractionStep(state, 'couple_studio:dishes', steps[index]!, 'user-a', `2026-09-19T00:00:0${index}.000Z`);
  }
  assert.equal(state?.sequenceComplete, true);
  assert.equal(state?.objectState, 'tap_off');

  const restarted = applyDomesticInteractionStep(state, 'couple_studio:dishes', 'take_plate', 'user-b', '2026-09-19T00:01:00.000Z');
  assert.deepEqual(restarted.completedStepIds, ['take_plate']);
  assert.equal(restarted.sequenceComplete, false);
  assert.equal(restarted.objectState, undefined);
});
