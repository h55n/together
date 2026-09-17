import test from 'node:test';
import assert from 'node:assert/strict';
import type { TransactionRecord } from '../../server/src/db/GameRepository.js';
import { LocalGameRepository } from '../../server/src/db/LocalGameRepository.js';
import { HouseholdService } from '../../server/src/game/HouseholdService.js';
import { HomeService } from '../../server/src/game/HomeService.js';
import { MovingService } from '../../server/src/game/MovingService.js';

class FailingTransactionRepository extends LocalGameRepository {
  failTransactionWrites = false;

  override async saveTransaction(transaction: TransactionRecord): Promise<void> {
    if (this.failTransactionWrites) throw new Error('simulated transaction persistence failure');
    await super.saveTransaction(transaction);
  }
}

async function setup(repo: LocalGameRepository = new LocalGameRepository()) {
  const households = new HouseholdService(repo, () => 0.52);
  const created = await households.createHousehold('a', { name: 'Moving Home', type: 'couple' });
  await households.joinHousehold('b', created.inviteCode);
  const household = (await repo.getHousehold(created.id))!;
  household.propertyId = '10000000-0000-4000-8000-000000000001';
  await repo.saveHousehold(household);
  await repo.saveInventory({ ownerType: 'household', ownerId: household.id, itemId: 'lamp_floor_01', quantity: 1, metadata: { category: 'furniture' } });
  await repo.saveInventory({ ownerType: 'household', ownerId: household.id, itemId: 'chair_wood_01', quantity: 1, metadata: { category: 'furniture' } });
  const home = new HomeService(repo);
  let state = await home.placeFurniture(household.id, 'a', {
    objectId: 'lamp-memory', definitionId: 'lamp_floor_01', roomId: 'living_sleep', expectedVersion: 0,
    idempotencyKey: 'moving-lamp-place-0001', transform: { position: { x: 1.2, y: 0, z: 1.2 }, rotationY: 0, scale: 1 },
  });
  state = await home.placeFurniture(household.id, 'a', {
    objectId: 'chair-donate', definitionId: 'chair_wood_01', roomId: 'living_sleep', expectedVersion: state.version,
    idempotencyKey: 'moving-chair-place-0001', transform: { position: { x: 3.5, y: 0, z: 2.4 }, rotationY: 0, scale: 1 },
  });
  return { repo, household, moving: new MovingService(repo, households) };
}

test('Couple moving decision requires both members before packing can begin', async () => {
  const { repo, household, moving } = await setup();
  const vote = await moving.openMoveVote(household.id, 'a', 'one_bhk');
  assert.equal(vote.resolution, 'pending');
  const approved = await moving.castMoveVote(vote.id, 'b', 'yes');
  assert.equal(approved.resolution, 'approved');
  const updated = await repo.getHousehold(household.id);
  assert.equal((updated?.hiddenState.moving as { status?: string } | undefined)?.status, 'packing');
  assert.equal(updated?.propertyId, '10000000-0000-4000-8000-000000000001');
});

test('moving packs sentimental objects into new-home boxes, drops donated items and commits once', async () => {
  const { repo, household, moving } = await setup();
  const vote = await moving.openMoveVote(household.id, 'a', 'one_bhk');
  await moving.castMoveVote(vote.id, 'b', 'yes');
  await moving.packObject(household.id, 'a', 'lamp-memory', 'keep');
  await moving.packObject(household.id, 'b', 'chair-donate', 'donate');
  const first = await moving.commitMove(household.id, 'a', 'move-commit-0001');
  const second = await moving.commitMove(household.id, 'a', 'move-commit-0001');
  assert.equal(first.household.propertyId, '10000000-0000-4000-8000-000000000002');
  assert.equal(second.transaction.id, first.transaction.id);
  assert.ok(first.household.sharedWallet < 8000);
  const home = await repo.getHomeState(household.id);
  assert.equal(home?.objects.length, 0);
  const boxes = home?.roomStates.movingBoxes as Array<{ objectId: string }>;
  assert.deepEqual(boxes.map((box) => box.objectId), ['lamp-memory']);
  const movingState = first.household.hiddenState.moving as { fromPropertyId: string; status: string };
  assert.equal(movingState.fromPropertyId, '10000000-0000-4000-8000-000000000001');
  assert.equal(movingState.status, 'moved');
});

test('failed moving ledger write rolls back property, wallet and home together', async () => {
  const repo = new FailingTransactionRepository();
  const { household, moving } = await setup(repo);
  const vote = await moving.openMoveVote(household.id, 'a', 'one_bhk');
  await moving.castMoveVote(vote.id, 'b', 'yes');
  await moving.packObject(household.id, 'a', 'lamp-memory', 'keep');
  await moving.packObject(household.id, 'b', 'chair-donate', 'donate');
  repo.failTransactionWrites = true;

  await assert.rejects(() => moving.commitMove(household.id, 'a', 'move-atomic-fail-001'), /simulated transaction persistence failure/);

  const fresh = await repo.getHousehold(household.id);
  assert.equal(fresh?.propertyId, '10000000-0000-4000-8000-000000000001');
  assert.equal(fresh?.sharedWallet, 8000);
  const home = await repo.getHomeState(household.id);
  assert.equal(home?.objects.length, 2);
  assert.equal(home?.roomStates.movingBoxes, undefined);
});

test('moving state exposes the latest household vote and persisted packing plan after reconnect', async () => {
  const { household, moving } = await setup();
  const vote = await moving.openMoveVote(household.id, 'a', 'one_bhk');
  let state = await moving.getState(household.id, 'a');
  assert.equal(state.vote?.id, vote.id);
  assert.equal(state.plan, null);

  await moving.castMoveVote(vote.id, 'b', 'yes');
  state = await moving.getState(household.id, 'b');
  assert.equal(state.vote?.resolution, 'approved');
  assert.equal(state.plan?.status, 'packing');
  assert.equal(state.plan?.targetPropertyId, '10000000-0000-4000-8000-000000000002');
});

test('minimalist households can pack an authored starter box even with no placed decor', async () => {
  const repo = new LocalGameRepository();
  const households = new HouseholdService(repo, () => 0.63);
  const created = await households.createHousehold('a', { name: 'Minimal Home', type: 'couple' });
  await households.joinHousehold('b', created.inviteCode);
  const household = (await repo.getHousehold(created.id))!;
  household.propertyId = '10000000-0000-4000-8000-000000000001';
  await repo.saveHousehold(household);
  const moving = new MovingService(repo, households);
  const vote = await moving.openMoveVote(household.id, 'a', 'one_bhk');
  await moving.castMoveVote(vote.id, 'b', 'yes');
  const plan = await moving.packObject(household.id, 'a', 'starter-box:core', 'keep');
  assert.equal(plan.status, 'ready');
  const result = await moving.commitMove(household.id, 'a', 'minimal-move-0001');
  assert.equal(result.household.propertyId, '10000000-0000-4000-8000-000000000002');
});
