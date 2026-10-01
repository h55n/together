import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalGameRepository } from '../../server/src/db/LocalGameRepository.js';
import { HouseholdService } from '../../server/src/game/HouseholdService.js';
import { NPCStateService } from '../../server/src/game/NPCStateService.js';

async function setup() {
  const repo = new LocalGameRepository();
  const households = new HouseholdService(repo);
  const household = await households.createHousehold('user-a', { name: 'NPC Home', type: 'friends' });
  return { repo, household, service: new NPCStateService(repo) };
}

test('named NPC memory uses authored discrete flags and repeated memories stay idempotent', async () => {
  const { household, service } = await setup();
  await service.remember(household.id, 'user-a', 'roshan', 'first_meeting', 4);
  let state = await service.remember(household.id, 'user-a', 'roshan', 'first_meeting', 4);
  assert.deepEqual(state.flags, ['first_meeting']);
  assert.equal(state.familiarity, 8);
  state = await service.remember(household.id, 'user-a', 'roshan', 'player_works_here', 200);
  assert.equal(state.familiarity, 100);
});

test('NPC memories are private to the household and outsiders cannot mutate them', async () => {
  const { household, service } = await setup();
  await assert.rejects(() => service.remember(household.id, 'outsider', 'roshan', 'first_meeting', 1), /active household member/);
});
