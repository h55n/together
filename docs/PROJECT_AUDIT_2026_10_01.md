# Together — complete project audit

**Date:** October 1, 2026 (Asia/Calcutta)  
**Audited checkpoint:** `8f1fd095804fd5296d9188f2e418972b0a33305e`  
**Default branch:** `build/amaya-bay-v1`  
**Product authority:** [PRD v3.1](PRD.md)

## 1. Overall verdict

Together is a substantial, browser-playable development build of Amaya Bay. The engine, household rules, server-authoritative life systems, content library and custom arrival flow exist. It is **not a completed V1 or a release-ready game**. The principal remaining work is dependable browser startup, full city/interaction art and animation, smooth streaming, production persistence/voice acceptance and real player testing.

A trustworthy percentage complete cannot be calculated from file counts, passing unit tests or phase labels. Engineering implementation is further along than experiential and release acceptance. Treat a system with code and tests as implemented, and require its PRD acceptance test before calling it finished.

### What this audit covered

- Workspace structure, current Git state and integration history.
- PRD definition of done, performance targets and acceptance scenarios.
- Engine startup/rendering/streaming, player/input/camera, world assets and NPC architecture.
- Arrival/tutorial/settings, gameplay panels and Memory Book.
- Server services, authentication, persistence adapters/migrations, voice infrastructure and operational guards.
- Local verification logs, reproducible browser failures and latest GitHub CI logs.
- Existing plans/status documents and inconsistencies between them and current code.

This is a repository and evidence audit. Hosted Supabase/TURN, real-device GPU/browser testing, all gameplay paths, art-reference re-review and long-duration human play were not newly executed. No claim of exhaustive security testing or visual acceptance is made.

## 2. Verification evidence

