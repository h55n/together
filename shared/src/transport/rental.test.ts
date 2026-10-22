import assert from 'node:assert/strict';
import test from 'node:test';
import { acceptTransportRentalCommand, createTransportRentalState, joinTransportRentalState } from './rental.js';

const create = (activityId: 'cycling' | 'kayak' | 'scooter_ride', participants = ['a', 'b']) => createTransportRentalState({ sessionId: 'outing-session', activityId, participants });
const rent = (state: ReturnType<typeof createTransportRentalState>, actor: string, key: string, context?: { priorKayakSafetyAcknowledged?: boolean }) => acceptTransportRentalCommand(state, actor, { key, expectedRevision: state.revision, kind: 'rent' }, context);

test('keeps ownership independent for each guest and derives equipment from the outing activity', () => {
  const initial = create('cycling');
  const a = rent(initial, 'a', 'rent-a');
  const b = rent(a, 'b', 'rent-b');
  assert.deepEqual(a.rentals.map(item => [item.ownerUserId, item.mode, item.status]), [['a', 'bicycle', 'rented']]);
  assert.deepEqual(b.rentals.map(item => [item.ownerUserId, item.mode, item.status]), [['a', 'bicycle', 'rented'], ['b', 'bicycle', 'rented']]);
  assert.notEqual(a.rentals[0]?.rentalId, b.rentals[1]?.rentalId);
  assert.equal(initial.rentals.length, 0);
});

test('requires kayak safety acknowledgement before departure and prior server safety skips the intro', () => {
  let state = rent(create('kayak', ['a']), 'a', 'rent');
  const kayak = state.rentals[0]!;
  assert.equal(kayak.mode, 'kayak');
  assert.throws(() => acceptTransportRentalCommand(state, 'a', { key: 'depart-early', expectedRevision: 1, kind: 'depart', rentalId: kayak.rentalId }), /safety/i);
  const acknowledged = acceptTransportRentalCommand(state, 'a', { key: 'safety', expectedRevision: 1, kind: 'acknowledge_safety', rentalId: kayak.rentalId });
  const repeated = acceptTransportRentalCommand(acknowledged, 'a', { key: 'safety-again', expectedRevision: 2, kind: 'acknowledge_safety', rentalId: kayak.rentalId });
  assert.equal(acknowledged.revision, 2);
  assert.equal(repeated.revision, acknowledged.revision);
  assert.equal(repeated.rentals[0]?.safetyAcknowledged, true);
  const departed = acceptTransportRentalCommand(repeated, 'a', { key: 'depart', expectedRevision: 2, kind: 'depart', rentalId: kayak.rentalId });
  assert.equal(departed.rentals[0]?.status, 'in_use');

  const returningPlayer = rent(create('kayak', ['b']), 'b', 'rent-b', { priorKayakSafetyAcknowledged: true });
  assert.equal(returningPlayer.rentals[0]?.safetyAcknowledged, true);
  const launched = acceptTransportRentalCommand(returningPlayer, 'b', { key: 'depart-b', expectedRevision: 1, kind: 'depart', rentalId: returningPlayer.rentals[0]!.rentalId });
  assert.equal(launched.rentals[0]?.status, 'in_use');
  const returned = acceptTransportRentalCommand(launched, 'b', { key: 'return-b', expectedRevision: 2, kind: 'return', rentalId: launched.rentals[0]!.rentalId });
  const rentedAgain = rent(returned, 'b', 'rent-b-again');
  assert.equal(rentedAgain.rentals[0]?.safetyAcknowledged, true);
});

test('rejects nonowners and stale commands without mutating prior rental state', () => {
  const state = rent(create('cycling'), 'a', 'rent-a');
  const rentalId = state.rentals[0]!.rentalId;
  assert.throws(() => acceptTransportRentalCommand(state, 'b', { key: 'steal', expectedRevision: 1, kind: 'depart', rentalId }), /owner/i);
  assert.throws(() => acceptTransportRentalCommand(state, 'a', { key: 'stale', expectedRevision: 0, kind: 'depart', rentalId }), /changed/i);
  assert.equal(state.rentals[0]?.status, 'rented');
});

test('returns owned equipment idempotently and preserves exact-key actor fingerprints', () => {
  let state = rent(create('cycling', ['a']), 'a', 'rent');
  const firstId = state.rentals[0]!.rentalId;
  const original = state;
  const rentalId = state.rentals[0]!.rentalId;
  state = acceptTransportRentalCommand(state, 'a', { key: 'depart', expectedRevision: 1, kind: 'depart', rentalId });
  const returned = acceptTransportRentalCommand(state, 'a', { key: 'return', expectedRevision: 2, kind: 'return', rentalId });
  assert.equal(returned.rentals[0]?.status, 'returned');
  assert.equal(acceptTransportRentalCommand(returned, 'a', { key: 'return', expectedRevision: 2, kind: 'return', rentalId }), returned);
  const returnedAgain = acceptTransportRentalCommand(returned, 'a', { key: 'return-again', expectedRevision: 3, kind: 'return', rentalId });
  assert.equal(returnedAgain.revision, returned.revision);
  assert.equal(original.rentals[0]?.status, 'rented');
  assert.throws(() => acceptTransportRentalCommand(returnedAgain, 'a', { key: 'return', expectedRevision: 2, kind: 'return', rentalId: `${rentalId}-other` }), /reused/i);
});

