# Amaya Bay Art and Smoothness Implementation Plan

> **For agentic workers:** Execute the tasks in order on the current world build. Keep each task reviewable and verify it before moving on.

**Goal:** Make Amaya Bay match the painterly, lush, lived-in direction of the four supplied reference videos while reaching smooth browser play at the PRD's Medium target.

**Architecture:** Keep Three.js, Rapier, React UI, Socket.IO, and the existing semantic city. Author a small set of strong reusable visual families, then render repeated placements through shared assets, batches, and LODs. Measure the real frame and streaming costs of each art change. Preserve gameplay collision and interactions across every quality tier.

**Tech Stack:** TypeScript, Three.js WebGPU/WebGL2, Rapier, React/Vite, Playwright, Vitest.

**Spec:** `docs/PRD.md` sections 22–23, 31–32, and 85; `docs/superpowers/specs/2026-09-15-browser-world-performance-design.md`; `docs/WORLD_BUILD_2026_09.md`.

## Global constraints

- Browser only; WebGPU preferred with a working WebGL2 fallback.
- Painterly stylized realism. Keep the Indian coastal identity and all seven districts.
- Medium is the normal desktop target; Low retains the full game and interactions.
- Reference art is direction, not assets to copy. Build original, coherent visual families.
- No gameplay collision, ownership, NPC, story, or persistence rule changes for visual LOD.
- Preserve the current uncommitted world work; review diffs before touching shared files.
- Do not claim 60 fps on Iris Xe until measured on that hardware at 1080p.

## Review focus

- Ordinary walking across chunk boundaries must show no blank area or recurring >50 ms hitch.
- The camera must remain comfortable and collision-safe at normal walking speed in both views.
- A scene with more planting/detail must not regain hundreds of per-object draw submissions.
- Evening, rain, and WebGL2 must retain legibility and interaction prompts.
- The seven arrival views and the Mogra–Lantern–Bay route must preserve recognizable landmarks.

## Baseline and acceptance

The 2026-09-29 headless WebGL2 tour showed roughly 545–1,448 draws and 0.5–3.1 million triangles at sampled locations. This is diagnostic evidence, not a hardware benchmark. `pnpm verify` passed with 15 lint warnings; the tour browser test passed. Save screenshots and performance records at the starter home, seven district arrivals, Lantern hero street, Bay lookout/steps, and selected activity fronts in day, evening, and rain.

Release gates: PRD target of 60 fps at 1080p Medium on Iris Xe-class hardware, 30 fps minimum on Low, no recurring movement hitch above 50 ms, typical Medium draw submissions under the PRD's 160 guideline where the scene allows it, no blank streaming transitions, and a human review of the full normal-speed route. Treat these as targets to prove, not automatic claims from unit tests or headless FPS.

## Task 1 — Establish a repeatable visual and timing baseline

- [ ] Add a dev-only Playwright capture route that records fixed camera/position/time/weather samples, backend, draw calls, triangles, p95/p99 frame time, >33/>50 ms counts, streaming commit time, and screenshots as artifacts.
- [ ] Run it in WebGL2 before visual changes and save the JSON/screenshots under `.art-review/`.
- [ ] Record separate warm-state stationary, normal walking, and teleport/streaming samples so loading cost is not mixed with steady-state cost.
- [ ] Review the frames against the four saved reference contact sheets and list the three most visible composition gaps at each hero stop.

## Task 2 — Reduce repeated-world draw cost without removing art

- [ ] Write a regression test that counts repeated vegetation draw meshes in a streamed active/visual chunk and checks resource ownership on disposal.
- [ ] Batch or instance trees and shrubs within each chunk from shared compiled variants; retain silhouette, materials, shadows near the player, and stable seed variation.
- [ ] Measure draw calls, triangles, construction/commit time, and browser screenshots before/after at Mogra Court, park, hill, and Bay Steps. Keep the change only if draw cost falls without a visible density loss or worse streaming hitch.
- [ ] Apply the same measured approach to repeated windows, railings, poles, planter modules, and permanent foreground detail, prioritizing the largest draw sources.

## Task 3 — Make streaming and movement frame-safe

- [ ] Profile each `GameEngine` phase and chunk generation/commit/disposal with p95/p99 timing during a normal-speed route.
- [ ] Split oversized chunk work into preparation and bounded commits; cap retire/disposal work, keep the old visual until replacement is ready, and prevent temporary collision gaps.
- [ ] Add tests for queue priority, cancellation, residency hysteresis, and preserved visual/collider state at boundaries.
- [ ] Run a continuous normal-speed home → Mogra Court → Lantern Street → Bay Steps browser walkthrough; inspect actual camera frames and interaction/collision at transitions.
- [ ] Tune first/third-person camera damping, animation cadence, and input feel from recorded play, with reduced-motion behavior retained.

## Task 4 — Produce one complete visual quality slice

- [ ] Finish the Mogra Court → Lantern Street → Bay Steps route before spreading polish citywide. For each street-level frame, author foreground planting, coherent building silhouettes/fronts, readable road edges, grounded props, and human/vehicle cues.
- [ ] Rework vegetation into species-specific crown/branch layers with hue/value variation and near/far LOD; place it to frame views and hide repetition.
- [ ] Give hero buildings setbacks, roof/eave shapes, inset glazing, entries, signage, balconies/porches, and ground contact; batch repeated modules.
- [ ] Improve pavement/road material breakup, water/shore depth, coastal haze, directional and contact shadows, and the cloud/light palette in day, dusk, and rain.
- [ ] Capture the same viewpoints and compare to baseline and the reference-derived PRD checklist. Reject any hero view that still reads as boxes on a plane or a largely empty foreground.

## Task 5 — Extend the proven language across all seven districts

- [ ] Build district-specific composition kits for Mogra Park, Rain Tree Lane, The Common, and Hill Garden using the same shared asset/material system.
- [ ] Check all seven arrivals, 28 named subareas at representative routes, the 45 venue exteriors, and each activity/job front from a normal player camera.
- [ ] Keep prompts and paths visible/reachable, props grounded, and simplified colliders aligned with what players see.
- [ ] Verify day/evening/rain silhouettes and avoid separate styles between districts.

## Task 6 — Browser quality and release evidence

- [ ] Profile WebGPU on capable physical hardware and WebGL2 on the supported browser/device matrix; investigate device loss and context recovery.
- [ ] Tune adaptive quality in measured order: distant residency/LOD, shadows, render scale, then optional effects. Never alter active collision or nearby interaction semantics.
- [ ] Run `pnpm verify`, targeted Playwright routes, multiplayer/voice/persistence smoke checks, and manual controller/accessibility review.
- [ ] Save a final side-by-side capture set, a normal-speed walkthrough video, performance traces, and a limitations list. Update `PROJECT_STATE.json`, world status, and handoff documentation with only verified claims.

## Execution order

Start Task 1 and the vegetation part of Task 2 now. Use those measurements to choose the first art changes in Task 4. Do not optimize by thinning the world; pair every new visual family with its batching/LOD cost before expanding it.
