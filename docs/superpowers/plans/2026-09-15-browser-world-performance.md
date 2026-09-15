# Browser World Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Amaya Bay immediately controllable and smooth at Medium quality through correct renderer selection, measured budgeted streaming, and reusable code-authored visual assets.

**Architecture:** Keep the existing Three.js engine and 128m city grid. Replace synchronous chunk reconciliation with a prioritised, budgeted residency queue; create cached asset definitions and instance pools so ordinary traversal changes transforms/visibility instead of allocating/disposal; adapt only far visual work from sustained frame measurements.

**Tech Stack:** TypeScript, Three.js/`three/webgpu`, Rapier, React UI, Vite, Node test runner, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-15-browser-world-performance-design.md`

## Global Constraints

- Browser-only desktop product; do not introduce Electron, a native client, or another renderer.
- WebGPU is preferred; WebGL2 fallback remains supported and forceable for test/debug.
- Medium is the normal supported-device experience; Low is a fallback, High/Capture add fidelity.
- React does not own per-frame world work; gameplay collision/interactions/NPC semantics remain quality-invariant.
- Code-authored Three.js assets compile once and are cached/shared; no core visual dependency on Blender/Maya/externally authored GLB assets.
- Commit each verified task and push `build/amaya-bay-v1` immediately after its commit.

---

## File Structure

- `client/src/game/core/Renderer.ts`: explicit Vite-resolvable WebGPU selection, forced WebGL2 mode, diagnostic fallback state.
- `client/src/game/debug/PerformanceMonitor.ts`: frame quantiles, counters, system timings, queue/memory/instance metrics.
- `client/src/game/debug/DebugOverlay.ts`: development-only compact performance display.
- `client/src/game/world/StreamingScheduler.ts`: pure priority/hysteresis/frame-budget scheduling.
- `client/src/game/world/WorldStreamer.ts`: residency ownership and staged commit integration.
- `client/src/game/assets/runtime/AssetRegistry.ts`: immutable compiled asset lifecycle.
- `client/src/game/assets/runtime/InstancePool.ts`: reusable `InstancedMesh` slots.
- `client/src/game/world/VegetationSystem.ts`: cached production vegetation variants/LODs.
- `client/src/game/world/NeighborhoodDressing.ts`: cached/merged building and prop placement integration.
- `client/src/game/performance/AdaptiveQualityController.ts`: measured visual budget decisions.
- `client/src/ui/game/GameCanvas.tsx`: honest critical-scene/deferred-city progress.
- authoritative docs listed in the spec: browser/code-authored asset direction and verified limits.

### Task 1: Renderer backend correctness

**Files:**
- Modify: `client/src/game/core/Renderer.ts`
- Modify: `client/src/game/core/rendererBackend.ts`
- Test: `client/src/game/core/Renderer.test.ts`

**Interfaces:**
- Produces `Renderer.create(canvas, { forceBackend?: 'webgl2' }): Promise<Renderer>`.
- Produces `RendererRuntimeInfo` with `requestedBackend`, `backend`, `fallbackReason?`, and capability booleans.

- [ ] **Step 1: Write failing backend-selection tests**

```ts
it('uses the Vite-resolvable WebGPU renderer when WebGPU initialization succeeds', async () => {
  const renderer = await Renderer.create(canvas, { dependencies: webGpuDependencies });
  expect(renderer.info).toMatchObject({ requestedBackend: 'webgpu', backend: 'webgpu' });
});

