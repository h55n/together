import { describe, expect, it } from 'vitest';
import { recipes } from '@together/content';
import { CAFE_MENU } from '@together/shared';
import { LocalGameRepository } from '../db/LocalGameRepository';
import { HouseholdService } from './HouseholdService';
import { InventoryService } from './InventoryService';
import { ActivityService } from './ActivityService';

const items = [{ id: 'tea', price: 180 }, { id: 'milk', price: 80 }];

async function setup() {
  const repository = new LocalGameRepository();
  const household = await new HouseholdService(repository).createHousehold('alice', { name: 'Home', type: 'friends' });
  const inventory = new InventoryService(repository, { items, recipes });
  const activities = new ActivityService(repository, undefined, inventory);
  const stock = async (itemId: string) => (await repository.listInventory('household', household.id)).find(record => record.itemId === itemId)?.quantity ?? 0;
  const personalWallet = async () => (await repository.getHousehold(household.id))!.members[0]!.personalWallet;
  return { repository, household, inventory, activities, stock, personalWallet };
}

describe('café drinks become real food and money', () => {
  it('serving a drink charges the orderer and adds one household drink, replay-safe', async () => {
    const { household, activities, stock, personalWallet } = await setup();
    const cafe = await activities.start(household.id, 'alice', 'cafe_hangout', 'cafe-start');
    const before = await personalWallet();
    await activities.cafeCommand(cafe.id, 'alice', { key: 'order-chai', expectedRevision: 0, kind: 'order_drink', drink: 'chai' });
    expect(await stock('drink:chai')).toBe(0);
    expect(await personalWallet()).toBe(before);
    await activities.cafeCommand(cafe.id, 'alice', { key: 'serve-chai', expectedRevision: 1, kind: 'serve_drink', orderId: 'order-1', recipientId: 'alice' });
    expect(await stock('drink:chai')).toBe(1);
    expect(await personalWallet()).toBe(before - CAFE_MENU.chai);
    await activities.cafeCommand(cafe.id, 'alice', { key: 'serve-chai', expectedRevision: 1, kind: 'serve_drink', orderId: 'order-1', recipientId: 'alice' });
    expect(await stock('drink:chai')).toBe(1);
    expect(await personalWallet()).toBe(before - CAFE_MENU.chai);
  });

  it('sipping consumes the served drink', async () => {
    const { household, activities, stock } = await setup();
    const cafe = await activities.start(household.id, 'alice', 'cafe_hangout', 'cafe-sip-start');
    await activities.cafeCommand(cafe.id, 'alice', { key: 'order-1', expectedRevision: 0, kind: 'order_drink', drink: 'lemon_soda' });
    await activities.cafeCommand(cafe.id, 'alice', { key: 'serve-1', expectedRevision: 1, kind: 'serve_drink', orderId: 'order-1', recipientId: 'alice' });
    await activities.cafeCommand(cafe.id, 'alice', { key: 'sip-1', expectedRevision: 2, kind: 'sip_drink', orderId: 'order-1' });
    expect(await stock('drink:lemon_soda')).toBe(0);
    await activities.cafeCommand(cafe.id, 'alice', { key: 'sip-1', expectedRevision: 2, kind: 'sip_drink', orderId: 'order-1' });
    expect(await stock('drink:lemon_soda')).toBe(0);
  });

  it('serving fails without spending or serving when the orderer cannot pay', async () => {
    const { repository, household, activities, stock, personalWallet } = await setup();
    const saved = (await repository.getHousehold(household.id))!;
    saved.members[0]!.personalWallet = CAFE_MENU.filter_coffee - 1;
    await repository.saveHousehold(saved);
    const cafe = await activities.start(household.id, 'alice', 'cafe_hangout', 'cafe-broke-start');
    await activities.cafeCommand(cafe.id, 'alice', { key: 'order-broke', expectedRevision: 0, kind: 'order_drink', drink: 'filter_coffee' });
    await expect(activities.cafeCommand(cafe.id, 'alice', { key: 'serve-broke', expectedRevision: 1, kind: 'serve_drink', orderId: 'order-1', recipientId: 'alice' }))
      .rejects.toThrow(/Insufficient personal funds/i);
    expect(await stock('drink:filter_coffee')).toBe(0);
    expect(await personalWallet()).toBe(CAFE_MENU.filter_coffee - 1);
    const refreshed = await activities.list(household.id, 'alice');
    const session = refreshed.find(entry => entry.id === cafe.id)!;
    expect(session.state.cafe?.orders[0]?.servedTo).toBeUndefined();
  });
});
