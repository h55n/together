# Production deployment candidate

This configuration packages the current browser client, one game server and a Caddy HTTPS proxy. It is a deployment candidate, not completed release acceptance. Performance, final art, hosted persistence/private images, distinct-network voice and human gameplay acceptance remain open in the production-readiness ledger.

The `container-candidate` CI job builds both images using placeholder public settings after repository/browser verification, checks packaged runtime dependencies and SQL migrations, and validates the Caddy configuration. It does not deploy or require production credentials. A successful run must be recorded separately; adding the job does not establish that the images have passed it.

## Prerequisites

- Docker Engine with Compose on the deployment host; a public DNS hostname pointing to it and inbound TCP 80/443 plus optional UDP 443.
- A Supabase project with the project's migrations applied, anonymous sign-in enabled, and the configured private Memory bucket. Follow `docs/PRODUCTION_RUNBOOK.md` for migration and operational checks.
- Working TURN infrastructure that shares the configured credential secret.
- Run `pnpm verify` and the browser suite against the exact source revision before deployment.

## Build and start

From the repository root, copy `deploy/.env.production.example` to `deploy/.env.production.local`, fill its real values and keep it private. It is ignored by Git and excluded from Docker build contexts. Only the public Supabase URL/anon key enter the browser image; service-role and TURN secrets enter the server at runtime.

```sh
docker compose --env-file deploy/.env.production.local -f deploy/compose.yaml config --quiet
docker compose --env-file deploy/.env.production.local -f deploy/compose.yaml build
docker compose --env-file deploy/.env.production.local -f deploy/compose.yaml up -d
```

The browser uses the site's origin for HTTP, sockets and voice configuration. The proxy preserves `/api` and `/socket.io` paths and handles websocket upgrades. The game server's port is internal. Caddy persists certificates in named volumes; do not delete these during an ordinary update. A public HTTPS origin is required for browser microphone access.

Client configuration is baked into the image: rebuild the web image when its Supabase URL or public key changes. Server secrets can be changed by recreating the server. This setup deliberately runs one game-server instance because presence, mutation serialization and rate limiting are process-local.

## Acceptance and rollback

Check `/healthz`, `/readyz`, onboarding, expired-token reconnect, two/six-player rooms, private Memory upload/download, station handoff and TURN voice on separate networks. Readiness currently validates runtime configuration; it does not prove a successful database transaction or TURN relay. Run the backup/restore and restart tests from the runbook before release.

```sh
docker compose --env-file deploy/.env.production.local -f deploy/compose.yaml ps
docker compose --env-file deploy/.env.production.local -f deploy/compose.yaml logs --tail 100 server
```

Record and retain the previous image IDs/digests before an update. Roll back to those images and recreate services if acceptance fails; database migrations need their separately rehearsed rollback/restore procedure. Do not run `down --volumes` as an update or rollback step.

Local validation: Compose configuration can be checked without Docker Engine. Actual image builds, Caddy HTTPS issuance and hosted acceptance require a running engine and the infrastructure above; report their evidence separately.
