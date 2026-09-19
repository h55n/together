# Together V1 — Verification Record

## Current connected baseline

As of **2026-09-19**, the recovery branch has a fully green connected CI baseline:

- Branch: `fix/audit-recovery-2026-09-17`
- Verified HEAD: `b9b549e99901b28fbfccea9c944be45b8ac0d5e5`
- GitHub Actions run: `35433112762`
- Result: **SUCCESS**

CI runs on Node 24 and installs the committed dependency graph with:

```bash
corepack enable
pnpm install --frozen-lockfile
```

The exact verified gate is:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm validate
pnpm validate:repo
pnpm build
pnpm --filter @together/client exec playwright install --with-deps chromium
pnpm test:e2e
```

All steps above passed on the verified HEAD.

## Browser/runtime evidence

The Playwright gate boots the real client and server, uses documented local development auth, enters solo Amaya Bay through the player-facing onboarding flow, waits for the game engine to become playable, checks for browser runtime errors, confirms the renderer/debug frame is alive, samples the rendered canvas to reject an empty/flat frame, verifies W changes the live Rapier player position, and verifies V switches the camera from first-person to third-person.

GitHub's headless runner uses the explicit `?renderer=webgl2` compatibility mode for this E2E because its virtual GPU is not a reliable WebGPU target. Normal application startup remains WebGPU-first and is protected by the `GameCanvas` lifecycle regression suite.

The current browser gate also verifies the recovery of a real StrictMode/Rapier failure: development StrictMode previously started two overlapping asynchronous `GameEngine.create()` calls, which could leave Rapier wrappers pointing at an invalid/disposed WASM world. Engine creation is now serialized, the StrictMode regression passes, and the playable-frame E2E is green. First-playable startup now performs a bounded five-nearest-chunk warmup, one hidden physics settle and renderer prewarm before input/gameplay begins.

## Recovery regressions covered

Automated coverage now includes, among the broader domain suite:

- WebGPU-first normal renderer selection and explicit WebGL2 compatibility selection;
- React StrictMode engine creation ownership/lifecycle;
- authoritative realtime home refresh;
- weather UI reactivity;
- input reset on browser focus loss;
- camera/movement math;
- streamed terrain collider ownership and disposal;
- starter-property/world-geometry clearance;
- shared world-space street/path network and procedural dressing clearance;
- static batching for streamed structural dressing and vegetation;
- ambient NPC instancing and dynamic instance updates;
- first playable browser frame without recorded runtime errors;
- real-browser keyboard movement through Rapier and first-person → third-person camera toggle.

## Historical sandbox-safe verification

The original handoff sandbox could not install the declared Node 24/pnpm dependency graph because registry/DNS access was unavailable. `node tools/verify-sandbox.mjs` existed to provide partial offline evidence there.

That historical limitation is **not** a current repository blocker. Connected GitHub Actions now performs the authoritative clean/frozen install, full TypeScript/lint/test/validation/build gate, and Chromium E2E.

## Connected WebGL2 diagnostic snapshot

GitHub Actions run `35433112762` published this first-playable WebGL2 compatibility sample after the bounded warmup:

- FPS: **88.7**
- smoothed CPU frame: **11.3 ms**
- p95 frame: **17.2 ms**
- p99 frame: **18.2 ms**
- frames >33 ms / >50 ms: **0 / 0**
- draw calls: **148**
- triangles: **223,782**
- meshes: **419**
- instanced meshes / instances: **2 / 64**
- active colliders: **107**
- active / visual chunks at sample time: **20 / 9**
- visible-gameplay render max: **5.8 ms**
- visible-gameplay physics max: **0.4 ms**

The hidden warmup itself recorded a 32.2 ms physics settle and 59.3 ms aggregate preload commit maximum; those occur before the loading state is released. This is CI/headless WebGL2 evidence only, not a Medium 1080p target-hardware or WebGPU benchmark.

## Still requiring real-device/manual verification

The green CI baseline does **not** establish release-complete V1. The following remain outside current automated evidence:

- Medium 1080p frame-time, p95/p99, draw-call, triangle and GPU-memory measurements on Iris Xe-class hardware or the final supported-hardware definition;
- real WebGPU browser acceptance across supported desktop browsers/GPUs;
- full WebGPU/WebGL2/browser/controller matrix;
- two-browser Couple create/join/property/movement acceptance;
- Friends 2–6 client soak, reconnect, latency/loss and simultaneous-edit testing;
- shared kitchen concurrency with real players;
- production Supabase persistence/RLS/private Memory storage verification;
- STUN/TURN voice tests across different networks;
- Quiet Walk, Shared Kitchen, Money, Rain, Moving, Memory and No-HUD PRD acceptance tests;
- final production-art/audio/LOD/compression review.

Do not convert CI success into an FPS or release-quality claim until those measurements and acceptance runs exist.
