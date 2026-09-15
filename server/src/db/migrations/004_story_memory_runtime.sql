-- Runtime persistence additions for the data-driven story engine and private Memory Book.
ALTER TABLE story_instances ADD COLUMN IF NOT EXISTS failures INTEGER NOT NULL DEFAULT 0;
ALTER TABLE story_instances ADD COLUMN IF NOT EXISTS memory_tag TEXT;

ALTER TABLE memories ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS location_id TEXT;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS weather TEXT;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS participants JSONB NOT NULL DEFAULT '[]';
ALTER TABLE memories ADD COLUMN IF NOT EXISTS event_id TEXT;
UPDATE memories SET idempotency_key = COALESCE(idempotency_key, 'legacy:' || id::text);
UPDATE memories SET location_id = COALESCE(location_id, 'unknown');
UPDATE memories SET weather = COALESCE(weather, 'unknown');
ALTER TABLE memories ALTER COLUMN idempotency_key SET NOT NULL;
ALTER TABLE memories ALTER COLUMN location_id SET NOT NULL;
ALTER TABLE memories ALTER COLUMN weather SET NOT NULL;
ALTER TABLE memories ALTER COLUMN screenshot_path SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_memories_idempotency ON memories(idempotency_key);
