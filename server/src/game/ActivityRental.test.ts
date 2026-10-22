import { describe, expect, it } from 'vitest';
import { LocalGameRepository } from '../db/LocalGameRepository.js';
import { HouseholdService } from './HouseholdService.js';
import { ActivityService } from './ActivityService.js';
import type { WeatherState } from '@together/shared';

async function setup() {
  const repository = new LocalGameRepository(), households = new HouseholdService(repository);
  const household = await households.createHousehold('alice', { name: 'Home', type: 'friends' });
  await households.joinHousehold('bob', household.inviteCode);
  return { repository, household, service: new ActivityService(repository) };
}

describe('persistent rental authority', () => {
  it('gates kayak hire and departure by trusted city time and weather while keeping return and accepted retries available', async () => {
    const repository = new LocalGameRepository(), households = new HouseholdService(repository);
    const household = await households.createHousehold('alice', { name: 'Home', type: 'friends' });
    let environment = { gameMinute: 7 * 60 + 59, weather: 'clear' as WeatherState };
    const service = new ActivityService(repository, { environment: () => environment });
    const session = await service.start(household.id, 'alice', 'kayak', 'kayak-conditions-case');

    await expect(service.rentalCommand(session.id, 'alice', { key: 'too-early', expectedRevision: 0, kind: 'rent' })).rejects.toThrow(/08:00/);
    environment = { gameMinute: 8 * 60, weather: 'light_rain' };
    const rented = await service.rentalCommand(session.id, 'alice', { key: 'open-rent', expectedRevision: 0, kind: 'rent' });
    const rentalId = rented.state.transportRental!.rentals[0]!.rentalId;
    const safety = await service.rentalCommand(session.id, 'alice', { key: 'open-safety', expectedRevision: 1, kind: 'acknowledge_safety', rentalId });

    environment = { gameMinute: 12 * 60, weather: 'monsoon_rain' };
    await expect(service.rentalCommand(session.id, 'alice', { key: 'unsafe-depart', expectedRevision: 2, kind: 'depart', rentalId })).rejects.toThrow(/weather/);
    environment = { gameMinute: 12 * 60, weather: 'thunderstorm' };
    const retry = await service.rentalCommand(session.id, 'alice', { key: 'open-safety', expectedRevision: 1, kind: 'acknowledge_safety', rentalId });
    expect(retry.state.revision).toBe(safety.state.revision);
    await expect(service.rentalCommand(session.id, 'alice', { key: 'unsafe-rent', expectedRevision: 2, kind: 'rent' })).rejects.toThrow(/weather/);

    environment = { gameMinute: 18 * 60 + 30, weather: 'clear' };
    await expect(service.rentalCommand(session.id, 'alice', { key: 'closed-rent', expectedRevision: 2, kind: 'rent' })).rejects.toThrow(/closed/);
    const returned = await service.rentalCommand(session.id, 'alice', { key: 'return-anyway', expectedRevision: 2, kind: 'return', rentalId });
    expect(returned.state.transportRental!.rentals[0]!.status).toBe('returned');
  });

  it('allows kayak departures through the closing minute and rejects the closed boundary', async () => {
    const repository = new LocalGameRepository(), households = new HouseholdService(repository);
    const household = await households.createHousehold('alice', { name: 'Home', type: 'friends' });
    let environment = { gameMinute: 18 * 60 + 29, weather: 'clear' as WeatherState };
    const service = new ActivityService(repository, { environment: () => environment });
    const session = await service.start(household.id, 'alice', 'kayak', 'kayak-closing-case');
    const rented = await service.rentalCommand(session.id, 'alice', { key: 'late-rent', expectedRevision: 0, kind: 'rent' });
    const rentalId = rented.state.transportRental!.rentals[0]!.rentalId;
    const safe = await service.rentalCommand(session.id, 'alice', { key: 'late-safety', expectedRevision: 1, kind: 'acknowledge_safety', rentalId });
    const departCommand = { key: 'late-depart', expectedRevision: 2, kind: 'depart' as const, rentalId };
    const departed = await service.rentalCommand(session.id, 'alice', departCommand);
    expect(departed.state.transportRental!.rentals[0]!.status).toBe('in_use');
    environment = { gameMinute: 18 * 60 + 30, weather: 'clear' };
    await expect(service.rentalCommand(session.id, 'alice', { key: 'closed-depart', expectedRevision: 3, kind: 'depart', rentalId })).rejects.toThrow(/closed/);
    environment = { gameMinute: 23 * 60, weather: 'thunderstorm' };
    const retry = await service.rentalCommand(session.id, 'alice', departCommand);
    expect(retry.state.revision).toBe(departed.state.revision);
    const returned = await service.rentalCommand(session.id, 'alice', { key: 'storm-return', expectedRevision: 3, kind: 'return', rentalId });
    expect(returned.state.transportRental!.rentals[0]!.status).toBe('returned');
    expect(safe.state.transportRental!.rentals[0]!.status).toBe('rented');
  });

  it('fails closed on invalid server time while cycling remains outside kayak conditions', async () => {
    const repository = new LocalGameRepository(), households = new HouseholdService(repository);
    const household = await households.createHousehold('alice', { name: 'Home', type: 'friends' });
    const service = new ActivityService(repository, { environment: () => ({ gameMinute: Number.NaN, weather: 'thunderstorm' }) });
    const kayak = await service.start(household.id, 'alice', 'kayak', 'kayak-invalid-clock');
    await expect(service.rentalCommand(kayak.id, 'alice', { key: 'invalid-clock-rent', expectedRevision: 0, kind: 'rent' })).rejects.toThrow(/closed/);
    const bicycle = await service.start(household.id, 'alice', 'cycling', 'cycling-no-weather-gate');
    const rented = await service.rentalCommand(bicycle.id, 'alice', { key: 'cycling-in-storm', expectedRevision: 0, kind: 'rent' });
    expect(rented.state.transportRental!.rentals[0]!.mode).toBe('bicycle');
  });

  it('requires first-time kayak safety and preserves it across completed outings and service restarts', async () => {
    const { repository, household, service } = await setup();
    const session = await service.start(household.id, 'alice', 'kayak', 'kayak-rental-first');
    const rented = await service.rentalCommand(session.id, 'alice', { key: 'rent', expectedRevision: 0, kind: 'rent' });
    const rentalId = rented.state.transportRental!.rentals[0]!.rentalId;
    await expect(service.rentalCommand(session.id, 'alice', { key: 'unsafe', expectedRevision: 1, kind: 'depart', rentalId })).rejects.toThrow(/safety/);
    await service.rentalCommand(session.id, 'alice', { key: 'safe', expectedRevision: 1, kind: 'acknowledge_safety', rentalId });
    const restarted = new ActivityService(repository);
    const departed = await restarted.rentalCommand(session.id, 'alice', { key: 'depart', expectedRevision: 2, kind: 'depart', rentalId });
    expect(departed.state.transportRental!.rentals[0]!.status).toBe('in_use');
    await restarted.rentalCommand(session.id, 'alice', { key: 'return', expectedRevision: 3, kind: 'return', rentalId });
    const next = await restarted.start(household.id, 'alice', 'kayak', 'kayak-rental-second');
    const nextRented = await restarted.rentalCommand(next.id, 'alice', { key: 'next-rent', expectedRevision: 0, kind: 'rent' });
    expect(nextRented.state.transportRental!.rentals[0]!.safetyAcknowledged).toBe(true);
    expect(nextRented.state.transportRental!.rentals[0]!.rentalId).not.toBe(rentalId);
    await expect(restarted.advance(next.id, 'alice', 'safety_check')).rejects.toThrow(/rental commands/);
  });

  it('isolates co-op leases and recovers exact returns without invalidating peer equipment', async () => {
    const { repository, household, service } = await setup();
    const session = await service.start(household.id, 'alice', 'cycling', 'cycling-rental-first');
    await service.join(session.id, 'bob');
    const alice = await service.rentalCommand(session.id, 'alice', { key: 'alice-rent', expectedRevision: 1, kind: 'rent' });
    const aliceId = alice.state.transportRental!.rentals[0]!.rentalId;
    const bob = await service.rentalCommand(session.id, 'bob', { key: 'bob-rent', expectedRevision: 2, kind: 'rent' });
    await expect(service.rentalCommand(session.id, 'bob', { key: 'steal-return', expectedRevision: 3, kind: 'return', rentalId: aliceId })).rejects.toThrow(/owner/);
    await expect(service.rentalCommand(session.id, 'outsider', { key: 'outside', expectedRevision: 3, kind: 'return', rentalId: aliceId })).rejects.toThrow(/member/);
    const command = { key: 'alice-return', expectedRevision: 3, kind: 'return' as const, rentalId: aliceId };
    const returned = await service.rentalCommand(session.id, 'alice', command);
    const retry = await new ActivityService(repository).rentalCommand(session.id, 'alice', command);
    expect(retry.state.revision).toBe(returned.state.revision);
    expect(retry.state.status).toBe('active');
    expect(retry.state.transportRental!.rentals.find(rental => rental.ownerUserId === 'bob')!.status).toBe('rented');
    await expect(service.rentalCommand(session.id, 'alice', { ...command, rentalId: bob.state.transportRental!.rentals[1]!.rentalId })).rejects.toThrow(/different request/);
  });

  it('accepts only one stale competing command across independent service instances', async () => {
    const { repository, household, service } = await setup();
    const session = await service.start(household.id, 'alice', 'cycling', 'cycling-rental-race');
    const outcomes = await Promise.allSettled([
      service.rentalCommand(session.id, 'alice', { key: 'rent-a', expectedRevision: 0, kind: 'rent' }),
      new ActivityService(repository).rentalCommand(session.id, 'alice', { key: 'rent-b', expectedRevision: 0, kind: 'rent' }),
    ]);
    expect(outcomes.filter(outcome => outcome.status === 'fulfilled')).toHaveLength(1);
    expect((await service.list(household.id, 'alice'))[0]!.state.transportRental!.rentals).toHaveLength(1);
  });

  it('atomically prevents two sessions from renting equipment to the same household member', async () => {
    const { repository, household, service } = await setup();
    const bicycle = await service.start(household.id, 'alice', 'cycling', 'cross-session-bike');
    const kayak = await service.start(household.id, 'alice', 'kayak', 'cross-session-kayak');
    const outcomes = await Promise.allSettled([
      service.rentalCommand(bicycle.id, 'alice', { key: 'bike-rent', expectedRevision: 0, kind: 'rent' }),
      new ActivityService(repository).rentalCommand(kayak.id, 'alice', { key: 'kayak-rent', expectedRevision: 0, kind: 'rent' }),
    ]);
    expect(outcomes.filter(outcome => outcome.status === 'fulfilled')).toHaveLength(1);
    const sessions = await service.list(household.id, 'alice');
    expect(sessions.flatMap(session => session.state.transportRental?.rentals ?? []).filter(rental => rental.status !== 'returned')).toHaveLength(1);
  });
  it('rents a scooter that only rides with a helmet on and only leases the road while checked out', async () => {
    const { household, service } = await setup();
    const session = await service.start(household.id, 'alice', 'scooter_ride', 'scooter-outing-start');
    let saved = await service.rentalCommand(session.id, 'alice', { key: 'scooter-rent', expectedRevision: 0, kind: 'rent' });
    const rentalId = saved.state.transportRental!.rentals[0]!.rentalId;
    expect(saved.state.transportRental!.rentals[0]!.mode).toBe('scooter');
    await expect(service.rentalCommand(session.id, 'alice', { key: 'scooter-early', expectedRevision: 1, kind: 'depart', rentalId })).rejects.toThrow(/helmet/);
    expect(service.transportLeaseAuthority.allows(household.id, 'alice', 'scooter')).toBe(false);
    await service.rentalCommand(session.id, 'alice', { key: 'scooter-helmet', expectedRevision: 1, kind: 'acknowledge_safety', rentalId });
    await service.rentalCommand(session.id, 'alice', { key: 'scooter-ride', expectedRevision: 2, kind: 'depart', rentalId });
    expect(service.transportLeaseAuthority.allows(household.id, 'alice', 'scooter')).toBe(true);
    saved = await service.rentalCommand(session.id, 'alice', { key: 'scooter-park', expectedRevision: 3, kind: 'return', rentalId });
    expect(saved.state.status).toBe('complete');
    expect(service.transportLeaseAuthority.allows(household.id, 'alice', 'scooter')).toBe(false);
  });
});
