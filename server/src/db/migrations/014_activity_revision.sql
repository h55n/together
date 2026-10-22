-- Only the server service role can conditionally replace activity snapshots.
create or replace function compare_and_swap_activity_session(
  p_id uuid, p_expected_revision bigint, p_state jsonb, p_updated_at timestamptz
) returns boolean language plpgsql security definer set search_path = public as $$
declare affected integer;
begin
  if p_expected_revision < 0 or (p_state->>'revision') is null or (p_state->>'revision')::bigint <> p_expected_revision + 1 then
    raise exception 'Invalid activity revision';
  end if;
  update activity_sessions set state = p_state, updated_at = p_updated_at
    where id = p_id and coalesce((state->>'revision')::bigint, 0) = p_expected_revision;
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;
revoke all on function compare_and_swap_activity_session(uuid,bigint,jsonb,timestamptz) from public, anon, authenticated;
grant execute on function compare_and_swap_activity_session(uuid,bigint,jsonb,timestamptz) to service_role;
