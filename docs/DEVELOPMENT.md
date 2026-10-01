# Together V1 — Development Guide

## Prerequisites

Use Node.js 24 LTS and pnpm 12.4.1.

```bash
node --version
corepack enable
corepack prepare pnpm@12.4.1 --activate
pnpm --version
```

## Install

The dependency graph and lockfile are committed and exercised by connected GitHub Actions. Use the frozen install path:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm verify
pnpm test:e2e
```

Do not copy `node_modules` between Windows/Linux/macOS. Rollup and other packages use platform-native optional dependencies.

## Environment

```bash
cp .env.example .env
```

Local development may leave Supabase values blank. The server then uses the in-memory repository and local private Memory image store.

Production requires:

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on the server;
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the client build;
- Supabase anonymous sign-in enabled for the V1 frictionless identity flow;
- `CLIENT_URL` set to the HTTPS client origin;
- `VITE_SERVER_URL` set to the public game-server origin when client/server are split;
- the ordered database migrations applied;
- the private `together-memories` Storage bucket (migration 012 bootstraps it);
- `TURN_URL` and server-only `TURN_SHARED_SECRET` for production voice.

Never place the TURN shared secret in a `VITE_*` variable. The server issues authenticated short-lived TURN credentials to the browser.

## Database

Build the server, then use the deterministic migration runner:

```bash
pnpm --filter @together/server build
DATABASE_URL=... pnpm --filter @together/server migrate
```

The runner applies `001` through `012` in lexical order under a PostgreSQL advisory lock, records SHA-256 checksums, and refuses edited already-applied migrations. `node tools/validate-repository.mjs` also validates sequence shape and rejects obvious destructive migration patterns.

## Run

```bash
pnpm dev
```

Or separately:

```bash
pnpm dev:server
pnpm dev:client
```

## Controls

Default keyboard/mouse:

- WASD — move
- mouse — look
- Shift — jog
- E — contextual interaction / advance embodied step
- V — first/third person
- X — dismount transport
- Tab — Life panel
- M — city map
- B — Memory Book
- P — manual Memory photo

Movement/interact/camera/dismount controls are remappable in Settings. Controller input includes move/look, interact, jog, camera toggle and dismount.

## Test and build

Connected environment:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm validate
pnpm build
pnpm test:e2e
```

Single quality gate:

```bash
pnpm verify
```

Sandbox-safe path:

```bash
node tools/verify-sandbox.mjs
```

Do not treat the sandbox-safe path as a replacement for the production Vite/server/Playwright build. It exists to retain meaningful verification when native/platform packages cannot be installed.

## WebGPU/WebGL2

Use a current secure-context browser. The renderer probes capabilities at runtime. Clean installs use Three.js `WebGPURenderer`/`three/webgpu` first; WebGL2 is the graceful compatibility profile.

If WebGPU does not initialize:

1. inspect the browser console and renderer debug overlay;
2. verify the declared Three.js version installed cleanly;
3. test WebGL2 fallback before treating the game as unsupported.

## Debugging

The runtime includes performance metrics for frame time, draw calls, triangles and chunk residency. The codebase also contains deterministic time/weather/city helpers that can be driven directly in development.

The full PRD calls for a broader debug suite (navmesh/collider/audio/light/state editors). Not every editor surface is implemented yet; see `docs/KNOWN_LIMITATIONS.md`.

## Supabase auth

Development can use the explicit local header identity path only when `ALLOW_DEV_AUTH=true`. Production client startup requires Supabase client-safe credentials, restores or creates an anonymous Supabase session, follows token refresh, and sends the Bearer token through REST, Socket.IO and voice configuration requests. The server rejects local-header auth in production.

Never ship production with the in-memory repository, local Memory image store or development auth fallback.

## Memory images

Local mode stores private images under a local server-controlled directory. Production mode writes to the configured private Supabase Storage bucket and serves authorized image access through the application boundary.

## Voice

Voice is never stored. Configure the server:

```text
STUN_URL=stun:stun.l.google.com:19302
TURN_URL=turns:turn.example.com:5349
TURN_SHARED_SECRET=
TURN_TTL_SECONDS=3600
```

`TURN_SHARED_SECRET` is server-only. Authenticated clients fetch short-lived ICE credentials from `/api/voice/ice-config`. Use a real TURN service and different-network devices for final production verification.

The server also exposes `/healthz` and `/readyz`, emits request IDs/structured completion logs, uses production-only API throttling, restricts production CORS to `CLIENT_URL`, and shuts down gracefully on SIGTERM/SIGINT.
