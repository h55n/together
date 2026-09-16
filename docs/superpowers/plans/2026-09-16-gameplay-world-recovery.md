# Gameplay World Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the player-facing 3D experience observed in the 2026-09-16 gameplay recording so movement is readable, cameras do not sit inside architecture, starter homes are visually enclosed, the map reads as a city, and the browser runtime spends substantially fewer submissions on repeated static detail.

**Architecture:** Preserve the authoritative browser-only TypeScript/Three.js/Rapier stack and existing server/gameplay systems. Fix camera visibility at the camera layer, add production-safe architectural enclosure to property shells, replace the bubble map with authored geographic layers derived from Amaya Bay coordinates, and reduce avoidable world-object overhead through shared geometry/instancing rather than deleting perceptual detail.

**Tech Stack:** TypeScript, Three.js, Rapier, React, Vitest/node:test, pnpm workspaces.

**Spec:** `docs/PRD.md` V3.1, especially Sections 22–33, 62, 85–90, 103–105, 111 and 112.

## Global Constraints

- V1 remains browser-only; do not create Electron/native fallback clients.
- First-person remains the default; third-person remains a seamless toggle.
- Medium quality remains the canonical visual target.
- Primary routes must not ship as primitive box-city art.
- Runtime fixes must prefer shared geometry/materials, merging, instancing, LOD and streaming.
- Camera collision must protect visibility without changing gameplay collision.
- Roof/ceiling changes must not prevent normal first-person traversal or interaction.
- No new gameplay systems in this recovery pass; repair the experience already present.

---

### Task 1: Camera obstruction safety

**Files:**
- Modify: `client/src/game/camera/cameraMath.ts`
- Modify: `client/src/game/camera/cameraMath.test.ts`
- Modify: `client/src/game/camera/CameraController.ts`
- Modify: `client/src/game/GameEngine.ts`

**Interfaces:**
- Produces: `firstPersonEyeOffset(yaw, distance)` and `safeThirdPersonDistance(desiredDistance, hitDistances, padding, minimumDistance)` helpers.
- Camera collision roots include the permanent `AmayaBayEnvironment.root` in addition to streamed/home roots.

- [ ] **Step 1: Write failing camera math tests** covering forward first-person eye offset and nearest-hit third-person distance clamping.
- [ ] **Step 2: Run the camera test and verify RED** because the helpers do not exist.
- [ ] **Step 3: Implement the pure helpers** with stable Three.js-forward yaw semantics and deterministic distance clamping.
- [ ] **Step 4: Replace the single fragile third-person ray with a small camera-volume probe set** (center plus lateral/vertical offsets) and snap inward immediately when a newly detected obstruction is closer than the current camera distance; keep damping only for recovery outward.
- [ ] **Step 5: Offset first-person eye slightly forward from the avatar root** to avoid the camera originating inside the placeholder torso while preserving visible limbs on look-down.
- [ ] **Step 6: Register `environment.root` as a collision root** in `GameEngine.create`.
- [ ] **Step 7: Run camera tests/typecheck/verification and commit.**

### Task 2: Starter-home enclosure and camera-readable interiors

**Files:**
- Modify: `client/src/game/world/StarterHome.ts`
- Modify: `client/src/game/world/PropertyInterior.ts`
- Create: `client/src/game/world/propertyShell.test.ts`

**Interfaces:**
- Production property groups expose named roof meshes `home:roof`/`home:<id>:roof` for validation/debugging.

- [ ] **Step 1: Write a failing property-shell test** asserting the couple studio and a non-studio property include roof/ceiling geometry above wall height.
- [ ] **Step 2: Run the property-shell test and verify RED.**
- [ ] **Step 3: Add thin roof/ceiling caps with modest eaves** using shared material families; keep them camera-collidable through the existing home group but do not add unnecessary Rapier roof colliders.
- [ ] **Step 4: Ensure doorway/spawn clearance remains valid** and no roof mesh sits below the camera's normal first-person height.
- [ ] **Step 5: Run focused tests/typecheck and commit.**

### Task 3: Replace the bubble diagram with a navigable Amaya Bay map

**Files:**
- Modify: `client/src/ui/game/CityMap.tsx`
- Modify: `client/src/index.css`
- Create: `client/src/ui/game/cityMapGeometry.ts`
- Create: `client/src/ui/game/cityMapGeometry.test.ts`

