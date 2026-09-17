-- Audit hardening for the canonical Amaya Bay V1 runtime.
-- Safe to apply after migrations 001-009.

BEGIN;

-- Legacy prototype identity columns must not block canonical Supabase-auth profiles.
ALTER TABLE users ALTER COLUMN clerk_id DROP NOT NULL;
ALTER TABLE users ALTER COLUMN username DROP NOT NULL;
UPDATE users SET display_name = COALESCE(NULLIF(display_name, ''), NULLIF(username, ''), 'Player') WHERE display_name IS NULL OR display_name = '';
ALTER TABLE users ALTER COLUMN display_name SET NOT NULL;

-- Repository upserts require inferable non-partial unique constraints.
DROP INDEX IF EXISTS idx_transactions_idempotency;
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_idempotency ON transactions(idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventories_owner_item ON inventories(owner_type, owner_id, item_id);

-- One completion key is persisted with each completed job session. This is used
-- together with service-level ownership/state checks and the payout transaction
-- invariant to prevent a session from being paid under multiple keys.
ALTER TABLE job_sessions ADD COLUMN IF NOT EXISTS completion_idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS job_sessions_completion_key_idx
  ON job_sessions(completion_idempotency_key)
  WHERE completion_idempotency_key IS NOT NULL;

-- These tables were introduced after the original RLS pass. With no client-side
-- policies they remain service-role-only, which is the intended V1 server model.
ALTER TABLE job_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_sessions ENABLE ROW LEVEL SECURITY;

-- Small durable server state store used for process-independent city time and
-- other singleton runtime values. Service role bypasses RLS; clients have no
-- direct policies.
CREATE TABLE IF NOT EXISTS server_runtime_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE server_runtime_state ENABLE ROW LEVEL SECURITY;

COMMIT;
