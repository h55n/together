-- Atomic durable boundary for authoritative economy/home mutations.
-- Each RPC call runs as one PostgreSQL transaction: transaction ledger, wallets,
-- inventory, home state and optional job-session completion either all persist or all roll back.

CREATE OR REPLACE FUNCTION public.commit_authoritative_mutation_v1(
  p_kind text,
  p_household jsonb,
  p_transaction jsonb,
  p_home jsonb DEFAULT NULL,
  p_inventory jsonb DEFAULT NULL,
  p_job_session jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household_id uuid := (p_household->>'id')::uuid;
  v_transaction_id uuid;
  v_existing transactions%ROWTYPE;
  v_member jsonb;
BEGIN
  IF p_kind NOT IN ('purchase', 'job_payout', 'moving', 'renovation') THEN
    RAISE EXCEPTION 'Unsupported authoritative mutation kind: %', p_kind;
  END IF;

  INSERT INTO public.transactions (
    id, idempotency_key, household_id, user_id, wallet_type, amount,
    type, item_ref, metadata, created_at
  ) VALUES (
    (p_transaction->>'id')::uuid,
    p_transaction->>'idempotencyKey',
    (p_transaction->>'householdId')::uuid,
    (p_transaction->>'userId')::uuid,
    p_transaction->>'walletType',
    (p_transaction->>'amount')::integer,
    p_transaction->>'type',
    NULLIF(p_transaction->>'itemRef', ''),
    COALESCE(p_transaction->'metadata', '{}'::jsonb),
    COALESCE((p_transaction->>'createdAt')::timestamptz, NOW())
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_transaction_id;

  IF v_transaction_id IS NULL THEN
    SELECT * INTO v_existing
    FROM public.transactions
    WHERE idempotency_key = p_transaction->>'idempotencyKey';

    IF v_existing.household_id IS DISTINCT FROM (p_transaction->>'householdId')::uuid
      OR v_existing.user_id IS DISTINCT FROM (p_transaction->>'userId')::uuid
      OR v_existing.type IS DISTINCT FROM p_transaction->>'type'
      OR COALESCE(v_existing.item_ref, '') IS DISTINCT FROM COALESCE(p_transaction->>'itemRef', '') THEN
      RAISE EXCEPTION 'Idempotency key belongs to a different authoritative mutation';
    END IF;
    RETURN;
  END IF;

  UPDATE public.households
  SET property_id = CASE WHEN p_household ? 'propertyId' THEN NULLIF(p_household->>'propertyId', '')::uuid ELSE NULL END,
      stage = COALESCE((p_household->>'stage')::integer, stage),
      shared_wallet = COALESCE((p_household->>'sharedWallet')::integer, shared_wallet),
      hidden_state = COALESCE(p_household->'hiddenState', hidden_state),
      active_time_seconds = COALESCE((p_household->>'activeTimeSeconds')::bigint, active_time_seconds)
  WHERE id = v_household_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Household not found during authoritative mutation'; END IF;

  FOR v_member IN SELECT value FROM jsonb_array_elements(COALESCE(p_household->'members', '[]'::jsonb)) LOOP
    UPDATE public.household_members
    SET personal_wallet = COALESCE((v_member->>'personalWallet')::integer, personal_wallet),
        membership_state = COALESCE(v_member->>'membershipState', membership_state),
        bedroom_id = CASE WHEN v_member ? 'bedroomId' THEN NULLIF(v_member->>'bedroomId', '') ELSE bedroom_id END
    WHERE household_id = v_household_id
      AND user_id = (v_member->>'userId')::uuid;
  END LOOP;

  IF p_inventory IS NOT NULL THEN
    INSERT INTO public.inventories (owner_type, owner_id, item_id, quantity, metadata)
    VALUES (
      p_inventory->>'ownerType',
      (p_inventory->>'ownerId')::uuid,
      p_inventory->>'itemId',
      (p_inventory->>'quantity')::integer,
      COALESCE(p_inventory->'metadata', '{}'::jsonb)
    )
    ON CONFLICT (owner_type, owner_id, item_id) DO UPDATE
    SET quantity = EXCLUDED.quantity,
        metadata = EXCLUDED.metadata;
  END IF;

  IF p_home IS NOT NULL THEN
    INSERT INTO public.household_home_state (
      household_id, version, surface_config, furniture, room_states, processed_mutations, updated_at
    ) VALUES (
      (p_home->>'householdId')::uuid,
      (p_home->>'version')::integer,
      COALESCE(p_home->'surfaces', '{}'::jsonb),
      COALESCE(p_home->'objects', '[]'::jsonb),
      COALESCE(p_home->'roomStates', '{}'::jsonb),
      COALESCE(p_home->'processedMutations', '{}'::jsonb),
      COALESCE((p_home->>'updatedAt')::timestamptz, NOW())
    )
    ON CONFLICT (household_id) DO UPDATE
    SET version = EXCLUDED.version,
        surface_config = EXCLUDED.surface_config,
        furniture = EXCLUDED.furniture,
        room_states = EXCLUDED.room_states,
        processed_mutations = EXCLUDED.processed_mutations,
        updated_at = EXCLUDED.updated_at;
  END IF;

  IF p_job_session IS NOT NULL THEN
    UPDATE public.job_sessions
    SET state = COALESCE(p_job_session->>'state', state),
        completion_idempotency_key = NULLIF(p_job_session->>'completionIdempotencyKey', ''),
        completed_actions = COALESCE(p_job_session->'completedActions', completed_actions),
        mistakes = COALESCE((p_job_session->>'mistakes')::integer, mistakes),
        updated_at = COALESCE((p_job_session->>'updatedAt')::timestamptz, updated_at)
    WHERE id = (p_job_session->>'id')::uuid;

    IF NOT FOUND THEN RAISE EXCEPTION 'Job session not found during payout mutation'; END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.commit_authoritative_mutation_v1(text, jsonb, jsonb, jsonb, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commit_authoritative_mutation_v1(text, jsonb, jsonb, jsonb, jsonb, jsonb) TO service_role;
