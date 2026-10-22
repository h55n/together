import { describe, expect, it } from 'vitest';
import { recipes } from '@together/content';
import { LocalGameRepository } from '../db/LocalGameRepository';
import { HouseholdService } from './HouseholdService';
import { InventoryService } from './InventoryService';
import { CookingService } from './CookingService';
import { ActivityService } from './ActivityService';

const items = [{ id: 'tea', price: 180 }, { id: 'milk', price: 80 }, { id: 'sugar', price: 75 }];

async function setup() {
  const repository = new LocalGameRepository();
  const household = await new HouseholdService(repository).createHousehold('alice', { name: 'Home', type: 'friends' });
  for (const itemId of ['tea', 'milk']) await repository.saveInventory({ ownerType: 'household', ownerId: household.id, itemId, quantity: 1, metadata: {} });
  const inventory = new InventoryService(repository, { items, recipes });
  const cooking = new CookingService(repository, inventory, recipes);
  const stock = async (itemId: string) => (await repository.listInventory('household', household.id)).find(record => record.itemId === itemId)?.quantity ?? 0;
  return { repository, household, inventory, cooking, stock };
}

async function cookChai(cooking: CookingService, householdId: string) {
  let session = await cooking.start(householdId, 'alice', 'chai', 'cook-chai-start');
  // Each step happens at its own station; a cook moves between them.
  for (const [step, station] of [['measure', 'counter'], ['boil', 'hob'], ['pour', 'counter'], ['serve', 'table']] as const) {
    session = await cooking.claimStation(householdId, 'alice', session.id, station);
    session = await cooking.completeStep(householdId, 'alice', session.id, step, false);
  }
  return session;
}

describe('cooked dishes become household food', () => {
  it('adds one dish per serving to the household shelf when cooking completes', async () => {
    const { household, cooking, stock } = await setup();
    const session = await cookChai(cooking, household.id);
    expect(session.state.status).toBe('completed');
    expect(await stock('dish:chai')).toBe(2);
    expect(await stock('tea')).toBe(0);
  });

  it('brings a cooked dish to a picnic before spending raw groceries', async () => {
    const { repository, household, inventory, cooking, stock } = await setup();
    await cookChai(cooking, household.id);
    await repository.saveInventory({ ownerType: 'household', ownerId: household.id, itemId: 'tea', quantity: 1, metadata: {} });
    await repository.saveInventory({ ownerType: 'household', ownerId: household.id, itemId: 'milk', quantity: 1, metadata: {} });
    const activities = new ActivityService(repository, undefined, inventory);
    const picnic = await activities.start(household.id, 'alice', 'picnic', 'cooked-picnic-start');
    await activities.picnicCommand(picnic.id, 'alice', { key: 'bring-cooked-chai', expectedRevision: 0, kind: 'bring_food', food: 'chai' });
    expect(await stock('dish:chai')).toBe(1);
    expect(await stock('tea')).toBe(1);
    // A lost-reply retry neither spends a second dish nor falls back to raw groceries.
    await activities.picnicCommand(picnic.id, 'alice', { key: 'bring-cooked-chai', expectedRevision: 0, kind: 'bring_food', food: 'chai' });
    expect(await stock('dish:chai')).toBe(1);
    expect(await stock('tea')).toBe(1);
  });
});
