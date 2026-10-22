-- Serialize household activity snapshots so a member cannot hold equipment in
-- two distinct outing rows. This replaces 014's CAS without changing its API.
create or replace function public.compare_and_swap_activity_session(
  p_id uuid, p_expected_revision bigint, p_state jsonb, p_updated_at timestamptz
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  target_household uuid;
  current_state jsonb;
  affected integer;
begin
  if p_expected_revision < 0 or (p_state->>'revision') is null or (p_state->>'revision')::bigint <> p_expected_revision + 1 then
    raise exception 'Invalid activity revision';
  end if;
  select household_id into target_household from public.activity_sessions where id = p_id;
  if not found then return false; end if;
  -- Lock the parent first for all outing writes, including equipment returns.
  perform 1 from public.households where id = target_household for update;
  select state into current_state from public.activity_sessions where id = p_id for update;
  if not found or coalesce((current_state->>'revision')::bigint, 0) <> p_expected_revision then return false; end if;
  if exists (
    select 1 from pg_catalog.jsonb_array_elements(coalesce(p_state->'transportRental'->'rentals', '[]'::jsonb)) incoming
    join public.activity_sessions other on other.household_id = target_household and other.id <> p_id
    cross join lateral pg_catalog.jsonb_array_elements(coalesce(other.state->'transportRental'->'rentals', '[]'::jsonb)) held
    where incoming->>'status' <> 'returned' and held->>'status' <> 'returned'
      and incoming->>'ownerUserId' = held->>'ownerUserId'
  ) then return false; end if;
  update public.activity_sessions set state = p_state, updated_at = p_updated_at
    where id = p_id and coalesce((state->>'revision')::bigint, 0) = p_expected_revision;
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;
revoke all on function public.compare_and_swap_activity_session(uuid,bigint,jsonb,timestamptz) from public, anon, authenticated;
grant execute on function public.compare_and_swap_activity_session(uuid,bigint,jsonb,timestamptz) to service_role;
