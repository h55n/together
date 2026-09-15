import test from 'node:test';
import assert from 'node:assert/strict';
import { activityActionSequence, advanceActivityState, createActivityState, joinActivityState } from './activity.js';

const activityIds = ['picnic','cycling','kayak','badminton','mini_golf','cafe_hangout','board_game','photography'] as const;

test('all eight V1 leisure activities have embodied multi-step sequences', () => {
  for (const id of activityIds) {
    const steps = activityActionSequence(id);
    assert.ok(steps.length >= 2, `${id} should have at least two embodied steps`);
    assert.ok(steps.every((step) => step.id.length > 0 && step.animation.length > 0));
  }
});

test('shared leisure state allows household members to join without turning play into a reward grind', () => {
  let state = createActivityState('picnic', 'u1');
  state = joinActivityState(state, 'u2', 6);
  assert.deepEqual(state.participants, ['u1','u2']);
  assert.equal(state.status, 'active');
  assert.equal(state.score, undefined);
});

test('activity advances in authored order and completes on the final embodied step', () => {
  let state = createActivityState('photography', 'u1');
  const steps = activityActionSequence('photography');
  assert.throws(() => advanceActivityState(state, steps[1]!.id), /next activity step/i);
  state = advanceActivityState(state, steps[0]!.id);
  assert.equal(state.status, 'active');
  state = advanceActivityState(state, steps[1]!.id);
  assert.equal(state.status, 'complete');
});
