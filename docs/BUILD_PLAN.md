# Together V1 — Amaya Bay Build Plan

> **Execution rule:** work in dependency order, test the smallest meaningful unit first, verify integration at every phase boundary, and never mark experiential work complete because files merely exist.

**Goal:** build the most complete coherent browser-playable Together V1 possible while preserving `docs/PRD.md` as the single product source of truth.

**Architecture:** migrate the legacy JavaScript prototype into a pnpm TypeScript monorepo. React owns menus/panels; a framework-independent Three.js engine owns the realtime world. Rendering is WebGPU-first with Three.js universal/WebGL2 fallback. Persistent consequences are server-authoritative through Express + Socket.IO with Supabase/Drizzle adapters and local development stores when credentials are absent.

**Current constraint:** the sandbox cannot resolve npm registry DNS, so new dependencies can be declared and code can be implemented, but a fresh frozen install cannot be performed here. Verification must distinguish source failures from unavailable platform packages.

---

## Phase 0 — Repository + technical foundation

**Objective:** produce a typed, deterministic engine/server foundation that can boot without hiding external-service dependencies.

**Depends on:** legacy audit only.

**Systems/files:** root workspace/tooling; `shared/src`; `client/src/game/core`; renderer backend; loop/input; Rapier adapter; asset registry; logger; Socket.IO session; auth/database adapters; debug metrics; tests.

**Implementation tasks:**
1. Convert workspace to pnpm and TypeScript with strict shared configs.
2. Replace Clerk assumptions with Supabase-anonymous adapter boundary and local dev identity fallback.
3. Define Zod/shared contracts for players, households, snapshots, city time/weather, home object mutations, economy idempotency keys.
4. Introduce `Renderer` abstraction using `three/webgpu`/`WebGPURenderer` as preferred path and explicit WebGL2-compatible fallback profile.
5. Introduce fixed-step capable `GameLoop`, non-React `InputManager`, `SceneManager`, `AssetLoader`, performance counters.
6. Initialize Rapier through a dedicated `PhysicsWorld` and kinematic player-controller boundary.
7. Canonicalize Socket.IO room/event contracts and snapshot/reconnect handshake.
8. Add Express health/runtime endpoints and structured logging.
9. Add content/asset validation scripts and baseline tests.

**Tests:** schema parsing/rejection; time conversion; invite-code rules; fixed-step clamping; renderer capability decision as pure logic; socket payload validation; server health; local persistence adapter.

**Acceptance:** client/server entry points exist; renderer/physics/socket/auth/db initialization failures are explicit; two clients have a defined join/snapshot path; full typecheck/lint/test/build must pass once dependencies are installable.

**Performance criteria:** zero per-frame React state ownership; render-loop allocation audit documented; debug frame/draw/triangle counters exposed.

**Manual verification:** browser boot, renderer backend report, pointer lock/input, physics capsule, server connection, reconnect snapshot.

**Phase failure:** any hidden client-authoritative wallet/story write, WebGL-only renderer, JavaScript-only new architecture, or React-driven transform loop.

**Blocks next phase:** renderer, input, physics, loop, and world scene must be structurally usable.

---

## Phase 1 — World feel vertical slice

**Objective:** make one Lantern Street → Bay edge slice visually pleasant enough to walk without a task.

**Depends on:** Phase 0 engine loop/render/physics.

**Systems/files:** world composition, materials, vegetation, lighting/time, weather/wetness, atmospheric fog, first/third camera, embodied proxy avatar, ambient NPC walkers, audio-zone architecture, performance overlay.

**Implementation tasks:**
1. Author a hero-street composition from reusable facade/curb/awning/window/balcony/drain/utility components rather than boxes.
2. Build stylized-PBR material families with roughness/albedo variation and weather parameters; use TSL-compatible material hooks where custom nodes are needed.
3. Build deterministic multi-layer vegetation species (trunk/branch/canopy hierarchy, instancing, wind hooks), not sphere trees.
4. Establish human scale, 78° first-person FOV, 1.62–1.78m eye-height range, collision-safe third-person toggle on `V`.
5. Add first-person proxy torso/legs/arms architecture and local-head visibility layer rules; final rig remains asset-dependent.
6. Add dawn → night continuous lighting profiles, golden-hour target, fog/atmosphere, rain state and progressive wetness.
7. Add district audio-zone interfaces and procedural ambient bed fallback where licensed final audio is missing.
8. Add simple deterministic NPC walkers with distance-tier hooks.
9. Track draw calls/triangles/frame time/chunk counts in debug overlay.

