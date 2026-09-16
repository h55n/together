# Gameplay / World Recovery — 2026-09-16

This document records the recovery pass driven by the supplied 87.9-second gameplay recording. `docs/PRD.md` V3.1 remains authoritative.

## Why this pass existed

The recorded build was not failing only on polish. It showed player-facing foundation defects:

- third-person camera repeatedly disappeared into or behind large static building surfaces;
- the permanent authored environment was not reliably part of camera obstruction handling;
- starter homes were open-topped shells with no roof/ceiling cap;
- the city map was a district bubble/planning diagram rather than navigable cartography;
- visible world detail was expensive relative to the frame, with the recording showing roughly 2k–3k draw calls in sparse views;
- several permanent landmarks still read as large primitive masses with weak roof/ground-contact silhouette.

## Changes completed in this recovery branch

### Camera visibility

- first-person eye origin is offset slightly forward from the avatar root to reduce body intrusion;
- third-person collision now probes a small camera volume rather than a single center ray;
- obstruction entry snaps inward immediately instead of easing the camera through a wall;
- recovery outward remains damped;
- the camera discovers and registers the permanent `amaya-bay-authored-environment` root in addition to explicitly registered streamed/home collision roots;
- pure camera distance/offset behavior has automated coverage.

### Starter-home enclosure

- all five starter-property shell paths now receive a thin roof/ceiling cap with modest eave overhang;
- the couple studio receives the same enclosure treatment even though it is constructed through `StarterHome`;
- roof geometry is named for debugging and is kept out of Rapier gameplay collision so ordinary movement is not altered;
- roof sizing/clearance has automated coverage.

### In-game map

- the district-circle planning diagram is no longer the primary map representation;
- map geometry now contains an authored primary road spine, district connectors, Bay Steps promenade, Mogra Park loop, Hill Garden approach, and a southern waterfront/coastline;
- selected landmarks are labeled with proper pins;
- district areas remain as subdued geographic context rather than opaque bubbles;
- map projection/road/waterfront geometry is deterministic and tested;
- styling now follows warm tactile cartography consistent with the UI direction.

### Runtime draw-submission reduction

- added `StaticBatchCompiler`, which bakes static child transforms and merges compatible meshes by shared material while preserving named semantic groups;
- Lantern Street hero geometry is compiled through this path;
- all six permanent authored environment landmark groups are compiled through this path;
- shrub authoring pieces are now compiled into material-grouped runtime geometry rather than remaining five independent meshes per shrub;
- permanent-building roof/plinth/sill/balcony details were added where useful after batching so added visual layers do not linearly multiply draw submissions;
- batching behavior has automated coverage.

### Verification infrastructure

- added GitHub Actions CI for Node 24 + pnpm frozen install;
- CI runs typecheck, lint, tests, content validation, repository validation, and production build;
- corrected the repository ESLint environment so TypeScript/DOM/Node globals do not appear as hundreds of false `no-undef` errors;
- expanded client tests so world/asset/map recovery tests are actually executed with the correct Vitest/Node runners.

## Verified result

GitHub Actions run `35120777943` on commit `f27efcab7a491d4c23e58b48be131e83d9916400` passed:

- frozen dependency install — PASS
- TypeScript — PASS
- lint — PASS (existing warnings remain non-blocking)
- tests — PASS
- content validation — PASS
- repository validation — PASS
- production build — PASS

## What this does NOT prove

Do not claim the recording problems are completely solved until a fresh browser run is captured.

This environment did not perform:

- manual mouse/WASD/pointer-lock feel testing in the actual game;
- third-person orbit around every building/property corner;
- first-person look-down/body composition inspection;
- target-hardware 1080p Medium profiling;
- before/after draw-call capture from the same camera positions as the supplied recording;
- visual acceptance of the full city against the four art-reference videos.

The static compiler should materially reduce submissions for the authored permanent world and Lantern Street, but the exact runtime number must be measured in the browser debug overlay. Streamed chunk dressing can still contain expensive object patterns and remains a high-priority profiling target.

## Remaining priorities

1. **Fresh browser capture and performance measurement.** Reproduce the same solo route from the original recording. Record draw calls, triangles, p95/p99 frame time, and >50ms hitch count at the same locations.
2. **Camera/manual control acceptance.** Orbit tight building corners, walk in/out of each starter property, toggle first/third person repeatedly, and verify no wall/roof/body dominates the frame.
3. **Streamed chunk renderer audit.** Profile `WorldStreamer`, `AmayaBayChunkFactory`, `NeighborhoodDressing`, and `CityVenueDressing`; convert repeated compatible props/foliage/facade pieces to instances or compiled material batches rather than deleting visible density.
4. **Hero-route art pass.** Continue replacing box-like primary-route massing with roof/eave silhouette, facade setbacks, recessed openings, balconies/awnings, drains/service detail, vegetation overlap, signs and ground contact. Keep stable IDs and gameplay anchors.
5. **Road/ground composition.** Add real road/path curvature, curb/drain transitions, authored surface breakup, lane/street rhythm, foreground clusters and sightline framing.
6. **Avatar embodiment.** The current procedural avatar still needs production-quality rigging, locomotion blending, IK, posture, hand contact and first-person body framing.
7. **City life.** Increase readable ambient motion through appropriately budgeted NPCs, bicycles, autos, curtains, storefront activity, birds/cats and weather response.
8. **PRD acceptance.** Do not advance the visual milestone until the Quiet Walk test is passed and a tester willingly walks Mogra Court → Bay Steps without needing a task.

## Non-negotiable continuation rules

- Stay browser-only. Do not add Electron/native/parallel PC renderer.
- Do not fix performance by reverting to empty/blockout city art.
- Preserve server/gameplay systems that are already working.
- Treat rendering submissions, object count, resource ownership, LOD and streaming as the performance problem to solve.
- Medium is the canonical art target.
- Measure before and after every substantial renderer optimization.
