# Together V1 Audit Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair every currently verified lifecycle, renderer, physics, persistence, authorization, socket, story/content, verification, and tooling defect without changing Together V3.1 product direction.

**Architecture:** Preserve the browser-only Three.js/WebGPU-first client and the existing service/repository boundaries, but make their invariants explicit and testable. Consequence-changing multi-record writes move behind repository atomic-operation methods; authorization always precedes idempotent/cache returns; renderer/engine lifetime becomes independent from React transient UI state; terrain collision follows the same canonical height field as rendering; socket payloads are minimized and room membership is socket-scoped. The authoritative product source is Together PRD V3.1; historical files may be removed when they contradict V3.1 and have no runtime consumers.

**Tech Stack:** TypeScript, React, Three.js/WebGPU + WebGL2 fallback, Rapier 3D, Socket.IO, Express, Supabase/PostgreSQL, Vitest, Node test runner, pnpm, GitHub Actions.

**Spec:** `docs/PRD.md` / Together PRD V3.1. Relevant requirements: WebGPU-first browser-only renderer (§24), server-authoritative state (§57), canonical DB model (§69), transactional consequence-changing writes (§78), immediate/transactional persistence (§79), request/invite rate limiting and authorization (§109), browser fallback policy (§124), repository migration principle (§127), source-of-truth conflict rule (§131).

## Global Constraints

- Browser-only V1; do not add Electron/native client.
- `three/webgpu` / WebGPU is preferred; WebGL2 is compatibility fallback.
- Gameplay must remain complete in WebGL2 fallback.
- Server owns wallets, inventories, purchases, property, home persistence, story state/rewards, NPC persistent flags, job payouts, votes, and Memory metadata.
- Every consequence-changing request must be idempotent and ownership-scoped.
- Multi-record authoritative writes must be atomic.
- PRD V3.1 overrides legacy runtime/document assumptions.
- Use test-first fixes and keep CI green after each repair group.

---

### Task 1: Make verification truthful and cross-platform

