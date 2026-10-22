import type { ActivitySessionRecord } from '../db/GameRepository.js';

/** Socket reads stay synchronous; connect warms persisted ownership and RPC commits update it. */
export class TransportLeaseAuthority {
  private readonly owners = new Map<string, Map<string, { revision: number; mode: 'bicycle' | 'kayak' | 'scooter'; checkedOut: boolean }>>();
  apply(session: ActivitySessionRecord): void {
    const state = session.state.transportRental;
    if (!state) return;
    for (const rental of state.rentals) {
      const key = JSON.stringify([session.householdId, rental.ownerUserId]);
      const sessions = this.owners.get(key) ?? new Map();
      if ((sessions.get(session.id)?.revision ?? -1) > (session.state.revision ?? 0)) continue;
      sessions.set(session.id, { revision: session.state.revision ?? 0, mode: rental.mode, checkedOut: rental.status === 'in_use' });
      this.owners.set(key, sessions);
    }
  }
  allows(householdId: string, userId: string, transport: string): boolean {
    // Every rentable vehicle must be backed by a checked-out lease; walking and autos need none.
    if (transport !== 'bicycle' && transport !== 'kayak' && transport !== 'scooter') return true;
    return [...(this.owners.get(JSON.stringify([householdId, userId]))?.values() ?? [])].some(lease => lease.mode === transport && lease.checkedOut);
  }
  release(householdId: string, userId: string): void { this.owners.delete(JSON.stringify([householdId, userId])); }
}
