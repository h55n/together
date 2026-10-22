-- Service-only fare debit and receipt creation. Existing wallet state is read under row lock.
create or replace function public.commit_transit(
  p_household_id uuid, p_user_id uuid, p_from jsonb,
  p_destination_id text, p_destination_name text, p_fare integer, p_key text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  member public.household_members%rowtype;
  receipt public.transactions%rowtype;
begin
  if p_key is null or length(trim(p_key)) < 8 or length(p_key) > 128 or
     p_fare is null or p_fare < 25 or p_fare > 220 or
     p_destination_id is null or length(p_destination_id) = 0 or
     p_from is null or jsonb_typeof(p_from) <> 'object' or
     jsonb_typeof(p_from->'x') is distinct from 'number' or
     jsonb_typeof(p_from->'z') is distinct from 'number' then
    raise exception 'Invalid transit request';
  end if;
  if abs((p_from->>'x')::numeric) > 450 or abs((p_from->>'z')::numeric) > 450 then
    raise exception 'Invalid auto departure position';
  end if;
  -- Serialize globally shared keys, even when requests claim different households.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_key, 0));
  select * into member from public.household_members
    where household_id = p_household_id and user_id = p_user_id for update;
  if not found or member.membership_state is distinct from 'active' then
    raise exception 'User is not an active household member';
  end if;
  select * into receipt from public.transactions where idempotency_key = p_key;
  if found then
    if receipt.household_id is distinct from p_household_id or receipt.user_id is distinct from p_user_id or
       receipt.wallet_type is distinct from 'personal' or receipt.type is distinct from 'transport' or
       receipt.item_ref is distinct from p_destination_id or receipt.amount is distinct from -p_fare or
       receipt.metadata->'from' is distinct from p_from then
      raise exception 'Idempotency key belongs to a different transit request';
    end if;
    return jsonb_build_object('personalWallet', member.personal_wallet, 'transaction', to_jsonb(receipt));
  end if;
  if member.personal_wallet is null or member.personal_wallet < p_fare then
    raise exception 'Not enough personal funds for this auto ride';
  end if;
  update public.household_members set personal_wallet = personal_wallet - p_fare
    where household_id = p_household_id and user_id = p_user_id;
  insert into public.transactions (household_id, user_id, wallet_type, type, amount, idempotency_key, item_ref, metadata)
    values (p_household_id, p_user_id, 'personal', 'transport', -p_fare, p_key, p_destination_id,
      jsonb_build_object('from', p_from, 'destination', p_destination_name)) returning * into receipt;
  -- Both writes roll back if receipt insertion or any later statement fails.
  return jsonb_build_object('personalWallet', member.personal_wallet - p_fare, 'transaction', to_jsonb(receipt));
end;
$$;
revoke all on function public.commit_transit(uuid,uuid,jsonb,text,text,integer,text) from public, anon, authenticated;
grant execute on function public.commit_transit(uuid,uuid,jsonb,text,text,integer,text) to service_role;