test('allows only one active rental per actor, and permits a new rental after return', () => {
  let state = rent(create('cycling', ['a']), 'a', 'rent');
  const firstId = state.rentals[0]!.rentalId;
  assert.throws(() => rent(state, 'a', 'rent-again'), /current rental/i);
  state = acceptTransportRentalCommand(state, 'a', { key: 'return', expectedRevision: 1, kind: 'return', rentalId: state.rentals[0]!.rentalId });
  state = rent(state, 'a', 'rent-next');
  assert.equal(state.rentals.length, 1);
  assert.notEqual(state.rentals[0]?.rentalId, firstId);
});

test('rejects unknown rentals and non-kayak safety acknowledgement', () => {
  let state = create('cycling', ['a']);
  assert.throws(() => acceptTransportRentalCommand(state, 'a', { key: 'depart', expectedRevision: 0, kind: 'depart', rentalId: 'missing' }), /rental/i);
  state = rent(state, 'a', 'rent');
  assert.throws(() => acceptTransportRentalCommand(state, 'a', { key: 'safety', expectedRevision: 1, kind: 'acknowledge_safety', rentalId: state.rentals[0]!.rentalId }), /kayak/i);
});

test('extends an outing roster immutably and rejects stale commands after a join', () => {
  const state = create('cycling', ['a']);
  const joined = joinTransportRentalState(state, 'b');
  assert.deepEqual(joined.participants, ['a', 'b']);
  assert.equal(state.participants.length, 1);
  assert.throws(() => acceptTransportRentalCommand(joined, 'a', { key: 'stale', expectedRevision: 0, kind: 'rent' }), /changed/i);
});

test('keeps rental history and command receipts bounded during a long shared outing', () => {
  const guests = ['a', 'b', 'c', 'd', 'e', 'f'];
  let state = create('cycling', guests);
  for (let cycle = 0; cycle < 18; cycle++) {
    const actor = guests[cycle % guests.length]!;
    state = rent(state, actor, `rent-${cycle}`);
    const rental = state.rentals.find(item => item.ownerUserId === actor && item.status === 'rented')!;
    state = acceptTransportRentalCommand(state, actor, { key: `depart-${cycle}`, expectedRevision: state.revision, kind: 'depart', rentalId: rental.rentalId });
    state = acceptTransportRentalCommand(state, actor, { key: `return-${cycle}`, expectedRevision: state.revision, kind: 'return', rentalId: rental.rentalId });
    assert.ok(state.rentals.length <= guests.length);
    assert.equal(state.rentals.filter(item => item.ownerUserId === actor).length, 1);
  }
  assert.equal(state.rentals.length, guests.length);
  const id = state.rentals.find(item => item.ownerUserId === 'a')!.rentalId;
  for (let index = 0; index < 140; index++) {
    state = acceptTransportRentalCommand(state, 'a', { key: `repeat-return-${index}`, expectedRevision: state.revision, kind: 'return', rentalId: id });
    assert.ok(state.receipts.length <= 128);
  }
  assert.equal(state.receipts.length, 128);
  assert.equal(state.receipts.some(receipt => receipt.key === 'repeat-return-11'), false);
  assert.equal(state.receipts.at(-1)?.key, 'repeat-return-139');
});

test('scooter rentals need a helmet on every ride and seat a rider and one pillion', () => {
  let state = rent(create('scooter_ride'), 'a', 'scooter-rent');
  const rental = state.rentals[0]!;
  assert.equal(rental.mode, 'scooter');
  assert.equal(rental.safetyAcknowledged, false);
  assert.throws(() => acceptTransportRentalCommand(state, 'a', { key: 'early-ride', expectedRevision: state.revision, kind: 'depart', rentalId: rental.rentalId }), /helmet/);
  state = acceptTransportRentalCommand(state, 'a', { key: 'helmet', expectedRevision: state.revision, kind: 'acknowledge_safety', rentalId: rental.rentalId });
  assert.deepEqual(state.kayakSafetyAcknowledgedBy, [], 'a helmet is not a remembered kayak introduction');
  state = acceptTransportRentalCommand(state, 'a', { key: 'ride', expectedRevision: state.revision, kind: 'depart', rentalId: rental.rentalId });
  assert.equal(state.rentals[0]!.status, 'in_use');
  assert.throws(() => joinTransportRentalState(state, 'c'), /no available guest place/);
  // Even with prior kayak history, a fresh scooter rental starts with the helmet off.
  const again = rent(create('scooter_ride', ['a']), 'a', 'scooter-again', { priorKayakSafetyAcknowledged: true });
  assert.equal(again.rentals[0]!.safetyAcknowledged, false);
});