it('uses WebGL2 only when forced or after a recorded WebGPU failure', async () => {
  const renderer = await Renderer.create(canvas, { forceBackend: 'webgl2', dependencies: webGlDependencies });
  expect(renderer.info).toMatchObject({ requestedBackend: 'webgl2', backend: 'webgl2' });
});
```

- [ ] **Step 2: Run the renderer test and verify it fails because the options/info contract is absent**

Run: `pnpm --filter @together/client exec vitest run src/game/core/Renderer.test.ts`

- [ ] **Step 3: Implement static `three/webgpu` import and explicit dependency seam**

```ts
import { WebGPURenderer } from 'three/webgpu';
export type RendererCreateOptions = { forceBackend?: 'webgl2'; dependencies?: RendererDependencies };
```

Construct `WebGPURenderer` only for requested WebGPU, await `init()`, record its thrown message as `fallbackReason`, and construct `THREE.WebGLRenderer` only for forced WebGL2 or a capability-allowed failure.

- [ ] **Step 4: Run the renderer test and client typecheck**

Run: `pnpm --filter @together/client exec vitest run src/game/core/Renderer.test.ts; pnpm --filter @together/client typecheck`

- [ ] **Step 5: Commit and push**

```powershell
git add client/src/game/core/Renderer.ts client/src/game/core/rendererBackend.ts client/src/game/core/Renderer.test.ts
git commit -m "fix: make WebGPU renderer selection explicit"
git push origin build/amaya-bay-v1
```

### Task 2: Performance evidence and debug metrics

**Files:**
- Modify: `client/src/game/debug/PerformanceMonitor.ts`
- Modify: `client/src/game/debug/DebugOverlay.ts`
- Modify: `client/src/game/GameEngine.ts`
- Test: `client/src/game/debug/PerformanceMonitor.test.ts`

**Interfaces:**
- Produces `PerformanceMonitor.recordSystem(name, milliseconds)`, `recordStreaming(metrics)`, and `read()` fields for p95/p99, hitch counts, queues, instances, meshes, and timings.

- [ ] **Step 1: Write failing metric tests**

```ts
it('records p95, p99, and threshold hitch counts from a bounded frame sample', () => {
  const monitor = new PerformanceMonitor();
  [10, 16, 35, 55, 18].forEach((ms) => monitor.recordFrame(ms));
  expect(monitor.read()).toMatchObject({ framesOver33ms: 2, framesOver50ms: 1, p95FrameMs: 55 });
});
```

- [ ] **Step 2: Run the metric test and verify it fails**

Run: `pnpm --filter @together/client exec vitest run src/game/debug/PerformanceMonitor.test.ts`

- [ ] **Step 3: Implement bounded rolling samples and named timing ledger**

Keep at most 240 frame samples; use copied/sorted numeric samples only on overlay refresh. In `GameEngine.update`, time player/camera, streaming, NPC, weather/lighting, physics, and render submission with `performance.now()` only when debug instrumentation is enabled.

- [ ] **Step 4: Render the metrics in the existing overlay at its 250ms refresh cadence**

Display backend/fallback status, FPS/average/p95/p99, draw/triangles/mesh/instance counts, A/V/H chunks, pending jobs, generation/commit timings, and active colliders.

- [ ] **Step 5: Verify and commit/push**

Run: `pnpm --filter @together/client test; pnpm --filter @together/client typecheck`

```powershell
git add client/src/game/debug client/src/game/GameEngine.ts
git commit -m "feat: instrument world performance bottlenecks"
git push origin build/amaya-bay-v1
```

### Task 3: Deterministic, budgeted streaming scheduler

**Files:**
- Create: `client/src/game/world/StreamingScheduler.ts`
- Create: `client/src/game/world/StreamingScheduler.test.ts`
- Modify: `client/src/game/world/WorldStreamer.ts`
- Test: `client/src/game/world/WorldStreamer.test.ts`

**Interfaces:**
- Produces `StreamingScheduler.reconcile(desired, movement): void`, `takeFrameBudget(budgetMs, commit): number`, and `metrics()`.
- A job contains `{ key, x, z, ring, priority, revision }` and stale revisions cannot commit.

- [ ] **Step 1: Write failing scheduler tests**

```ts
it('commits current and forward chunks before horizon jobs within a frame budget', () => {
  const scheduler = new StreamingScheduler();
  scheduler.reconcile(desiredChunks, { x: 1, z: 0 });
  const committed = scheduler.takeFrameBudget(2, () => 1);
  expect(committed.map((job) => job.key)).toEqual(['0:0', '1:0']);
});

