import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { LocalGameRepository } from '../db/LocalGameRepository';
import { SupabaseGameRepository } from '../db/SupabaseGameRepository';
import type { TransactionRecord } from '../db/GameRepository';
import { HouseholdService } from './HouseholdService';
import { TransitService } from './TransitService';

async function setup() {
  const repository = new LocalGameRepository();
  const household = await new HouseholdService(repository).createHousehold('user-a', { name: 'Ride Home', type: 'couple' });
  return { repository, household, first: new TransitService(repository), second: new TransitService(repository) };
}
const origin = { x: -200, z: 150 };
const destination = 'auto_bay_steps';

describe('atomic transit fare', () => {
  it('rejects malformed departure coordinates without creating a charge or receipt', async () => {
    const { repository, household, first } = await setup();
    for (const from of [{ x: NaN, z: 0 }, { x: Infinity, z: 0 }, { x: 451, z: 0 }])
      await expect(first.bookAuto(household.id, 'user-a', from, destination, 'invalid-origin')).rejects.toThrow(/departure/);
    expect(await repository.listTransactions(household.id)).toHaveLength(0);
    expect((await repository.getHousehold(household.id))!.members[0]!.personalWallet).toBe(1500);
  });
  it('concurrent independent services charge each distinct booking against the latest balance', async () => {
    const { repository, household, first, second } = await setup();
    const [a, b] = await Promise.all([
      first.bookAuto(household.id, 'user-a', origin, destination, 'ride-key-a'),
      second.bookAuto(household.id, 'user-a', origin, destination, 'ride-key-b'),
    ]);
    expect((await repository.getHousehold(household.id))!.members[0]!.personalWallet).toBe(1500 - a.fare - b.fare);
    expect(await repository.listTransactions(household.id)).toHaveLength(2);
    const [retryA, retryB] = await Promise.all([
      first.bookAuto(household.id, 'user-a', origin, destination, 'ride-key-a'),
      second.bookAuto(household.id, 'user-a', origin, destination, 'ride-key-a'),
    ]);
    expect(retryA.transaction.id).toBe(a.transaction.id); expect(retryB.transaction.id).toBe(a.transaction.id);
    expect(retryA.personalWallet).toBe(b.personalWallet);
    expect(await repository.listTransactions(household.id)).toHaveLength(2);
  });
  it('a concurrently retried fresh key debits once, and the final affordable ride wins atomically', async () => {
    const { repository, household, first, second } = await setup();
    const pair = await Promise.all([
      first.bookAuto(household.id, 'user-a', origin, destination, 'retry-key'),
      second.bookAuto(household.id, 'user-a', origin, destination, 'retry-key'),
    ]);
    expect(pair[0].transaction.id).toBe(pair[1].transaction.id);
    expect(await repository.listTransactions(household.id)).toHaveLength(1);
    const saved = (await repository.getHousehold(household.id))!; saved.members[0]!.personalWallet = pair[0].fare;
    await repository.saveHousehold(saved);
    const attempts = await Promise.allSettled([
      first.bookAuto(household.id, 'user-a', origin, destination, 'last-key-a'),
      second.bookAuto(household.id, 'user-a', origin, destination, 'last-key-b'),
    ]);
    expect(attempts.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect((await repository.getHousehold(household.id))!.members[0]!.personalWallet).toBe(0);
    expect(await repository.listTransactions(household.id)).toHaveLength(2);
  });
  it('rejects changed actor, household, destination, or departure before replaying a receipt', async () => {
    const { repository, household, first } = await setup();
    household.members.push({ userId: 'user-b', personalWallet: 1500, membershipState: 'active', joinedAt: new Date().toISOString() });
    await repository.saveHousehold(household);
    const other = await new HouseholdService(repository).createHousehold('user-a', { name: 'Other Ride Home', type: 'couple' });
    await first.bookAuto(household.id, 'user-a', origin, destination, 'owned-key');
    for (const [home, actor, from, target] of [
      [household.id, 'user-b', origin, destination], [other.id, 'user-a', origin, destination],
      [household.id, 'user-a', origin, 'auto_hill_garden'], [household.id, 'user-a', { x: -199, z: 150 }, destination],
    ] as const) await expect(first.bookAuto(home, actor, from, target, 'owned-key')).rejects.toThrow(/different transit/);
    const saved = (await repository.getHousehold(household.id))!; saved.members[0]!.membershipState = 'left'; await repository.saveHousehold(saved);
    await expect(first.bookAuto(household.id, 'user-a', origin, destination, 'owned-key')).rejects.toThrow(/active household/);
  });
  it('failed receipt insertion leaves both wallet and receipt unchanged, then the same key retries safely', async () => {
    const { repository, household, first } = await setup();
    const transactions = (repository as unknown as { transactions: Map<string, TransactionRecord> }).transactions;
    const insert = vi.spyOn(transactions, 'set').mockImplementationOnce(() => { throw new Error('receipt insert failed'); });
    await expect(first.bookAuto(household.id, 'user-a', origin, destination, 'failed-key')).rejects.toThrow('receipt insert failed');
    expect(await repository.getTransactionByIdempotencyKey('failed-key')).toBeNull();
    expect((await repository.getHousehold(household.id))!.members[0]!.personalWallet).toBe(1500);
    insert.mockRestore();
    const retry = await first.bookAuto(household.id, 'user-a', origin, destination, 'failed-key');
    expect(retry.personalWallet).toBe(1500 - retry.fare); expect(await repository.listTransactions(household.id)).toHaveLength(1);
  });
  it('uses only the hosted atomic RPC and preserves its transport receipt on retry', async () => {
    const rpc = vi.fn().mockRejectedValueOnce(new Error('database unavailable')).mockResolvedValue({ error: null,
      data: { personalWallet: 1400, transaction: { id: 'receipt', idempotency_key: 'hosted-key', household_id: 'home', user_id: 'user-a',
        wallet_type: 'personal', type: 'transport', amount: -100, item_ref: destination, metadata: { from: origin }, created_at: '2026-10-08T00:00:00Z' } } });
    const from = vi.fn(); const repository = new SupabaseGameRepository({ rpc, from } as unknown as SupabaseClient);
    const input = { householdId: 'home', userId: 'user-a', from: origin, destinationId: destination, destinationName: 'Bay Steps', fare: 100, idempotencyKey: 'hosted-key' };
    await expect(repository.commitTransit(input)).rejects.toThrow('database unavailable');
    const saved = await repository.commitTransit(input);
    expect(saved.transaction.type).toBe('transport'); expect(saved.personalWallet).toBe(1400);
    expect(rpc).toHaveBeenLastCalledWith('commit_transit', { p_household_id: 'home', p_user_id: 'user-a', p_from: origin,
      p_destination_id: destination, p_destination_name: 'Bay Steps', p_fare: 100, p_key: 'hosted-key' });
    expect(from).not.toHaveBeenCalled();
  });
});
