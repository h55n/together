# Together V1 — Implemented Architecture

This document describes what exists in the repository at handoff. `docs/PRD.md` remains authoritative for product intent.

## Monorepo

The active implementation is TypeScript-first and organized as:

```text
client/   React + Vite + Three.js runtime
server/   Express + Socket.IO + authoritative game services
shared/   schemas, deterministic rules, cross-runtime types
content/  validated authored game content
tools/    verification utilities
docs/     product/engineering documentation
```

The old JavaScript/JSX prototype runtime has been removed from the active tree. Its history remains recoverable from the Git `legacy-import` commit.

## Client runtime

### UI boundary

React owns onboarding, household/property selection, Life/Map/Settings panels, Memory Book, cooking, shopping, stories, jobs, activities, decorating, moving/renovation and voice controls.

React does not own per-frame transforms.

### Game boundary

`client/src/game/GameEngine.ts` owns the real-time lifecycle. Major subsystems are intentionally separate:

- `core/Renderer.ts` — WebGPU-first universal renderer loading with WebGL2 fallback;
- `core/GameLoop.ts` — render/fixed-step loop;
- `core/InputManager.ts` — pointer-lock keyboard/gamepad input and remappable bindings;
- `physics/` — Rapier world and kinematic controller;
- `camera/` — first-person/third-person switching and collision;
- `player/` — local avatar, movement, transports and micro-animation hooks;
- `world/` — Amaya Bay environment, chunk streaming, district dressing, property shells, materials and vegetation;
- `interaction/` — proximity/view-priority interactions and multi-step micro-actions;
- `npc/` — ambient and named NPC presentation;
- `lighting/`, `weather/`, `audio/` — mood/environment systems;
- `network/` — remote player interpolation;
- `debug/` — frame/draw-call/triangle/chunk metrics;
- `HomeDecorationRenderer.ts` — canonical home object state rendered into selected property shells.

## Renderer and quality

`Renderer.create()` probes WebGPU/WebGL2. On a clean declared Three.js install it dynamically loads `three/webgpu` / `WebGPURenderer`; when unavailable but WebGL2 exists it uses `THREE.WebGLRenderer` as a compatibility path.

Quality profiles are render-only. They change pixel-ratio cap, shadow enablement and far chunk residency; gameplay collision/interaction scale remains exactly `1` across Low/Medium/High/Capture.

## Amaya Bay world

The city coordinate system uses 1 world unit = 1 metre and a roughly 900m × 900m playable footprint.

`shared/src/world/city.ts` defines the stable semantic city layer:

- seven canonical districts;
- 28 named subareas/colonies;
- stable location anchors for jobs, NPCs, activities and transport;
- 45 distributed everyday venues so the city is not a one-store/one-café theme park.

`WorldStreamer` loads 128m chunks in active/visual/horizon rings. Active chunks contain gameplay collision. Lower quality tiers may trim distant visual residency but not active gameplay collision.

World dressing is deterministic from chunk/district seeds. Primary art is currently procedural development art; final GLB/KTX2 replacement requirements are documented separately.

## Player and avatar

The player uses a Rapier kinematic capsule with PRD-scale movement. First person is canonical; `V` toggles a damped third-person camera.

The current character is a procedural development avatar driven by the persisted avatar configuration. The same underlying identity data is used locally and remotely. Micro-animation sampling provides distinct locomotion, carry, scrub, wipe, wash, cut, stir, pour, fold, water, sit, sleep, typing, cycle, scooter, kayak and social motion hooks.

This is an engine-valid embodiment foundation, not a substitute for the required final humanoid GLB, authored clips, IK and facial assets.

## Household/network model

The server is authoritative for persistent consequences. Socket.IO handles real-time presence/movement/voice signaling.

Core concepts:

- household codes are six-character human-readable identifiers;
- Couple capacity = 2; Friends capacity = 2–6;
- movement snapshots are validated and broadcast at client-side ~15Hz;
- remote clients interpolate instead of hard snapping;
- Couple/Friends voting rules are shared deterministic rules;
- returning browser sessions remember only household identity and re-fetch authoritative state.

## Persistence

`GameRepository` defines one interface used by:

- `LocalGameRepository` for local development/testing;
- `SupabaseGameRepository` for production Postgres/Supabase.

Persistence covers households, members, profiles, home state, inventory, transactions, stories, memories, NPC relationships, votes, notes, cooking sessions, job sessions and activity sessions.

Nine SQL migrations are currently ordered under `server/src/db/migrations/`.

Private Memory images use `MemoryImageStore` with a local implementation and Supabase Storage implementation.

## Home

Five starter shells exist in the world: Couple Studio, 1BHK, Courtyard 2BHK, PG House and Hostel Floor. The selected property determines the actual shell/spawn rather than only UI metadata.

`HomeService` is authoritative for versioned place/move/remove/surface mutations. Placement validation checks authored room bounds and oriented footprints. Household furniture must be purchased/owned before placement. Removal returns the furniture item to storage.

The catalog currently contains 92 stable furniture/decor definitions and 15 renovation definitions.

## Micro-life and cooking

`shared/src/interaction/microActions.ts` defines reusable action primitives and physical sequences. Eight chore families have multi-step state transitions rather than one fake timer.

Cooking has:

- 23 grocery/household item definitions;
- 20 recipe graphs;
- station ownership for co-op work;
- dependency-gated parallel steps;
- persistent server sessions;
- good/imperfect/burnt outcomes based on mistakes;
- real inventory reservation/consumption.

## Economy and jobs

Wallet/inventory consequences are authoritative and idempotent.

Implemented job session definitions include Café Roshan barista, Market Helper, Delivery Rider, Nursery Assistant and quiet Freelance/Remote Work. A payout cannot occur before authored task progression is completed.

## Transport and leisure

Transport foundations exist for walking, bicycle, scooter, kayak and server-priced auto-rickshaw travel. Seven auto destinations cover all districts.

Eight leisure activities use persistent shared sessions and embodied step sequences without XP rewards.

## NPCs

The content layer defines 12 persistent residents: the canonical ten plus Leela and Farhan. Named NPCs have schedules, authored contextual dialogue and discrete household-specific memory flags.

Ambient NPCs use local deterministic presentation/update tiers. A production baked navmesh/crowd implementation remains future work.

## Story and progression

The content library contains 36 story definitions:

- 20 shared;
- 8 Couple;
- 8 Friends.

`StoryService` persists task state and enforces eligibility, path/stage gates and server-derived outcomes. Seven internal life stages are driven by active household play time rather than offline wall-clock decay.

## Memory Book

Manual and sparse automatic capture use the rendered canvas and private image storage. Metadata includes household, participants/context, location, weather, game time/story/activity context and caption. Captions are editable by active household members. The UI presents a warm scrapbook and supports client-side share-card export.

## Voice/social

Voice uses WebRTC peer audio with Socket.IO signaling. Modes are off/household/proximity with mute and push-to-talk hooks. ICE configuration supports STUN and optional TURN credentials. TURN production connectivity has not been tested in this environment.

Sticky household notes are private and bounded to physical placements rather than a social feed.

## Verification architecture

The normal connected quality gate is `pnpm verify` plus Playwright.

Because this sandbox cannot install the declared package graph, `node tools/verify-sandbox.mjs` independently validates:

- shared/content pure tests;
- server domain/service tests compiled through the sandbox verification tsconfig;
- client TypeScript;
- shared TypeScript;
- content TypeScript;
- migration/repository/secret/legacy-entrypoint integrity.
