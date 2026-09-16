Continue `h55n/together` from the exact remote state produced by the 2026-09-16 gameplay/world recovery pass. Do not restart the project, do not recreate systems already present, and do not use an older local checkout as the source of truth.

## 1. Synchronize before doing anything

Repository: `https://github.com/h55n/together`
Canonical working branch: `build/amaya-bay-v1`
Recovery implementation floor: `f27efcab7a491d4c23e58b48be131e83d9916400`

Run:

```bash
git status --short
git fetch origin --prune
git switch build/amaya-bay-v1
git pull --ff-only origin build/amaya-bay-v1
git rev-parse HEAD
git log --oneline --decorate -15
```

The branch you pull must contain commit `f27efcab7a491d4c23e58b48be131e83d9916400` or a descendant. If your local branch has unrelated uncommitted work, preserve it safely before switching; do not overwrite it. Do not reset the remote branch backwards.

## 2. Read the authoritative context in this order

1. `docs/PRD.md` — authoritative V3.1 product/technical direction.
2. `docs/GAMEPLAY_RECOVERY_2026-09-16.md` — exact reason for this repair pass, completed fixes, and remaining browser work.
3. `docs/superpowers/plans/2026-09-16-gameplay-world-recovery.md` — implementation plan/history.
4. `HANDOFF.md`
5. `docs/IMPLEMENTATION_STATUS.md`
6. `docs/ARCHITECTURE.md`
7. `docs/BUILD_PLAN.md`
8. `docs/KNOWN_LIMITATIONS.md`
9. `docs/VERIFICATION.md`

Where older handoff/status wording conflicts with the V3.1 PRD or the dated gameplay-recovery document, use the PRD first and the recovery document second.

## 3. Product direction that must not regress

Together V1 is a browser-only TypeScript/Three.js multiplayer cozy life simulator set in one city, Amaya Bay. It is WebGPU-first with a supported WebGL2 fallback. Do not create Electron, a native PC renderer, Unity/Unreal migration, or a second client to avoid solving browser performance.

The V1 world-art pipeline is Three.js-native/code-authored and compiled into efficient runtime geometry. Blender/GLB is optional future input, not a dependency for completing V1.

Keep these rules:

- first-person is the default, third-person is always available;
- painterly stylized realism, not primitive/blockout shipping art;
- Medium is the canonical visual target;
- React owns UI, not per-frame world transforms;
- Rapier owns gameplay collision/controller correction;
- persistent economy/home/story consequences remain server-authoritative;
- no visible needs/relationship/vibe meters by default;
- chores/cooking remain embodied multi-step interactions;
- Couple/Friends share the same engine;
- no second city, random public matchmaking or MMO-scale layer before Amaya Bay V1 is complete;
- performance fixes must use batching, instancing, LOD, streaming, workload scaling and correct resource ownership—not by making the city visually empty.

## 4. Recovery work already completed — DO NOT redo it blindly

The 2026-09-16 gameplay recording showed camera obstruction, open-roof property shells, a bubble-diagram map, primitive world presentation and roughly 2k–3k draw calls in sparse views. The recovery branch already implemented:

### Camera

- first-person eye offset to reduce body intrusion;
- multi-probe third-person camera obstruction rather than a single center ray;
- immediate inward camera correction when a new obstruction appears;
- damped recovery outward;
- automatic registration of the permanent `amaya-bay-authored-environment` as a camera collision root;
- camera math tests.

Relevant files:

- `client/src/game/camera/CameraController.ts`
- `client/src/game/camera/cameraMath.ts`
- `client/src/game/camera/cameraMath.test.ts`

### Homes

- all starter property shell paths now receive roof/ceiling caps with small eaves;
- roof sizing is tested;
- roof render/camera geometry does not add unnecessary Rapier roof colliders.

Relevant files:

