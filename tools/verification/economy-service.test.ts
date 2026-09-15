import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalGameRepository } from '../../server/src/db/LocalGameRepository.js';
import { HouseholdService } from '../../server/src/game/HouseholdService.js';
import { EconomyService } from '../../server/src/game/EconomyService.js';

async function setup() {
  const repo = new LocalGameRepository();
  const households = new HouseholdService(repo);
  const household = await households.createHousehold('user-a', { name: 'Wallet Test', type: 'couple' });
  return { repo, household, economy: new EconomyService(repo) };
}

test('server-known furniture price is charged exactly once by idempotency key', async () => {
  const { repo, household, economy } = await setup();
  const first = await economy.purchase(household.id, 'user-a', { itemId: 'lamp_floor_01', wallet: 'household', idempotencyKey: 'purchase-lamp-0001' });
  assert.equal(first.sharedWallet, 7220);
  const second = await economy.purchase(household.id, 'user-a', { itemId: 'lamp_floor_01', wallet: 'household', idempotencyKey: 'purchase-lamp-0001' });
  assert.equal(second.sharedWallet, 7220);
  assert.equal((await economy.listTransactions(household.id, 'user-a')).length, 1);
  const inventory = await repo.listInventory('household', household.id);
  assert.equal(inventory.find((entry) => entry.itemId === 'lamp_floor_01')?.quantity, 1);
});

test('job payouts are server-authoritative and enter personal wallet', async () => {
  const { household, economy } = await setup();
  const result = await economy.completeJobShift(household.id, 'user-a', 'cafe_roshan', 'standard', 'job-cafe-0001');
  assert.equal(result.personalWallet, 2200);
  const repeated = await economy.completeJobShift(household.id, 'user-a', 'cafe_roshan', 'standard', 'job-cafe-0001');
  assert.equal(repeated.personalWallet, 2200);
});
