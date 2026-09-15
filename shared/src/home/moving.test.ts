import test from 'node:test';
import assert from 'node:assert/strict';
import { completeMovingPlan, createMovingPlan, packMovingObject } from './moving.js';

test('moving plan records keep/sell/donate choices and becomes ready only after physical packing', () => {
  let plan = createMovingPlan('old-home', 'new-home', 2);
  assert.equal(plan.status, 'packing');
  plan = packMovingObject(plan, 'lamp', 'keep');
  assert.equal(plan.status, 'packing');
  plan = packMovingObject(plan, 'chair', 'donate');
  assert.equal(plan.status, 'ready');
  assert.deepEqual(plan.dispositionByObject, { lamp: 'keep', chair: 'donate' });
});

test('moving cannot commit before required packing and completion preserves the old-home identity', () => {
  let plan = createMovingPlan('mogra-a', 'courtyard-b', 1);
  assert.throws(() => completeMovingPlan(plan), /not ready/);
  plan = packMovingObject(plan, 'photo-frame', 'keep');
  const complete = completeMovingPlan(plan);
  assert.equal(complete.status, 'moved');
  assert.equal(complete.fromPropertyId, 'mogra-a');
  assert.equal(complete.targetPropertyId, 'courtyard-b');
});
