import { AUTO_DESTINATIONS, applyWalletTransaction, autoFare } from '@together/shared';
import type { GameRepository, HouseholdRecord, TransactionRecord } from '../db/GameRepository.js';

export type AutoBookingResult = {
  destinationId: string;
  fare: number;
  personalWallet: number;
  transaction: TransactionRecord;
};

export class TransitService {
  constructor(private readonly repository: GameRepository) {}

  async bookAuto(
    householdId: string,
    userId: string,
    from: { x: number; z: number },
    destinationId: string,
    idempotencyKey: string,
  ): Promise<AutoBookingResult> {
    if (!idempotencyKey || idempotencyKey.length < 8) throw new Error('Invalid idempotency key');
    const destination = AUTO_DESTINATIONS.find((entry) => entry.id === destinationId);
    if (!destination) throw new Error('Unknown auto-rickshaw destination');
    const existing = await this.repository.getTransactionByIdempotencyKey(idempotencyKey);
    const household = await this.authorize(householdId, userId);
    const member = household.members.find((entry) => entry.userId === userId)!;
    if (existing) {
      const fare = Math.abs(existing.amount);
      return { destinationId, fare, personalWallet: member.personalWallet, transaction: existing };
    }
    const fare = autoFare(from, destination.position);
    const next = applyWalletTransaction(member.personalWallet, -fare);
    if (!next.ok) throw new Error('Not enough personal funds for this auto ride');
    member.personalWallet = next.balance;
    const transaction: TransactionRecord = {
      id: crypto.randomUUID(), idempotencyKey, householdId, userId,
      walletType: 'personal', amount: -fare, type: 'transport', itemRef: destinationId,
      metadata: { from, destination: destination.displayName }, createdAt: new Date().toISOString(),
    };
    await this.repository.saveHousehold(household);
    await this.repository.saveTransaction(transaction);
    return { destinationId, fare, personalWallet: member.personalWallet, transaction };
  }

  private async authorize(householdId: string, userId: string): Promise<HouseholdRecord> {
    const household = await this.repository.getHousehold(householdId);
    if (!household) throw new Error('Household not found');
    if (!household.members.some((member) => member.userId === userId && member.membershipState === 'active')) throw new Error('User is not an active household member');
    return household;
  }
}
