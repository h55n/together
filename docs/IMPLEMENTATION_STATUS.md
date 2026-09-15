# Together V1 — Implementation Status

Status is evaluated against the strict exit criteria in `docs/PRD.md` / `docs/BUILD_PLAN.md`. "Implemented" does not mean the corresponding phase is marked complete when required browser/manual/asset verification was unavailable.

## Verification baseline at handoff

Green in this environment:

- `node tools/verify-sandbox.mjs`
- 161 automated domain/integration tests
- client TypeScript
- shared TypeScript
- content TypeScript
- content validation through the emitted validation module
- repository/migration/secret/legacy-entrypoint integrity

Environment-blocked:

- clean `pnpm install` (registry DNS unavailable; pnpm not installed)
- full `pnpm typecheck/lint/test/validate/build`
- Vite production build (copied Windows dependency tree lacks Linux Rollup native package)
- full server `tsc` (copied dependency tree lacks declared Express/Supertest types/current Drizzle package)
- Playwright/browser E2E
- real target-hardware performance measurement

See `docs/VERIFICATION.md`.

## Phase 0 — Repository + technical foundation

**Status: PARTIAL (implementation substantial; strict runtime exit not fully verified)**

Implemented:

- TypeScript pnpm-workspace structure;
- shared runtime schemas/contracts;
- WebGPU-first renderer bootstrap + WebGL2 fallback;
- fixed/update loop;
- pointer-lock/remappable keyboard/gamepad input;
- Rapier kinematic controller;
- asset loader foundation;
- structured server logging;
- Socket.IO connection/presence/movement contract;
- Supabase/local persistence adapters;
- Supabase-oriented auth adapter;
- migrations and verification utilities;
- performance/debug overlay foundations.

Strict blocker: two-browser boot/connect cannot be manually verified in this sandbox dependency state.

## Phase 1 — World feel vertical slice

**Status: PARTIAL**

Implemented:

- first-person default + switchable third-person;
- human-scale controller and camera collision;
- embodied procedural development avatar;
- Lantern Street hero slice;
- stylized PBR material families;
- layered vegetation system;
- continuous time/lighting profiles;
- rain/wetness/weather state;
- procedural district ambience and sparse contextual music;
- ambient NPC walkers;
- performance diagnostics.

Not release-complete: final art/animation/audio assets and subjective Quiet Walk playtest.

## Phase 2 — Amaya Bay city shell

**Status: PARTIAL**

Implemented:

- ~900m × 900m semantic city footprint;
- 7 canonical districts;
- 28 named subareas/colonies;
- 45 distributed everyday venues;
- authored elevation model/waterfront/landmarks;
- 128m chunk streaming with active/visual/horizon rings;
- deterministic district dressing and vegetation;
- quality-dependent far residency;
- transport/location anchors and district identity.

Missing/limited:

- final authored terrain/road meshes;
- production LOD assets;
- fully baked navmesh/path service;
- end-to-end measured traversal/performance on target hardware.

## Phase 3 — Player + avatar identity

**Status: PARTIAL**

Implemented:

- persisted avatar schema/creator data;
- body frame, height, skin/hair/outfit identity;
- first/third-person shared body foundation;
- head-masking architecture hooks;
- locomotion/micro-motion sampling;
- gestures;
- remote avatar identity + interpolation;
- profile persistence.

Missing: production rig, authored clips, IK, facial system and release-quality blend polish.

## Phase 4 — Household formation + multiplayer

**Status: PARTIAL**

Implemented:

- fast/local identity path with Supabase adapter architecture;
- create/join household;
- Couple/Friends limits;
- six-character invite code;
- household lobby/state;
- property proposal/voting;
- property assignment;
- household Socket.IO room/presence;
- synchronized movement/profile state;
- reconnect to authoritative household snapshot.

Strict blocker: two real browser/device acceptance run not performed here.

## Phase 5 — Home system

**Status: PARTIAL**

Implemented:

- five physical starter shells;
- selected-property spawning;
- room-local persistent furniture state;
- 92 furniture/decor definitions;
- authoritative purchase/ownership/place/move/remove;
- rotation/snapping/overlap bounds;
- surface changes;
- decorate ghost preview;
- persistent hidden home state;
- Couple/Friends property capacities;
- 15 renovations.

Missing: final production interiors/assets and broad multiplayer stress/manual placement testing.

## Phase 6 — Embodied micro-life

**Status: PARTIAL**

Implemented:

- reusable micro-action state machine;
- pick/place/carry/pour/scrub/wipe/wash/cut/stir/press/open/close/fold/water/handover/receive/sit/sleep and related hooks;
- dishes;
- trash;
- plant care;
- laundry;
- floor cleaning;
- bathroom cleaning;
- repair;
- grocery restock;
- contextual home interactions;
- proportional persistent hidden state.

Missing: production object/contact IK and final chore prop/animation art.

