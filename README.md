# Together V1 — Amaya Bay

Together is a browser-based, persistent multiplayer cozy life simulator for Couple and Friends households. Players create a household, choose a home in **Amaya Bay**, live in an embodied first-person world (with switchable third-person), work gentle physical jobs, shop, cook, clean, decorate, explore, spend time together, experience authored life stories, and preserve shared history in a private Memory Book.

`docs/PRD.md` is the authoritative product source. If this README conflicts with the PRD, the PRD wins.

## Current build

This repository is a substantial V1 implementation and handoff build, not a claim of release-complete production art. The implemented code includes:

- WebGPU-first Three.js renderer architecture with WebGL2 fallback;
- Rapier kinematic player physics, first/third-person cameras, gamepad and remappable keyboard input;
- a ~900m × 900m Amaya Bay world split into 128m chunks;
- 7 major districts, 28 named subareas/colonies, 45 distributed everyday venues, terrain/elevation, streamed neighborhood dressing and vegetation;
- five starter home shells and persistent furniture/surface customization;
- 92 furniture/decor definitions, including 20 greenery options;
- Couple/Friends household creation, six-character invite codes, property voting and Socket.IO presence;
- eight embodied chore families and a reusable micro-action framework;
- 23 grocery/household items, 20 recipes and persistent co-op cooking sessions;
- server-authoritative personal/shared wallets, transaction idempotency and five job definitions;
- bicycle, scooter, kayak and auto-rickshaw transport foundations;
- 8 persistent leisure activities with shared sessions;
- 12 named persistent NPCs with schedules, memory flags and authored contextual dialogue;
- 36 data-driven household stories (20 shared, 8 Couple, 8 Friends) and seven life stages;
- private manual/automatic Memory capture, captions and share-card export;
- renovation and moving flows with voting, packing decisions and moving memories;
- WebRTC household/proximity voice architecture with Socket.IO signaling and optional TURN;
- sticky notes, accessibility controls, quality tiers, performance diagnostics and debug tooling foundations.

See `docs/IMPLEMENTATION_STATUS.md` and `docs/KNOWN_LIMITATIONS.md` for the strict acceptance status.

## Requirements

- Node.js **24 LTS**
- pnpm **12.4.1** through Corepack
- a modern desktop browser with WebGPU or WebGL2

The supplied sandbox had Node 22 and no registry/DNS access, so it could not generate `pnpm-lock.yaml` or perform a clean dependency install. On the first connected Node 24 machine, generate and commit the lockfile:

```bash
corepack enable
corepack prepare pnpm@12.4.1 --activate
pnpm install
pnpm verify
pnpm test:e2e
```

After that, use `pnpm install --frozen-lockfile` in CI and subsequent environments.

## Local development

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Default local URLs:

- Client: `http://localhost:5173`
- Server: `http://localhost:3001`

Without Supabase credentials, development uses the in-memory repository and local private Memory image storage. Production intentionally requires Supabase server credentials.

## Verification

Normal connected environment:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm validate
pnpm build
pnpm test:e2e
```

Sandbox-safe verification (does not require pnpm, Vite/Rollup, or the missing server declaration packages):

```bash
node tools/verify-sandbox.mjs
```

At handoff this passes 161 automated domain/integration tests plus client/shared/content TypeScript and repository integrity validation.

## Repository structure

```text
together/
  client/       React/Vite UI + framework-independent Three.js game runtime
  server/       Express + Socket.IO + authoritative game services + persistence adapters
  shared/       Runtime-validated contracts and pure deterministic game rules
  content/      Typed recipes, NPCs, stories, jobs/activities and validation
  tools/        Repository and sandbox verification utilities
  docs/         PRD, audit, build plan, architecture, status and handoff documentation
```

Important runtime boundaries:

- React owns menus/panels/HUD, not per-frame transforms.
- Three.js owns the real-time world and frame loop.
- persistent consequences are server-authoritative.
- movement remains locally responsive and synchronizes through snapshots.
- content is data-driven and validated.
- hidden needs/relationship state is never presented as numeric HUD meters.

## External services

### Supabase

Set server variables in `.env`:

```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
SUPABASE_MEMORY_BUCKET=together-memories
```

Apply `server/src/db/migrations/001_*.sql` through `009_*.sql` in order.

### Voice

STUN works without application credentials. Production-grade NAT traversal requires TURN:

```text
VITE_STUN_URL=stun:stun.l.google.com:19302
VITE_TURN_URL=
VITE_TURN_USERNAME=
VITE_TURN_CREDENTIAL=
```

Voice audio is never stored by the application.

## Documentation

Start here:

1. `docs/PRD.md` — authoritative product requirements.
2. `docs/REPO_AUDIT_AGAINST_PRD.md` — old prototype audit.
3. `docs/BUILD_PLAN.md` — dependency-ordered implementation plan.
4. `docs/IMPLEMENTATION_STATUS.md` — actual phase status and evidence.
5. `docs/ARCHITECTURE.md` — actual implemented architecture.
6. `docs/DEVELOPMENT.md` — install/run/test/service setup.
7. `docs/ASSET_REQUIREMENTS.md` — final production asset replacement requirements.
8. `docs/KNOWN_LIMITATIONS.md` — explicit unfinished/blocked work.
9. `HANDOFF.md` and `CONTINUATION_PROMPT.md` — continuation state.
