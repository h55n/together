import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { LocalGameRepository } from '../db/LocalGameRepository';
import { SupabaseGameRepository } from '../db/SupabaseGameRepository';
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
  it('recognizes the same payment retry after reading a completed hosted database row', async () => {
    const { households, jobs, repository } = services();
    const household = await households.createHousehold('user-a', { name: 'Home', type: 'friends' });
    let session = await jobs.start(household.id, 'user-a', 'cafe_roshan', 'hosted-start-0001');
    while (session.nextAction) session = await jobs.advance(session.id, 'user-a', session.nextAction);
    const key = `job-finish:${session.id}`;
    const paid = await jobs.complete(session.id, 'user-a', key);
    const row = {
      id: session.id, household_id: household.id, user_id: 'user-a', job_id: session.jobId,
      start_idempotency_key: session.startIdempotencyKey, completion_idempotency_key: key,
      state: 'complete', completed_actions: session.completedActions, mistakes: 0,
      started_at: session.startedAt, updated_at: paid.session.updatedAt,
    };
    const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: row, error: null }) };
    const hosted = new SupabaseGameRepository({ from: () => query } as unknown as SupabaseClient);
    vi.spyOn(repository, 'getJobSession').mockImplementation(id => hosted.getJobSession(id));
    const retried = await jobs.complete(session.id, 'user-a', key);
    expect(retried.session.completionIdempotencyKey).toBe(key);
    expect(retried.economy.personalWallet).toBe(paid.economy.personalWallet);
    expect(await repository.listTransactions(household.id)).toHaveLength(1);
    await expect(jobs.complete(session.id, 'user-a', 'different-payment-key')).rejects.toThrow('already paid');
  });

  it('reuses one active job across concurrent starts and allows a new shift after payment', async () => {
    const { households, jobs, repository } = services();
    const household = await households.createHousehold('user-a', { name: 'Home', type: 'friends' });
    const [first, second] = await Promise.all([
      jobs.start(household.id, 'user-a', 'cafe_roshan', 'parallel-start-0001'),
      jobs.start(household.id, 'user-a', 'cafe_roshan', 'parallel-start-0002'),
    ]);
    expect(second.id).toBe(first.id);
    expect(await repository.listJobSessions(household.id, 'user-a')).toHaveLength(1);
    let progress = first;
    while (progress.nextAction) progress = await jobs.advance(first.id, 'user-a', progress.nextAction);
    await jobs.complete(first.id, 'user-a', `job-finish:${first.id}`);
    const next = await jobs.start(household.id, 'user-a', 'cafe_roshan', 'parallel-start-0003');
    expect(next.id).not.toBe(first.id);
    expect(next.completedActions).toEqual([]);
  });

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