## Phase 7 — Cooking + food

**Status: PARTIAL**

Implemented:

- 23 grocery/household items;
- 20 validated recipes;
- inventory/fridge logic;
- grocery purchasing;
- co-op cooking session persistence;
- parallel steps + station ownership;
- wash/cut/measure/boil/fry/stir/pour/plate/serve action mapping;
- good/imperfect/burnt outcomes;
- ingredient reservation/atomic consumption;
- kitchen player-facing surface.

Missing: final food/utensil assets, IK and complete shared-meal sit/eat animation polish.

## Phase 8 — Economy + jobs

**Status: PARTIAL**

Implemented:

- personal/household wallets;
- transaction ledger;
- server-owned prices/rewards;
- idempotency;
- Couple/Friends shared-spend protection rules;
- physical job sessions for Café Roshan, Market Helper, Delivery Rider, Nursery Assistant and Freelance;
- authored sequential actions and payout gates.

Missing: production NPC/customer/prop presentation and balancing playtest.

## Phase 9 — Transport + leisure

**Status: PARTIAL**

Implemented:

- walking;
- bicycle;
- scooter foundation;
- kayak foundation + weather closure;
- auto-rickshaw destination/fare/ride/skip flow;
- 8 required leisure activity definitions and persistent shared sessions;
- no XP/reward pressure for leisure.

Missing: release-quality vehicle handling/animation/physics and activity-specific art/tactile polish.

## Phase 10 — NPC life simulation

**Status: PARTIAL**

Implemented:

- ambient NPC pool/update tiers;
- 12 named residents;
- time schedules;
- discrete household-specific memory flags;
- contextual authored dialogue;
- named workplace/location anchors;
- weather/time-aware presentation foundations.

Missing: production navmesh/crowd pathing, door/interior traversal and animation/facial polish.

## Phase 11 — Story engine + life stages

**Status: COMPLETE WITH KNOWN LIMITATIONS**

Implemented and domain-verified:

- 7 life stages driven by active play;
- path/stage/flag eligibility;
- persistent tasks;
- branches/outcomes;
- failure memories;
- idempotent resolution;
- 20 shared stories;
- 8 Couple stories;
- 8 Friends stories;
- calm player-facing situation/task surface.

Known limitation: content/presentation has not undergone multi-session narrative playtest.

## Phase 12 — Memory Book

**Status: PARTIAL**

Implemented:

- manual capture;
- sparse automatic activity/story opportunities;
- capture scoring/cooldown foundations;
- private local/Supabase image store adapters;
- metadata/captions;
- scrapbook UI;
- authenticated retrieval;
- client share-card export.

Missing: composition quality playtesting, production Memory visual assets and cross-browser export verification.

## Phase 13 — Home growth + moving

**Status: COMPLETE WITH KNOWN LIMITATIONS**

Implemented and domain-verified:

- 15 renovation options;
- household approval;
- property choice/move transaction;
- keep/sell/donate packing state;
- minimalist starter-box fallback;
- server-computed moving cost;
- property transfer/new-home boxes;
- reconnect-safe moving/renovation state;
- physical home planning interaction;
- moving/renovation Memory opportunities.

Known limitation: final movers/truck/packing prop animations and emotional art staging are development-level.

## Phase 14 — Voice + social presence

**Status: PARTIAL**

Implemented:

- WebRTC peer architecture;
- Socket.IO offer/answer/ICE signaling;
- STUN/TURN configuration builder;
- off/household/proximity modes;
- mute and push-to-talk;
- distance attenuation hooks;
- private physical sticky notes;
- avatar gesture hooks.

Blocked: production TURN and 2–6 real-device voice soak testing.

## Phase 15 — Art, audio, weather + world polish

**Status: PARTIAL**

Implemented:

- district-specific dressing/materials/venue façades;
- 45 venue distribution preventing one-store/one-café city design;
- rain/wet-surface foundations;
- lighting/time/weather mood;
- district ambience foundation;
- sparse procedural/context music;
- authored audio/context hooks.

Release blocker: production art/audio asset replacement remains outstanding. See `docs/ASSET_REQUIREMENTS.md`.

## Phase 16 — Performance + accessibility + release quality

**Status: PARTIAL**

Implemented:

- Low/Medium/High/Capture profiles;
- pixel ratio/shadow/far-stream cost differences with gameplay scale invariant;
- FOV/head bob/reduced motion/UI scale/high-contrast/subtitles/master volume;
- keyboard remapping;
- controller movement/look/action mappings;
- frame/draw-call/triangle/chunk debug metrics;
- repository/secret/migration validation;
- sandbox-safe verification command.

Outstanding:

- clean connected dependency install/lockfile;
- lint/full build/Playwright;
- target hardware benchmark;
- browser matrix;
- broader network latency/loss soak;
- final asset compression/LOD benchmark.