it('keeps a resident representation during a ring change until its replacement commits', () => {
  // Reconcile visual -> active, consume zero budget, then assert the visual resident remains.
});
```

- [ ] **Step 2: Run scheduler tests and verify failure**

Run: `pnpm --filter @together/client exec vitest run src/game/world/StreamingScheduler.test.ts`

- [ ] **Step 3: Implement priority, revision cancellation, and 12ms default budget**

Priority order is current chunk, adjacent chunks, movement-direction chunks, active, visual, horizon, then distance/key tie-break. Store residency separately from pending replacements. Jobs exceed no more than one commit callback per budget check.

- [ ] **Step 4: Integrate scheduler into `WorldStreamer` without changing the 128m manifest calculation**

`WorldStreamer.update` computes desired rings every 300ms, schedules differences, and consumes commits each frame. Keep current groups visible until replacement add succeeds. Remove groups only after replacement commit or true eviction.

- [ ] **Step 5: Verify and commit/push**

Run: `pnpm --filter @together/client exec vitest run src/game/world/StreamingScheduler.test.ts src/game/world/WorldStreamer.test.ts; pnpm --filter @together/client typecheck`

```powershell
git add client/src/game/world/StreamingScheduler.ts client/src/game/world/StreamingScheduler.test.ts client/src/game/world/WorldStreamer.ts client/src/game/world/WorldStreamer.test.ts
git commit -m "feat: budget city streaming work by frame"
git push origin build/amaya-bay-v1
```

### Task 4: Cache compiled code-authored assets and instance vegetation

**Files:**
- Create: `client/src/game/assets/runtime/AssetRegistry.ts`
- Create: `client/src/game/assets/runtime/InstancePool.ts`
- Create: `client/src/game/assets/runtime/AssetRegistry.test.ts`
- Modify: `client/src/game/world/VegetationSystem.ts`
- Modify: `client/src/game/world/AmayaBayChunkFactory.ts`

**Interfaces:**
- Produces `AssetRegistry.acquire(assetId, lod): CompiledAsset`, `releasePlacement(placementId)`, and `dispose()`.
- Produces `InstancePool.allocate(assetId, matrix): number`, `setVisible(slot, visible): void`, and `release(slot): void`.

- [ ] **Step 1: Write failing registry tests**

```ts
it('compiles each species variant and LOD once while returning separate placement slots', () => {
  const registry = new AssetRegistry(materials);
  expect(registry.acquire('tree:rain_tree:0:lod0')).toBe(registry.acquire('tree:rain_tree:0:lod0'));
  expect(registry.metrics().compiledAssets).toBe(1);
});
```

- [ ] **Step 2: Run the registry test and verify failure**

Run: `pnpm --filter @together/client exec vitest run src/game/assets/runtime/AssetRegistry.test.ts`

- [ ] **Step 3: Compile merged vegetation variants once**

Generate each deterministic tree variant per LOD with transformed `BufferGeometry`, merge compatible trunk/canopy surfaces, compute bounds, and cache immutable geometry/material references. Build `InstancedMesh` pools by species/variant/LOD; placement updates instance matrices instead of adding child meshes.

- [ ] **Step 4: Replace chunk tree `Group` construction with registry placements**

`AmayaBayChunkFactory` requests LOD from residency ring and records placement slots in `root.userData`. Chunk disposal releases slots only; it must not dispose registry geometry/materials.

- [ ] **Step 5: Verify and commit/push**

Run: `pnpm --filter @together/client exec vitest run src/game/assets/runtime/AssetRegistry.test.ts; pnpm --filter @together/client build`

```powershell
git add client/src/game/assets/runtime client/src/game/world/VegetationSystem.ts client/src/game/world/AmayaBayChunkFactory.ts
git commit -m "feat: instance cached production vegetation"
git push origin build/amaya-bay-v1
```

### Task 5: Merge static building/prop visuals and budget colliders

**Files:**
- Modify: `client/src/game/world/NeighborhoodDressing.ts`
- Modify: `client/src/game/world/AmayaBayChunkFactory.ts`
- Modify: `client/src/game/physics/PhysicsWorld.ts`
- Create: `client/src/game/world/NeighborhoodDressing.test.ts`

**Interfaces:**
- Consumes `AssetRegistry` and `StreamingScheduler` from Tasks 3–4.
- Produces placement-backed static dressing with `activateCollision()`/`deactivateCollision()` callbacks queued through the streaming budget.

- [ ] **Step 1: Write failing tests**

```ts
it('creates one merged facade surface per material family instead of one mesh per window and sill', () => {
  const group = createLayeredBuilding(lot, materials, true);
  expect(meshCount(group)).toBeLessThanOrEqual(6);
});

