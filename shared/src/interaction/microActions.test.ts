import test from 'node:test';
import assert from 'node:assert/strict';
import { createMicroActionSession, advanceMicroAction, MICRO_ACTION_PRIMITIVES, dishwashingSequence } from './microActions.js';

test('micro-action framework exposes every V1 embodied primitive', () => {
  for (const id of ['pick_up','place','carry','pour','scrub','wipe','wash','cut','stir','press','open','close','fold','water','hand_over','receive','sit','sleep']) {
    assert.ok(MICRO_ACTION_PRIMITIVES.includes(id as never), id);
  }
});

test('dishwashing advances through physical steps instead of one fake timer', () => {
  let session = createMicroActionSession('wash_plate', dishwashingSequence);
  assert.equal(session.currentStep?.primitive, 'pick_up');
  session = advanceMicroAction(session, 'pick_up');
  assert.equal(session.currentStep?.primitive, 'open');
  for (const step of dishwashingSequence.slice(1)) session = advanceMicroAction(session, step.primitive);
  assert.equal(session.status, 'completed');
  assert.equal(session.completedSteps.length, dishwashingSequence.length);
});

test('invalid primitive cannot skip a required embodied step', () => {
  const session = createMicroActionSession('wash_plate', dishwashingSequence);
  assert.throws(() => advanceMicroAction(session, 'scrub'), /Expected pick_up/);
});

test('every physical micro-action step maps to a body animation or deliberate fallback', async () => {
  const { avatarActionForPrimitive } = await import('./microActions.js');
  assert.equal(avatarActionForPrimitive('scrub'), 'scrub');
  assert.equal(avatarActionForPrimitive('wash'), 'wash');
  assert.equal(avatarActionForPrimitive('open'), 'hand_over');
  assert.equal(avatarActionForPrimitive('switch_on'), 'hand_over');
  assert.equal(avatarActionForPrimitive('inspect'), 'point');
});

test('V1 chore sequence library covers the eight promised embodied chore families', async () => {
  const { CHORE_SEQUENCES } = await import('./microActions.js');
  assert.deepEqual(Object.keys(CHORE_SEQUENCES).sort(), [
    'bathroom_clean','dishes','floor_clean','groceries','laundry','plant_care','repair','trash',
  ]);
  for (const [id, steps] of Object.entries(CHORE_SEQUENCES)) {
    assert.ok(steps.length >= 3, `${id} collapsed into a fake one-step timer`);
    assert.ok(steps.some((step) => step.replicate), `${id} has no replicated physical step`);
  }
});
