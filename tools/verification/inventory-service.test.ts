import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalGameRepository } from '../../server/src/db/LocalGameRepository.js';
import { HouseholdService } from '../../server/src/game/HouseholdService.js';
import { InventoryService } from '../../server/src/game/InventoryService.js';
import { items, recipes } from '../../content/src/index.js';

async function setup() {
  const repo = new LocalGameRepository();
  const households = new HouseholdService(repo);
  const household = await households.createHousehold('user-a', { name: 'Kitchen Home', type: 'couple' });
  return { repo, household, inventory: new InventoryService(repo, { items, recipes }) };
}

test('grocery purchase charges the server-known market price exactly once and persists household stock', async () => {
  const { household, inventory } = await setup();
  const request = { itemId: 'rice', quantity: 2, wallet: 'household' as const, idempotencyKey: 'grocery-rice-0001' };
  const first = await inventory.purchaseGrocery(household.id, 'user-a', request);
  assert.equal(first.sharedWallet, 7740);
  assert.deepEqual(first.inventory.map((stack) => [stack.itemId, stack.quantity]), [['rice', 2]]);
  const second = await inventory.purchaseGrocery(household.id, 'user-a', request);
  assert.equal(second.sharedWallet, 7740);
  assert.deepEqual(second.inventory.map((stack) => [stack.itemId, stack.quantity]), [['rice', 2]]);
});

test('recipe ingredient consumption is authoritative, atomic and idempotent', async () => {
  const { household, inventory } = await setup();
  for (const itemId of ['rice', 'lentils', 'spices']) {
    await inventory.purchaseGrocery(household.id, 'user-a', { itemId, quantity: 1, wallet: 'household', idempotencyKey: `buy-${itemId}-khichdi` });
  }
  const first = await inventory.consumeRecipeIngredients(household.id, 'user-a', 'khichdi', 'cook-khichdi-0001');
  assert.equal(first.inventory.length, 0);
  const second = await inventory.consumeRecipeIngredients(household.id, 'user-a', 'khichdi', 'cook-khichdi-0001');
  assert.equal(second.inventory.length, 0);
});

test('missing ingredients reject the cooking transaction without consuming partial stock', async () => {
  const { household, inventory } = await setup();
  await inventory.purchaseGrocery(household.id, 'user-a', { itemId: 'rice', quantity: 1, wallet: 'household', idempotencyKey: 'buy-only-rice-0001' });
  await assert.rejects(() => inventory.consumeRecipeIngredients(household.id, 'user-a', 'khichdi', 'cook-missing-0001'), /Missing ingredients/);
  const stock = await inventory.listHouseholdInventory(household.id, 'user-a');
  assert.deepEqual(stock.map((stack) => [stack.itemId, stack.quantity]), [['rice', 1]]);
});
