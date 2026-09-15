-- Canonical V1 user/profile columns used by SupabaseGameRepository.
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}';

-- New V1 profiles deliberately use the Supabase auth UUID as both game user id
-- and auth_user_id. Legacy rows remain intact and can be migrated explicitly.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id) WHERE auth_user_id IS NOT NULL;
UPDATE users SET display_name = COALESCE(display_name, username, 'Player') WHERE display_name IS NULL;
