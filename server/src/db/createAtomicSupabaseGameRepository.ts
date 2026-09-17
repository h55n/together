import type { SupabaseClient } from '@supabase/supabase-js';
import type { AtomicGameRepository, JobPayoutCommit, MovingCommit, PurchaseCommit, RenovationCommit } from './GameRepository.js';
import { SupabaseGameRepository } from './SupabaseGameRepository.js';

type MutationKind = 'purchase' | 'job_payout' | 'moving' | 'renovation';
type AuthoritativeCommit = PurchaseCommit | JobPayoutCommit | MovingCommit | RenovationCommit;

export function createAtomicSupabaseGameRepository(client: SupabaseClient): AtomicGameRepository {
  const base = new SupabaseGameRepository(client);

  async function commit(kind: MutationKind, input: AuthoritativeCommit): Promise<void> {
    const home = 'home' in input ? input.home : null;
    const inventory = 'inventory' in input ? input.inventory : null;
    const session = 'session' in input ? input.session ?? null : null;
    const { error } = await client.rpc('commit_authoritative_mutation_v1', {
      p_kind: kind,
      p_household: input.household,
      p_transaction: input.transaction,
      p_home: home,
      p_inventory: inventory,
      p_job_session: session,
    });
    if (error) throw error;
  }

  return Object.assign(base, {
    commitPurchase: (input: PurchaseCommit) => commit('purchase', input),
    commitJobPayout: (input: JobPayoutCommit) => commit('job_payout', input),
    commitMoving: (input: MovingCommit) => commit('moving', input),
    commitRenovation: (input: RenovationCommit) => commit('renovation', input),
  });
}
