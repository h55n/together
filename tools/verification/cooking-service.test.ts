import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalGameRepository } from '../../server/src/db/LocalGameRepository.js';
import { HouseholdService } from '../../server/src/game/HouseholdService.js';
import { InventoryService } from '../../server/src/game/InventoryService.js';
import { CookingService } from '../../server/src/game/CookingService.js';
import { items, recipes } from '../../content/src/index.js';

async function setup() {
  const repo = new LocalGameRepository();
  const households = new HouseholdService(repo, () => 0.42);
  const household = await households.createHousehold('a', { name: 'Shared Kitchen', type: 'couple' });
  await households.joinHousehold('b', household.inviteCode);
  const inventory = new InventoryService(repo, { items, recipes });
  for (const [itemId, quantity] of [['rice', 2], ['vegetables', 2], ['oil', 1]] as const) {
    await inventory.purchaseGrocery(household.id, 'a', { itemId, quantity, wallet: 'household', idempotencyKey: `kitchen-${itemId}-0001` });
  }
  return { repo, household, cooking: new CookingService(repo, inventory, recipes) };
}

test('cooking start reserves recipe ingredients exactly once and survives idempotent retry', async () => {
  const { repo, household, cooking } = await setup();
  const first = await cooking.start(household.id, 'a', 'fried_rice', 'cook-session-fried-rice-0001');
  const second = await cooking.start(household.id, 'a', 'fried_rice', 'cook-session-fried-rice-0001');
  assert.equal(first.id, second.id);
  const stock = await repo.listInventory('household', household.id);
  assert.equal(stock.find((stack) => stack.itemId === 'oil'), undefined);
  assert.equal(stock.find((stack) => stack.itemId === 'rice'), undefined); // consumed both recipe portions from purchased stock
});

test('two household members can own separate stations and finish one shared imperfect meal', async () => {
  const { household, cooking } = await setup();
  let session = await cooking.start(household.id, 'a', 'fried_rice', 'cook-session-coop-0001');
  session = await cooking.claimStation(household.id, 'a', session.id, 'sink');
  session = await cooking.completeStep(household.id, 'a', session.id, 'wash', false);
  session = await cooking.releaseStation(household.id, 'a', session.id, 'sink');
  session = await cooking.claimStation(household.id, 'b', session.id, 'counter');
  session = await cooking.completeStep(household.id, 'b', session.id, 'cut', false);
  session = await cooking.releaseStation(household.id, 'b', session.id, 'counter');
  session = await cooking.claimStation(household.id, 'a', session.id, 'hob_a');
  session = await cooking.completeStep(household.id, 'a', session.id, 'boil', false);
  session = await cooking.claimStation(household.id, 'b', session.id, 'hob_b');
  session = await cooking.completeStep(household.id, 'b', session.id, 'fry', true);
  session = await cooking.completeStep(household.id, 'b', session.id, 'stir', false);
  session = await cooking.releaseStation(household.id, 'b', session.id, 'hob_b');
  session = await cooking.claimStation(household.id, 'b', session.id, 'table');
  session = await cooking.completeStep(household.id, 'b', session.id, 'serve', false);
  assert.equal(session.state.status, 'completed');
  assert.equal(session.state.outcome?.quality, 'imperfect');
  assert.deepEqual(new Set(session.state.participants), new Set(['a','b']));
});

test('outsiders cannot join a household cooking session', async () => {
  const { household, cooking } = await setup();
  const session = await cooking.start(household.id, 'a', 'fried_rice', 'cook-session-private-0001');
  await assert.rejects(() => cooking.claimStation(household.id, 'outsider', session.id, 'counter'), /active household member/);
});

test('concurrent station mutations preserve both players instead of losing one update', async () => {
  const { household, cooking } = await setup();
  const session = await cooking.start(household.id, 'a', 'fried_rice', 'cook-session-concurrent-0001');

  await Promise.all([
    cooking.claimStation(household.id, 'a', session.id, 'sink'),
    cooking.claimStation(household.id, 'b', session.id, 'counter'),
  ]);

  let saved = (await cooking.list(household.id, 'a')).find((entry) => entry.id === session.id);
  assert.equal(saved?.state.stationClaims.sink, 'a');
  assert.equal(saved?.state.stationClaims.counter, 'b');

  await Promise.all([
    cooking.completeStep(household.id, 'a', session.id, 'wash', false),
    cooking.completeStep(household.id, 'b', session.id, 'cut', false),
  ]);

  saved = (await cooking.list(household.id, 'a')).find((entry) => entry.id === session.id);
  assert.deepEqual(new Set(saved?.state.completedStepIds), new Set(['wash', 'cut']));
  assert.deepEqual(new Set(saved?.state.participants), new Set(['a', 'b']));
});

test('concurrent claims for the same cooking station reject the second owner', async () => {
  const { household, cooking } = await setup();
  const session = await cooking.start(household.id, 'a', 'fried_rice', 'cook-session-same-station-0001');

  const results = await Promise.allSettled([
    cooking.claimStation(household.id, 'a', session.id, 'counter'),
    cooking.claimStation(household.id, 'b', session.id, 'counter'),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);

  const saved = (await cooking.list(household.id, 'a')).find((entry) => entry.id === session.id);
  assert.ok(saved?.state.stationClaims.counter === 'a' || saved?.state.stationClaims.counter === 'b');
});
