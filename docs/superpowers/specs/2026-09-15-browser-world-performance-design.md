# Browser World Performance and Visual Quality Design

**Date:** 2026-09-15
**Status:** Proposed for review

## Goal

Make Together V1 playable immediately in a desktop browser while preserving a polished Medium-quality city as the normal experience. The refactor must remove loading and traversal hitches through scheduling, shared production assets, instancing/batching, and adaptive quality—not by reducing the city to development geometry or permanently forcing players to Low.

## Product Constraints

- The only client remains the TypeScript browser client using Three.js, `three/webgpu`, WebGPU-first rendering, WebGL2 fallback, Rapier, React UI, Socket.IO, and the existing server/shared/content packages.
- Three.js owns all per-frame world mutation. React only owns UI state.
- Medium is the intended baseline for mid-range and higher-end desktop hardware. Low is a functional fallback. High and Capture improve visual fidelity without altering gameplay collision, interactions, city footprint, NPC semantics, or household systems.
- The world uses code-authored Three.js production assets compiled once, cached/shared, and rendered with the appropriate merge/instance/batch strategy. No core visual milestone depends on Blender, Maya, or externally authored GLBs.
- Existing multiplayer, home, economy, stories, interactions, and persistence remain intact.

## Baseline Findings

The current implementation constructs an `AmayaBayEnvironment`, the Lantern Street hero, a property interior, 32 ambient NPCs, and a `WorldStreamer` during `GameEngine.create`. `WorldStreamer` eagerly reconciles every required 128m chunk in a ring transition. The current factory creates terrain, dressing, venue objects, trees, and active-ring colliders synchronously. Ring changes remove groups, dispose geometry/materials, and rebuild whole chunk groups. Medium has a radius of five chunks and enables 1.5 pixel ratio and shadows; Low was recently made the temporary default, which conflicts with the product direction.

The renderer dynamically imports `three/webgpu` through an indirect Vite-ignored module specifier, then silently falls back to `WebGLRenderer` on any import/init error. This makes a production WebGPU failure indistinguishable from an intentional compatibility fallback. Existing monitoring covers FPS, CPU frame time, draw calls, triangles, and ring counts but cannot attribute a hitch to generation, commit, collider work, NPCs, physics, lighting, or renderer submission.

## Architecture

### 1. Reliable renderer selection

`Renderer` will use a Vite-resolvable static `three/webgpu` import. It will expose explicit backend selection: normal WebGPU-preferred mode, a test/debug forced WebGL2 mode, and an unsupported state. A WebGPU initialization failure will be retained as diagnostic data before a valid WebGL2 fallback is chosen. Debug metrics will show requested backend, selected backend, fallback cause, and capability signals.

### 2. Critical scene versus deferred city work

`GameEngine.create` will complete a critical scene only: renderer, physics ground, selected property, player/avatar, camera, lighting/weather, collision-safe hero street, and interaction data. Once this scene is committed, input and the render loop start. The streamer then prepares city work in priority order: current chunk, immediately adjacent chunks, direction-of-travel chunks, and distant horizon chunks. The loading UI communicates that the city is continuing to stream rather than blocking play.

### 3. Budgeted residency streaming

The streaming API changes from synchronous `createVisual(chunk, ring)` reconciliation to a data-first job queue. A job has immutable chunk placement data, requested ring/LOD, priority, and cancellation token. Preparation produces only structured placement data or cached asset references. Commit work is limited by a measured millisecond budget per frame. If a job exceeds budget, it continues next frame. Existing visible representation remains until a replacement is committed; residency hysteresis prevents immediate back-and-forth LOD changes at chunk boundaries.

The first implementation remains main-thread deterministic and budgeted. A later task introduces a worker for CPU-only placement preparation after the interface and benchmark prove its value. No Three.js object crosses the worker boundary.

### 4. Shared code-authored assets

A new runtime asset layer owns immutable geometry and shared materials by stable asset ID and LOD. It provides:

- `AssetDefinition`: semantic tags, bounds, collision proxy metadata, shadow policy, LODs, and batching mode.
- `CompiledAsset`: immutable geometry/material surfaces generated once per variant/LOD.
- `AssetRegistry`: cache lifecycle and preload access.
- `InstancePool`: stable instance slots for repeated assets such as trees, lamps, planters, benches, bins, facade modules, and repeated props.
- `StaticBatchRenderer`: optional measured batching for varied static geometry sharing a material family.