it('does not create active-ring colliders until the scheduled collision commit runs', () => {
  // Assert PhysicsWorld createFixedCuboid count is zero before and nonzero after commit.
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm --filter @together/client exec vitest run src/game/world/NeighborhoodDressing.test.ts`

- [ ] **Step 3: Merge facade/window/sill/balcony geometry by material**

Use `BufferGeometryUtils.mergeGeometries` after applying local transforms. Preserve facade depth, window rhythm, balconies, awnings, roof services, and existing material families. Use instance pools for repeated benches, lamps, bins, planters, crates, and posts.

- [ ] **Step 4: Queue simple collision proxies**

Use existing cuboid building proxies, but activate/deactivate only through a bounded callback queue. Keep collision data independent of rendering and never remove gameplay-relevant active collision due to visual quality.

- [ ] **Step 5: Verify and commit/push**

Run: `pnpm --filter @together/client exec vitest run src/game/world/NeighborhoodDressing.test.ts; pnpm typecheck; pnpm --filter @together/client build`

```powershell
git add client/src/game/world/NeighborhoodDressing.ts client/src/game/world/AmayaBayChunkFactory.ts client/src/game/physics/PhysicsWorld.ts client/src/game/world/NeighborhoodDressing.test.ts
git commit -m "feat: batch static city dressing and colliders"
git push origin build/amaya-bay-v1
```

### Task 6: Adaptive Medium-quality controller and first-playable UI

**Files:**
- Create: `client/src/game/performance/AdaptiveQualityController.ts`
- Create: `client/src/game/performance/AdaptiveQualityController.test.ts`
- Modify: `shared/src/settings/gameSettings.ts`
- Modify: `client/src/game/GameEngine.ts`
- Modify: `client/src/ui/game/GameCanvas.tsx`

**Interfaces:**
- Produces `AdaptiveQualityController.sample(snapshot): AdaptiveVisualBudget` with `{ pixelRatioCap, shadowScale, vegetationScale, streamRadiusChunks }`.
- Explicit selected `GameSettings.quality` is the upper bound; normal settings default to Medium.

- [ ] **Step 1: Write failing adaptation tests**

```ts
it('keeps Medium after sustained 45–60 FPS and lowers only far visual budget after repeated p95 hitches', () => {
  const controller = new AdaptiveQualityController('medium');
  expect(controller.sample(snapshot(16))).toMatchObject({ streamRadiusChunks: 5, shadowsEnabled: true });
  expect(afterSamples(controller, snapshot(42))).toMatchObject({ streamRadiusChunks: 4 });
});

it('never changes gameplayScale or active collision radius', () => {
  expect(controller.sample(snapshot(60)).gameplayScale).toBe(1);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm --filter @together/client exec vitest run src/game/performance/AdaptiveQualityController.test.ts`

- [ ] **Step 3: Implement sampled hysteresis adaptation**

Start Medium. Require 240 stable frames before increasing visual budget and 30 hitches over 33ms within 120 samples before reducing. Reduce far radius, vegetation LOD, shadow scale, then pixel ratio; restore in reverse. `quality: 'low'` pins fallback and `high`/`capture` raise only their ceiling.

- [ ] **Step 4: Wire critical readiness separately from deferred city readiness**

`GameEngine.create` invokes `onCriticalReady` after home/player/hero street are ready. `GameCanvas` replaces the blocking message with `Entering Amaya Bay` until critical readiness, then a non-blocking `City streaming` status. The engine starts controls at critical readiness.

- [ ] **Step 5: Verify and commit/push**

Run: `pnpm --filter @together/client exec vitest run src/game/performance/AdaptiveQualityController.test.ts; pnpm --filter @together/client test; pnpm typecheck`

```powershell
git add client/src/game/performance client/src/game/GameEngine.ts client/src/ui/game/GameCanvas.tsx shared/src/settings/gameSettings.ts
git commit -m "feat: adapt far visual quality without changing gameplay"
git push origin build/amaya-bay-v1
```

### Task 7: Audit permanent environment, document, and verify browser behavior

**Files:**
- Modify: `client/src/game/world/AmayaBayEnvironment.ts`
- Modify: `docs/PRD.md`
- Modify: `docs/ASSET_REQUIREMENTS.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/BUILD_PLAN.md`
- Modify: `docs/IMPLEMENTATION_STATUS.md`
- Modify: `docs/KNOWN_LIMITATIONS.md`
- Modify: `HANDOFF.md`
- Modify: `CONTINUATION_PROMPT.md`

**Interfaces:**
- Produces one ownership rule: only sky/water/explicit hero landmarks are permanent; route geometry is streamed through the asset registry.

- [ ] **Step 1: Write an environment ownership test**

```ts
it('keeps only declared sky, water, and hero landmarks permanent', () => {
  const environment = new AmayaBayEnvironment(materials);
  expect(permanentCityMeshNames(environment.root)).toEqual(['amaya-sky', 'amaya-water', 'bay-landmark']);
});
```

- [ ] **Step 2: Run test and verify failure if duplicate permanent route geometry remains**

Run: `pnpm --filter @together/client exec vitest run src/game/world/AmayaBayEnvironment.test.ts`

- [ ] **Step 3: Move duplicate city-route geometry into asset/streamer ownership**

Do not remove named hero landmarks, water, or sky. Delete only geometry duplicated by streamed chunks after replacement visual parity is observed.

- [ ] **Step 4: Reconcile all authoritative documentation**

State browser-only operation, code-authored compiled/cached assets, Medium baseline, optional imported assets, budgeted streaming, WebGPU-first/WebGL2 fallback, and unverified hardware FPS limits. Remove requirements that core world quality depends on Blender/GLB/KTX2 exports.

- [ ] **Step 5: Run full verification, manual browser profile, commit/push**

Run: `pnpm typecheck; pnpm lint; pnpm test; pnpm --filter @together/content validate; pnpm build`

Record backend, average/p95/p99, hitch counts, draw calls, triangles, mesh/instance counts, streaming jobs, and visible quality at Medium in `docs/VERIFICATION.md`. If the browser automation bridge remains unavailable, record it as an environment limitation rather than claiming measured FPS.

```powershell
git add client/src/game/world/AmayaBayEnvironment.ts docs HANDOFF.md CONTINUATION_PROMPT.md
git commit -m "docs: align browser asset and performance architecture"
git push origin build/amaya-bay-v1
```

## Plan Self-Review

- Spec coverage: Tasks 1–2 cover renderer correctness and instrumentation; Tasks 3–5 cover queueing, cached/instanced assets, colliders, LODs, and no traversal disposal; Task 6 covers Medium/adaptive critical readiness; Task 7 covers duplicate permanent geometry, authoritative docs, and measured verification.
- Placeholder scan: no deferred implementation labels or unspecified test assertions remain.
- Type consistency: Task 3 scheduler is consumed by Tasks 4–5; Task 4 registry is consumed by Task 5; Task 6 consumes monitor snapshots and existing shared quality settings.
