import { describe, expect, it } from 'vitest';
import { LocalGameRepository } from '../db/LocalGameRepository';
import { HouseholdService } from './HouseholdService';
import { ActivityService } from './ActivityService';
import { InventoryService } from './InventoryService';

const catalog = { items: [{ id: 'semolina', price: 85 }, { id: 'tea', price: 180 }, { id: 'milk', price: 80 }], recipes: [] };

async function setup(stock: Record<string, number>) {
  const repository = new LocalGameRepository();
  const household = await new HouseholdService(repository).createHousehold('alice', { name: 'Home', type: 'friends' });
  for (const [itemId, quantity] of Object.entries(stock)) await repository.saveInventory({ ownerType: 'household', ownerId: household.id, itemId, quantity, metadata: {} });
  const inventory = new InventoryService(repository, catalog);
  const service = new ActivityService(repository, undefined, inventory);
  const session = await service.start(household.id, 'alice', 'picnic', 'provision-picnic-start');
  const stockOf = async (itemId: string) => (await repository.listInventory('household', household.id)).find(r => r.itemId === itemId)?.quantity ?? 0;
  return { repository, household, service, session, stockOf };
}

describe('picnic food comes from household inventory', () => {
  it('consumes the matching groceries when food is brought', async () => {
    const { service, session, stockOf } = await setup({ semolina: 2 });
    const next = await service.picnicCommand(session.id, 'alice', { key: 'bring-idli', expectedRevision: 0, kind: 'bring_food', food: 'idli' });
    expect(next.state.picnic!.portions).toHaveLength(1);
    expect(await stockOf('semolina')).toBe(1);
  });
  it('rejects bringing food the household does not have and leaves the picnic unchanged', async () => {
    const { service, session, stockOf } = await setup({ tea: 1 });
    await expect(service.picnicCommand(session.id, 'alice', { key: 'bring-chai', expectedRevision: 0, kind: 'bring_food', food: 'chai' })).rejects.toThrow(/Missing ingredients/);
    expect(await stockOf('tea')).toBe(1);
    expect((await service.sportsSnapshot(session.id, 'alice')).state.picnic!.portions).toHaveLength(0);
  });
  it('does not consume twice when the same command is retried after a lost reply', async () => {
    const { service, session, stockOf } = await setup({ semolina: 2 });
    const command = { key: 'bring-idli', expectedRevision: 0, kind: 'bring_food' as const, food: 'idli' as const };
    await service.picnicCommand(session.id, 'alice', command);
    await service.picnicCommand(session.id, 'alice', command);
    expect(await stockOf('semolina')).toBe(1);
  });
  it('does not lose groceries when a stale revision is rejected, and a corrected retry consumes once', async () => {
    const { service, session, stockOf } = await setup({ semolina: 1 });
    await service.picnicCommand(session.id, 'alice', { key: 'mat', expectedRevision: 0, kind: 'place_mat', x: 0, z: 0 });
    await expect(service.picnicCommand(session.id, 'alice', { key: 'bring-stale', expectedRevision: 0, kind: 'bring_food', food: 'idli' })).rejects.toThrow(/changed/);
    expect(await stockOf('semolina')).toBe(1);
    await service.picnicCommand(session.id, 'alice', { key: 'bring-fresh', expectedRevision: 1, kind: 'bring_food', food: 'idli' });
    expect(await stockOf('semolina')).toBe(0);
  });
});
