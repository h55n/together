-- Persistent cooperative cooking sessions for Together V1.
CREATE TABLE IF NOT EXISTS cooking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL,
  state JSONB NOT NULL DEFAULT '{}',
  ingredient_transaction_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cooking_sessions_household ON cooking_sessions(household_id, updated_at DESC);
ALTER TABLE cooking_sessions ENABLE ROW LEVEL SECURITY;
