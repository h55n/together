import assert from 'node:assert/strict';
import test from 'node:test';
import { isInviteCode, normalizeInviteCode } from './inviteCodes.js';

test('invite codes are six human-readable uppercase characters', () => {
  assert.equal(normalizeInviteCode(' ab2-k9q '), 'AB2K9Q');
  assert.equal(isInviteCode('AB2K9Q'), true);
  assert.equal(isInviteCode('ABO1IQ'), false, 'ambiguous O/I/1 are excluded');
  assert.equal(isInviteCode('TOO-LONG'), false);
});
