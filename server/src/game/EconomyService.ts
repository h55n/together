import { applyWalletTransaction, furnitureById, jobById, purchaseRequestSchema, type FurnitureDefinition, type JobId, type ShiftQuality } from '@together/shared';
import { requireAtomicGameRepository, type GameRepository, type HouseholdRecord, type JobSessionRecord, type TransactionRecord } from '../db/GameRepository.js';

export type EconomySnapshot = { sharedWallet: number; personalWallet: number; transaction: TransactionRecord };

export class EconomyService {
  constructor(private readonly repository: GameRepository) {}

  async purchase(householdId: string, userId: string, rawRequest: unknown): Promise<EconomySnapshot> {
    const request = purchaseRequestSchema.parse(rawRequest);
    const household = await this.authorize(householdId, userId);
    const existing = await this.repository.getTransactionByIdempotencyKey(request.idempotencyKey);
    if (existing) {
      this.assertExisting(existing, householdId, userId, 'purchase', request.itemId);
      return this.snapshot(household, userId, existing);
    }
    const definition = furnitureById(request.itemId);
    if (!definition) throw new Error('Unknown purchasable item');
    const amount = definition.price;
    if (request.wallet === 'household') {
      const result = applyWalletTransaction(household.sharedWallet, -amount);
      if (!result.ok) throw new Error('Insufficient household funds');
      household.sharedWallet = result.balance;
    } else {
      const member = household.members.find((candidate) => candidate.userId === userId)!;
      const result = applyWalletTransaction(member.personalWallet, -amount);
      if (!result.ok) throw new Error('Insufficient personal funds');
      member.personalWallet = result.balance;
    }
    if (isFlatPackFurniture(definition)) {
      const rawFlags = household.hiddenState.flags;
      const flags = rawFlags && typeof rawFlags === 'object' && !Array.isArray(rawFlags)
        ? Object.fromEntries(Object.entries(rawFlags).map(([key, value]) => [key, Boolean(value)]))
        : {};
      household.hiddenState = { ...household.hiddenState, flags: { ...flags, bought_flat_pack: true } };
    }
    const transaction = this.transaction(householdId, userId, request.wallet, -amount, 'purchase', request.idempotencyKey, request.itemId);
    const inventory = await this.repository.listInventory('household', householdId);
    const owned = inventory.find((entry) => entry.itemId === definition.id);
    await requireAtomicGameRepository(this.repository).commitPurchase({
      household,
      inventory: {
        ownerType: 'household',
        ownerId: householdId,
        itemId: definition.id,
        quantity: (owned?.quantity ?? 0) + 1,
        metadata: { ...(owned?.metadata ?? {}), category: 'furniture', purchasedBy: userId },
      },
      transaction,
    });
    return this.snapshot(household, userId, transaction);
  }

  async completeJobShift(
    householdId: string,
    userId: string,
    jobId: JobId,
    quality: ShiftQuality,
    idempotencyKey: string,
    sessionId?: string,
    completedSession?: JobSessionRecord,
  ): Promise<EconomySnapshot> {
    if (idempotencyKey.length < 8) throw new Error('Invalid idempotency key');
    const household = await this.authorize(householdId, userId);
    const existing = await this.repository.getTransactionByIdempotencyKey(idempotencyKey);
    if (existing) {
      this.assertExisting(existing, householdId, userId, 'job_payout', jobId);
      if (sessionId && existing.metadata.jobSessionId !== sessionId) throw new Error('Idempotency key belongs to a different job session');
      return this.snapshot(household, userId, existing);
    }
    const job = jobById(jobId);
    if (!job) throw new Error('Unknown job');
    const member = household.members.find((candidate) => candidate.userId === userId)!;
    const payout = job.payouts[quality];
    const result = applyWalletTransaction(member.personalWallet, payout);
    if (!result.ok) throw new Error('Invalid job payout');
    member.personalWallet = result.balance;
    const metadata = { quality, ...(sessionId ? { jobSessionId: sessionId } : {}) };
    const transaction = this.transaction(householdId, userId, 'personal', payout, 'job_payout', idempotencyKey, job.id, metadata);
    await requireAtomicGameRepository(this.repository).commitJobPayout({
      household,
      transaction,
      ...(completedSession ? { session: completedSession } : {}),
    });
    return this.snapshot(household, userId, transaction);
  }

  async listTransactions(householdId: string, userId: string): Promise<TransactionRecord[]> {
    await this.authorize(householdId, userId);
    return this.repository.listTransactions(householdId);
  }

  private snapshot(household: HouseholdRecord, userId: string, transaction: TransactionRecord): EconomySnapshot {
    const member = household.members.find((candidate) => candidate.userId === userId)!;
    return { sharedWallet: household.sharedWallet, personalWallet: member.personalWallet, transaction };
  }

  private assertExisting(transaction: TransactionRecord, householdId: string, userId: string, type: TransactionRecord['type'], itemRef?: string): void {
    if (transaction.householdId !== householdId || transaction.userId !== userId || transaction.type !== type || (itemRef && transaction.itemRef !== itemRef)) {
      throw new Error('Idempotency key belongs to a different transaction');
    }
  }

  private transaction(householdId: string, userId: string, walletType: 'personal' | 'household', amount: number, type: TransactionRecord['type'], idempotencyKey: string, itemRef?: string, metadata: Record<string, unknown> = {}): TransactionRecord {
    return { id: crypto.randomUUID(), idempotencyKey, householdId, userId, walletType, amount, type, ...(itemRef ? { itemRef } : {}), metadata, createdAt: new Date().toISOString() };
  }

  private async authorize(householdId: string, userId: string): Promise<HouseholdRecord> {
    const household = await this.repository.getHousehold(householdId);
    if (!household) throw new Error('Household not found');
    if (!household.members.some((member) => member.userId === userId && member.membershipState === 'active')) throw new Error('User is not an active household member');
    return household;
  }
}

function isFlatPackFurniture(definition: FurnitureDefinition): boolean {
  return definition.category === 'storage' || definition.category === 'table' || definition.category === 'bed';
}
