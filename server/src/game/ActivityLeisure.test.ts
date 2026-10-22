import { describe, expect, it } from 'vitest';
import { LocalGameRepository } from '../db/LocalGameRepository';
import { HouseholdService } from './HouseholdService';
import { ActivityService } from './ActivityService';

describe('persistent leisure authority', () => {
  it('lets a guest join an arranged picnic and share its existing food', async () => {
    const repository = new LocalGameRepository(), households = new HouseholdService(repository);
    const household = await households.createHousehold('alice', { name: 'Home', type: 'friends' });
    await households.joinHousehold('bob', household.inviteCode);
    const service = new ActivityService(repository);
    const session = await service.start(household.id, 'alice', 'picnic', 'join-picnic-start');
    const brought = await service.picnicCommand(session.id, 'alice', { key: 'bring-idli', expectedRevision: 0, kind: 'bring_food', food: 'idli' });
    const joined = await service.join(session.id, 'bob');
    expect(joined.state.picnic!.participants).toEqual(['alice', 'bob']);
    expect(joined.state.picnic!.revision).toBe(1);
    expect(joined.state.picnic!.portions).toEqual(brought.state.picnic!.portions);
    const portionId = joined.state.picnic!.portions[0]!.id;
    await service.picnicCommand(session.id, 'bob', { key: 'serve-bob', expectedRevision: 1, kind: 'serve_food', portionId, recipientId: 'bob' });
    const eaten = await service.picnicCommand(session.id, 'bob', { key: 'eat-bob', expectedRevision: 2, kind: 'eat_food', portionId });
    expect(eaten.state.picnic!.portions[0]!.eatenBy).toBe('bob');
  });
  it('starts picnic and café with playable state and prevents checklist bypass', async () => {
    const repository = new LocalGameRepository();
    const household = await new HouseholdService(repository).createHousehold('alice', { name: 'Home', type: 'friends' });
    const service = new ActivityService(repository);
    for (const [activity, step] of [['picnic', 'place_mat'], ['cafe_hangout', 'choose_seat']] as const) {
      const session = await service.start(household.id, 'alice', activity, `leisure-start-${activity}`);
      expect(activity === 'picnic' ? session.state.picnic : session.state.cafe).toBeDefined();
      await expect(service.advance(session.id, 'alice', step)).rejects.toThrow(/commands/);
    }
  });
  it('recovers picnic lost replies across service instances and rejects stale concurrent changes', async () => {
    const repository = new LocalGameRepository();
    const household = await new HouseholdService(repository).createHousehold('alice', { name: 'Home', type: 'friends' });
    const service = new ActivityService(repository), other = new ActivityService(repository);
    const session = await service.start(household.id, 'alice', 'picnic', 'picnic-authority-start');
    const command = { key: 'picnic-mat', expectedRevision: 0, kind: 'place_mat' as const, x: 0, z: 0 };
    const results = await Promise.allSettled([
      service.picnicCommand(session.id, 'alice', command),
      other.picnicCommand(session.id, 'alice', { ...command, key: 'other-mat', x: 1 }),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const saved = (await service.list(household.id, 'alice'))[0]!;
    const accepted = Object.keys(saved.state.receipts!)[0]!;
    const original = accepted === command.key ? command : { ...command, key: 'other-mat', x: 1 };
    const retry = await other.picnicCommand(session.id, 'alice', original);
    expect(retry.state.revision).toBe(saved.state.revision);
    await expect(service.picnicCommand(session.id, 'alice', { ...original, x: 2 })).rejects.toThrow(/different/);
    await expect(service.picnicCommand(session.id, 'outsider', command)).rejects.toThrow(/member/);
  });
  it('persists café serving and consumption while leaving completion to the guests', async () => {
    const repository = new LocalGameRepository();
    const household = await new HouseholdService(repository).createHousehold('alice', { name: 'Home', type: 'friends' });
    const service = new ActivityService(repository);
    const session = await service.start(household.id, 'alice', 'cafe_hangout', 'cafe-authority-start');
    const ordered = await service.cafeCommand(session.id, 'alice', { key: 'order-chai', expectedRevision: 0, kind: 'order_drink', drink: 'chai' });
    const orderId = ordered.state.cafe!.orders[0]!.id;
    const served = await service.cafeCommand(session.id, 'alice', { key: 'serve-chai', expectedRevision: 1, kind: 'serve_drink', orderId, recipientId: 'alice' });
    expect(served.state.status).toBe('active');
    const sipped = await service.cafeCommand(session.id, 'alice', { key: 'sip-chai', expectedRevision: 2, kind: 'sip_drink', orderId });
    expect(sipped.state.cafe!.orders[0]!.sippedBy).toBe('alice');
    expect(sipped.state.status).toBe('active');
    const finished = await service.cafeCommand(session.id, 'alice', { key: 'finish-cafe', expectedRevision: 3, kind: 'finish' });
    expect(finished.state.status).toBe('complete');
  });
});
