# Repository Audit Against PRD — Together V1 “Amaya Bay”

**Audit date:** 2026-09-15  
**Authoritative product source:** `docs/PRD.md`  
**Imported baseline:** `5c4730ee1d30ebcc05c7f2f7675f996580ca1654` (`legacy-import`)  
**Implementation branch:** `build/amaya-bay-v1`

## Executive finding

The uploaded repository is a useful gameplay prototype, not a completed V1 foundation. Its strongest reusable pieces are the separation between React UI and a Three.js game loop, Socket.IO room/event concepts, Zustand stores, JSON story content, a Supabase-shaped persistence adapter, invite-code utilities, and a few persistence/economy concepts. The old documentation materially overstates completion: most “complete” systems are placeholders, timer/toast interactions, client-authoritative state, or primitive geometry.

The new PRD explicitly supersedes the old Navrang Nagar identity, Clerk authentication, WebGL/GLSL-first renderer, visible vibe/relationship systems, timer chores, old economy values, snow/winter weather, and blocky city art. Those must not be preserved for compatibility.

## Baseline verification

The uploaded ZIP contained Windows-installed `node_modules`. On Linux, the package executable shims initially lacked executable bits. After repairing executable bits locally, baseline commands still could not establish an application pass because the copied dependency tree lacks Rollup's Linux optional native package (`@rollup/rollup-linux-x64-gnu`). `npm ci` cannot repair the tree because this sandbox has no DNS access to the npm registry. This is an environment/package-transfer failure, not evidence that application runtime code is broken.

A genuine repository quality failure is also present: `npm run lint` has no ESLint configuration and exits before linting source.

| Baseline command | Result | Interpretation |
|---|---|---|
| `npm ci` | BLOCKED | registry DNS unavailable in sandbox |
| `npm test` | BLOCKED | copied Rollup native optional package is Windows-only/missing Linux binary |
| `npm run lint` | FAIL | no ESLint configuration in repository |
| `npm run build` | BLOCKED | copied Rollup native optional package missing for Linux |
| TypeScript | NOT AVAILABLE | legacy repo is JavaScript and has no TypeScript toolchain |

## PRD system audit

