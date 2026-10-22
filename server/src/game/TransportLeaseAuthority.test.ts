import { describe, expect, it } from 'vitest';
import { acceptTransportRentalCommand, createActivityState, createTransportRentalState } from '@together/shared';
import { TransportLeaseAuthority } from './TransportLeaseAuthority.js';
import type { ActivitySessionRecord } from '../db/GameRepository.js';

describe('socket transport lease cache', () => {
  it('blocks unleased modes, allows committed departure, rejects older warm reads and revokes returns', () => {
    const cache = new TransportLeaseAuthority();
    const state = createTransportRentalState({ sessionId: 'session', activityId: 'cycling', participants: ['alice'] });
    const rented = acceptTransportRentalCommand(state, 'alice', { key: 'rent', expectedRevision: 0, kind: 'rent' });
    const rentalId = rented.rentals[0]!.rentalId;
    const record = (rentalState: typeof state): ActivitySessionRecord => ({ id: 'session', householdId: 'home', activityId: 'cycling', idempotencyKey: 'test-rental-cache', createdAt: '', updatedAt: '', state: { ...createActivityState('cycling', 'alice'), revision: rentalState.revision, transportRental: rentalState } });
    expect(cache.allows('home', 'alice', 'walking')).toBe(true);
    expect(cache.allows('home', 'alice', 'bicycle')).toBe(false);
    cache.apply(record(rented));
    expect(cache.allows('home', 'alice', 'bicycle')).toBe(false);
    const departed = acceptTransportRentalCommand(rented, 'alice', { key: 'depart', expectedRevision: 1, kind: 'depart', rentalId });
    cache.apply(record(departed)); cache.apply(record(rented));
    expect(cache.allows('home', 'alice', 'bicycle')).toBe(true);
    expect(cache.allows('home', 'bob', 'bicycle')).toBe(false);
    expect(cache.allows('other-home', 'alice', 'bicycle')).toBe(false);
    expect(cache.allows('home', 'alice', 'kayak')).toBe(false);
    cache.apply(record(acceptTransportRentalCommand(departed, 'alice', { key: 'return', expectedRevision: 2, kind: 'return', rentalId })));
    cache.apply(record(departed));
    expect(cache.allows('home', 'alice', 'bicycle')).toBe(false);
    cache.release('home', 'alice');
    expect(cache.allows('home', 'alice', 'bicycle')).toBe(false);
  });
});
