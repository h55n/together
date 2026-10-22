-- Refuse existing duplicate active records rather than deleting player progress.
-- Resolve any pre-existing duplicates explicitly before applying this migration.
begin;
create unique index if not exists job_sessions_one_active_job_idx
  on public.job_sessions(household_id, user_id, job_id) where state = 'active';

create or replace function public.start_or_resume_job_session_v1(
  p_id uuid, p_start_key text, p_household_id uuid, p_user_id uuid, p_job_id text
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare result public.job_sessions%rowtype;
begin
  if length(p_start_key) < 8 then raise exception 'Invalid idempotency key'; end if;
  -- Serialize this player's starts across API workers; the unique index also protects other writers.
  perform pg_advisory_xact_lock(hashtextextended(p_household_id::text || ':' || p_user_id::text || ':' || p_job_id, 0));
  select * into result from public.job_sessions where start_idempotency_key = p_start_key;
  if found then
    if result.household_id <> p_household_id or result.user_id <> p_user_id or result.job_id <> p_job_id then
      raise exception 'Idempotency key belongs to a different job session';
    end if;
    return to_jsonb(result);
  end if;
  select * into result from public.job_sessions
    where household_id = p_household_id and user_id = p_user_id and job_id = p_job_id and state = 'active';
  if found then return to_jsonb(result); end if;
  insert into public.job_sessions(id, start_idempotency_key, household_id, user_id, job_id, state)
    values(p_id, p_start_key, p_household_id, p_user_id, p_job_id, 'active') returning * into result;
  return to_jsonb(result);
end;
$$;
revoke all on function public.start_or_resume_job_session_v1(uuid,text,uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.start_or_resume_job_session_v1(uuid,text,uuid,uuid,text) to service_role;
commit;
