# Together V1 Audit Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair every source-verified lifecycle, persistence, authorization, verification, content, tooling, and multiplayer correctness issue identified in the September 17 audit without mixing in city-art redesign work.

**Architecture:** Keep the existing pnpm monorepo and V1 Amaya Bay domain model. Fix root causes at their ownership boundaries: schema defects in a forward migration, authorization/idempotency inside services, atomic durable mutations through repository-level commands/RPC boundaries, engine lifecycle in `GameCanvas`/renderer/physics/input ownership, and verification coverage in workspace scripts/CI. Visual city redesign remains a separate downstream task.

**Tech Stack:** TypeScript 5.9, React, Three.js/WebGPU+WebGL2, Rapier, Express, Socket.IO, Supabase/PostgreSQL, Vitest/Node test, Playwright, pnpm 12, GitHub Actions.

**Spec:** `docs/PRD.md`, `docs/BUILD_PLAN.md`, `docs/superpowers/specs/2026-09-15-browser-world-performance-design.md`

## Global Constraints

- Preserve `build/amaya-bay-v1` product direction and Amaya Bay content model.
- Browser remains primary V1 runtime; WebGPU is preferred with WebGL2 fallback.
- Server remains authoritative for membership, wallet, inventory, home, jobs, votes, and persistent progression.
- Do not redesign city art, district composition, hero-route visuals, or asset aesthetics in this recovery branch.
- Every behavior change must have a regression test or executable verification rule.

---

### Task 1: Make the verification gate truthful

**Files:** `package.json`, `client/package.json`, `content/package.json`, `.github/workflows/ci.yml`, `tools/verify-sandbox.mjs`, `tools/verify-pure.mjs`, `content/src/validate.ts`

- [ ] Add all client tests to the normal client test command, including performance/adaptive-quality tests.
- [ ] Add a `content` test script so workspace `pnpm test` actually executes content tests.
- [ ] Include pure/service verification suites in the canonical root `verify`/CI path.
- [ ] Replace bare `tsc` spawning with package-manager-resolved invocation for cross-platform verification.
- [ ] Make direct-execution detection in `content/src/validate.ts` Windows-safe.
- [ ] Keep Playwright explicit in CI or document the browser prerequisites if it cannot run in the standard job.

### Task 2: Repair database/schema compatibility and RLS

**Files:** `server/src/db/migrations/010_audit_recovery.sql`, `server/src/db/SupabaseGameRepository.ts`, database verification tests.

- [ ] Relax/migrate obsolete `users.clerk_id` and `users.username` requirements for canonical Supabase-auth profiles.
- [ ] Ensure property IDs stored in `households.property_id` are canonical UUID record IDs.
- [ ] Replace the partial idempotency uniqueness shape with an upsert-compatible constraint/index.
- [ ] Enable RLS for `job_sessions`, `activity_sessions`, and any migration-added durable tables.
- [ ] Add payout/session uniqueness needed to enforce one payout per job session.

### Task 3: Authorization and idempotency ownership

**Files:** `JobSessionService.ts`, `ActivityService.ts`, `PropertySelectionService.ts`, `MovingService.ts`, `RenovationService.ts`, `EconomyService.ts`, verification tests.

- [ ] Authorize membership before returning cached/retry records.
- [ ] Verify cached records belong to the requested user/household/action before reusing them.
- [ ] Authorize resolved vote reads before returning them.
- [ ] Reject completion/payout attempts for an already completed job session unless they are the exact same completion retry.

### Task 4: Atomic persistent mutations

**Files:** `GameRepository.ts`, `LocalGameRepository.ts`, `SupabaseGameRepository.ts`, economy/moving/renovation services, migration SQL/RPC functions, tests.

- [ ] Introduce explicit repository commands for purchase, job payout, moving commit, and renovation commit so the multi-write invariant has one durable boundary.
- [ ] Local repository applies equivalent operations atomically in-memory for tests.
- [ ] Supabase implementation uses PostgreSQL RPC functions/transactions rather than sequential client writes.
- [ ] Preserve idempotency and expected-version semantics across retries.

### Task 5: Client engine lifecycle and renderer ownership

**Files:** `GameCanvas.tsx`, `rendererBackend.ts`, `Renderer.ts`, `GameEngine.ts`, `PhysicsWorld.ts`, `InputManager.ts`, world/asset disposal code, tests.

- [ ] Make engine creation depend only on stable identity/world inputs, not capture/UI callback identities.
- [ ] Remove normal-path forced WebGL2; WebGPU is attempted first unless explicitly forced to compatibility mode.
- [ ] Detect WebGL2 without acquiring a context on the production canvas before WebGPU initialization.
- [ ] Only apply renderer pixel ratio/shadow/streaming changes when the adaptive budget actually changes.
- [ ] Align player collision/ground height with `cityHeightAt` rather than one flat world floor.
- [ ] Dispose Rapier world, authored permanent world geometry, caches, and asset registries deterministically.
- [ ] Disabled input returns neutral snapshots and does not poll/use gamepads.

### Task 6: Client state/UI correctness

**Files:** `GameCanvas.tsx`, `CookingPanel.tsx`, socket contracts/server/client.

- [ ] Completed cooking sessions no longer block starting a new meal.
- [ ] Surface finish mutations immediately resync renderer state.
- [ ] Add authoritative household-state invalidation/sync events for home/economy/inventory/story changes.

### Task 7: Socket/auth/time hardening

**Files:** `AuthService.ts`, `app.ts`, `registerSocketServer.ts`, `TimeService.ts`, migrations/services/tests.

- [ ] Development-header identity is gated by an explicit development opt-in, not merely missing Supabase credentials.
- [ ] Add API rate limiting for authenticated mutation routes and tighter limits for invite/join attempts.
- [ ] Presence is keyed by socket/session so multiple tabs/devices do not overwrite each other.
- [ ] Rejoin leaves previous household/city rooms before joining replacements.
- [ ] Broadcast only the public remote-profile projection (display name/avatar), never settings.
- [ ] Persist/restore canonical city clock state so restart does not reset to day 1 08:00.

### Task 8: Story/content/network correctness

**Files:** content definitions, property/moving/home/story services, shared network interpolation/contracts, tests.

- [ ] Produce canonical `property_assigned` and `moved_in` story flags at runtime.
- [ ] Produce `bought_flat_pack` when an eligible flat-pack furniture purchase occurs.
- [ ] Correct oven recipe action semantics.
- [ ] Replace iterative angle wrapping with constant-time modular normalization and cap snapshot yaw to a sane range.
- [ ] Use cryptographic randomness for invite-code generation.
- [ ] Preserve solo-capable badminton because V1 allows player-vs-NPC activity.

### Task 9: Tooling and legacy cleanup

**Files:** `scripts/setup.js`, `shared/*.js` legacy files, `tools/validate-repository.mjs`, `.env.example`, docs.

- [ ] Modernize setup for Node 24+, pnpm, current env variable names, and current directory layout.
- [ ] Remove/archive tracked contradictory legacy runtime JS constants rather than leaving a second source of truth.
- [ ] Strengthen repository secret scanning and clarify its guarantee.
- [ ] Document that browser-visible TURN credentials must be short-lived/ephemeral.

### Task 10: Verification and handoff

- [ ] Run/fetch CI for typecheck, lint, all unit/service/content tests, validation, build, and repository integrity.
- [ ] Run/fetch Playwright when the CI environment supports browser installation.
- [ ] Review branch diff against `build/amaya-bay-v1` for accidental visual/product changes.
- [ ] Update implementation status/handoff with exact remaining limitations only after evidence is green.