**Files:**
- Modify: `package.json`
- Modify: `client/package.json`
- Modify: `content/package.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `tools/verify-sandbox.mjs`
- Modify: `tools/verify-pure.mjs`
- Modify: `content/src/validate.ts`
- Test: all existing client/content/tool verification suites

**Interfaces:**
- Produces one `pnpm verify` gate that executes every unit/service/content suite plus typecheck, lint, validation and build.

- [ ] Add the two currently omitted client test files to the client test command.
- [ ] Add a real `content:test`/workspace `test` script so content tests execute under normal `pnpm test`.
- [ ] Include pure service verification in the CI/verify gate rather than relying on historical sandbox-only runs.
- [ ] Replace bare `tsc` spawning with a Node-resolved/package-manager-safe invocation on Windows.
- [ ] Make `content/src/validate.ts` direct-execution detection URL/path-safe on Windows.
- [ ] Run/inspect CI and fix only defects exposed by the expanded gate.

### Task 2: Repair canonical database schema compatibility

**Files:**
- Create: `server/src/db/migrations/010_audit_hardening.sql`
- Modify: `server/src/db/SupabaseGameRepository.ts`
- Modify: `server/src/game/HouseholdService.ts`
- Modify/Test: `server/src/game/HouseholdService.test.ts`
- Create/Test: `tools/verification/schema-contract.test.ts`

**Interfaces:**
- Produces a V3.1-compatible `users` row shape, valid UUID property references, full RLS coverage, and conflict targets that PostgreSQL can enforce safely.

- [ ] Write failing contract tests for legacy `users.clerk_id/username` nullability, Solo Explorer UUID property assignment, transaction idempotency uniqueness, and RLS on job/activity sessions.
- [ ] Add migration 010 to relax/remove obsolete Clerk-era constraints while preserving legacy data, add/repair exact unique constraints required by repository upserts, enable RLS on migrations 008/009 tables, and add canonical constraints for current V1 identifiers.
- [ ] Assign Solo Explorer using the canonical starter property record UUID, never a definition slug.
- [ ] Make Supabase upsert conflict targets match real non-partial unique constraints.

### Task 3: Enforce authorization and idempotency ownership before cached returns

**Files:**
- Modify: `server/src/game/JobSessionService.ts`
- Modify: `server/src/game/ActivityService.ts`
- Modify: `server/src/game/PropertySelectionService.ts`
- Modify: `server/src/game/MovingService.ts`
- Modify: `server/src/game/RenovationService.ts`
- Modify: `server/src/game/EconomyService.ts`
- Create/Test: `server/src/game/AuthorizationIdempotency.test.ts`

**Interfaces:**
- Cached/idempotent results may be returned only after caller membership/ownership is proven and the recovered record matches requested household/user/action scope.

- [ ] Write failing tests showing non-members can currently retrieve cached sessions/resolved votes or reuse another caller's idempotency key.
- [ ] Authorize household membership before all cache/resolution early returns.
- [ ] Verify cached session/transaction ownership and semantic operation type before returning it.
- [ ] Ensure vote resolution reads remain authorized even when already resolved.

### Task 4: Make money/home/job mutations atomic and one-shot

**Files:**
- Modify: `server/src/db/GameRepository.ts`
- Modify: `server/src/db/LocalGameRepository.ts`
- Modify: `server/src/db/SupabaseGameRepository.ts`
- Modify: `server/src/game/EconomyService.ts`
- Modify: `server/src/game/JobSessionService.ts`
- Modify: `server/src/game/MovingService.ts`
- Modify: `server/src/game/RenovationService.ts`
- Create/Test: `server/src/game/AtomicMutation.test.ts`
- Extend: `server/src/db/migrations/010_audit_hardening.sql`

**Interfaces:**
- Repository atomic methods commit wallet + ledger + inventory/home/session state in one operation and return the committed canonical records.

- [ ] Write failure-injection tests proving partial writes are currently possible.
- [ ] Add repository-level atomic operation APIs for purchase, job completion, moving commit, and renovation commit.
- [ ] Implement local repository atomicity with staged clones/commit-at-end semantics.
- [ ] Implement Supabase atomicity through PostgreSQL RPC functions added by migration 010.
- [ ] Bind job payout idempotency to the job session itself so a completed session cannot pay again under a new caller key.
- [ ] Reject `complete()` for a job session already completed unless returning the same committed payout result.
- [ ] Add minimum elapsed-time and authored job/location context validation without making movement client-authoritative.

### Task 5: Harden HTTP auth, rate limits, and socket lifecycle/privacy

**Files:**
- Modify: `server/src/auth/AuthService.ts`
- Modify: `server/src/app.ts`
- Modify: `server/src/socket/registerSocketServer.ts`
- Modify: `server/src/game/TimeService.ts`
- Modify: `server/src/index.ts`
- Modify: `client/src/network/GameSocketClient.ts`
- Create/Test: `server/src/socket/registerSocketServer.test.ts`
- Create/Test: `server/src/app.security.test.ts`

**Interfaces:**
- Development-header identity is explicitly opt-in; request/invite paths are rate limited; presence is socket-scoped; room changes leave prior rooms; remote profiles expose only display name/avatar; city time can restore a persisted epoch.

- [ ] Write failing tests for accidental dev auth, missing rate limits, multi-socket presence overwrite, rejoin room leakage, over-broad profile payload, and city-time reset semantics.
- [ ] Require explicit `ALLOW_DEV_AUTH=true` in addition to non-production mode for dev-header identity.
- [ ] Add dependency-free in-memory request limiter middleware with stricter invite/join limits and standards-compliant 429 responses.
- [ ] Key presence by socket ID and maintain user-to-socket lookup for targeted voice signaling.
- [ ] Leave previous household/city rooms before rejoin and emit leave semantics only for the departing socket/user presence that actually disappears.
- [ ] Map profile broadcasts to `{displayName, avatarConfig}` only.
- [ ] Persist/restore city-time epoch through server state/config so restarts do not reset day/time when persistence is configured.

### Task 6: Fix client engine/renderer/input lifetime defects

**Files:**
- Modify: `client/src/ui/game/GameCanvas.tsx`
- Modify: `client/src/game/core/rendererBackend.ts`
- Modify: `client/src/game/core/Renderer.ts`
- Modify: `client/src/game/GameEngine.ts`
- Modify: `client/src/game/core/InputManager.ts`
- Create/Test: `client/src/game/core/rendererBackend.test.ts`
- Create/Test: `client/src/game/core/InputManager.test.ts`
- Create/Test: `client/src/ui/game/GameCanvas.lifecycle.test.tsx` or equivalent extracted helper tests

**Interfaces:**
- Engine creation depends only on structural session/avatar/property inputs, not transient capture/UI state; default backend is WebGPU-first; no WebGL context is acquired on the production canvas merely to probe capability; pixel ratio changes only when budget changes; disabled input emits a neutral snapshot.

- [ ] Add failing renderer-selection tests proving normal URLs should not force WebGL2 and detection must not consume the production canvas context.
- [ ] Split capability detection into non-destructive WebGPU detection and fallback WebGL probing via a temporary canvas / guarded fallback path.
- [ ] Remove normal-path `forceRendererBackend='webgl2'`; retain explicit diagnostic query forcing only when requested.
- [ ] Stabilize engine event callbacks through refs/event adapters so capture busy state cannot recreate `GameEngine`.
- [ ] Cache applied visual budget/pixel ratio and only update renderer properties on actual budget changes.
- [ ] Make disabled `InputManager.consumeSnapshot()` return neutral values and reset gamepad edge state.

### Task 7: Align physics with terrain and complete resource disposal

**Files:**
- Modify: `client/src/game/physics/PhysicsWorld.ts`
- Modify: `client/src/game/world/AmayaBayChunkFactory.ts`
- Modify: `client/src/game/world/VegetationSystem.ts`
- Modify: `client/src/game/world/WorldStreamer.ts`
- Modify: `client/src/game/GameEngine.ts`
- Create/Test: `client/src/game/physics/terrainPhysics.test.ts`
- Extend/Test: existing world streamer/asset lifetime tests

**Interfaces:**
- Active terrain chunks create colliders derived from the same sampled height field as rendered chunk geometry; chunk unload destroys chunk-owned colliders/resources; engine disposal frees Rapier world and permanent authored geometry safely.

- [ ] Write failing tests for hill height/collider agreement and disposal counts.
- [ ] Remove the giant flat-world collider as the authoritative outdoor ground.
- [ ] Generate active-ring terrain heightfield/trimesh collision from the canonical chunk height samples and dispose on unload/ring downgrade.
- [ ] Add explicit `PhysicsWorld.dispose()` and call Rapier `world.free()`/resource cleanup where supported.
- [ ] Expose and invoke vegetation/compiled-asset disposal.
- [ ] Dispose permanent scene geometry that is not owned by shared material/asset registries without double-freeing shared geometry.

### Task 8: Repair cooking, home-render sync, and live household synchronization

**Files:**
- Modify: `client/src/ui/game/GameCanvas.tsx`
- Modify: `client/src/ui/game/CookingPanel.tsx`
- Modify: `client/src/network/GameSocketClient.ts`
- Modify: `server/src/socket/registerSocketServer.ts`
- Modify: mutation services/routes that change shared household state
- Create/Test: client cooking/home synchronization tests

**Interfaces:**
- Completed cooking history does not block starting a new meal; surface finishes sync immediately; household mutation events cause other connected members to refresh authoritative state.

- [ ] Keep `cookingSession` null when no active session exists; display recent completed result separately if desired.
- [ ] Provide an explicit new-meal action after completion.
- [ ] Call `syncHomeDecoration()` after surface mutations.
- [ ] Add scoped socket invalidation events for home/economy/inventory/story/household mutations and refresh from authoritative HTTP endpoints on peers.

### Task 9: Repair story/content/runtime invariants

**Files:**
- Modify: `server/src/game/PropertySelectionService.ts`
- Modify: `server/src/game/StoryService.ts`
- Modify: relevant purchase/move/cooking services to produce canonical hidden flags
- Modify: `content/src/index.ts`
- Modify: `shared/src/network/interpolation.ts`
- Modify: `shared/src/contracts.ts`
- Test: `content/src/content.test.ts`
- Test: `shared/src/contracts.test.ts`
- Test: `shared/src/network/interpolation.test.ts`

**Interfaces:**
- Canonical story prerequisites have runtime producers; recipe actions match stations; yaw normalization is constant-time and bounded at the contract boundary.

- [ ] Add tests proving `property_assigned`, `moved_in`, and `bought_flat_pack` can be produced by normal gameplay.
- [ ] Set canonical flags at property assignment and move-in completion; produce flat-pack flag from appropriate furniture purchase/category metadata.
- [ ] Fix oven recipe action vocabulary (`bake`/appropriate authored action) and update shared action enum/presentation only if required.
- [ ] Bound yaw to a reasonable finite range at the snapshot schema and replace iterative angle normalization with modulo/atan2-style constant-time normalization.
- [ ] Keep badminton solo eligibility because PRD V3.1 explicitly permits player-vs-NPC.

### Task 10: Remove stale setup/legacy contradictions and strengthen repository validation

**Files:**
- Rewrite: `scripts/setup.js`
- Modify: `.env.example`
- Modify: `tools/validate-repository.mjs`
- Delete if unreferenced: `shared/constants.js`, `shared/utils.js`, `shared/utils.test.js` and other root legacy JS runtime artifacts
- Modify: docs that still direct users to obsolete setup behavior

**Interfaces:**
- Setup uses Node 24+/pnpm and writes env files in paths actually consumed by server/client; repository validation detects broader secret families and rejects resurrected legacy runtime constants.

- [ ] Confirm legacy root JS modules have no current runtime/test imports before deleting them.
- [ ] Replace old Clerk/npm/Navrang setup instructions with the V3.1 pnpm/Supabase/Amaya Bay flow.
- [ ] Make env placement explicit (`server/.env` and client env or root command with explicit dotenv path) rather than creating an unused root file.
- [ ] Expand committed-secret heuristics for Supabase JWT/service-role formats, generic private tokens, GitHub tokens, AWS-style keys, and private keys while retaining false-positive exclusions for examples/tests.
- [ ] Validate no production TURN long-lived credential is committed; document ephemeral credential requirement.

### Task 11: Final end-to-end verification and handoff state

**Files:**
- Modify: `docs/IMPLEMENTATION_STATUS.md`
- Modify: `HANDOFF.md`
- Modify: `PROJECT_STATE.json`
- Create/update: `docs/VERIFICATION.md`

**Interfaces:**
- The repaired branch truthfully states what passed, what still requires real Supabase/browser soak testing, and exact continuation entry points.

- [ ] Run GitHub CI on the repair branch with expanded gate.
- [ ] Inspect all failures and repair regressions until green.
- [ ] Verify migration 010 is syntactically/contractually covered; explicitly mark live Supabase migration execution as deployment work if no database is connected.
- [ ] Verify renderer selection tests, lifecycle tests, server auth/idempotency tests, story/content tests, and build all pass.
- [ ] Compare branch against `build/amaya-bay-v1` and confirm changes are limited to the audited repair scope.
- [ ] Update handoff/current-state docs with exact final commit SHA and remaining environment-only verification items.
