import assert from 'node:assert/strict';
import test from 'node:test';
import { LocalGameRepository } from '../../server/src/db/LocalGameRepository.js';
import { HouseholdService } from '../../server/src/game/HouseholdService.js';
import { TransitService } from '../../server/src/game/TransitService.js';

async function setup() {
  const repository = new LocalGameRepository();
  const households = new HouseholdService(repository);
  const household = await households.createHousehold('user-a', { name: 'Ride Home', type: 'couple' });
  const transit = new TransitService(repository);
  return { repository, household, transit };
}

test('auto booking charges a server-computed small personal fare exactly once', async () => {
  const { household, transit } = await setup();
  const before = household.members[0]!.personalWallet;
  const first = await transit.bookAuto(household.id, 'user-a', { x: -200, z: 150 }, 'auto_bay_steps', 'auto:test:0001');
  const retry = await transit.bookAuto(household.id, 'user-a', { x: -200, z: 150 }, 'auto_bay_steps', 'auto:test:0001');
  assert.ok(first.fare > 0 && first.fare < 220);
  assert.equal(first.personalWallet, before - first.fare);
  assert.equal(retry.personalWallet, first.personalWallet);
  assert.equal(retry.transaction.id, first.transaction.id);
});

test('unknown destinations and outsiders cannot book a household ride', async () => {
  const { household, transit } = await setup();
  await assert.rejects(() => transit.bookAuto(household.id, 'user-a', { x: 0, z: 0 }, 'not_real', 'auto:test:0002'));
  await assert.rejects(() => transit.bookAuto(household.id, 'outsider', { x: 0, z: 0 }, 'auto_bay_steps', 'auto:test:0003'));
});
