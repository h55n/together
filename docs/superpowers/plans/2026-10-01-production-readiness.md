# Together production-readiness implementation plan

Goal: resolve audited defects and complete browser-game polish and release acceptance.
Architecture: preserve the existing browser client/server architecture; repair each subsystem at its source, then verify complete routes and online behavior.
Stack: TypeScript, Three.js, Rapier, React, Vite, Express, Socket.IO, existing persistence/voice adapters.
Spec: ../specs/2026-10-01-production-readiness-design.md
Execution: native in this session, explicitly authorized by the user. Task ledger: 2026-10-01-production-readiness-progress.md.

## Global constraints
- PRD v3.1 governs scope; world production does not require an external DCC.
- Target 60 FPS at 1080p Medium, 30 FPS fallback, no recurring movement hitch above 50 ms.
- Preserve authoritative consequences, privacy and all household modes.
- No secrets printed; no production claims without actual acceptance evidence.

## Review focus
- Late shader completion after timeout/unmount must never render disposed resources or start a stale engine.
- Retry in WebGL2 must rebuild the canvas even when already using WebGL2.
- Stalled/colliding motion must not play a full-speed walking gait.
- Focus loss/menu transitions must release keys, drag and pointer capture coherently.
- Long sessions and interrupted requests must keep memory/resources bounded and retain private access.

## Task 1 — Startup lifecycle and shader completion
Files: client/src/game/core/Renderer.ts, client/src/game/GameEngine.ts, client/src/ui/game/GameCanvas.tsx; core preparation helper/tests and lifecycle tests.
- [ ] Reproduce Friends failure using existing browser test and examine Three.js compileAsync polling/context behavior.
- [ ] RED: unresolved/rejected compilation, cancellation, late settlement and fresh-canvas retry must complete safely without late render/start or resource leaks.
- [ ] GREEN: implement bounded preparation/cancellation and truthful retry UX; fix confirmed completion cause rather than swallowing failures.
- [ ] Run focused Vitest and solo/Couple/Friends/recovery browser tests; log unresolved GPU cause separately if not eliminated.

## Task 2 — Browser origin and managed-service reliability
Files: client/playwright.config.ts, client/e2e/*.spec.ts, .github/workflows/ci.yml when supported by reproduction.
- [ ] Find absolute localhost/127.0.0.1 URLs and service-liveness assumptions.
- [ ] Standardize navigation to configured baseURL and verify alternate port/origin, retaining errors.
- [ ] Run required complete browser suite; record real Linux CI as external until run.

## Task 3 — Cursor, camera and locomotion
Files: core/InputManager.ts, camera/CameraController.ts, player/PlayerController.ts, player/PlayerAvatar.ts, shared/src/animation/avatarMotion.ts, network/RemotePlayerSystem.ts and associated tests.
- [ ] Reproduce focus/drag/pointer-lock/menu and controller issues; RED tests for each confirmed defect.
- [ ] RED: backward/strafe/diagonal, starts/stops, blocked motion and action transitions differ correctly and remain continuous across frame rates.
- [ ] GREEN: measured movement and direction-aware blended poses, consistent local/remote motion and cursor/menu state.
- [ ] Verify ordinary browser controls and representative first/third-person routes, including collisions/stairs.

## Task 4 — Streaming and performance
Files: world/WorldStreamer.ts, AmayaBayChunkFactory.ts, StreamingScheduler.ts, assets/runtime/*, performance/* and route/benchmark E2E.
- [ ] Capture current cold/warm CPU/frame/draw/triangle/residency metrics at recorded viewport/backend.
- [ ] RED: staged work is cancellable, stale results disposed and expensive chunks cannot monopolize traversal commits.
- [ ] GREEN: staged preparation and cached compiled families; tune batching/LOD/shadows based on profiles.
- [ ] Re-run routes and compare percentiles/memory; physical 1080p acceptance remains separate.

## Task 5 — Accessibility, Memory and identity recovery
Files: ui/game/*Panel.tsx, CityMap.tsx, MemoryBook.tsx, auth/clientAuth.ts and shared modal hook/component/tests.
- [ ] RED: keyboard focus stays in active dialog, Escape closes it and focus returns; canceled image requests revoke URLs; transient auth failures can retry.
- [ ] GREEN: common modal behavior, bounded visible-image loading, abort/retry/error handling.
- [ ] Verify keyboard/controller flow and long-book failures with real UI tests.

## Task 6 — Production presentation and complete life loop
Files: world/player/interaction/audio and gameplay panels/content, driven by normal-play findings.
- [ ] Record one primary route and life loop without developer travel; list observable art/action/audio/task problems.
- [ ] Fix task clarity, feedback, embodied action/prop alignment, transitions and grounded sound; add regressions for gameplay changes.
- [ ] Compare day/night/rain and interiors with reference target; expand to all districts/jobs/chores/activities only after representative route works.
- [ ] Verify uninterrupted and interrupted co-op sequences, memories and rejoin.

## Task 7 — Hosted and release acceptance
Files: production adapters/readiness/migrations/voice/config and docs/VERIFICATION.md, PROJECT_STATE.json as justified by tests.
- [ ] Inventory configured services without exposing secrets; verify production guards and local security regressions.
- [ ] Execute hosted staging and distinct-network voice/concurrency/restart/backup tests only with available authorized infrastructure.
- [ ] Run pnpm verify, required browser suite and independent final review; fix findings with regression tests.
- [ ] Record each PRD/human/device/hosted gate as passed, failed or unverified. Production-ready requires all mandatory gates; keep goal active when work remains.
