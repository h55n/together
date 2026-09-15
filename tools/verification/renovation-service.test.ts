import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalGameRepository } from '../../server/src/db/LocalGameRepository.js';
import { HouseholdService } from '../../server/src/game/HouseholdService.js';
import { RenovationService } from '../../server/src/game/RenovationService.js';

async function setup() {
  const repo = new LocalGameRepository();
  const households = new HouseholdService(repo, () => 0.41);
  const created = await households.createHousehold('a', { name: 'Renovation Home', type: 'couple' });
  await households.joinHousehold('b', created.inviteCode);
  const household = (await repo.getHousehold(created.id))!;
  household.propertyId = '10000000-0000-4000-8000-000000000001';
  household.sharedWallet = 30_000;
  await repo.saveHousehold(household);
  return { repo, household, renovations: new RenovationService(repo, households) };
}

test('Couple renovation requires both members and commits authored renovation once', async () => {
  const { repo, household, renovations } = await setup();
  const vote = await renovations.openVote(household.id, 'a', 'study_corner');
  assert.equal(vote.resolution, 'pending');
  const approved = await renovations.castVote(vote.id, 'b', 'yes');
  assert.equal(approved.resolution, 'approved');

  const first = await renovations.commit(vote.id, 'a', 'renovation-study-0001');
  const retry = await renovations.commit(vote.id, 'a', 'renovation-study-0001');
  assert.equal(first.transaction.id, retry.transaction.id);
  assert.equal(first.household.sharedWallet, 20_500);
  const home = await repo.getHomeState(household.id);
  assert.deepEqual((home?.roomStates.renovations as { installed: string[] }).installed, ['study_corner']);
  assert.equal((first.household.hiddenState.flags as Record<string, boolean>).renovated_home, true);
});

test('renovation cannot be installed twice or on the wrong property', async () => {
  const { household, renovations } = await setup();
  const vote = await renovations.openVote(household.id, 'a', 'study_corner');
  await renovations.castVote(vote.id, 'b', 'yes');
  await renovations.commit(vote.id, 'a', 'renovation-study-0002');
  await assert.rejects(() => renovations.openVote(household.id, 'a', 'study_corner'), /already installed/);
  await assert.rejects(() => renovations.openVote(household.id, 'a', 'roof_gathering'), /not available/);
});


test('renovation state exposes latest vote and installed renovations for reconnecting members', async () => {
  const { household, renovations } = await setup();
  const vote = await renovations.openVote(household.id, 'a', 'study_corner');
  let state = await renovations.getState(household.id, 'b');
  assert.equal(state.vote?.id, vote.id);
  assert.deepEqual(state.installed, []);

  await renovations.castVote(vote.id, 'b', 'yes');
  await renovations.commit(vote.id, 'a', 'renovation-state-0001');
  state = await renovations.getState(household.id, 'b');
  assert.equal(state.vote?.resolution, 'approved');
  assert.deepEqual(state.installed, ['study_corner']);
});