**Tests:** deterministic vegetation placement; lighting interpolation; weather state transition; camera mode state; NPC schedule/tier selection.

**Acceptance:** visual composition is no longer legacy box-city/sphere-tree blockout; walking/camera/weather operate coherently; final art gaps are clearly labeled.

**Manual verification:** quiet walk at midday, golden hour and rain; third-person camera collision; no obvious near-camera popping.

**Phase failure:** primary hero view still reads as engineering primitives or weather is only particles.

**Blocks next phase:** world component vocabulary and quality/performance budget must be credible.

---

## Phase 2 — Amaya Bay city shell

**Objective:** make all seven districts traversable through streamed 128m chunks using authored district composition data.

**Depends on:** Phase 1 world vocabulary and profiler.

**Systems/files:** `content/city`; chunk compiler/streamer; terrain height sampler; roads/paths/waterfront; district landmarks; semantic vegetation fields; collision/nav metadata; horizon LOD; transport-route graph; audio zones.

**Implementation tasks:**
1. Define 900m × 900m city coordinates and district bounds/landmarks.
2. Create deterministic chunk manifest covering Mogra Court, Lantern Street, Mogra Park, Bay Steps, Rain Tree Lane, The Common and Hill Garden.
3. Implement Active/Visual/Horizon residency state machine with hysteresis.
4. Generate terrain/road/path/waterfront proxy surfaces from authored data while final meshes remain replaceable assets.
5. Add chunk collision metadata and walking connectivity.
6. Add semantic vegetation zones and deterministic instance seeds.
7. Add district audio-zone metadata and named transport nodes/routes.
8. Add chunk/LOD debug visualization and residency metrics.

**Tests:** chunk coordinate mapping; ring hysteresis; deterministic seeds; district lookup; route graph integrity; manifest reference validation.

**Acceptance:** end-to-end city traversal is represented and streamable; no second city; all districts are geographically distinct; placeholder geometry is identified as proxy, not shipping art.

**Performance criteria:** chunk load/unload is out of per-frame hot path; old chunk remains until replacement state is ready; repeated props are instance-ready.

**Manual verification:** walk/scooter-speed debug traversal, stream boundary inspection, collision continuity, horizon composition.

**Phase failure:** monolithic always-loaded city, arbitrary street locks, or unbounded per-object update loops.

**Blocks next phase:** stable city coordinate/navigation substrate.

---

## Phase 3 — Player + avatar identity

**Objective:** make local/remote players recognizable and embodied.

**Depends on:** Phases 0–2 physics/network/world scale.

**Systems/files:** avatar schema/creator; rig loader; animation graph; first-person body; third-person body; remote interpolation buffer; clothing contexts; persistence.

**Implementation tasks:** typed avatar config; quality-focused option set; GLB rig contract; locomotion state graph; animation cross-fade; first-person head masking/body visibility; gesture hooks; remote snapshot interpolation; persistent config adapter.

**Tests:** avatar schema; interpolation under jitter; animation-state selection; camera visibility layers.

**Acceptance:** two players can have distinct persisted avatar configurations and smooth remote motion. Final acceptance requires production character/animation assets.

**Manual verification:** look down in first person; camera toggle; remote walking/turning; avatar reload persistence.

**Phase failure:** floating camera/hands, snapping remote avatar, or local body obscuring camera.

**Blocks next phase:** stable player identity for household lobby and co-presence.

---

## Phase 4 — Household formation + multiplayer

**Objective:** implement People → Household → Home.

**Depends on:** shared schemas, auth adapter, player identity, server rooms.

**Systems/files:** Supabase anonymous auth adapter; local dev auth; create/join API; 6-character code; Couple/Friends rules; lobby presence; property vote; assignment transaction; movement rooms; reconnect snapshot.