**Interfaces:**
- `cityMapGeometry.ts` exports authored road/path polylines, waterfront geometry and `worldToMapPoint` projection helpers using the canonical 900m coordinate system.

- [ ] **Step 1: Write failing map-geometry tests** for world/map orientation, coastline placement and road endpoints connecting canonical district centers.
- [ ] **Step 2: Run the tests and verify RED.**
- [ ] **Step 3: Implement deterministic map geometry** for primary road spines, neighborhood connectors, Bay Steps waterfront/promenade, park loop and hill approach.
- [ ] **Step 4: Render roads, paths, coastline, district labels, selected landmarks/transport anchors and a current-location indicator** with a restrained legend; remove district circles as the primary representation.
- [ ] **Step 5: Style the map as warm tactile cartography, not a planning bubble chart.**
- [ ] **Step 6: Run focused tests/typecheck and commit.**

### Task 4: Reduce avoidable world draw submissions

**Files:**
- Modify: `client/src/game/world/AmayaBayEnvironment.ts`
- Modify: `client/src/game/world/NeighborhoodDressing.ts`
- Modify: `client/src/game/world/CityVenueDressing.ts`
- Modify as needed: `client/src/game/assets/runtime/StaticGeometryCache.ts`, `InstancePool.ts`
- Add/modify focused tests alongside those systems.

**Interfaces:**
- Repeated primitive geometry must come from shared cached geometry or `InstancedMesh` pools rather than allocating one geometry per placement.

- [ ] **Step 1: Add a failing resource-structure test** that catches repeated equivalent `BoxGeometry`/common prop meshes being emitted as independent geometry where pooling is expected.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Reuse shared geometry for common static boxes/slabs/windows/rails** and instance repeated detail families where transforms/materials are compatible.
- [ ] **Step 4: Preserve visual density while reducing mesh submissions; do not solve performance by deleting the city.**
- [ ] **Step 5: Update debug/resource assertions so regressions are measurable.**
- [ ] **Step 6: Run focused tests/typecheck and commit.**

### Task 5: Improve the visible world baseline without expanding scope

**Files:**
- Modify: `client/src/game/world/AmayaBayEnvironment.ts`
- Modify: `client/src/game/world/HeroStreet.ts`
- Modify: `client/src/game/world/MaterialLibrary.ts`
- Modify focused visual-structure tests if required.

**Interfaces:**
- Existing landmark IDs and interaction anchors remain stable.

- [ ] **Step 1: Add structural tests for hero-building requirements** (roof/eave, recessed/opening layer, ground-contact treatment and vegetation/prop anchors) where they can be represented deterministically.
- [ ] **Step 2: Verify RED where current primitive buildings fail.**
- [ ] **Step 3: Add roof silhouettes/eaves, façade depth, balcony/awning/threshold/ground-contact layers and selective service detail** to the most visible permanent landmarks and Lantern Street hero frontage.
- [ ] **Step 4: Improve foreground/midground vegetation and street rhythm using existing shared materials/compiled vegetation rather than per-placement mesh explosions.**
- [ ] **Step 5: Keep stable IDs, collisions and gameplay anchors unchanged.**
- [ ] **Step 6: Run focused tests/typecheck and commit.**

### Task 6: Verification, truthful status and handoff

**Files:**
- Modify: `docs/IMPLEMENTATION_STATUS.md`
- Modify: `docs/KNOWN_LIMITATIONS.md`
- Modify: `docs/VERIFICATION.md`
- Modify: `HANDOFF.md`
- Modify: `PROJECT_STATE.json`
- Modify: `CONTINUATION_PROMPT.md`

**Interfaces:**
- `CONTINUATION_PROMPT.md` must instruct Codex to fetch the final pushed branch/commit, update its local checkout, verify baseline, inspect the recording-driven recovery changes, and continue only remaining work.

- [ ] **Step 1: Run every verification available in the execution environment.** Record commands and exact limitations; do not claim browser/performance success without a real run.
- [ ] **Step 2: Compare the recovery branch against `build/amaya-bay-v1` and review every changed file for accidental scope expansion.**
- [ ] **Step 3: Update implementation status to distinguish code-complete, manually unverified and still-missing release-quality work.**
- [ ] **Step 4: Write a continuation prompt with exact branch/commit and remaining priorities.**
- [ ] **Step 5: Push the final verified branch state, then fast-forward or merge into the requested working branch only if verification supports it.**
