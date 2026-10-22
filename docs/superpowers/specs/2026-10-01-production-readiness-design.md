# Together production readiness

Date: October 1, 2026. Baseline: c77de71. Authority: PRD v3.1 and PROJECT_AUDIT_2026_10_01.md.

## Intent and constraints
The user wants the existing browser game made dependable, smooth and polished, including cursor/camera, walking/sideways movement, effects and tasks. Keep TypeScript/Three.js, Rapier, React UI, Express/Socket.IO and existing authoritative rules. No Unity migration, required Blender installation, second city or new public matchmaking. Execute locally in this session, as explicitly requested; preserve all existing gameplay scope.

## Work packages
1. Startup: investigate multi-context shader completion; bound and cancel asynchronous preparation, release resources on failure/unmount, show useful preparation stages and allow retry on a fresh canvas. A timeout reports failure, never certifies the underlying GPU issue fixed.
2. Browser reliability: use one configured origin in all tests, deterministic managed services, retain the first actionable error, run solo/Couple/Friends and recovery tests. Never hide failing tests through skips or looser assertions.
3. Comfort: cursor capture/drag, focus and menus must agree; no stuck keys, jumps on recapture, look behind dialogs or unintended interaction. Mouse/controller input remains frame-rate independent.
4. Locomotion: measured displacement drives gait; distinguish forward/backward/strafe/diagonal motion and blend starts/stops/turns, including collision and action interruption. Local and remote presentation must agree. Foot placement/contact and hand/action transitions must remain grounded.
5. Streaming and rendering: profile representative cold/warm routes, compile reusable assets, stage expensive preparation/commit and control submissions, residency, shadows and texture/geometry ownership. Do not mistake scheduling a long synchronous job for bounded work.
6. Presentation and life loop: refine primary route, avatar/actions, interactions, feedback and audio together; accept onboarding/home/groceries/cooking/job/decoration/story/memory/rejoin before broader city visual changes.
7. Accessibility and reliability: modal focus entry/trap/restore and Escape/controller behavior; bounded Memory images, cancellation and failure/retry; transient identity initialization retry; truthful online error handling.
8. Production acceptance: hosted auth/RLS/migrations/private storage/restart/concurrent mutations/backup restoration; distinct-network TURN and multiplayer soak; human PRD acceptance and physical browser/GPU/controller matrix.

## Exit criteria
Repository verification and required browser suite pass without suppressing errors. Six players repeatedly enter/move/reconnect. No indefinite preparation or late start after cancellation. Directional movement and menu/cursor transitions are browser-tested. Measure 60 FPS target at 1080p Medium, 30 FPS fallback and no recurring movement hitch above 50 ms on supported target hardware. Full PRD acceptance and hosted durability/voice/privacy evidence are required for a production-ready claim.

## Evidence discipline
Unit tests establish behavior, browser tests establish integration, saved screenshots establish only the captured appearance, and target hardware/hosted services need separate evidence. Do not mark external gates complete from local mocks. Keep a task ledger with RED/GREEN tests, commands, results, rulings and unresolved gates. No deployment, shared-branch push or credential disclosure is authorized by this plan.
