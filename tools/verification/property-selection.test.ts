import assert from 'node:assert/strict';
import test from 'node:test';
import { STARTER_PROPERTIES } from '../../shared/src/home/properties.js';
import { LocalGameRepository } from '../../server/src/db/LocalGameRepository.js';
import { HouseholdService } from '../../server/src/game/HouseholdService.js';
import { PropertySelectionService } from '../../server/src/game/PropertySelectionService.js';

test('Couple property assignment requires both members to confirm', async () => {
  const repository = new LocalGameRepository();
  const households = new HouseholdService(repository, () => 0.21);
  const properties = new PropertySelectionService(repository, households);
  const household = await households.createHousehold('a-user', { name: 'Us', type: 'couple' });
  await households.joinHousehold('b-user', household.inviteCode);

  const vote = await properties.openPropertyVote(household.id, 'a-user', 'couple_studio');
  assert.equal(vote.resolution, 'pending');
  assert.equal((await properties.getLatestPropertyVote(household.id, 'a-user'))?.id, vote.id);
  const approved = await properties.castPropertyVote(vote.id, 'b-user', 'yes');
  assert.equal(approved.resolution, 'approved');
  const updated = await households.getHouseholdForMember(household.id, 'a-user');
  assert.equal(updated.propertyId, STARTER_PROPERTIES[0]!.recordId);
});

test('Friends property vote ties do not silently assign a home', async () => {
  const repository = new LocalGameRepository();
  const households = new HouseholdService(repository, () => 0.31);
  const properties = new PropertySelectionService(repository, households);
  const household = await households.createHousehold('u0', { name: 'PG', type: 'friends' });
  for (const id of ['u1', 'u2', 'u3']) await households.joinHousehold(id, household.inviteCode);
  const vote = await properties.openPropertyVote(household.id, 'u0', 'courtyard_2bhk');
  await properties.castPropertyVote(vote.id, 'u1', 'yes');
  await properties.castPropertyVote(vote.id, 'u2', 'no');
  const tied = await properties.castPropertyVote(vote.id, 'u3', 'no');
  assert.equal(tied.resolution, 'tied');
  const updated = await households.getHouseholdForMember(household.id, 'u0');
  assert.equal(updated.propertyId, undefined);
});
