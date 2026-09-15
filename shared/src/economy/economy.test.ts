import assert from 'node:assert/strict';
import test from 'node:test';
import { requiresSharedApproval, applyWalletTransaction } from './economy.js';

test('large shared purchases require household approval', () => {
  assert.equal(requiresSharedApproval({ amount: 2500, sharedBalance: 8000, configuredThreshold: 3000 }), true);
  assert.equal(requiresSharedApproval({ amount: 1800, sharedBalance: 8000, configuredThreshold: 3000 }), false);
  assert.equal(requiresSharedApproval({ amount: 3500, sharedBalance: 20000, configuredThreshold: 3000 }), true);
});

test('wallet transaction rejects overdraft and never invents money', () => {
  assert.deepEqual(applyWalletTransaction(1500, -500), { ok: true, balance: 1000 });
  assert.deepEqual(applyWalletTransaction(1500, -1600), { ok: false, balance: 1500, reason: 'insufficient_funds' });
  assert.deepEqual(applyWalletTransaction(1500, 700), { ok: true, balance: 2200 });
});
