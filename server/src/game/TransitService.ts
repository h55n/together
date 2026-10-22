import { AUTO_DESTINATIONS, autoFare } from '@together/shared';
import type { GameRepository, TransactionRecord } from '../db/GameRepository.js';

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
    if (typeof idempotencyKey !== 'string' || idempotencyKey.trim().length < 8 || idempotencyKey.length > 128) throw new Error('Invalid idempotency key');
    if (!from || ![from.x, from.z].every(value => Number.isFinite(value) && Math.abs(value) <= 450)) throw new Error('Invalid auto departure position');
    const destination = AUTO_DESTINATIONS.find((entry) => entry.id === destinationId);
    if (!destination) throw new Error('Unknown auto-rickshaw destination');
    const fare = autoFare(from, destination.position);
    const committed = await this.repository.commitTransit({ householdId, userId, from: { x: from.x, z: from.z },
      destinationId, destinationName: destination.displayName, fare, idempotencyKey });
    return { destinationId, fare, ...committed };
  }
}
