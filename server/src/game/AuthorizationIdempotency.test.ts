import { describe, expect, it } from 'vitest';
import { LocalGameRepository } from '../db/LocalGameRepository';
import { ActivityService } from './ActivityService';
import { EconomyService } from './EconomyService';
import { HouseholdService } from './HouseholdService';
import { JobSessionService } from './JobSessionService';
import { MovingService } from './MovingService';
import { PropertySelectionService } from './PropertySelectionService';
import { RenovationService } from './RenovationService';

function services() {
  const repository = new LocalGameRepository();
  let randomValue = 0.07;
  const households = new HouseholdService(repository, () => {
    randomValue = (randomValue + 0.173) % 1;
    return randomValue;
  });
  const economy = new EconomyService(repository);
  return {
    repository,
    households,
    economy,
    jobs: new JobSessionService(repository, economy),
    activities: new ActivityService(repository),
    properties: new PropertySelectionService(repository, households),
    moving: new MovingService(repository, households),
    renovation: new RenovationService(repository, households),
  };
}

describe('authorization before idempotent/cache returns', () => {
  it('does not expose an existing job session to a non-member reusing its start key', async () => {
    const { households, jobs } = services();
    const household = await households.createHousehold('user-a', { name: 'Home', type: 'friends' });
    await jobs.start(household.id, 'user-a', 'cafe_roshan', 'job-start-0001');

    await expect(jobs.start(household.id, 'outsider', 'cafe_roshan', 'job-start-0001'))
      .rejects.toThrow(/active household member|active member/);
  });

  it('does not expose an existing activity session to a non-member reusing its idempotency key', async () => {
    const { households, activities } = services();
    const household = await households.createHousehold('user-a', { name: 'Home', type: 'friends' });
    await activities.start(household.id, 'user-a', 'picnic', 'activity-0001');

    await expect(activities.start(household.id, 'outsider', 'picnic', 'activity-0001'))
      .rejects.toThrow(/active household member|active member/);
  });

  it('authorizes callers before returning an already-resolved property vote', async () => {
    const { households, properties } = services();
    const household = await households.createHousehold('user-a', { name: 'Home', type: 'couple' });
    await households.joinHousehold('user-b', household.inviteCode);
    const vote = await properties.openPropertyVote(household.id, 'user-a', 'couple_studio');
    const resolved = await properties.castPropertyVote(vote.id, 'user-b', 'yes');
    expect(resolved.resolution).toBe('approved');

    await expect(properties.castPropertyVote(vote.id, 'outsider', 'yes'))
      .rejects.toThrow(/active member|active household member/);
  });

  it('authorizes callers before returning resolved moving and renovation votes', async () => {
    const { repository, households, moving, renovation } = services();
    const household = await households.createHousehold('user-a', { name: 'Home', type: 'friends' });
    const now = new Date().toISOString();
    await repository.saveVote({
      id: 'move-vote-resolved', householdId: household.id, type: 'moving', payload: {}, ballots: {}, resolution: 'approved', createdAt: now,
    });
    await repository.saveVote({
      id: 'reno-vote-resolved', householdId: household.id, type: 'renovation', payload: {}, ballots: {}, resolution: 'approved', createdAt: now,
    });

    await expect(moving.castMoveVote('move-vote-resolved', 'outsider', 'yes'))
      .rejects.toThrow(/active member|active household member/);
    await expect(renovation.castVote('reno-vote-resolved', 'outsider', 'yes'))
      .rejects.toThrow(/active member|active household member/);
  });

  it('rejects reuse of a transaction idempotency key from a different household/user scope', async () => {
    const { households, economy } = services();
    const first = await households.createHousehold('user-a', { name: 'A', type: 'friends' });
    const second = await households.createHousehold('user-b', { name: 'B', type: 'friends' });
    await economy.purchase(first.id, 'user-a', { itemId: 'chair_wood_01', wallet: 'household', idempotencyKey: 'purchase-shared-key' });

    await expect(economy.purchase(second.id, 'user-b', { itemId: 'chair_wood_01', wallet: 'household', idempotencyKey: 'purchase-shared-key' }))
      .rejects.toThrow(/idempotency key.*different|different.*scope/i);
  });
});
