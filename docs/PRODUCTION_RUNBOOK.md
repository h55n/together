# Production operations and acceptance

Use `deploy/README.md` for the container candidate. This runbook records required operations; none of the hosted checks below are certified by local unit tests.

## Before startup

Build the exact reviewed revision with `pnpm verify` and the browser suite. Choose a unique `RELEASE_TAG` and retain the preceding image tag/digests. Populate the private deployment environment file. Client keys are public configuration; service-role, database and TURN secrets must remain server-only.

Apply the ordered SQL migrations only after a recoverable database backup and a staging rehearsal. The runner uses an advisory lock and migration checksums. A migration failure requires inspection; do not edit an already recorded migration to force it through.

```sh
docker compose --env-file deploy/.env.production.local -f deploy/compose.yaml build
docker compose --env-file deploy/.env.production.local -f deploy/compose.yaml run --rm migrate
```

The optional migration service requires `DATABASE_URL` in the private file. It is an explicit operation and does not run when the game starts. Migration 012 creates the private Memory bucket; confirm `SUPABASE_MEMORY_BUCKET` matches the provisioned bucket. Enable anonymous sign-in and verify browser auth against the same Supabase project.

### Activity and transit migration boundary

The packaged runner applies the complete `001`–`016` SQL chain in filename order and skips only migrations whose recorded checksums match. For a database already through `013_active_job_sessions.sql`, the required new order is:

1. `014_activity_revision.sql`: installs `public.compare_and_swap_activity_session(uuid,bigint,jsonb,timestamptz)`. An activity snapshot changes only when its stored revision matches the expected revision; the replacement must increment it by exactly one. Existing snapshots without a revision are treated as revision zero. The function is `SECURITY DEFINER`, sets `search_path = public`, and permits execution only by `service_role`.
2. `015_atomic_transit.sql`: installs `public.commit_transit(uuid,uuid,jsonb,text,text,integer,text)`. This `SECURITY INVOKER` function locks the idempotency key and member row, checks active membership and the saved request fingerprint, and debits the personal wallet and inserts its transport receipt in one database transaction. Its execution privilege is also restricted to `service_role`.
3. `016_transport_rental_authority.sql`: replaces activity CAS using the same signature. It locks the parent household before the activity row, rechecks the expected revision, and rejects an incoming active lease if the same household actor already holds equipment in another outing row. The function uses an empty search path and schema-qualified objects; only `service_role` may execute it. It is prepared and packaged locally; hosted execution and PostgreSQL concurrency acceptance remain open.

Both functions are required by the new server's Supabase repository. Build the server image from the reviewed source, confirm these SQL files are included under `server/dist/db/migrations`, then run the explicit migration operation above against staging before upgrading the server. A `/readyz` response does not verify that either RPC exists or works. Do not deploy the server first, skip earlier migrations, expose the service-role key to the browser, or grant these functions to `anon`/`authenticated` to work around an error.

After migration, retain the runner output and inspect the migration ledger using the privileged operations connection:

```sql
select name, checksum, applied_at
from public.together_schema_migrations
order by name;

select to_regprocedure('public.compare_and_swap_activity_session(uuid,bigint,jsonb,timestamptz)') as activity_rpc,
       to_regprocedure('public.commit_transit(uuid,uuid,jsonb,text,text,integer,text)') as transit_rpc;
```

Verify both functions' execution ACLs in staging: `anon` and `authenticated` must not have `EXECUTE`; `service_role` must have it. Confirm the existing RLS on activity sessions, household members and transactions remains enabled. Use the server's private service-role connection for positive RPC checks and real anonymous-authenticated browser tokens for negative direct-RPC and cross-household API checks. Do not record credentials in the evidence.

## Staging acceptance

1. Confirm HTTPS, `/healthz`, `/readyz` and an authenticated API request. Readiness is configuration validation; independently exercise database reads/writes.
2. Onboard two users into one household, then six into Friends mode. Move, disconnect/reconnect, refresh credentials and rejoin after server restart. Confirm household isolation with an unrelated user's token.
3. Run groceries → shared cooking → job payment → decoration → story → Memory → exit/rejoin. Check interrupted actions, simultaneous station claims and failed-request retry. Confirm the persisted state after restart, not only the immediate response.
4. Upload and download a private Memory. Verify another household cannot retrieve its metadata or bytes and that its bucket/object is not publicly readable.
5. Connect voice from different networks and confirm an actual TURN relay with browser WebRTC diagnostics. Check mute, leave and token refresh. Same-machine loopback is insufficient.
6. Record 1080p Medium and fallback performance on target GPUs, browser/controller coverage, long-session memory and human visual/audio/gameplay acceptance against `docs/PRD.md` and the current audit.

### Activity CAS and atomic fare acceptance

Use disposable staging households and retain before/after database snapshots, request keys, revisions and receipt IDs. Run the following against the hosted Supabase adapter, including two independent server processes connected to the same staging database; local repository mocks do not establish PostgreSQL concurrency behavior.

