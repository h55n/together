import { describe, expect, it } from 'vitest';
import { LocalGameRepository } from '../db/LocalGameRepository';
import { HouseholdService } from './HouseholdService';

describe('HouseholdService', () => {
  it('creates a Couple household with canonical starting funds and six-character code', async () => {
    const service = new HouseholdService(new LocalGameRepository(), () => 0);
    const household = await service.createHousehold('user-a', { name: 'Sea Window', type: 'couple' });
    expect(household.sharedWallet).toBe(8000);
    expect(household.inviteCode).toHaveLength(6);
    expect(household.members).toHaveLength(1);
    expect(household.members[0]?.personalWallet).toBe(1500);
  });

  it('prevents a third active member from joining Couple mode', async () => {
    const service = new HouseholdService(new LocalGameRepository(), () => 0.1);
    const household = await service.createHousehold('user-a', { name: 'Two Only', type: 'couple' });
    await service.joinHousehold('user-b', household.inviteCode);
    await expect(service.joinHousehold('user-c', household.inviteCode)).rejects.toThrow('Couple households are limited to 2 members');
  });

  it('allows up to six Friends members', async () => {
    const service = new HouseholdService(new LocalGameRepository(), () => 0.2);
    const household = await service.createHousehold('u0', { name: 'PG Gang', type: 'friends' });
    for (let i = 1; i < 6; i += 1) await service.joinHousehold(`u${i}`, household.inviteCode);
    await expect(service.joinHousehold('u6', household.inviteCode)).rejects.toThrow('Friends households are limited to 6 members');
  });

  it('creates a solo explorer with the canonical UUID-backed 1BHK and normal starting funds', async () => {
    const service = new HouseholdService(new LocalGameRepository(), () => 0.3);
    const household = await service.createSoloExplorer('user-a');
    expect(household.type).toBe('friends');
    expect(household.propertyId).toBe('10000000-0000-4000-8000-000000000002');
    expect(household.sharedWallet).toBe(8000);
    expect(household.hiddenState).toMatchObject({
      soloExplorer: true,
      flags: { property_assigned: true, moved_in: true },
    });
    expect(household.members).toHaveLength(1);
  });
});
