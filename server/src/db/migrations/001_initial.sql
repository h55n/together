-- ============================================================
-- Together — Complete Database Schema
-- Run in Supabase SQL editor or via psql
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id      TEXT UNIQUE NOT NULL,
  username      TEXT UNIQUE NOT NULL,
  avatar_config JSONB NOT NULL DEFAULT '{}',
  path_type     TEXT CHECK (path_type IN ('couple','friends','open')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_seen     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

-- ── Households ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS households (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  path_type          TEXT CHECK (path_type IN ('couple','friends','open')),
  dwelling_type      TEXT CHECK (dwelling_type IN ('apartment','house')),
  invite_code        TEXT UNIQUE NOT NULL,
  wallet_balance     INTEGER DEFAULT 500 CHECK (wallet_balance >= 0),
  vibe_score         INTEGER DEFAULT 50 CHECK (vibe_score BETWEEN 0 AND 100),
  relationship_score INTEGER DEFAULT 50 CHECK (relationship_score BETWEEN 0 AND 100),
  city_id            TEXT DEFAULT 'navrang_nagar',
  building_id        TEXT,
  unit_number        INTEGER,
  game_day           INTEGER DEFAULT 1,
  game_season        TEXT DEFAULT 'summer',
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  last_active        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_households_invite ON households(invite_code);

-- ── Household Members ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS household_members (
  household_id    UUID REFERENCES households(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  role            TEXT DEFAULT 'member',
  personal_wallet INTEGER DEFAULT 100,
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (household_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_members_user ON household_members(user_id);

-- ── Room Layouts ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS room_layouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID REFERENCES households(id) ON DELETE CASCADE UNIQUE,
  rooms           JSONB NOT NULL DEFAULT '[]',
  furniture       JSONB NOT NULL DEFAULT '[]',
  paint_config    JSONB NOT NULL DEFAULT '{}',
  floor_config    JSONB NOT NULL DEFAULT '{}',
  personalisation JSONB NOT NULL DEFAULT '{}',
  last_updated    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Chore Boards ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chore_boards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  week_number  INTEGER NOT NULL,
  chores       JSONB NOT NULL DEFAULT '[]',
  reset_at     TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (household_id, week_number)
);

-- ── Story Events ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS story_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  event_id     TEXT NOT NULL,
  status       TEXT DEFAULT 'active' CHECK (status IN ('active','resolved','abandoned')),
  started_at   TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  task_states  JSONB DEFAULT '{}',
  outcome      JSONB
);
CREATE INDEX IF NOT EXISTS idx_story_household ON story_events(household_id, status);

-- ── Memory Book ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memory_book (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id   UUID REFERENCES households(id) ON DELETE CASCADE,
  type           TEXT NOT NULL,
  screenshot_url TEXT,
  caption        TEXT CHECK (LENGTH(caption) <= 80),
  season         TEXT,
  game_hour      INTEGER,
  game_day       INTEGER,
  in_game_date   TEXT,
  stickers       JSONB DEFAULT '[]',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_memory_household ON memory_book(household_id, created_at DESC);

-- ── Transactions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id),
  user_id      UUID REFERENCES users(id),
  wallet_type  TEXT CHECK (wallet_type IN ('household','personal')),
  type         TEXT NOT NULL,
  amount       INTEGER NOT NULL,
  description  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tx_household ON transactions(household_id, created_at DESC);

-- ── Player Jobs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  job_type        TEXT NOT NULL,
  level           INTEGER DEFAULT 1 CHECK (level BETWEEN 1 AND 3),
  total_earnings  INTEGER DEFAULT 0,
  sessions_played INTEGER DEFAULT 0,
  last_played     TIMESTAMPTZ,
  UNIQUE (user_id, job_type)
);

-- ── Neighbour Relations ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS neighbour_relations (
  household_a  UUID REFERENCES households(id),
  household_b  UUID REFERENCES households(id),
  status       TEXT DEFAULT 'stranger',
  first_met    TIMESTAMPTZ DEFAULT NOW(),
  interactions INTEGER DEFAULT 0,
  PRIMARY KEY (household_a, household_b),
  CHECK (household_a < household_b)
);

-- ── Notice Board ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notice_board (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id          TEXT NOT NULL DEFAULT 'navrang_nagar',
  author_household UUID REFERENCES households(id),
  author_name      TEXT,
  text             TEXT NOT NULL CHECK (LENGTH(text) <= 140),
  reactions        INTEGER DEFAULT 0,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notice_city ON notice_board(city_id, created_at DESC);

-- ── Row Level Security (Supabase) ─────────────────────────────
-- Enable RLS on all tables (service key bypasses for server)
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE households         ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_layouts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_boards       ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_book        ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_jobs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighbour_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notice_board       ENABLE ROW LEVEL SECURITY;
