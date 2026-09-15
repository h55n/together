-- Physical job-session persistence. Payouts are not issued until authored task sequence completes.
create table if not exists public.job_sessions (
  id uuid primary key,
  start_idempotency_key text not null unique,
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  job_id text not null,
  state text not null check (state in ('active','complete')),
  completed_actions jsonb not null default '[]'::jsonb,
  mistakes integer not null default 0 check (mistakes >= 0),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists job_sessions_household_user_idx on public.job_sessions(household_id, user_id, updated_at desc);