**Tests:** invite code collision handling; Couple capacity 2; Friends 2–6; vote tie rules; property assignment idempotency; reconnect snapshot.

**Acceptance:** two browser sessions can create/join one household, see presence, vote a property and enter same world/home context.

**Manual verification:** separate profiles/incognito clients, disconnect/reconnect, invalid/expired code.

**Phase failure:** host silently controls property, random stranger matchmaking required, or shared writes trust client values.

**Blocks next phase:** canonical household/property identity.

---

## Phase 5 — Home system

**Objective:** make a persistent shared home that changes safely.

**Depends on:** household/property assignment.

**Systems/files:** five shell definitions; interior zone streaming; room permissions; furniture definitions/catalog; decorate camera; authoritative placement/move/remove; surfaces; storage; lighting; persistence/local fallback; hidden home state.

**Tests:** bounds/overlap rules; bedroom permissions; duplicate mutation idempotency; reload serialization; concurrent version conflict.

**Acceptance:** reload preserves home; two clients converge on same canonical furniture state.

**Manual verification:** place/move/rotate item, surface change, simultaneous edits, room ownership in Friends.

**Phase failure:** client-only home state or rigid global grid required for all placement.

**Blocks next phase:** persistent interactive domestic environment.

---

## Phase 6 — Embodied micro-life

**Objective:** build reusable physical-action state machines, then real domestic interactions.

**Depends on:** avatar hooks, interaction sockets, persistent home object state.

**Systems/files:** primitives `pickup/place/carry/pour/scrub/wipe/wash/cut/stir/press/open/close/fold/water/handover/receive/sit/sleep`; chore compositions; hidden player/home states.

**Tests:** action transition legality; interruption/reconnect; proportional chore state; authoritative object state transitions.

**Acceptance:** dishes, trash, plant care, laundry, floor/bathroom cleaning, basic repair, groceries, sitting and sleeping visibly alter world state rather than resolving as a fake timer.

**Manual verification:** full dish flow; partial chores; two-player cooperation; reconnect mid-action.

**Phase failure:** toast/progress-bar-only completion for promised embodied action.

**Blocks next phase:** cooking reuses these primitives.

---

## Phase 7 — Cooking + food

**Objective:** deliver the shared meal loop as a composable station graph.

**Depends on:** micro-actions, inventory, home kitchen stations.

**Systems/files:** ingredients/inventory; recipes; fridge/storage; workstation occupancy; parallel step graph; mistakes/outcomes; serving/eating; starter comfort-food content.

**Tests:** recipe validation; parallel/sync step resolution; inventory consumption transaction; failure outcomes; co-op station lock.

**Acceptance:** two players can shop, prep in parallel, cook, serve, sit and eat one meal with imperfect-but-valid outcomes.

**Phase failure:** cooking is isolated score minigame or inventory-button consumption.

---

## Phase 8 — Economy + jobs

**Objective:** make money an aspiration loop, never survival punishment.

**Depends on:** authoritative transactions/inventory/world locations/micro-actions.

**Systems/files:** personal/shared wallets; idempotent ledger; purchase policy/votes; Café Roshan, Market Helper, Delivery Rider, Nursery Assistant; trust progression.

**Tests:** duplicate payout prevention; insufficient funds; Couple protection; Friends >30% shared spend vote; server-known prices/rewards only.

**Acceptance:** an enjoyable 6–12 minute job funds meaningful small purchases; no client-supplied reward or price is trusted.

---

## Phase 9 — Transport + leisure

**Objective:** make city time enjoyable without productivity.

**Depends on:** traversal/world/activity interaction framework.

**Systems/files:** bicycle, scooter, auto; picnic, cycling, kayak, badminton, mini-golf, café hangout, board/card game, photography.

**Tests:** transport state validation; activity lifecycle/cleanup; weather closure rules; rental transaction idempotency.

**Acceptance:** a 30-minute no-job/no-chore session offers several real activities.

---

## Phase 10 — NPC life simulation

**Objective:** make Amaya Bay feel alive without real strangers.

