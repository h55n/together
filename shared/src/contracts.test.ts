import assert from 'node:assert/strict';
import test from 'node:test';
import {
  householdCreateSchema,
  playerSnapshotSchema,
  purchaseRequestSchema,
  homeObjectMutationSchema,
} from './contracts.js';

test('household creation only accepts Couple or Friends V1 types', () => {
  assert.equal(householdCreateSchema.safeParse({ name: 'Bay Home', type: 'couple' }).success, true);
  assert.equal(householdCreateSchema.safeParse({ name: 'Bay Home', type: 'friends' }).success, true);
  assert.equal(householdCreateSchema.safeParse({ name: 'Bay Home', type: 'open' }).success, false);
});

test('movement snapshots enforce finite bounded network fields', () => {
  assert.equal(playerSnapshotSchema.safeParse({
    seq: 3,
    sentAt: 10,
    position: { x: 12, y: 1.7, z: -4 },
    yaw: 0.5,
    animation: 'walk',
    transport: 'walking',
  }).success, true);
  assert.equal(playerSnapshotSchema.safeParse({
    seq: 4,
    sentAt: 11,
    position: { x: Number.POSITIVE_INFINITY, y: 0, z: 0 },
    yaw: 0,
    animation: 'idle',
    transport: 'walking',
  }).success, false);
  assert.equal(playerSnapshotSchema.safeParse({
    seq: 5,
    sentAt: 12,
    position: { x: 0, y: 1.7, z: 0 },
    yaw: 1e12,
    animation: 'idle',
    transport: 'walking',
  }).success, false);
});

test('purchase requests never accept a client-supplied price or reward', () => {
  const parsed = purchaseRequestSchema.parse({
    itemId: 'decor_lamp_01',
    wallet: 'household',
    idempotencyKey: 'purchase-12345678',
    price: 1,
  });
  assert.equal('price' in parsed, false);
  assert.deepEqual(Object.keys(parsed).sort(), ['idempotencyKey', 'itemId', 'wallet']);
});

test('home object mutations carry an optimistic version and idempotency key', () => {
  assert.equal(homeObjectMutationSchema.safeParse({
    objectId: 'chair-1',
    definitionId: 'chair_wood_01',
    roomId: 'living',
    expectedVersion: 4,
    idempotencyKey: 'home-12345678',
    transform: {
      position: { x: 1, y: 0, z: 2 },
      rotationY: 1.2,
      scale: 1,
    },
  }).success, true);
});

test('kayak is a valid synchronized transport state', () => {
  const parsed = playerSnapshotSchema.parse({
    seq: 1,
    sentAt: 1,
    position: { x: 0, y: 0, z: 0 },
    yaw: 0,
    animation: 'kayak',
    transport: 'kayak',
  });
  assert.equal(parsed.transport, 'kayak');
});
