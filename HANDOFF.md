# Together V1 — Amaya Bay Handoff

## Product Summary

Together is a calm, beautiful, persistent browser-based 3D life simulator where real Couple or Friends households move into Amaya Bay, build a home, work gentle jobs, shop, cook, clean, decorate, explore, spend time together, experience authored life stories, and preserve shared history in a private Memory Book.

The product is about the feeling of living a life with someone. It is not a combat game, survival game, stat-dashboard simulator, public matchmaking product or MMO in V1.

## Authoritative Source

`docs/PRD.md` is the single source of truth. It supersedes every old Game Bible, prototype assumption, historical implementation note and old architecture wherever they conflict.

## Current Repository State

- Project: Together V1 — Amaya Bay
- Branch: `build/amaya-bay-v1`
- Implementation HEAD: `9f355fd6607902c2dbe035102a014c5abc1e9466`
- Historical imported-prototype commit: `5c4730e`
- Implementation-plan commit: `bc415e8`
- Final handoff documentation is committed after the implementation HEAD and intentionally does not self-reference its own Git hash; run `git rev-parse HEAD` for the final documentation commit.
- Language: TypeScript for active application code
- Monorepo: pnpm workspaces
- Client: React + Vite + Three.js + WebGPU-first renderer + Rapier + Socket.IO + Web Audio/WebRTC
- Server: Express + Socket.IO + Zod + Supabase/Postgres adapters + Drizzle schema definitions
- Shared: deterministic rules/runtime schemas
- Content: data-driven items, recipes, NPCs, activities and stories

The active legacy JavaScript/JSX prototype runtime was removed. Git history preserves it.

## Implemented

### Foundation

- TypeScript monorepo and shared contracts.
- WebGPU-first renderer architecture with WebGL2 fallback.
- Fixed/update loop and Rapier character controller.
- Pointer-lock keyboard/mouse, gamepad and remappable controls.
- Asset loader foundation and performance/debug counters.
- Socket.IO household/presence/movement and remote interpolation.
- Local + Supabase persistence adapter architecture.
- Nine ordered SQL migrations.

### Amaya Bay

- Approximately 900m × 900m semantic city footprint.
- Seven canonical districts: Mogra Court, Lantern Street, Mogra Park, Bay Steps, Rain Tree Lane, The Common, Hill Garden.
- 28 named subareas/colonies.
- 45 distributed everyday venues; the city intentionally has multiple groceries, cafés/tea spots, food places, repairs and laundries rather than one of each.
- 128m active/visual/horizon chunk streaming.
- Deterministic district dressing, terrain/elevation, vegetation, landmark/activity anchors, day/night/weather and district mood foundations.
- Low/Medium/High/Capture quality cost profiles.

### Player and identity

- First-person default with switchable third-person.
- Human-scale movement and camera collision.
- Persisted avatar identity/configuration.
- Shared local/remote identity presentation.
- Procedural development body and distinct locomotion/domestic/job/transport/social micro-motion hooks.

### Household and home

- Couple and Friends household creation/joining.
- Six-character invite codes.
- Couple/Friends membership and voting rules.
- Five physical starter property shells.
- Selected-property spawning.
- Server-authoritative furniture ownership and persistent place/move/remove/surface state.
- 92 furniture/decor definitions.
- Decorate mode with ghost preview, snapping and rotation.
- 15 renovation definitions and shared approval flow.
- Moving vote, packing, keep/sell/donate, property transfer and reconnect-safe state.

### Daily life and food

- Reusable embodied micro-action framework.
- Eight chore families with multi-step action/state sequences.
- 23 grocery/household item definitions.
- Multiple physical grocery venues.
- 20 recipes.
- Persistent co-op cooking sessions with station ownership, parallel dependencies, ingredient reservation and good/imperfect/burnt outcomes.

### Economy and work

- Personal and household wallets.
- Transaction ledger/idempotency.
- Server-owned prices/rewards.
- Shared-spend protection/voting rules.
- Physical job session definitions for Café Roshan, Market Helper, Delivery Rider, Nursery Assistant and Freelance/Remote Work.
- Payout requires authored step completion.

### Transport and leisure

- Walking, bicycle, scooter and kayak foundations.
- Seven-district auto-rickshaw destination/fare/visible-ride-or-skip flow.
- Eight persistent leisure activities with shared participation and embodied steps, intentionally without XP rewards.

### NPCs, story and Memory

- Ambient city-life NPC pool/update tiers.
- 12 named residents with schedules, discrete household memory flags and authored contextual dialogue.
- Seven internal life stages based on active play rather than offline punishment.
- 36 data-driven story definitions: 20 shared, 8 Couple, 8 Friends.
- Persistent story tasks, alternate failure outcomes and Memory hooks.
- Private manual Memory capture.
- Sparse automatic activity/story Memory opportunities.
- Private local/Supabase image-store adapters, captions, authenticated retrieval and share-card export.

### Social/voice/accessibility

- WebRTC peer voice architecture with Socket.IO signaling.
- Off/household/proximity modes, mute/PTT and proximity attenuation hooks.
- Private household sticky notes.
- FOV, head bob, reduced motion, UI scaling, high-contrast prompt, subtitles, master volume, keyboard remapping and controller foundations.

## Verified

### PASS in the supplied sandbox

```bash
node tools/verify-sandbox.mjs
```

This currently verifies:

- 161 tests pass / 0 fail;
- client TypeScript passes;
- shared TypeScript passes;
- content TypeScript passes;
- repository integrity passes;
- nine ordered migrations found;
- required project roots/docs found;
- no obvious committed secrets;
- legacy runtime entrypoints absent.

