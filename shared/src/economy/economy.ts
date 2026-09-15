export const STARTING_SHARED_WALLET = 8_000;
export const STARTING_PERSONAL_WALLET = 1_500;
export const SHARED_SPEND_RATIO_REQUIRING_APPROVAL = 0.3;

export type SharedApprovalInput = {
  amount: number;
  sharedBalance: number;
  configuredThreshold: number;
};

export function requiresSharedApproval(input: SharedApprovalInput): boolean {
  const amount = Math.max(0, Math.round(input.amount));
  const balance = Math.max(0, Math.round(input.sharedBalance));
  const threshold = Math.max(0, Math.round(input.configuredThreshold));
  if (amount > threshold) return true;
  if (balance === 0) return amount > 0;
  return amount / balance > SHARED_SPEND_RATIO_REQUIRING_APPROVAL;
}

export type WalletTransactionResult =
  | { ok: true; balance: number }
  | { ok: false; balance: number; reason: 'insufficient_funds' | 'invalid_amount' };

/** Apply a server-authoritative signed delta without permitting negative balances. */
export function applyWalletTransaction(balance: number, delta: number): WalletTransactionResult {
  if (!Number.isFinite(balance) || !Number.isFinite(delta)) {
    return { ok: false, balance, reason: 'invalid_amount' };
  }
  const current = Math.max(0, Math.round(balance));
  const change = Math.round(delta);
  const next = current + change;
  if (next < 0) return { ok: false, balance: current, reason: 'insufficient_funds' };
  return { ok: true, balance: next };
}
