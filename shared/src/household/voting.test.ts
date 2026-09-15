import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveHouseholdVote } from './voting.js';

test('Couple votes require both active members to approve', () => {
  assert.equal(resolveHouseholdVote('couple', ['a', 'b'], { a: 'yes', b: 'yes' }), 'approved');
  assert.equal(resolveHouseholdVote('couple', ['a', 'b'], { a: 'yes', b: 'no' }), 'rejected');
  assert.equal(resolveHouseholdVote('couple', ['a', 'b'], { a: 'yes' }), 'pending');
});

test('Friends votes use simple majority and ties reopen discussion', () => {
  assert.equal(resolveHouseholdVote('friends', ['a', 'b', 'c'], { a: 'yes', b: 'yes', c: 'no' }), 'approved');
  assert.equal(resolveHouseholdVote('friends', ['a', 'b', 'c', 'd'], { a: 'yes', b: 'yes', c: 'no', d: 'no' }), 'tied');
  assert.equal(resolveHouseholdVote('friends', ['a', 'b', 'c'], { a: 'no', b: 'no', c: 'yes' }), 'rejected');
});
