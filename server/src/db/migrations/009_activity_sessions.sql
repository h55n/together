create table if not exists activity_sessions (
  id uuid primary key,
  idempotency_key text not null unique,
  household_id uuid not null references households(id) on delete cascade,
  activity_id text not null,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists activity_sessions_household_idx on activity_sessions(household_id, updated_at desc);