- `client/src/game/world/PropertyInterior.ts`
- `client/src/game/world/propertyShell.ts`
- `client/src/game/world/propertyShell.test.ts`

### City map

- old district bubbles are no longer the main map representation;
- authored road spine/connectors, park loop, promenade, coastline and landmark pins were added;
- map geometry is deterministic/tested and the map received a warm cartographic visual pass.

Relevant files:

- `client/src/ui/game/CityMap.tsx`
- `client/src/ui/game/CityMap.css`
- `client/src/ui/game/cityMapGeometry.ts`
- `client/src/ui/game/cityMapGeometry.test.ts`

### Runtime batching/performance foundation

- added `StaticBatchCompiler` to bake static transforms and merge compatible static meshes by shared material;
- Lantern Street hero geometry now uses it;
- permanent Amaya Bay landmark groups now use it;
- shrub source pieces are compiled into material-grouped runtime geometry;
- permanent Mogra Court/Rain Tree Lane/The Common landmarks received basic roof/plinth/facade-depth improvements while remaining batchable.

Relevant files:

- `client/src/game/assets/runtime/StaticBatchCompiler.ts`
- `client/src/game/assets/runtime/StaticBatchCompiler.test.ts`
- `client/src/game/world/HeroStreet.ts`
- `client/src/game/world/AmayaBayEnvironment.ts`
- `client/src/game/world/VegetationSystem.ts`

### Verification infrastructure

- `.github/workflows/ci.yml` now performs Node 24 + pnpm frozen install, typecheck, lint, tests, content validation, repository validation and production build;
- ESLint was made environment-aware so browser/Node globals do not produce hundreds of false `no-undef` errors;
- client test coverage now includes world/assets/map recovery work through the correct Vitest/Node runners.

A clean GitHub Actions run on implementation commit `f27efcab7a491d4c23e58b48be131e83d9916400` passed install, typecheck, lint, tests, validation and production build.

## 5. Your FIRST task: verify in a real browser before adding features

Do not start jobs, stories, furniture catalog expansion, voice, or another gameplay feature.

