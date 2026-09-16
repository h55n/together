Continue the Together V1 project from the exact current repository state. Do not restart the implementation, do not recreate systems already verified as working, and do not treat old documentation as more authoritative than `docs/PRD.md`.

Repository/project: Together V1 — Amaya Bay
Current working branch: `build/amaya-bay-v1`
Implementation HEAD containing the game/system work: `9f355fd6607902c2dbe035102a014c5abc1e9466`
The handoff documentation is committed after that implementation commit; use `git rev-parse HEAD` to see the final documentation-only HEAD.

## What Together is

Together is a calm, persistent browser-based 3D multiplayer life simulator where Couple or Friends households create identities, form a household, choose a home in Amaya Bay, live in embodied first-person (with switchable third-person), work gentle physical jobs, shop, cook, clean, decorate, travel, enjoy leisure, build NPC familiarity, experience ordinary-life stories and preserve shared history in a private Memory Book.

`docs/PRD.md` is the single source of truth.

## Product rules that must not regress

- One complete city only: Amaya Bay. Do not add a second city.
- First person is primary/default; third person remains switchable.
- World is real 3D calm stylized realism, not pixel/blocky primitive shipping art.
- Japanese-inspired spatial calm + contemporary Indian lived culture.
- Do not gate normal streets; progression unlocks capabilities/activities/life development.
- No combat, premium currency, FOMO, XP-grind focus or survival-punishment economy.
- No visible hunger/energy/relationship/vibe meters.
- React owns UI; Three.js owns the frame/world.
- Persistent consequences are server-authoritative.
- Never trust client price/reward/permission/inventory authority.
- Chores/cooking remain multi-step embodied systems; never replace them with fake wait timers.
- Couple/Friends share the same underlying engine.
- Memory Book is core, not optional gallery polish.

## Repository state and architecture

Read first:

1. `docs/PRD.md`
2. `HANDOFF.md`
3. `docs/IMPLEMENTATION_STATUS.md`
4. `docs/ARCHITECTURE.md`
5. `docs/KNOWN_LIMITATIONS.md`
6. `docs/ASSET_REQUIREMENTS.md`
7. `docs/BUILD_PLAN.md`
8. `docs/VERIFICATION.md`

The active app is TypeScript. Obsolete JS/JSX prototype runtime files were removed; history remains in Git at the legacy import commit.

Monorepo:

- `client/` — React/Vite UI + Three.js/Rapier game runtime
- `server/` — Express/Socket.IO authoritative services + repository adapters
- `shared/` — schemas and deterministic rules
- `content/` — typed game content
- `tools/` — validation/sandbox verification

## Implemented systems

Do not rebuild these from scratch:

- WebGPU-first renderer architecture + WebGL2 fallback;
- fixed loop, input, Rapier movement, camera modes and collision;
- ~900m-class Amaya Bay semantic city, 7 districts, 28 subareas, 45 venues, 128m streaming chunks;
- deterministic terrain/dressing/vegetation/weather/lighting/audio foundations;
- avatar identity/profile persistence, first/third-person body foundation and remote interpolation;
- Couple/Friends household creation, six-character codes, presence and property voting;
- five physical starter home shells;
- authoritative furniture ownership/placement/move/remove/surface state and decorate mode;
- 92 furniture/decor definitions and 15 renovations;
- reusable micro-actions and eight chore families;
- 23 item definitions, multiple physical groceries, 20 recipes and persistent co-op cooking;
- personal/shared wallets, idempotent transactions and physical job sessions;
- walking/bicycle/scooter/kayak/auto-rickshaw foundations;
- eight persistent leisure activity sessions;
- 12 named NPCs with schedules, dialogue and household memory flags;
- seven active-play life stages;
- 36 stories: 20 shared, 8 Couple, 8 Friends;
- private manual/automatic Memory images, captions and share export;
- moving/packing/property-transfer and renovation approval/state;
- WebRTC household/proximity voice signaling foundation and sticky notes;
- FOV/head-bob/reduced-motion/UI scale/high contrast/subtitles/audio/remapping/controller foundations;
- Low/Medium/High/Capture render-cost profiles and debug metrics.

## Verification baseline

In the original sandbox:

```bash
node tools/verify-sandbox.mjs
```

PASS:

- 161 tests / 161 pass / 0 fail
- client TypeScript PASS
- shared TypeScript PASS
- content TypeScript PASS
- repository integrity PASS
- content validation zero issues

The following were NOT application-verified because the sandbox had Node 22, no pnpm executable/registry DNS and a copied Windows dependency tree:

- clean install / generated pnpm lockfile
- full server TypeScript against clean dependencies
- ESLint
- Vite production build
- Playwright
- real browser two-player acceptance
- target-hardware FPS/GPU memory

## First exact task

Do **not** start by adding a new gameplay feature.

On a connected Node 24 machine:

```bash
corepack enable
corepack prepare pnpm@12.4.1 --activate
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm validate
pnpm build
pnpm test:e2e
```

Commit the generated `pnpm-lock.yaml` after the first clean green install. If anything fails, diagnose it from evidence. Do not weaken TypeScript, remove WebGPU architecture or reintroduce old JS just to make a stale environment pass.

After clean verification, manually run two-browser household onboarding/property/movement and reconnect. Fix only verified defects.

## Next dependency-ordered implementation work

1. Final humanoid GLB/rig/animations/IK and first-person embodiment polish.
2. Production Amaya Bay hero-route art replacement/LOD/KTX2/Meshopt.
3. Baked per-chunk navmesh/path batching/door links for NPCs.
4. Final weather/wetness/runoff/reflection and district SFX/audio assets.
5. Real-player shared-kitchen/furniture/moving/Memory acceptance testing.
6. Supabase RLS/private Storage production testing.
7. TURN voice testing and 2–6 member voice/network soak.
8. Medium/Low performance profile on PRD target hardware.
9. Browser/controller/accessibility matrix and PRD acceptance tests.

## Relevant high-leverage files

- `client/src/game/GameEngine.ts`
- `client/src/ui/game/GameCanvas.tsx`
- `client/src/game/world/WorldStreamer.ts`
- `client/src/game/world/AmayaBayChunkFactory.ts`
- `client/src/game/world/PropertyInterior.ts`
- `client/src/game/player/PlayerController.ts`
- `client/src/game/player/PlayerAvatar.ts`
- `server/src/app.ts`
- `server/src/index.ts`
- `server/src/db/GameRepository.ts`
- `server/src/db/LocalGameRepository.ts`
- `server/src/db/SupabaseGameRepository.ts`
- `server/src/game/*.ts`
- `shared/src/index.ts`
- `shared/src/world/city.ts`
- `shared/src/home/*`
- `shared/src/interaction/*`
- `shared/src/story/*`
- `content/src/index.ts`
- `tools/verify-sandbox.mjs`

## External dependencies/setup

- Supabase/Postgres/Auth/Storage for production persistence.
- Real private Storage bucket for Memory screenshots.
- TURN service for robust production WebRTC.
- Final Blender/GLB/KTX2/audio assets described in `docs/ASSET_REQUIREMENTS.md`.

## Asset gaps

The current procedural/development world and avatar are not shipping art. Preserve system/content IDs and replace proxies incrementally; never delete functioning system logic merely because final assets arrive.

## Known risks

Read `docs/KNOWN_LIMITATIONS.md`. In particular, do not claim 60fps target, TURN readiness, production avatar quality or hero-route art completion until measured/verified.

## Execution rule

Continue phase-by-phase. Before changing a system, inspect its current implementation and tests. Do not redo verified completed work. Use failing tests for behavior changes. Run relevant local tests after each atomic change and global verification at coherent checkpoints. Update `docs/IMPLEMENTATION_STATUS.md`, `HANDOFF.md` and `PROJECT_STATE.json` whenever the actual state materially changes.

## V3.1 technical-direction supersession

As of 2026-09-15, `docs/PRD.md` V3.1 is the authoritative product and technical direction. Together V1 remains a browser-only TypeScript/Three.js product: WebGPU-first via `three/webgpu`, with WebGL2 compatibility fallback, Rapier, React for application UI only, Socket.IO, and the existing server/shared/content architecture. Core Amaya Bay art is code-authored, compiled once into shared immutable runtime assets, then rendered through measured merging, instancing, LOD, and streaming. Blender/Maya/hand-authored GLB/KTX2 exports are optional future inputs only and are not a V1 production dependency. Medium is the normal supported-desktop baseline; Low is a complete fallback. Hardware FPS claims remain unverified until a real browser profile is recorded.
