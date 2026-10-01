# Amaya Bay visual and smoothness progress

## September 30 implementation

Reference films inspected from the four local MP4s. Reference contact sheets are in `.art-review/reference-video-1.jpg` through `reference-video-4.jpg`. Direction: layered greenery and lived-in residential streets, warm/cool painterly light, sculpted coastal clouds, grounded pavement and readable architecture.

- Removed the earlier per-chunk canopy geometry merge experiment after it increased cold construction cost.
- Corrected FPS/p95/p99 to use animation-frame intervals; CPU work is measured separately. Reset timing after an explicit loop restart. Added streaming and hitch diagnostics plus opt-in fixed-camera browser captures.
- Shared foliage material preserves leaf and blossom hues as painted vertex colours, reducing each tree to wood plus foliage. Distant variants reduce fine geometry while maintaining crown bounds. Shrubs now use shared compiled variants.
- Added shared geometry instancing with nested-transform and shadow-policy tests. Chunk placements use this instead of copying roadside canopies into new meshes. Shared vegetation geometry is released when its material library is disposed; instance buffers are released on chunk disposal.
- Replaced full water normal reconstruction with analytic wave normals. Shoreline coordinates stay fixed.
- Added shaded, taller coastal cloud clusters in one draw, blended sky palettes, and continuous lighting profiles.
- Architectural pass underway: opaque exterior glazing, dark reveals, projecting frames, mullions and open balcony rails replace overlapping flat legacy details.

Regression evidence: observed failures and subsequent passes for independent frame/CPU timing, analytic water normals, two-draw foliage, distant geometry/bounds, shared shrubs, continuous lighting, nested instance transforms and shadow separation. Type checking passes.

First automated capture showed Mogra Court at about 490 draws / 1.33M triangles after warming, before shared instancing and architectural changes. Its frame cadence was 1–2 FPS despite short CPU update times. The browser capture heavily slowed other processes and was stopped; these timings are diagnostic only. Do not compare them to prior CPU-derived “FPS” values or claim physical hardware acceptance.

Ruling: continue in the existing checkout and retain all prior uncommitted world work — required by the accepted plan and user request — cost if wrong: changes need careful file-by-file review before a commit.

## Still required

Finish/inspect the hero architecture and foreground composition; rerun fixed views after changes; normal-speed walking and bounded chunk work; all subareas/venues/interactions; physical hardware WebGPU/WebGL performance and multiplayer/voice/persistence acceptance. Full reference-quality completion is not yet verified.

## September 30 continuation

- Added street-oriented frontage lots, open balcony details, inset window reveals and shared compiled building prototypes. Collider yaw follows the visible building. Exact indexed corridor queries replace repeated full street sample scans.
- Chunk retirement releases collision immediately and disposes one departed visual group per frame. Reconciliation cancels obsolete queued work. Cold construction remains monolithic and can exceed 100 ms; this gate is not complete.
- Nearby foliage detail is independent of active residency: occupied/adjacent nine chunks retain dense crowns; the outer active ring uses lighter crowns while retaining buildings and collision. All 25 active chunks remain. The promotion regression failed before implementation and passes afterward.
- Water uses analytic normals and continuous animation time with distant updates capped at 10 Hz. Deferred updates and resumed wave position are tested. Shore foam winding was corrected after an independent review reproduced downward normals.
- Coastal clouds now use broad shaded bases and asymmetric rising billows, with instance-buffer disposal on teardown. Residential vacant terrain now uses colour-varied planted ground; explicit streets and sidewalks retain their paving.
- Full `pnpm verify` passed after the foliage/cloud changes, with existing lint and bundle-size warnings. The final planted-ground adjustment has targeted world regression and type-check coverage; inspect their latest result before claiming that follow-up verified.
- Automated WebGL2 capture explicitly selects Intel UHD D3D11 through ANGLE. At 960×540, the normal 20-second walk crossed z=128 and measured approximately 41 FPS with no >50 ms frame in its final 240 samples. This does not certify the complete route or the 1080p Medium target. Cold travel hitches and excessive draw submissions remain.
- Running workspace builds during captures can refresh the development scene. Two arrivals returned to the starter home; those frames/metrics are invalid. The benchmark now asserts each district's actual position before saving a frame. Use the subsequent stable capture for the current screenshots.

Review: no Important/Critical findings in the frontage, collision yaw, exact corridor query, prototype ownership or continuous water timing. Minor retained: frontage-to-frontage/cross-chunk seeded overlap prevention is implicit; the reviewer reproduced no placed overlap. The earlier cloud instance disposal minor is fixed.

Ruling: retain planted residential ground outside explicitly authored pavement — references show layered greenery and current frames showed pavement extending across empty lots — cost if wrong: district paving/landscape boundaries need more authored masks. No collision geometry changes accompany this surface change.

Next sequence: finish foreground/setback composition on the Mogra–Lantern–Bay slice; split cold chunk preparation into bounded work; profile building/prop submissions; then extend proven kits and inspect all venue/interior fronts. Production humanoid animation, audio, multiplayer/voice/persistence and physical device acceptance remain separate unfinished release work.

## Current location-verified evidence

The stable capture in `.art-review/world-current-2026-09-30.log` passed all seven district position assertions and reported no page errors. Warm WebGL2 at 960×540: Mogra 52.4 FPS, Lantern 53.6, Bay 37.7, Park 54.1, Rain Tree 44.1, Common 48.9, Hill 60.0. The normal 20-second boundary walk measured approximately 40 FPS, 971 draws and 1.99M triangles, with zero >50 ms frames in the final 240 samples. Loading/travel remains hitch-prone; this is not release acceptance. Earlier captures with reset positions must not be used as district benchmarks.

The planted-ground follow-up passed 12 targeted world tests and client type checking. `git diff --check` passed (line-ending warnings only). Current seven-district screenshot overview: `.art-review/current-world/world-overview.png`. Playable capture: `.art-review/amaya-bay-current-review.mp4`; it includes review teleports plus the ordinary keyboard walk, rather than a full continuous city walkthrough.