Run the baseline:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm validate
pnpm validate:repo
pnpm build
```

Then launch the actual client/server and reproduce the same kind of solo traversal that exposed the problem.

Specifically test:

1. spawn in every starter property;
2. walk through each doorway and tight interior corner;
3. toggle `V` first-person/third-person repeatedly;
4. orbit the third-person camera around walls, roofs, storefronts and narrow lanes;
5. look down in first person and inspect whether torso/head/limbs intrude incorrectly;
6. walk Mogra Court → Lantern Street → Bay Steps;
7. open `M` and confirm the new map communicates actual roads/coast/landmarks;
8. repeat the original recording viewpoints if possible.

If a camera/control problem remains, diagnose with evidence before changing movement speed or input math. Movement math was not the primary root cause of the recorded obstruction problem.

## 6. Measure performance before and after further renderer work

Use the existing debug metrics and record at minimum:

- renderer backend;
- FPS/frame time;
- p95/p99 frame time;
- >50 ms hitch counter;
- draw calls;
- triangles;
- visible Mesh/Object3D count;
- visible instance count;
- resident chunks;
- asset-registry resource counts.

Capture the same viewpoints before and after each optimization.

The supplied recording previously showed roughly 2,194 draws / 308k triangles around one open street view and roughly 2,977 draws / 395k triangles in another sparse open-world view. The recovery batching code should improve part of this, but DO NOT claim the target is met until you measure the new build.

PRD Medium guideline remains <160 typical draw calls, <900k typical visible triangles, 60fps target at 1080p on target class hardware, and no recurring >50ms hitch.

## 7. Highest-priority remaining engineering work

Work in this order unless fresh profiling proves another bottleneck is larger.

### A. Streamed chunk render-cost audit

Inspect:

- `client/src/game/world/WorldStreamer.ts`
- `client/src/game/world/AmayaBayChunkFactory.ts`
- `client/src/game/world/NeighborhoodDressing.ts`
- `client/src/game/world/CityVenueDressing.ts`
- vegetation/prop placement paths
- runtime asset registry/cache ownership

Find repeated geometry/material/object patterns still emitted as independent Mesh/Object3D submissions. Convert appropriate families to:

- `InstancedMesh` for repeated identical geometry/material;
- material-grouped compiled/merged `BufferGeometry` for unique static structures;
- `BatchedMesh` only where profiling demonstrates value and both renderer backends remain correct;
- explicit near/mid/far LODs with hysteresis.

Do not recursively dispose registry-owned shared geometry when chunks unload.

### B. Primary-route world-art recovery

The city is still far below the V3.1 art bar. Improve the highest-visibility route first instead of spreading weak detail everywhere:

Mogra Court → Lantern Street → Bay Steps.

For buildings add, where composition calls for it:

- roof/eave silhouette;
- facade setbacks;
- recessed windows/doors;
- frames/sills;
- balconies/porches/awnings;
- railings;
- thresholds/plinth/curb/drain ground contact;
- selective AC/exhaust/drain/service silhouettes;
- signs and planters;
- warm active interior planes at appropriate times.

For streets add authored rhythm rather than random clutter:

- curb/drain transitions;
- road patches/markings;
- poles/cables;
- bicycles/scooters/autos;
- benches/planters;
- foreground vegetation overlap;
- storefront spill-out;
- sightline breaks and view releases.

Keep all additions batch/instance/LOD-friendly.

### C. Avatar/game feel

The procedural avatar still looks like development art. Improve without breaking network/content identity contracts:

- locomotion blending and foot contact;
- turn-in-place / acceleration / deceleration readability;
- better posture and body yaw behavior;
- first-person body framing;
- hand/contact IK for interactions;
- higher-quality rig/animation representation using the code-owned Three.js architecture.

### D. City life and atmosphere

After frame cost is controlled, improve perceived life with budgeted motion:

- ambient pedestrians with tiered updates;
- bicycles/autos in distance;
- curtains/laundry/foliage motion;
- birds/cats/micro-events;
- storefront state;
- audio-zone identity;
- rain response and wetness.

Do not add expensive full-detail NPCs everywhere just to make screenshots busy.

## 8. Acceptance gates before moving on

Do not call the world-feel phase complete until:

- the camera never spends normal traversal inside/behind walls;
- starter homes read as enclosed architecture;
- first-person body framing is intentional;
- a player can understand the city map as geography;
- the primary route no longer reads as colored boxes on a plane;
- measured Medium draw calls/frame time are moving toward PRD budget without deleting visual identity;
- the Quiet Walk acceptance test is passed: a tester willingly walks Mogra Court → Bay Steps and notices lighting, vegetation, NPC life, sound, storefronts, weather or city detail without being given a task.

## 9. TDD / verification rules

For each behavioral or renderer-structure change:

1. reproduce/measure first;
2. add or update a failing test where the behavior is testable deterministically;
3. make the smallest architecture-correct change;
4. run focused tests;
5. run global typecheck/lint/test/validate/build at coherent checkpoints;
6. inspect the diff for accidental gameplay/content regressions;
7. update `docs/GAMEPLAY_RECOVERY_2026-09-16.md` and `docs/IMPLEMENTATION_STATUS.md` when the verified state changes materially.

Do not weaken tests, TypeScript, renderer architecture or browser support to make a failure disappear.

## 10. What can remain for later after world feel is actually good

Only after the world/camera/performance gate is healthy should you resume deeper release work such as production avatar polish, NPC navmesh/door links, shared-kitchen acceptance, Supabase production validation, TURN/voice soak, final weather/audio pass, browser/controller matrix, and the remaining PRD acceptance tests.

The immediate objective is not “more systems.” It is to make the existing game finally look, move and render like the Together V1 described by the PRD.