Repeated assets use `InstancedMesh`; unique buildings merge compatible internal geometry by material; only objects requiring independent animation/interactions remain individual objects. Registries retain shared resources across normal chunk transitions and dispose only at game shutdown or explicit cache eviction.

### 5. Visual-quality production packs

The initial packs focus on visible routes: building facades, five vegetation species, street props, road/waterfront/park dressing, and hero-route assets. Each pack is code-authored with recognizable silhouettes, facade depth, controlled material/vertex-color variation, and LOD0/LOD1/LOD2/horizon forms. Procedural generation remains an authoring tool, but each variant compiles once to a small number of immutable draw units rather than creating child meshes per placement.

Materials remain in `MaterialLibrary`/a controlled registry. Wetness, tint, roughness, emissive windows, and variation are shared material-level effects; new materials or procedural textures are not allocated per object or per chunk.

### 6. Collision and duplicated cost

Collision stays separate from render geometry. Active chunks activate simple authored cuboid/compound proxies through a budgeted queue; distant chunks never lose interaction semantics but do not retain unnecessary colliders. The permanent `AmayaBayEnvironment` will be audited against streamed content: only intentional sky/water/landmark components remain permanent, and duplicate city geometry is removed or moved into the same asset/streaming ownership model.

### 7. Instrumentation and adaptation

`PerformanceMonitor` records instantaneous, average, p95/p99 frame times; over-33ms and over-50ms counts; draw calls, triangles, visible meshes/instances, registry counts, ring residency, generation/commit queue timing, collider counts, per-system timings, and renderer memory where exposed. Debug instrumentation is lightweight and enabled only in development/debug mode.

An adaptive controller starts at Medium for the supported target. It samples sustained frame time after the critical scene is playable. It first reduces far residency, far LOD, shadow resolution, and render scale when performance is unstable; it restores those in reverse after sustained headroom. It never alters player physics, active collision, interaction reachability, NPC semantics, or the immediate home/hero scene. Explicit user quality selection overrides adaptation except for an emergency safe startup profile following a catastrophic initialization history.

## Data Flow

1. Game entry requests the renderer and creates the critical scene.
2. Engine starts input/rendering immediately after critical readiness.
3. Streamer computes desired residency from player position and velocity, applies hysteresis, and queues missing/changed placements.
4. Preparation resolves manifest/asset IDs and LODs; commit consumes jobs inside the frame budget.
5. Asset registry supplies cached shared resources; instance pools update transforms/visibility rather than rebuild geometry.
6. Performance monitor records work; adaptive controller adjusts only the far visual budget.
7. Debug overlay exposes the selected backend, workloads, queues, and current quality decision.

## Acceptance Criteria

- Medium starts as the normal setting for supported desktop devices.
- The critical scene reaches controllable state before deferred city work finishes.
- Streaming never intentionally performs unlimited chunk construction/collider work in one frame.
- No blank chunk is shown while a replacement LOD is pending.
- Nearby visuals, property interior, player, lighting, and core interactions retain visual quality during adaptation.
- Shared geometry/materials are not disposed during ordinary chunk traversal.
- WebGPU and forced WebGL2 paths report correct backend state and are independently testable.
- Unit tests cover queue priority/budget, hysteresis, quality adaptation invariants, registry reuse, and renderer selection logic.
- Production build, typecheck, existing gameplay tests, and browser/manual performance measurements are recorded separately. The automated environment cannot itself certify target-hardware FPS.

## Documentation Reconciliation

The following source-of-truth documents will be changed as implementation lands: `docs/PRD.md`, `docs/ASSET_REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `docs/BUILD_PLAN.md`, `docs/IMPLEMENTATION_STATUS.md`, `docs/KNOWN_LIMITATIONS.md`, `HANDOFF.md`, and `CONTINUATION_PROMPT.md`. They will replace the requirement for production Blender/GLB world assets with the code-authored compiled/cached asset architecture, preserve optional future import support, and describe Medium—not permanent Low—as the intended baseline.

## Out of Scope for This Refactor

No Electron/native client, new city, second renderer, gameplay rewrite, server architecture replacement, public matchmaking, or artist-authored asset dependency is introduced. GPU timing is best-effort only where browser/backend support is reliable.