- Activity CAS: submit two different sports commands with the same expected revision concurrently. Only one may replace that revision; the other must conflict/reconcile without losing the accepted score or stroke. Replay an accepted command with its original key after a lost reply and server restart: the receipt must replay without another stroke, point or revision increment. Reusing the key with different inputs or another actor must fail. Verify a legacy activity snapshot without `state.revision` upgrades from zero to one and concurrent joins/start retries preserve the roster. Complete all six golf holes and a human-versus-human badminton rally through browser controls, then reload and compare both clients with persisted state.
- Atomic transit: record the starting personal wallet, submit the same departure/destination/key concurrently to both servers, and confirm exactly one matching transport transaction and one fare debit. Replay after a dropped reply and server restart. Reusing the key with a different household, actor, departure, destination or fare must fail without changing either wallet. Verify insufficient funds, inactive membership and out-of-city departures leave both wallet and transactions unchanged. Different valid keys submitted simultaneously must debit the combined fares without a lost wallet update.
- Rental ownership after 016: rent into two different activity rows concurrently for the same actor through two independent servers. Exactly one active lease may persist. Reject another participant departing or returning the owner's rental. Lost departure/return replies retain the original key; confirmed stale returns get a new key/revision only after authoritative reconciliation shows no accepted receipt. Reload/resume retains the lease ID, and later kayak outings retain prior safety acknowledgement. Inspect legacy rows for malformed or explicit-null `transportRental.rentals` before migration: omitted pre-rental fields are supported; non-array JSON fails closed and requires reviewed data repair.
- Failure rollback: in a controlled staging transaction/fault harness, force receipt insertion to fail after the debit statement. Confirm PostgreSQL rolls back the wallet change and creates no receipt. Do not install failure triggers or alter production tables for this check. A failed/missing RPC or permission error must surface as a failed operation, without falling back to separate wallet/receipt writes.
- Security and restart: reject direct RPC execution with both public client roles and sports/transit API calls from an unrelated household. Restart the server and verify accepted receipts and balances still match the database. Do not infer successful transport charging from the client's ride animation alone.

These checks validate the two new database mutation boundaries. They do not certify multi-replica Socket.IO presence, voice, rate limiting or other services; the shipped Compose topology remains one server.

The rental socket cache is scoped to that single server: it warms persisted ownership on connection, updates after accepted rental commands, and releases the player cache on the last disconnect. It has no cross-process adapter invalidation. Implement and test invalidation/revocation before multiple game-server replicas. Include growing household history in the cache/memory soak; focused local tests do not certify its long-session resource envelope. Migration 016 replaces an RPC body, so rehearse rollback to a version that preserves cross-row lease authority rather than assuming an older image or the 014 function is compatible.

## Backup and restore

Record the provider's database backup/retention procedure and separately back up private Memory objects. A database snapshot alone does not establish recovery of image bytes. Restore to an isolated staging project and verify household membership, wallets, home layout, cooking, stories, memories and image authorization. Record measured recovery time and the oldest recoverable point before release.

## Update and rollback

Build/tag new images, rehearse migrations and acceptance in staging, then recreate production services. Keep the previous images and certificate volumes. If acceptance fails, restore the prior `RELEASE_TAG` and recreate using its retained images. Schema changes need a separately rehearsed compatible rollback or backup restore; container rollback alone does not undo them. Never remove volumes as a normal update step.

Migrations 014/015 add RPCs rather than replacing the existing tables, but that does not make mixed server versions safe. Older activity writers can bypass revision CAS and older transit writers can separate the wallet debit from its receipt. Drain activity/transit writes and stop older writers during cutover; resume only after the new image and hosted checks pass. A rollback image must have rehearsed compatibility with these mutation guarantees. If it does not, keep those writes unavailable until a compatible forward fix or an approved, rehearsed restore is ready. Do not drop either RPC while any running image depends on it, edit recorded migration checksums, or delete activity receipts/transport transactions to make a retry appear new. No down-migration is supplied for 014/015. A database restore may discard accepted writes after its backup point and requires a separately planned recovery of private Memory objects.

Inspect correlated request IDs and bounded container logs when investigating failures. Redact tokens, secrets and private content from shared diagnostics. The supplied topology has one game-server process; multi-replica presence, locking and rate limiting need additional coordination before scaling it horizontally.

Record actual check dates, source revision, image digests, infrastructure configuration and results. Leave failed or unavailable checks open in `docs/superpowers/plans/2026-10-01-production-readiness-progress.md`.

## Local operations inspection — October 9, 2026

`docker compose --env-file deploy/.env.production.example -f deploy/compose.yaml config --quiet` exited successfully using the checked-in placeholder environment. The Docker executable is installed, but `docker version --format '{{.Server.Version}}'` could not connect to the Docker Desktop Linux engine pipe. No engine was started and no containers, migrations or deployment were run. This establishes Compose interpolation/configuration validity only. Image builds, packaged migration execution, PostgreSQL/RPC permissions and concurrency, HTTPS issuance, hosted restart/restore, RLS/private storage and TURN relay acceptance remain unverified.
