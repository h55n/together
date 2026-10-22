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

test('independent transit services charge two concurrent trips without losing either debit', async () => {
  const { repository, household, transit } = await setup();
  const other = new TransitService(repository);
  const results = await Promise.all([
    transit.bookAuto(household.id, 'user-a', { x: -200, z: 150 }, 'auto_bay_steps', 'auto:parallel:1'),
    other.bookAuto(household.id, 'user-a', { x: -200, z: 150 }, 'auto_bay_steps', 'auto:parallel:2'),
  ]);
  const saved = await repository.getHousehold(household.id);
  assert.equal(saved!.members[0]!.personalWallet, household.members[0]!.personalWallet - results[0]!.fare - results[1]!.fare);
  assert.equal((await repository.listTransactions(household.id)).length, 2);
  await assert.rejects(() => transit.bookAuto(household.id, 'user-a', { x: -199, z: 150 }, 'auto_bay_steps', 'auto:parallel:1'), /different transit/);
});