**Depends on:** city navigation/time/weather/content engine.

**Systems/files:** ambient pool; schedule evaluator; path request batching; update tiers; named NPC definitions/schedules/dialogue/memory flags for Roshan, Kamla Aunty, Ravi, Meera, Dev, Naina, Arjun, Isha, Sana, Kabir plus two residents.

**Tests:** schedule boundaries/overrides; memory flags; weather behavior; tier transitions; path batching.

**Acceptance:** named NPC dialogue/state changes after authored household events; city remains populated plausibly.

---

## Phase 11 — Story engine + life stages

**Objective:** create persistent branching life continuity.

**Depends on:** household, economy, NPC memory, micro-actions, activities.

**Systems/files:** stage evaluator; typed story content schema; trigger/condition/task/branch/outcome engine; cooldown; persistence/idempotency; Couple/Friends filtering; core events.

**Tests:** branching/failure; stage gating; cooldown; duplicate resolution; path filtering; persistent NPC/home effects.

**Acceptance:** same elapsed play can produce different household histories; failure creates alternative stories, not game-over.

---

## Phase 12 — Memory Book

**Objective:** turn gameplay into recognizable shared history.

**Depends on:** renderer capture, story/activity metadata, storage adapter.

**Systems/files:** manual capture; scoring; screenshot queue/retry; metadata; scrapbook layouts; captions; export.

**Tests:** score threshold/cooldown; failed-upload retry; idempotent event memory; metadata serialization/privacy.

**Acceptance:** sparse meaningful captures persist and can be reopened/exported.

---

## Phase 13 — Home growth + moving

**Objective:** make home change an emotional story arc.

**Depends on:** home/economy/story/memory/transport.

**Systems/files:** renovation sockets; listings; visits; vote; packing state; keep/sell/donate; moving transaction; box transfer; first-night event; Memory spread.

**Tests:** moving transaction atomicity; furniture disposition; vote protection; retry safety; old/new property state.

**Acceptance:** moving requires physical preparation and preserves meaningful possessions/memories.

---

## Phase 14 — Voice + social presence

**Objective:** optional household/proximity voice and lightweight asynchronous communication.

**Depends on:** household rooms/player spatial positions.

**Systems/files:** WebRTC mesh; Socket.IO signaling; STUN/TURN env; mute/PTT; spatial Web Audio; sticky notes; gestures; text overlay.

**Tests:** signaling state; household authorization; mute state; note limits; reconnect cleanup. TURN production testing remains blocked without credentials.

**Acceptance:** local/peer voice can connect without gameplay dependency; voice is never recorded.

---

## Phase 15 — Art, audio, weather + world polish

**Objective:** replace primary-route proxies and make visual/audio direction cohesive.

**Depends on:** stable gameplay/world systems and final/licensed assets.

**Systems/files:** hero facades/interiors/vegetation/props/materials; rain/wetness/runoff; waterfront; night; district ambience; footsteps; interactions; sparse music; asset compression/LOD.

**Acceptance:** no core route reads as placeholder blockout; hero frames satisfy PRD checklist.

**Failure:** calling proxy procedural geometry production art.

---

## Phase 16 — Performance + accessibility + release quality

**Objective:** meet target hardware/browsers and release-quality controls/resilience.

**Depends on:** all core systems.

**Systems/files:** quality tiers; FOV/head-bob/camera-shake; subtitles/UI scale/remapping/reduced motion/controller; audio categories; asset/chunk/LOD tuning; network loss simulation; E2E/soak/browser matrix.

**Tests:** settings persistence; quality invariants; reconnect under latency/loss; Playwright onboarding; 2-player and 6-player soak.

**Acceptance:** 1080p Medium targets 60fps on PRD-class hardware as measured outside this sandbox; Low remains complete at >=30fps target; all quality gates green.

---

## Global verification checkpoints

At each coherent checkpoint run, when dependencies are installable:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm validate
pnpm build
pnpm test:e2e
```

Also validate migrations/content/assets and boot client/server. Record exact results in `docs/IMPLEMENTATION_STATUS.md`. A dependency/platform block is recorded as BLOCKED, never converted into a false PASS.
