# Together V1 — Verification Record

## Current connected baseline

As of **2026-09-20**, the recovery branch has a fully green connected CI baseline after the production-readiness/auth/network hardening pass:

- Branch: `fix/audit-recovery-2026-09-17`
- Verified HEAD: `4399928372709b5dfbd7c97ea4e32973c44876b1`
- GitHub Actions run: `35489863220`
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

The Playwright gate boots the real client and server with documented local-development auth and runs three Chromium acceptance tests. It enters solo Amaya Bay through the player-facing onboarding flow, waits for a playable engine, rejects browser runtime errors, samples the rendered canvas to reject an empty/flat frame, verifies W changes the live Rapier player position, and verifies V switches first-person → third-person.

It also runs a real two-browser Couple flow through identity, household creation/join, shared property selection, world entry and replicated movement; and a six-browser Friends flow through six-member joining, majority property selection, five remote avatars visible to the host, replicated movement and one client reload/reconnect. The complete browser suite passed 3/3 tests in 3.3 minutes on run `35489863220`.

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

The earlier connected baseline run `35433112762` published this first-playable WebGL2 compatibility sample after the bounded warmup. It remains useful diagnostic evidence, but it is not a fresh target-hardware benchmark for the current head:

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
- real-device Couple/Friends latency/loss/long-duration soak beyond the automated two-context Couple and six-context Friends browser acceptance;
- simultaneous-edit/shared-kitchen multiplayer acceptance with real people/devices;
- shared kitchen concurrency with real players;
- production Supabase anonymous auth, persistence/RLS/migrations/private Memory Storage verification against a real hosted project;
- server-issued TURN/STUN voice tests across different networks;
- Quiet Walk, Shared Kitchen, Money, Rain, Moving, Memory and No-HUD PRD acceptance tests;
- final production-art/audio/LOD/compression review.

Do not convert CI success into an FPS or release-quality claim until those measurements and acceptance runs exist.


## 2026-09-20 production-readiness hardening verified on current head

The green current head additionally verifies:

- production Supabase client identity strategy and Bearer-header selection;
- split-origin REST routing through `VITE_SERVER_URL`;
- production-only CORS allow-listing and fail-closed local auth;
- authenticated short-lived TURN credential generation with no browser-bundled shared secret;
- `/healthz`, `/readyz`, request IDs and structured HTTP completion logging;
- production HTTP fixed-window throttling and graceful shutdown wiring;
- 12 ordered SQL migrations, private Memory Storage bucket bootstrap and migration-contract coverage;
- server migration runner build output with advisory locking/checksums;
- 10/10 server test files / 23 tests;
- 28/28 client test files / 80 tests;
- 195 pure verification tests;
- repository integrity reporting 12 ordered migrations and no committed-secret heuristic hit.
