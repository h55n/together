# Together V1 — Development Guide

## Prerequisites

Use Node.js 24 LTS and pnpm 12.4.1.

```bash
node --version
corepack enable
corepack prepare pnpm@12.4.1 --activate
pnpm --version
```

## First connected install

This handoff environment had no npm-registry DNS access, so it could not produce a trustworthy `pnpm-lock.yaml`. On the first connected machine:

```bash
pnpm install
pnpm verify
pnpm test:e2e
```

Then commit the generated `pnpm-lock.yaml`. From that point onward CI/local restore should use:

```bash
pnpm install --frozen-lockfile
```

Do not copy `node_modules` between Windows/Linux/macOS. Rollup and other packages use platform-native optional dependencies.

## Environment

```bash
cp .env.example .env
```

Local development may leave Supabase values blank. The server then uses the in-memory repository and local private Memory image store.

Production requires:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- configured Supabase database/migrations
- private Storage bucket named by `SUPABASE_MEMORY_BUCKET`

Client-safe values use the `VITE_` prefix.

TURN is optional for local voice tests but required for reliable production NAT traversal.

## Database

Apply SQL files in lexical order:

```text
server/src/db/migrations/001_initial.sql
...
server/src/db/migrations/009_activity_sessions.sql
```

`node tools/validate-repository.mjs` validates sequence shape and rejects obvious destructive migration patterns.

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

The production architecture expects Supabase identity. Development uses the auth adapter and local identity fallback where credentials are absent. Never ship production with the in-memory repository or development auth fallback.

## Memory images

Local mode stores private images under a local server-controlled directory. Production mode writes to the configured private Supabase Storage bucket and serves authorized image access through the application boundary.

## Voice

Voice is never stored. Configure:

```text
VITE_STUN_URL=
VITE_TURN_URL=
VITE_TURN_USERNAME=
VITE_TURN_CREDENTIAL=
```

Use a real TURN service for production verification.