| Area | Status | Evidence / decision |
|---|---|---|
| Renderer | **REWRITE** | `GameEngine.js` directly constructs `THREE.WebGLRenderer`; no renderer abstraction or backend capability report. |
| WebGPU | **NOT BUILT** | no `three/webgpu`, `WebGPURenderer`, capability negotiation, or backend fallback path. |
| Shaders/materials | **REWRITE** | old custom GLSL/toon assumptions conflict with PRD TSL + stylized PBR direction. |
| City architecture | **REWRITE** | `CityGeometry.js` builds one ~400m primitive Navrang block, not 900m Amaya Bay. |
| Streaming | **NOT BUILT** | no 128m chunk residency model or streaming rings. |
| Terrain | **NOT BUILT** | single flat `PlaneGeometry`; no authored heightfield/splines/masks. |
| Vegetation | **REWRITE** | repeated cylinder + sphere trees explicitly violate PRD quality rule. |
| Lighting | **PARTIAL** | sky/time concepts exist, but renderer/light architecture is legacy and not quality-tiered. |
| Weather | **KEEP + REFACTOR** | weather concept exists; content includes snow/winter and lacks full wet-surface/world response. |
| First-person | **REWRITE** | camera system is not canonical embodied first-person; local avatar is not designed for head masking/body view. |
| Third-person | **KEEP + REFACTOR** | orbit/follow concepts are reusable after canonical first-person is established. |
| Physics | **REWRITE** | player uses manual AABB tests; PRD requires Rapier kinematic character controller. |
| Player | **KEEP + REFACTOR** | update/network separation is useful; movement/collision/body implementation must be replaced. |
| Avatar | **PARTIAL** | placeholder capsule/head and config exist; no production rig, creator depth, clothing contexts, IK, persistence completeness. |
| Interaction system | **KEEP + REFACTOR** | reusable registry/event idea; must add view ray + proximity priority, sockets, alignment, replication/persistence rules. |
| Micro-actions | **NOT BUILT** | apartment handlers mostly show toasts; no composable embodied primitives/state machines. |
| Home interiors | **PARTIAL** | apartment scene and room state exist, but quality/zone streaming/permissions are incomplete. |
| Furniture | **PARTIAL** | catalog and placement concepts exist; server authority, robust placement rules, item data architecture need revision. |
| Household creation | **PARTIAL** | create/join endpoints and invite code concept exist; canonical People → Household → Home flow is incomplete. |
| Multiplayer | **KEEP + REFACTOR** | Socket.IO groundwork exists; movement is broadcast-only/client-authoritative and lacks reconnect snapshots/validation/interest model. |
| Couple behavior | **PARTIAL** | old path flag exists, but canonical co-presence protections/voting are not implemented. |
| Friends behavior | **PARTIAL** | path flag exists; 2–6 persistent async rules/private bedrooms/recap are incomplete. |
| Economy | **REWRITE** | wallets/transactions exist conceptually, but values use old coin economy and lack idempotency/shared-decision policy. |
| Inventory | **NOT BUILT** | no canonical typed inventory service/table behavior. |
| Jobs | **PARTIAL** | endpoints/constants exist; jobs are not embodied physical world activities. |
| Chores | **REWRITE** | timer/reward/vibe model conflicts directly with PRD embodied partial-completion philosophy. |
| Cooking | **NOT BUILT** | only placeholder handler; no ingredients/recipe graph/stations/outcomes. |
| Transport | **NOT BUILT** | no functional bicycle/scooter/auto systems. |
| Leisure | **NOT BUILT** | no eight genuinely playable leisure activities. |
| NPCs | **KEEP + REFACTOR** | ambient walker concept exists; named cast/schedules/tiered updates/nav data are incomplete. |
| NPC memory | **NOT BUILT** | no canonical persistent authored fact flags per named NPC. |
| Story engine | **KEEP + REFACTOR** | JSON-driven concept is reusable; only three legacy events, old schemas/rewards/paths conflict with PRD. |
| Progression stages | **NOT BUILT** | no canonical Arrival → Open Living stage engine. |
| Memory Book | **PARTIAL** | UI/API ideas exist; no smart capture scoring, participant metadata, upload retry, layouts/export. |
| Voice | **NOT BUILT** | no WebRTC signaling/spatial voice/mic state. |
| Audio | **NOT BUILT** | asset folders exist but no PRD Web Audio bus/zone implementation of required depth. |
| Database | **KEEP + REFACTOR** | Supabase-shaped migration exists; schema names/columns need PRD v3 migration and Drizzle typing. |
| Authentication | **REWRITE** | old Clerk path conflicts with required Supabase Auth anonymous-first flow. |
| Save system | **PARTIAL** | persistence exists for selected systems; lacks transaction/idempotency/reconnect guarantees. |
| Networking | **KEEP + REFACTOR** | Socket.IO event/room concepts reusable; event names and server authority model need canonicalization. |
| Testing | **REWRITE** | small test set exists but current harness cannot run from packaged deps and coverage misses core PRD rules. |
| Performance | **PARTIAL** | old constants mention limits; no required live metrics/chunk residency/GPU timing architecture. |
| Developer tooling | **NOT BUILT** | PRD debug suite (teleport, weather/time, chunk, collider, network simulation, etc.) is absent. |

## Legacy systems explicitly removed from authority

- Navrang Nagar city naming and world layout.
- Clerk as canonical authentication.
- visible Vibe Meter and visible relationship scoring.
- coin-style `⌘` economy values and old job payouts.
- winter/snow as Amaya Bay routine seasonal weather.
- “E-key only” architecture as a universal interaction constraint; `E` remains default interact, but interaction composition is richer.
- old documentation claims that Phases 0–7 were complete.
- primitive sphere trees/colored box buildings as shippable world art.
- fake chore timers/toasts as completion of embodied chores.
- legacy GLSL/toon-shader-first rendering as the main material architecture.

## Reuse policy

Code is reused only when its runtime behavior and architecture satisfy `docs/PRD.md`. Reuse means preserving useful ideas or isolated implementations, not preserving obsolete interfaces. All new application code is TypeScript.
