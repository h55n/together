import assert from 'node:assert/strict';
import test from 'node:test';
import { createStarterHomeState, applyHomeAction } from './homeState.js';

test('domestic actions visibly and proportionally alter household state', () => {
  let state = createStarterHomeState();
  state = { ...state, dishesDirty: 4, laundryDirty: 3, trashBags: 2, floorDust: 0.8, bathroomGrime: 0.6 };
  state = applyHomeAction(state, { type: 'wash_dish', amount: 1 });
  assert.equal(state.dishesDirty, 3);
  state = applyHomeAction(state, { type: 'fold_laundry', amount: 2 });
  assert.equal(state.laundryDirty, 1);
  state = applyHomeAction(state, { type: 'take_trash', amount: 1 });
  assert.equal(state.trashBags, 1);
  state = applyHomeAction(state, { type: 'sweep_floor', amount: 0.25 });
  assert.equal(state.floorDust, 0.55);
  state = applyHomeAction(state, { type: 'clean_bathroom', amount: 0.2 });
  assert.ok(Math.abs(state.bathroomGrime - 0.4) < 1e-9);
});

test('plant watering is tracked per plant and cannot overfill beyond healthy state', () => {
  let state = createStarterHomeState();
  state = { ...state, plants: { pothos: 0.2 } };
  state = applyHomeAction(state, { type: 'water_plant', plantId: 'pothos', amount: 0.5 });
  assert.equal(state.plants.pothos, 0.7);
  state = applyHomeAction(state, { type: 'water_plant', plantId: 'pothos', amount: 0.8 });
  assert.equal(state.plants.pothos, 1);
});

test('home action network schema rejects invented action kinds and negative amounts', async () => {
  const { homeActionSchema } = await import('./homeState.js');
  assert.equal(homeActionSchema.safeParse({ type: 'wash_dish', amount: 1 }).success, true);
  assert.equal(homeActionSchema.safeParse({ type: 'wash_dish', amount: -1 }).success, false);
  assert.equal(homeActionSchema.safeParse({ type: 'delete_house', amount: 1 }).success, false);
});
