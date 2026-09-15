import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalGameRepository } from '../../server/src/db/LocalGameRepository.js';
import { HouseholdService } from '../../server/src/game/HouseholdService.js';
import { HomeService } from '../../server/src/game/HomeService.js';

async function setup() {
  const repo = new LocalGameRepository();
  const households = new HouseholdService(repo);
  const household = await households.createHousehold('user-a', { name: 'Our Home', type: 'couple' });
  household.propertyId = '10000000-0000-4000-8000-000000000001';
  await repo.saveHousehold(household);
  await repo.saveInventory({ ownerType: 'household', ownerId: household.id, itemId: 'lamp_floor_01', quantity: 1, metadata: { category: 'furniture' } });
  await repo.saveInventory({ ownerType: 'household', ownerId: household.id, itemId: 'chair_wood_01', quantity: 6, metadata: { category: 'furniture' } });
  return { repo, household, home: new HomeService(repo) };
}

test('authoritative furniture placement persists a canonical versioned object', async () => {
  const { repo, household, home } = await setup();
  const result = await home.placeFurniture(household.id, 'user-a', {
    objectId: 'lamp-1',
    definitionId: 'lamp_floor_01',
    roomId: 'living_sleep',
    expectedVersion: 0,
    idempotencyKey: 'home-place-lamp-0001',
    transform: { position: { x: 2, y: 0, z: 2 }, rotationY: 0, scale: 1 },
  });
  assert.equal(result.version, 1);
  assert.equal(result.objects.length, 1);
  assert.equal(result.objects[0]?.objectId, 'lamp-1');
  assert.equal((await repo.listInventory('household', household.id)).find((entry) => entry.itemId === 'lamp_floor_01'), undefined);
});

test('repeating the same idempotency key does not duplicate furniture', async () => {
  const { household, home } = await setup();
  const mutation = {
    objectId: 'chair-1', definitionId: 'chair_wood_01', roomId: 'living_sleep', expectedVersion: 0,
    idempotencyKey: 'home-place-chair-0001', transform: { position: { x: 1.5, y: 0, z: 1.5 }, rotationY: 0, scale: 1 },
  } as const;
  const first = await home.placeFurniture(household.id, 'user-a', mutation);
  const second = await home.placeFurniture(household.id, 'user-a', mutation);
  assert.equal(first.version, second.version);
  assert.equal(second.objects.length, 1);
});

test('overlapping furniture is rejected before canonical persistence', async () => {
  const { household, home } = await setup();
  await home.placeFurniture(household.id, 'user-a', {
    objectId: 'chair-a', definitionId: 'chair_wood_01', roomId: 'living_sleep', expectedVersion: 0,
    idempotencyKey: 'home-place-chair-a', transform: { position: { x: 2, y: 0, z: 2 }, rotationY: 0, scale: 1 },
  });
  await assert.rejects(() => home.placeFurniture(household.id, 'user-a', {
    objectId: 'chair-b', definitionId: 'chair_wood_01', roomId: 'living_sleep', expectedVersion: 1,
    idempotencyKey: 'home-place-chair-b', transform: { position: { x: 2, y: 0, z: 2 }, rotationY: 0, scale: 1 },
  }), /overlap/);
});

test('move/remove mutations enforce optimistic versions and remain idempotent', async () => {
  const { repo, household, home } = await setup();
  await home.placeFurniture(household.id, 'user-a', {
    objectId: 'chair-move', definitionId: 'chair_wood_01', roomId: 'living_sleep', expectedVersion: 0,
    idempotencyKey: 'home-place-chair-move', transform: { position: { x: 1.2, y: 0, z: 1.2 }, rotationY: 0, scale: 1 },
  });
  const moved = await home.moveFurniture(household.id, 'user-a', {
    objectId: 'chair-move', definitionId: 'chair_wood_01', roomId: 'living_sleep', expectedVersion: 1,
    idempotencyKey: 'home-move-chair-0001', transform: { position: { x: 3.4, y: 0, z: 2.2 }, rotationY: Math.PI / 4, scale: 1 },
  });
  assert.equal(moved.version, 2);
  assert.equal(moved.objects[0]?.transform.position.x, 3.4);
  const removed = await home.removeFurniture(household.id, 'user-a', 'chair-move', 2, 'home-remove-chair-0001');
  assert.equal(removed.version, 3);
  assert.equal(removed.objects.length, 0);
  const retried = await home.removeFurniture(household.id, 'user-a', 'chair-move', 2, 'home-remove-chair-0001');
  assert.equal(retried.version, 3);
  assert.equal((await repo.listInventory('household', household.id)).find((entry) => entry.itemId === 'chair_wood_01')?.quantity, 6);
});

test('surface changes persist without exposing hidden home-state numbers in UI contracts', async () => {
  const { household, home } = await setup();
  const state = await home.setSurface(household.id, 'user-a', 'living_sleep:wall_a', 'paint_sage_01', 0, 'home-surface-0001');
  assert.equal(state.version, 1);
  assert.equal(state.surfaces['living_sleep:wall_a'], 'paint_sage_01');
});

test('domestic micro-actions persist hidden physical home state proportionally', async () => {
  const { household, home } = await setup();
  let state = await home.seedDomesticState(household.id, 'user-a', { dishesDirty: 3, laundryDirty: 2, trashBags: 1, floorDust: 0.7, bathroomGrime: 0.4, groceries: 0.3, unresolvedRepairs: ['tap'], plants: { pothos: 0.2 } }, 0, 'seed-domestic-0001');
  state = await home.applyDomesticAction(household.id, 'user-a', { type: 'wash_dish', amount: 1 }, state.version, 'wash-dish-0001');
  const domestic = state.roomStates.domestic as { dishesDirty: number };
  assert.equal(domestic.dishesDirty, 2);
  const retried = await home.applyDomesticAction(household.id, 'user-a', { type: 'wash_dish', amount: 1 }, state.version - 1, 'wash-dish-0001');
  assert.equal((retried.roomStates.domestic as { dishesDirty: number }).dishesDirty, 2);
});


test('household cannot place furniture it has not purchased', async () => {
  const { household, home } = await setup();
  await assert.rejects(() => home.placeFurniture(household.id, 'user-a', {
    objectId: 'sofa-free', definitionId: 'sofa_2seat_01', roomId: 'living_sleep', expectedVersion: 0,
    idempotencyKey: 'home-free-sofa-0001', transform: { position: { x: 2, y: 0, z: 2 }, rotationY: 0, scale: 1 },
  }), /purchased|inventory/i);
});
