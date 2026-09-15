-- Together V1 / Amaya Bay canonical schema migration.
-- This migration deliberately leaves legacy prototype tables in place so imported data can be migrated explicitly.

ALTER TABLE households ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE households ADD COLUMN IF NOT EXISTS property_id UUID;
ALTER TABLE households ADD COLUMN IF NOT EXISTS stage INTEGER NOT NULL DEFAULT 0;
ALTER TABLE households ADD COLUMN IF NOT EXISTS shared_wallet INTEGER NOT NULL DEFAULT 8000;
ALTER TABLE households ADD COLUMN IF NOT EXISTS hidden_state JSONB NOT NULL DEFAULT '{}';
ALTER TABLE households ADD COLUMN IF NOT EXISTS active_time_seconds BIGINT NOT NULL DEFAULT 0;
UPDATE households SET type = COALESCE(type, NULLIF(path_type, ''), 'friends') WHERE type IS NULL;
ALTER TABLE households ALTER COLUMN type SET NOT NULL;

ALTER TABLE household_members ADD COLUMN IF NOT EXISTS personal_wallet INTEGER NOT NULL DEFAULT 1500;
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS membership_state TEXT NOT NULL DEFAULT 'active';
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS bedroom_id TEXT;

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL DEFAULT 'amaya_bay',
  property_type TEXT NOT NULL,
  building_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  base_layout_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS household_home_state (
  household_id UUID PRIMARY KEY REFERENCES households(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 0,
  surface_config JSONB NOT NULL DEFAULT '{}',
  furniture JSONB NOT NULL DEFAULT '[]',
  decor JSONB NOT NULL DEFAULT '[]',
  inventory JSONB NOT NULL DEFAULT '[]',
  room_states JSONB NOT NULL DEFAULT '{}',
  renovation_flags JSONB NOT NULL DEFAULT '{}',
  processed_mutations JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type TEXT NOT NULL CHECK (owner_type IN ('user','household')),
  owner_id UUID NOT NULL,
  item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_inventories_owner ON inventories(owner_type, owner_id);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS item_ref TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_idempotency ON transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS story_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  state TEXT NOT NULL,
  branch TEXT,
  task_state JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_story_instances_household ON story_instances(household_id, state);

CREATE TABLE IF NOT EXISTS npc_relationships (
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  npc_id TEXT NOT NULL,
  flags JSONB NOT NULL DEFAULT '[]',
  familiarity INTEGER NOT NULL DEFAULT 0,
  last_interaction TIMESTAMPTZ,
  PRIMARY KEY (household_id, npc_id)
);

CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  screenshot_path TEXT,
  caption TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_memories_household ON memories(household_id, created_at DESC);

CREATE TABLE IF NOT EXISTS household_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  author UUID NOT NULL,
  text TEXT NOT NULL CHECK (char_length(text) <= 280),
  placement JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  state JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_home_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE npc_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