Content validation also returned zero issues.

See `docs/VERIFICATION.md` for exact evidence and blocked commands.

## Partially Implemented

The following systems are architecturally/functionally present but do not meet the PRD's final release-quality acceptance bar yet:

- final Amaya Bay art/terrain/road/facade assets;
- final stylized-realistic humanoid rig, facial system, authored animation clips and IK;
- baked NPC navmesh/path batching/local-avoidance production system;
- production weather runoff/puddle/reflection/footprint polish;
- complete district/interaction SFX and mastered music library;
- vehicle/activity tactile polish;
- production furniture/food/prop models for all stable content IDs;
- full browser/device/controller matrix;
- final automatic Memory framing playtest;
- production observability/rate-limit hardening;
- full PRD debug-editor suite.

## Not Implemented / Not Production-Verified

- random stranger matchmaking (intentionally postponed by PRD);
- second city (intentionally prohibited for V1);
- public MMO-scale other-household streets;
- cars/deep pets/mobile parity/VR (post-V1);
- production TURN connectivity testing;
- full public-city scaling/Redis Socket.IO adapter;
- final art source pipeline exports because final production art does not exist in this repository.

## Known Bugs / Reproduction

No deterministic domain bug is known in the 161-test sandbox-safe suite.

Known verification/runtime risks are environmental or untested rather than reproduced application crashes:

1. **Clean install/build not run in this sandbox.** Reproduce here by `corepack pnpm --version`; it fails with registry DNS `EAI_AGAIN`.
2. **Direct Vite build fails with copied dependencies.** It errors before application bundling because Linux Rollup native optional dependency is absent.
3. **Full server `tsc` fails with copied dependencies.** The copied package tree lacks declared Express/Supertest types and current Drizzle package layout.

Do not "fix" these by weakening TypeScript or downgrading architecture. Run a clean Node 24/pnpm install first.

## External Setup Required

### First connected development machine

```bash
corepack enable
corepack prepare pnpm@12.4.1 --activate
pnpm install
pnpm verify
pnpm test:e2e
```

Commit the generated `pnpm-lock.yaml`, then use `pnpm install --frozen-lockfile` thereafter.

### Supabase

Provide `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, client-safe anon variables, database and a private Memory bucket. Apply migrations `001`–`009` in order. Verify RLS/storage policy in the actual project.

### TURN

Provide real TURN URL/username/credential and run 2–6 member voice tests across different networks. No voice data should be recorded.

## Asset Gaps

The largest release blocker is production asset quality. See `docs/ASSET_REQUIREMENTS.md` for exact GLB/KTX2/audio requirements, suggested budgets, paths and replacement instructions.

The current world/characters are explicitly development/procedural art; never relabel them as final production art.

## Next Recommended Work

Dependency order:

1. On a connected Node 24 machine: clean pnpm install, generate lockfile, run full typecheck/lint/tests/content/build/Playwright.
2. Fix any **verified** clean-install issues only; do not refactor already green domain systems speculatively.
3. Run two-browser Couple onboarding and movement; then Friends 2–6 client soak/reconnect.
4. Implement/import final humanoid rig + authored locomotion/domestic clips + IK while preserving current interaction/state contracts.
5. Replace hero-route procedural world assets with final Amaya Bay building/road/vegetation/prop GLBs/KTX2 and profile LOD/compression.
6. Implement production NPC navmesh/path batching and door links.
7. Run shared-kitchen, furniture concurrency, moving and Memory acceptance tests with real people.
8. Production-test Supabase persistence/private Memories and TURN voice.
9. Profile 1080p Medium on PRD target hardware; tune chunk/LOD/shadow/texture budgets without changing gameplay collision.
10. Finish art/audio/weather polish and execute PRD Quiet Walk, Rain, Money, Moving, Memory and No-HUD acceptance tests.

## Important Architectural Rules

Future work must not undo these:

- `docs/PRD.md` wins over old docs/code.
- One city only: Amaya Bay.
- First person remains primary; third person remains optional.
- React must not own per-frame world transforms.
- Server owns persistent consequences/economy/story/home authority.
- Client movement/camera stay locally responsive.
- No numeric hunger/energy/relationship/vibe HUD.
- No timer substitution for promised embodied chores/cooking.
- No blocky/proxy development art should be called shipping art.
- Couple and Friends share one engine; only rules/content weighting differ.
- City streets are largely open; progression unlocks capability, not arbitrary barriers.
- Money is aspirational, not survival pressure.
- Failure creates alternate stories/memories rather than harsh game-over.
- Stable content IDs must survive asset replacement and save migration.
- Quality tiers may change render cost, never gameplay collision/interaction behavior.

## V3.1 technical-direction supersession

As of 2026-09-15, `docs/PRD.md` V3.1 is the authoritative product and technical direction. Together V1 remains a browser-only TypeScript/Three.js product: WebGPU-first via `three/webgpu`, with WebGL2 compatibility fallback, Rapier, React for application UI only, Socket.IO, and the existing server/shared/content architecture. Core Amaya Bay art is code-authored, compiled once into shared immutable runtime assets, then rendered through measured merging, instancing, LOD, and streaming. Blender/Maya/hand-authored GLB/KTX2 exports are optional future inputs only and are not a V1 production dependency. Medium is the normal supported-desktop baseline; Low is a complete fallback. Hardware FPS claims remain unverified until a real browser profile is recorded.