| Gate | Finding | Evidence / limitation |
| --- | --- | --- |
| Local source quality | Fresh `pnpm verify`: PASS | `.art-review/project-audit-2026-10-01-verify.log`; includes typecheck, lint, tests, validation and build, but does not run browser E2E |
| Prior merged automated suite | PASS | 125 shared, 8 content, 119 client Vitest, 10 client Node, 30 server, 196 pure checks; `.art-review/default-merge-verification.log` |
| Local focused browser suite | 5/6 PASS | Couple two-context movement, solo world and three arrival/guide/recovery tests passed; `.art-review/default-merge-browser-native.log` |
| Local Friends six-player | FAIL | Later player remains on Preparing Amaya Bay past 30 seconds; focus and 960x540 reruns also failed |
| Startup instrumentation | Stall narrowed to asynchronous shader prewarm | Third player completes renderer, physics, scene and initial chunks; `compileAsync` does not complete during test. Explicit GL flush did not fix it; experimental code removed |
| Latest GitHub CI at audited SHA | FAIL: 11 browser failures, 2 passes, 2 skips | [Run 36816902610](https://github.com/h55n/together/actions/runs/36816902610); `.art-review/project-audit-ci-failure.log` |
| Hosted services and network soak | UNVERIFIED | Local in-memory development server is not proof of hosted persistence or TURN traversal |
| Target GPU/browser matrix | UNVERIFIED | Local ordinary URL recovers from WebGPU device failure to native WebGL2; physical WebGPU acceptance remains open |
| Current merged 1080p performance | UNVERIFIED | Earlier 960x540 measurements belong to the pre-merge checkpoint |

CI includes Friends test timeouts/browser-close errors and later `ERR_CONNECTION_REFUSED` navigation to `127.0.0.1:5173`. Several visual tests hardcode this origin while Playwright manages `localhost:5173`. Origin/binding, service liveness and resource pressure must be investigated separately. Do not count all 11 as independent gameplay defects or dismiss them as an environment issue without reproduction.

Two browser checks are opt-in: benchmark capture and complete normal-speed walk. Their skips do not prove those experiences pass.

## 3. Current state by subsystem

| Subsystem | Current implementation | Remaining acceptance / work |
| --- | --- | --- |
| Repository/toolchain | pnpm TypeScript monorepo; shared/content/client/server; lint, validation, CI and production build | Restore green browser CI; keep historical documents clearly dated |
| Engine/rendering | React UI separated from Three.js engine; Rapier; WebGPU preference and native WebGL2 recovery; serialized startup | Resolve shader warmup stall; visible startup stages, cancellation/retry and failure handling; physical WebGPU/device-loss tests |
| World/city | Seven districts, terrain/coast, city surfaces, frontage dressing, landmarks, homes and venues | Full ordinary traversal and venue matrix; cohesive reference-level architecture, vegetation, textures, props and interiors |
| Runtime assets | Shared registry, instancing, geometry cache, material batching, tree clusters and LOD infrastructure | Complete Three.js-native authored-to-compiled asset pipeline and family budgets; reduce repeated runtime construction/merging |
| Streaming/performance | Residency queues, stale work reconciliation, bounded jobs/retirement and profiling | One synchronous chunk can exceed the frame budget; move expensive preparation out of traversal frames; GPU memory and warm/cold 1080p measurements |
| Player/camera/input | First/third person, physics movement, keyboard/gamepad basics, focus-safe drag/pointer controls, neck gaze | Human comfort, stairs/collisions, controller/UI matrix and polished locomotion/interaction transitions |
| Avatar | Articulated procedural body, gaze and micro-action presentation | `PlayerAvatar` still explicitly marks itself placeholder; production proportions, clothing, facial/hand animation and IK quality |
| Onboarding | Custom coastal arrival, identity/create/join/property flow; skippable persisted first-day guide | Five real pairs/groups complete without developer help; error recovery, invites, controller/focus usability and first-30-minute experience |
| Household/multiplayer | Couple/Friends rules, invitations/votes, snapshots/remote presentation/reconnect contracts | Six-player startup regression; distinct-device six-player acceptance; latency/loss/background-tab/long-duration soak |
| Home/furniture/moving | Interiors and decoration UI; server-authoritative ownership, renovation and moving rules | Visual persistence across real hosted sessions; packing/unpacking embodied acceptance; complete home-state visualization and private-room usability |
| Economy/jobs/shopping | Wallet/inventory/job services, validated mutations and retry/authorization protections | Four jobs and shopping-food-home progression tested end to end; clear world feedback, embodied animation and non-grindy tuning |
| Cooking/chores | Persistent cooking sessions, recipe graphs, micro-action runtime and domestic action callbacks | Two-person Shared Kitchen test, interruption/partial completion, eight animated chores and convincing physical changes |
| Leisure/transport | Eight authored activities; world locations; bicycle/scooter/auto/kayak-related mechanics | All activities playable through normal prompts; co-op fun/animation/props; travel safety and state restoration |
| NPCs/story/progression | Named/ambient systems, schedule and navigation logic; NPC fact services; 36 authored stories | Believable routines, path/door avoidance and performance; multi-session branching/failure/balancing and contextual Couple/Friends acceptance |
| Memory Book | Automatic/manual capture, authenticated image fetching, captions and export hook | Capture framing, Moving Day spread, long books, upload failures and hosted privacy/restart durability |
| Audio | Procedural ambience and sparse synth music; Web Audio bus controls | Full district/interaction soundscape, footsteps/surface detail and production stems; voice/audio comfort acceptance |
| Authentication/persistence | Supabase anonymous sessions/token refresh, dev fallback disabled in production, atomic repository boundary and 12 migrations | Hosted anonymous auth/RLS/migrations/private Storage/rollback/concurrent writes/backup restore tested in staging |
| Voice | WebRTC manager/signaling and server-issued short-lived TURN credentials | Different-network NAT traversal, mic permissions/mute/rejoin/spatial voice quality and long-session testing |
| Accessibility | FOV/head-bob/UI-scale/reduced-motion/high-contrast/subtitle controls; remappable movement keys | Modal focus handling, screen-reader/keyboard/controller testing, full subtitle presentation and small-window flow |
| Operations/security | Production readiness, CORS, request IDs/logging, HTTP/socket limits, authorization/idempotency regressions | Multi-instance operational design, observability/alerts, deployment and real service acceptance; security testing beyond heuristic secret scan |

Data validation currently checks 12 NPCs, 20 recipes, 8 activities and 36 story events. These counts establish authored content coverage, not that all content is fun, visually complete or production-tested.

## 4. Prioritized findings and fixes

### P1 — blocks dependable testing or release

**A01. Six-player startup can remain indefinitely in shader prewarm.**  
Evidence: `client/src/game/core/Renderer.ts` awaits `compileAsync` without a timeout/cancellation contract; `GameEngine.prepareFirstPlayable` awaits it before engine start; GameCanvas only shows generic loading. Instrumentation reproduces the stalled boundary. Underlying GPU/driver/context cause is still unknown.  
Do: inspect shader completion/resource behavior and disposal under multiple worlds; design a bounded, cancellable startup with truthful errors/retry; keep renderer selection/recovery safe.  
Done when: six actual contexts join, move and reconnect repeatedly with no stuck loading, leaked engine or swallowed compilation rejection. Include a separate distinct-device test.

**A02. Current GitHub browser CI is red.**  
Evidence: run 36816902610 at the audited SHA; 11 failures after 18.3 minutes. Mixed absolute test URLs and managed server origin are visible in source.  
Do: make tests use their configured baseURL consistently, confirm host binding and client/server liveness, preserve the first actionable error through teardown, then reproduce shader/timeout failures independently.  
Done when: full required browser suite passes on a clean Linux runner; opt-in checks remain explicitly reported and their release evidence is captured separately.

**A03. Smooth browser play is not established.**  
Evidence: PRD target is 60 FPS at 1080p Medium, 30 FPS fallback and no recurring movement hitch above 50ms. Merged first-playable sample records 322 calls, about 952k triangles and a 264ms maximum streaming commit; it is a startup sample, not a warm benchmark. Earlier pre-merge 960x540 results reached 881 draws and p99 1116.5ms. `StreamingScheduler` measures a job after committing it, so its 8ms budget cannot interrupt a single expensive synchronous chunk.  
Do: collect current warm/cold traversal profiles; compile/cache reusable dressing, stage generation and GPU upload, reduce submissions and tune LOD/shadows/materials based on those profiles.  
Done when: measured 1080p target-machine routes meet frame and residency budgets, including chunk boundaries and weather; report CPU/GPU/frame-percentile/memory evidence.

**A04. Production persistence and voice are unaccepted.**  
Evidence: configured production adapters/readiness exist; local credential-free repository explicitly loses state on server restart. No current hosted Supabase/TURN acceptance evidence.  
Do: staging provisioning and migration verification; two households test auth/privacy/concurrency/reconnect, private images and restart durability; test TURN across separate networks.  
Done when: captured staging tests prove durable saves, no cross-household access, atomic economy/home writes and stable voice/reconnect.

### P2 — product completion and usability

**A05. Visual and animation quality remains below the reference target.**  
Do: finish a normal-speed Mogra Court–Lantern Street–Bay Steps route first, then all districts/interiors. Refine shape/material/foliage/lighting/contact/shading together; retain authored Three.js compilation/instancing. Finish avatar/hand/action animation and props.  
Done when: reference comparison and human Quiet Walk/Rain tests pass across day/night/rain, with performance evidence.

**A06. End-to-end life-loop acceptance is incomplete.**  
Do: play onboarding → chosen home → groceries → shared cooking/eating → job → purchase/decoration → story → memory → exit/rejoin, then moving and Friends solo return. Exercise failure and interrupted actions.  
Done when: PRD Shared Kitchen, Money, Moving, Memory and Solo Return tests pass through normal UI/world mechanics, with hosted persistence.

**A07. Audio is development quality.**  
Evidence: `AudioZoneManager` explicitly describes procedural ambience and sparse development music; noise buffer and synth notes are its current sound foundation.  
Do: authored district layers and grounded interaction sounds, restrained music, indoor/outdoor transitions and volume/mute tests.  
Done when: audio contributes to location and activity recognition in Quiet Walk/No-HUD tests.

**A08. Modal accessibility needs implementation and acceptance.**  
Evidence: map/settings/Memory Book declare `aria-modal`; sampled components contain no explicit focus trapping or focus restoration. Subtitle toggle exists, but an authored dialogue/audio subtitle presentation pipeline was not established in the inspected code.  
Do: keyboard focus entry/trap/return, Escape behavior, clear control labels and controller navigation; verify meaningful subtitles and contrast/scaling.  
Done when: full onboarding and game panels are usable by keyboard/controller and relevant assistive technology without focus escaping behind modals.

**A09. Memory Book scaling needs a long-session test.**  
Evidence: `MemoryBook.tsx` fetches all sorted images serially and retains object URLs while open; it revokes them on cleanup.  
Do: measure a large household book, add pagination/lazy visible-image loading as required, and exercise cancellation/token refresh/upload/export failures.  
Done when: opening a long book is responsive with bounded image memory and correct private access.

**A10. Status documents have drifted after the merge.**  
Evidence: old September 15 audit describes a JavaScript prototype and missing renderer/auth/lint; build plan retains historical DNS limitation; project-state missing list incorrectly includes implemented logging/rate limits; asset notes imply external assets are mandatory despite PRD v3.1.  
Do: retain historical evidence with clear labels, make this audit the current audit entry point and update active state claims.  
Done when: a new contributor can identify current branch, accepted vs unaccepted features, real blockers and Three.js-native production direction from the entry documents.

### P3 — maintainability and operational follow-through

- Production build warns about bundle size: the main bundle is about 3.53 MB minified / 1.28 MB gzip and the Three.js bundle about 1.43 MB / 0.38 MB gzip. Measure actual startup transfer and parse time, then split deferred UI/features where worthwhile; the warning alone does not prove the PRD 25 MB compressed startup budget is exceeded.

- `GameCanvas.tsx` centralizes many feature states/requests and engine lifecycle; split feature orchestration behind stable interfaces after startup behavior is protected by regression coverage.
- `resolveClientIdentity` caches the initialization promise, including a rejection. Test transient initialization failure/retry UX before deciding the reset behavior.
- HTTP fixed-window limits are process-local. Establish a deployment topology and shared limit strategy if multiple server replicas are used.
- Add release evidence for backups/restores, request/error correlation, latency/loss and memory growth; existing logging/readiness are a foundation, not completed operational acceptance.
- Keep native WebGPU and real controller coverage separate from WebGL2 compatibility success.

## 5. Execution plan and exit gates

| Order | Work package | Deliverable / exit gate |
| --- | --- | --- |
| 1 | Browser startup + CI reliability | Reproducible first-error diagnostics, bounded/cancellable startup, green Linux suite and repeated local 2/6-player runs |
| 2 | Complete one representative life route | Normal onboarding, walk, shopping, cooking, job, decoration, memory and rejoin; two testers can finish without developer help |
| 3 | World/character/audio production | Reference-quality primary route and interiors, then remaining districts and every job/chore/leisure prop/animation; compiled reusable asset families |
| 4 | Performance during production | Profile each package; 1080p Medium frame targets, bounded streaming and GPU-memory/download budgets; avoid postponing profiling until all art is finished |
| 5 | Hosted staging and resilience | Supabase/migrations/private images/rollback/restart and distinct-network TURN; soak and concurrency tests |
| 6 | Full product acceptance | PRD A–H scenarios, first 30 minutes/Evening Test, five independent pairs/groups onboarding, browser/device/controller/accessibility matrix |
| 7 | Release preparation | Green exact-SHA CI, staging evidence, deployment/rollback/backup procedure and documented residual risks |

Fixes can proceed alongside art work, but a startup failure prevents reliable testing of the art. Preserve the full life loop before adding more city/content scope. No second city, public matchmaking or MMO expansion is needed for V1.

## 6. Completion checklist

- [ ] Six-player startup and reconnect regression resolved.
- [ ] Required Linux browser CI green at the release commit.
- [ ] Complete normal-speed seven-district/venue/home traversal reviewed.
- [ ] Art reference target met on primary routes and interiors; placeholder avatar replaced/refined to production standard.
- [ ] Four jobs, eight animated chores and eight leisure activities accepted through normal play.
- [ ] PRD A–H human scenarios and first 30-minute/Evening experiences accepted.
- [ ] Five real pairs/groups onboard without help.
- [ ] 1080p Medium target performance, streaming, memory and download budgets recorded.
- [ ] Physical WebGPU/WebGL2/browser/controller matrix accepted.
- [ ] Hosted auth, RLS, atomic persistence, private memories, restart and backup restore accepted.
- [ ] Distinct-network voice and multiplayer soak accepted.
- [ ] Audio, accessibility and long-book UX accepted.

## 7. Evidence and reading order

1. `docs/PRD.md` — authoritative scope, sections 31, 112–113 and native asset production rules.
2. This audit — current findings and remaining acceptance.
3. `PROJECT_STATE.json` — current machine-readable summary; historical nested baseline is not current acceptance.
4. `docs/MERGE_CLEANUP_2026_10_01.md` — branch consolidation and startup investigation.
5. `.art-review/project-audit-2026-10-01-verify.log` and `.art-review/project-audit-ci-failure.log` — local evidence files excluded from source publication.
6. `.art-review/default-merge-browser-native.log`, `six-player-startup-stages.log`, `six-player-shader-flush.log` — browser and diagnostic evidence.
7. Earlier screenshots/videos/performance are historical checkpoint evidence and do not establish current merged visual or release quality.

**Fresh verification result:** `pnpm verify` completed with exit code 0 on October 1, 2026. 488 automated tests/checks passed (125 shared + 8 content + 119 client Vitest + 10 client Node + 30 server + 196 pure). Type checks, validation and build passed. ESLint reports one existing App effect-dependency warning; build reports large bundle chunks. Browser CI remains failed and was not rerun as part of this audit.
