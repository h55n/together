# Together V1 — Amaya Bay Handoff

## Live handoff — October 22, 2026

### Painterly-anime art build — Phase 1 step 1: Blender-scripted skinned character GLBs

- Deliverable shipped: `tools/blender/meshgen.py` + `tools/blender/build_character.py` generate all 21 character GLBs documented in `docs/ART_PRODUCTION_PLAN.md` into `client/public/assets/models/characters/` — bodies `body_{average,slim,broad}`, faces `face_01..03`, hair `hair_01..04`, outfits `outfit_{terracotta,blue,sage,mustard,home,sleep}`, crowd `crowd_01..05` — each with its `.source.md` staring "code-modelled, procedural, no external base mesh" per the build brief.
- One shared armature (`avatar-rig`, 29 deform bones: 5 spine chain + shoulder/upper_arm/forearm/hand/thumb/finger01–04/thigh/shin/foot per side) per GLB; `body_*` and `crowd_*` files carry baked clips `idle`/`walk`/`jog`/`sit`; face/hair/outfit files reuse the same armature (no clips) so PlayerAvatar can later sync bone rotations by name. glTF export confirmed with `export_animation_mode='ACTIONS'` on Blender 5.2.2 LTS.
- Skinning is distance-to-bone-segment Gaussians (`BONE_SIGMAS`); finish uses a single vertex-colour material `amaya-vertex-color` (COLOR_0, double-sided). Character faces +Y in Blender → game −Z; thighs ±0.44 walk stride, jog ±0.62, sit folds legs and drops hips −0.4 (baked as a location key on the hips bone, which points up its local +Y).
- Debugging notes recorded for the save: (1) pose-bone fcurve evaluation never reached the renderer in background mode — solved by applying preview poses directly from shared keyframe tables; (2) the fcurve API needs the slotted-action channelbag; (3) a latent bug where `assign_weights` filtered bones by `BONE_SIGMAS` (no `.L`/`.R` keys) made every limb fall back to `hips` weights — rendering showed rigid legs/arms; fixed by expanding sigma keys per side and sanity-checking every deform bone is covered.
- **Known imperfections (not claimed fixed):** stylized wide stride; stubby "banana" feet; fingers sculpted in a splayed fan at rest; slight crotch-gap between legs; skinning spikes near pelvis/knee joints. All are mesh/keyframe-level candidates for the next tuning pass.
- Verification: every GLB validated (binary header + JSON) in-process with report lines (`GLB_REPORT … 1 mesh, 1 armature, animations=['idle','jog','sit','walk']` for bodies/crowds); rig-sanity previews (rest/walk/jog/sit; front + side) generated to `.art-review/rig-preview/` (untracked) and visually inspected — sit shows folded legs on the ground, walk shows alternating stride with arm swing; `node tools/asset-index.mjs` indexed all 21; `node .art-review/verify-sports-candidate.mjs` passes (`Complete project gate passed`) after fixing a pre-existing `no-undef` lint error in `tools/asset-index.mjs` (`URL` → `dirname(fileURLToPath(import.meta.url))`); `world-art-review.spec.ts` passes 1/1 and its freshly captured frames keep the previous procedural look (GLBs are not wired into `PlayerAvatar`/`AmbientNPCSystem` yet — no runtime behaviour changed, `ArtAssets` resolution still falls back procedurally for ids it can't materialize).

### Active next build — ambient picnic/café persistence

- User requested the remaining work list and immediate continued implementation. Latest verified baseline remains 855 automated checks plus four rental browser flows.
- Next slice: hydrate bounded picnic/café arrangements from persisted household activity sessions on world entry, reconnect and activity invalidation; keep objects after modal close; reconcile revisions without duplicating props or letting stale responses restore completed arrangements.
- Root owns engine/UI lifecycle integration and browser acceptance. Luna `ambient_leisure` owns the independent scene registry and regression tests. Shared scene props must not take ownership of the camera or change player visibility; normal walking resumes when a panel closes.
- No inventory/carry/seated-body completion is inferred from this slice. Those, transport/NPC/weather/art/audio, hosted/device/soak gates remain in the backlog below. Implementation and verification are in progress; results will be appended and pending status replaced.
- **Implementation integrated, final verification running:** `AmbientLeisurePresentation.ts` owns at most two scene presentations and bounded per-kind revision/completion metadata. `useAmbientActivities.ts` hydrates without a panel, reconciles accepted commands, cancels stale requests and retries on reconnect/invalidation; household changes clear the previous cache. Engine camera ownership is separate from ambient props. Panel selection now uses the same newest-session rule as the canonical scene.
- Focused hydration/camera/activity lifecycle suites passed 27 checks before the additional newest-session regression. That regression was observed failing on the older session selection, then passed after correction. Worker registry tests/typecheck passed; new lint warnings were corrected. Existing fixture failures were traced to added independent hydration requests and fixtures now isolate panel requests; recovery assertions remain intact.
- Full integrated gate: `.art-review/production-readiness-2026-10-13-ambient-leisure-verify.log` (running). Extended real leisure browser checks now assert props after close, ordinary keyboard walking, reload hydration before reopening and cleanup on finish; browser execution is pending. No new hosted migration or deployment.

- **Ambient persistence verified (Oct 21):** full gate passed (log above: 58 server + 331 client checks, typechecks, lint, validation, builds; ends `Complete project gate passed`). `world-leisure.spec.ts` passed 3/3 in Chromium (guest joins existing picnic; picnic and café retain food/drink through lost reply and reload, props after close, walking resumes). Evidence: `.art-review/production-readiness-2026-10-13-ambient-leisure-browser.log`. Not covered: inventory/carry, seated shared bodies, hosted/device gates. Next backlog item: real inventory/carry for picnic/café/cooking food.

- **Goal round 13 (Oct 21):** interiors read dim (olive ceiling, grey walls) because only two point lights reach them. New `interiorPlaster` (warm white, faint emissive standing in for bounced light) now covers home walls and ceilings in both `StarterHome` and `PropertyInterior`; the art-review home shot is brighter and warmer. Gate passed. Evidence: `.art-review/production-readiness-2026-10-21-goal13-verify.log`.
- **Goal round 12 (Oct 21):** Lantern Street fixes from art review: the hero residential balconies used 5.2 m solid dark railing slabs that read as black bands; they are now a slim cream top rail on balusters. Grass is excluded from the Lantern hero street footprint, whose own 17 m roadway and wide sidewalks extend past the route margin. The capture also shows an ambient walker mid-stride on WebGL2. Gate passed. Evidence: `.art-review/production-readiness-2026-10-21-goal12-verify.log`.
- **Goal round 11 (Oct 21):** a large dark octagon in two-player home captures turned out to be the other member's head: every member spawned on the identical point. Members now spawn in a stable lane (−2..2 × 0.75 m) hashed from their user id. Home lighting props redone: the starter pendant is a smaller glowing double-sided paper shade on a cord, decoration floor lamps get a base, slim stem, glowing paper drum and bulb (new shared `lampShade` material), sofas get arms and cushions, beds get pillows. Gate passed; browser multiplayer-household and leisure 5/5. Evidence: `.art-review/production-readiness-2026-10-21-goal11-{verify,browser}.log`.
- **Goal round 10 (Oct 21):** grass was missing from many lawns: its filter used the unused authored-street corridors (`streetClearanceAt`), rejecting open lawns such as Rain Tree Lane (clearance −5.2 m), and Low budget (which slow headless runs fall back to) turned grass off entirely. Grass now avoids only drawn surface routes (roads keep a 2.3 m sidewalk margin, paths 0.9 m) and Low keeps a 35% meadow. Art review shows grass and wildflowers on Rain Tree Lane. Gate passed. Evidence: `.art-review/production-readiness-2026-10-21-goal10-verify.log`.
- **Goal round 9 (Oct 21):** tried to verify WebGPU townsfolk limb swing: headless Chromium exposes an adapter but cannot create a device on this machine (Dawn: `dxil.dll` load error 87), so three falls back to WebGL2; the in-app pane needs the Claude window visible to draw. WebGPU swing therefore still needs a human look on a visible WebGPU browser. Switched shadows to `PCFShadowMap` (three r186 removed `PCFSoftShadowMap` and warned on every load). `world-weather-visuals.spec.ts` now holds time/weather against the server's 5 s sync (it raced and failed once after the city clock was pinned); it and `world-visible` pass, and the rain capture shows rain over the bay at golden hour.
- **Goal round 8 (Oct 21):** the landward horizon now has two painted ridgelines (`createRidgeGeometry` in `CoastalSky.ts`, radii 560/515, peaks up to 120/80 m, falling away over the southern sea arc) tinted from the sky horizon colour for aerial perspective; art review showed the first version hidden behind the distant skyline, so the peaks were raised. Homely residential lots get a front yard: a low painted picket fence with a gate gap at the door, two rails and end hedges, built from existing trim/foliage materials so the draw-batch budget is unchanged (world tests 87/87). Art review gained a Rain Tree Lane homes frame. Gate passed (892 checks); browser visible/districts/venue-fronts/route 4/4 (opt-in full walk skipped as before). Evidence: `.art-review/production-readiness-2026-10-21-goal8-{verify,browser}.log`.
- **Goal round 7 (Oct 21):** stories now have an in-world presence: a glowing paper lantern (`interaction/StoryMarker.ts`) hovers over the active story's next pending location task (resolved by `interaction/storyTargets.ts`, with aliases for `common_library`→`the_common_library` and `property_visit`→Mogra Court found by a test that resolves every authored target); arriving within 6 m completes that task once through the existing task API. Active stories now load when the world is ready, not only when the J panel opens. Moving is physical: each packed item appears as a taped cardboard box inside the home (red tag sell, green donate), rebuilt from saved moving state after reload and cleared after the move. Ambient walkers whose patrol ends at a shop front (28 of 96) step inside for 6–14 s, turn around out of sight, then walk back out; hidden frames are skipped by the heading-smoothness test. New browser specs: `world-story-marker.spec.ts` (verified to fail with the arrival callback disabled) and `world-moving-boxes.spec.ts` (two players vote, pack, reload, see the boxes). Gate passed (892 checks); browser 9/9. Evidence: `.art-review/production-readiness-2026-10-21-goal7-{verify,browser}.log`.
- **Goal round 6 (Oct 21):** fixed outfit colours being chosen by a hash of the outfit id (so "Terracotta casual" could render teal): named outfits now match their names (terracotta, blue, sage, mustard, soft sleepwear, job uniforms) and unnamed ids fall back to a brighter anime palette. Shoulders moved in (0.35→0.325 × body width) so arms sit against the torso. Art review now includes a third-person avatar capture. Gate passed (888 checks). Evidence: `.art-review/production-readiness-2026-10-21-goal6-verify.log`.
- **Goal round 5 (Oct 21):** camera probes now use Rapier (`PhysicsWorld.castStaticRay`, `CameraController.usePhysicsRaycast`) instead of raycasting merged render batches: measured camera cost fell from 85–195 ms to 0.1–0.2 ms per frame and CPU frame time from 117–222 ms to 20–28 ms in local Chromium at three city spots (third person benefits most). First person adds forward/side wall probes that step the eye back from close surfaces. Fixed the sun path: it rose and set on the city's north side, so sea-facing (south) fronts were permanently shaded; it now rises east, crosses the southern sky over the bay and sets west, matching the sunset reference (art review shows a lit promenade and a western sunset). Bicycle rebuilt as a roadster (spokes, red frame, chain guard, leather seat, wicker basket) whose basket shows up to four produce items while the household shelf holds raw groceries. Ambient walkers sidestep people and the player ahead on their line (presentation offset ≤0.6 m, patrol cursors unchanged); the continuity test's near viewer moved 30 m off the walker line to keep its distance/LOD intent. WebGPU gets a node-material limb swing (`enableNodeLimbSwing`, lazy TSL): compiles and the WebGPU world loads without errors, but the swing is not visually verified because the hidden pane pauses frames. Gate passed (887 checks); browser 9/9 (scooter, rentals, auto ride, route, movement, visible, leisure ×3). Evidence: `.art-review/production-readiness-2026-10-21-goal5-{verify,browser}.log`.
- **Goal round 4 (Oct 21):** scooters are now a real rental (`scooter_ride` activity, mode `scooter`, max two guests): rent → put on helmet (required before every ride; not remembered like the kayak introduction) → ride → park/return. Server route enum, `ActivityService` (`isTransportRentalActivity`), `TransportLeaseAuthority` (unleased scooter snapshots now rejected) and the client prompt/panel/outing/save flow are updated; the old instant "Rent scooter" bypass is gone. Not added to the content leisure catalogue (the PRD's eight leisure activities stay eight). Heavy rain sends most ambient walkers indoors (stable per-walker threshold; patrols keep advancing). Tests: shared scooter rental rules, server scooter lease flow, NPC shelter; new `world-scooter-rental.spec.ts` passes. Gate passed (885 checks). Known issue seen in the scooter capture: the first-person camera can graze into a wall when the player stands tight against a building (hut), showing a half-black frame — camera near-wall clipping needs a pass. Evidence: `.art-review/production-readiness-2026-10-21-goal4-verify.log`, `...-scooter-browser.log`.
- **Goal round 3 (Oct 21):** weather now changes the look, not just wetness: `weatherAtmosphere(state)` (cloud cover, haze, sun scale, warmth, wind) eases in through `WeatherSystem.atmosphere` and drives sun strength/colour, fog density/mist tint, sky greying, visible cloud clusters and grass sway. Art review confirms misty mornings haze the bay; overcast was strengthened after review. Home lamp softened to 3.6 at 2.15 m after glare review. Acceptance runs now pin the city clock with `CITY_START_MINUTE` (Playwright: 600), fixing a pre-existing time-of-day dependency where kayak specs failed whenever the real-time city clock was at night (diagnosed from a 02:36 failure capture). Gate passed (880 checks); browser weather/visible/leisure 5/5 and rentals/kayak 4/4 with the pinned clock. Evidence: `.art-review/production-readiness-2026-10-21-goal3-{verify,browser,rentals-browser}.log`.
- **Goal round 2 (Oct 21):** auto-rickshaw rides follow the street network (`planAutoRideRoute`/`sampleAutoRideRoute` in `shared/src/transport/autoRickshaw.ts`, built on `planAmayaBaySurfacePath`); trip time uses the driven length and the camera eases toward the heading. New `world-auto-ride.spec.ts` verifies a Mogra Court → Bay Steps ride bends with the streets and ends on foot at the stand (dev-only `__amayaReviewRide`). Starter/property interiors: cream walls and ceilings, mint cabinets with wood tops, pastel fridge, pink/mint bedding, yellow sofa, rugs, framed prints, a second plant. Bloom threshold raised to 1.15 (both pipelines) and the home lamp softened/lowered after art review showed ceiling glare. New `world-art-review.spec.ts` captures home, Lantern Street, a residential lane, the sunset promenade and the picnic lawn for visual review. Gate passed (879 checks); browser 8/8 (auto ride, leisure ×3, kitchen, domestic, districts, movement). Evidence: `.art-review/production-readiness-2026-10-21-goal2-{verify,browser}.log`.
- **Goal round 1 (Oct 21):** Lantern hero buildings restyled (yellow Café Roshan with mint shutters and striped awning, blue/pink homes, cream shop row, green-yellow auto). NPC shadows swing via a shared `injectLimbSwing` depth material. WebGPU now gets the same bloom/grade/vignette via TSL (`core/WebGpuPostPipeline.ts`, `RenderPipeline` + `renderOutput`, lazy modules, falls back to direct render on failure); verified to run on the local WebGPU adapter but not visually captured (hidden pane), and one WebGPU start hit "Graphics preparation timed out" before a successful retry. Cooking completion grants `dish:<recipe>` × servings to household inventory via keyed `InventoryService.addProvisions`; picnic `bring_food` spends a cooked dish first, then raw groceries, under one replay-safe key; kitchen panel lists the shelf. Café/picnic guests now sit (café chair, ring around the picnic mat) while the activity view is open — presentation only, physics stays put. Server weather follows deterministic `naturalWeatherAt(day, minute)` in 3-hour blocks (storms only after rain, dangerous ≤15%); dev override lasts one block; `WORLD_WEATHER_FIXED` pins it (Playwright uses `clear`). Bicycle bell bound to remappable `bell` (R); kayak strokes play the paddle cue. Gate passed (877 checks); browser 6/6 rentals/kayak/kitchen/visible plus leisure 3/3 with seated captures. Evidence: `.art-review/production-readiness-2026-10-21-goal1-{verify,browser}.log`, `...-seated-browser.log`.
- **Crowd animation pass (Oct 21):** ambient walkers keep two instanced draws but now swing legs and arms in the WebGL vertex shader (`limb` vertex attribute, per-instance `gait` = stride phase + swing). Stride advances by measured displacement, so blocked or lingering walkers stand still; bob and sway follow the stride. About a third of walkers spawn on the bay promenade and a fifth on Lantern Street, with every sixth focus walker lingering; total raised 72→96. Limitations: shadows use the standing pose; WebGPU shows the standing pose. Two new NPC tests (gait gating, promenade share). Gate passed (872 checks); browser visible/districts/route 3/3. Evidence: `.art-review/production-readiness-2026-10-21-crowd-{verify,browser}.log`.
- **Buildings and streets pass (Oct 21):** pastel palette (`pastelYellow/Blue/Pink`, `mintPlaster`, `creamPlaster`) plus brighter existing plasters, cooler asphalt and lighter concrete. Neighbourhood lots pick a wall colour per lot id within their style family; homely styles (`rain_tree_old_home`, `pg_veranda`, `hill_terrace`, `park_pavilion`, `waterfront_hut`) get hip roofs (`hipRoofGeometry` in `FacadeDetails.ts`) with deep eaves in tile/slate/teal; flat roofs get a matching cornice band. Prototypes still share geometry: built with stand-in wall/roof materials and recoloured per placement. Venues pick a pastel within their family. Roads (runtime builder is `CitySurfaceNetwork.ts`, not `StreetNetwork.buildStreetChunk`, which is test/tooling only) gained a new `prepareChunkRoadDressing` pass: dashed warm centre line, white edge lines, wooden poles every third piece with three sagging cables clipped to the chunk; skipped inside the Lantern hero street, which got matching yellow/white paint. Poles are visual only (no collider). Building draw budget test raised 12→14 (roof + per-lot wall batch). Gate passed (870 checks); browser visible/districts/venue-fronts/movement 4/4. Evidence: `.art-review/production-readiness-2026-10-21-streets-{verify,browser}.log`. Not done: hero-street custom facades (Café Roshan, shop row) keep their own build, NPC limb animation, WebGPU post.
- **Painterly-anime visual pass (Oct 21):** user chose a painterly anime direction from four reference videos (Marine Drive sunset, Ghibli lane, Paper Route, Natsu no Michi). Added a WebGL2-only post chain (`client/src/game/core/PostPipeline.ts`: bloom, vibrance/split-tone grade, vignette; off on Low and on WebGPU), Neutral tone mapping, PCF soft shadows, a saturated sky palette, 336-lobe cumulus with lavender undersides, a bloom-lit sun disc/halo, warmer light and blue aerial haze. Foliage: richer palette, top-lit tree crowns, camera-local instanced swaying grass with wildflower drifts (`world/GrassField.ts`, visual only, hidden on Low). Promenade: brick paving with its own texture repeat and an instanced rubble sea wall. Avatar: rounded hips/limbs/shoes (same bounds) and higher-detail head/hands. Ambient walkers: merged body/head silhouettes with bright clothing and five skin tones, 32→72 walkers. On-foot movement now eases in and out. Gate passed (870 checks: 172 shared, 8 content, 62 server, 331 client, 53 camera/player, 244 pure); browser movement/visible/leisure specs 5/5. Updated CoastalSky tests (cloud count, underside tint) and the leisure walk hold (650→1000 ms) to match the intended changes. Evidence: `.art-review/production-readiness-2026-10-21-painterly-{verify,browser}.log`. Not done: WebGPU post-processing, real-hardware performance, NPC limb animation, final art sign-off.
- **Picnic inventory slice (Oct 21):** `bring_food` now validates, then spends household groceries via keyed `InventoryService.consumeProvisions` (`PICNIC_PROVISIONS` in `shared/src/leisure/picnic.ts`; mapping is provisional, needs product sign-off). Stale/missing-stock commands spend nothing; lost-reply retries spend once. Picnic panel disables Add and names missing items. Gate passed (62 server + 331 client; log `.art-review/production-readiness-2026-10-21-picnic-provisions-verify.log`); `world-leisure.spec.ts` 3/3 with real grocery purchases. Not done: café carry, cooked dishes into inventory, bag/basket handoff, seated bodies; spend is not atomic with activity CAS in hosted SQL. Local preview config added in `.claude/launch.json` plus untracked `.env` (ALLOW_DEV_AUTH=true).

**Latest build checkpoint verified:** the user authorised continuing the remaining PRD work after documentation consolidation. Trusted kayak rental opening-hour/weather enforcement and connected city clock/weather sync are implemented, retaining safe returns and exact retry recovery. Fresh verification passed 855 automated checks and all four rental browser flows. The full PRD is not complete and no deployment is certified.

### Active continuation — rental conditions

- Root coordinates integration and keeps this document current; Luna worker `rental_conditions` owns server/shared condition checks and regression coverage.
- Design source: PRD sections 115/119 (kayak hut opens 08:00, closes near sunset and in dangerous weather; light rain allows ordinary activity). No bicycle schedule or new fee is assumed.
- Inspect the existing clock/weather derivation before implementation so trusted server checks match the rendered city. Returns and accepted exact retries must remain available after closure/weather changes.
- Current scope does not certify hosted SQL, devices, art or the entire remaining backlog. New results will be recorded below as they complete.
- Integration now reads canonical Kayak Cove hours (08:00–18:30), checks the trusted city clock/weather on hire/departure, and preserves return/exact-retry behaviour. Root added a validated server-owned weather source and initial/periodic socket broadcast; connected clients consume weather and city-clock sync. No natural seasonal/weather progression is claimed: the canonical weather starts clear until server-owned logic changes it.
- Root weather and socket validation regressions were observed failing before implementation; weather service and six network checks subsequently passed. A further clock-sync regression was observed failing and is now implemented. A preliminary full gate is running; final integrated verification remains pending until source freezes.
- Source is now frozen. Worker finished seven rental authority checks, server typecheck and focused lint; root passed nine network/rental UI checks. Preliminary gate reached server tests and hit seven localhost `EACCES` failures from sandbox networking. A fresh complete gate with localhost access is running, with evidence in `.art-review/production-readiness-2026-10-13-rental-conditions-final-verify.log`. No product failure is inferred from that sandbox-only attempt.
- **Integrated automated gate passed:** 855 checks (172 shared, 8 content, 58 server, 320 client, 53 camera/player, 244 pure), all four typechecks, lint with zero errors/four existing warnings, content/repository validation, migration packaging and production builds. Final log above ends with exit 0 and `Complete project gate passed`. Four rental Chromium flows are now running against frozen source; new browser acceptance is pending.
- **Fresh browser acceptance passed:** all four rental scenarios passed in one clean run (1.6 minutes), exit 0. Actual kayak waterline/keyboard travel/return, checked-out reload and safety carry-over, uncertain departure reconciliation and combined bicycle/kayak travel/owned return passed. Evidence: `.art-review/production-readiness-2026-10-13-rental-conditions-browser.log`; captures preserved in `.art-review/2026-10-13-verified-rental-conditions`. Runner and owned development servers exited; no worker is still building. The 855-check + four-browser checkpoint is now the latest verified dirty candidate.

### Commit checkpoint — October 22, 2026

- All work above is committed on branch `art/painterly-anime-pass` (commit `6c19258`, parent `c77de71` on `build/amaya-bay-v1`); the working tree was clean after it. Not pushed; no hosted migration or deployment. `.gitignore` now excludes `.runtime/`, `.claude/`, `runtime-temp/`, `server/server/` and `test-results/`.
- Still open: user art review against the references, a human check of WebGPU townsfolk limb swing on a visible WebGPU browser, hosted Supabase migrations 014–016, cross-network TURN voice, real-device/performance acceptance and deployment.

### Workspace and coordination

- Workspace: `D:\ANTIGRAVITY\together`; PowerShell, Node 24, installed workspace toolchain.
- Branch: `build/amaya-bay-v1`; current HEAD `c77de7146db9d53e74cb181dd23580cae806b18e`. The working tree contains extensive uncommitted pre-existing and new work. Preserve it; do not reset, clean, discard or infer current runtime behavior from HEAD alone.
- User requested GPT-6.1 Sol coordination with GPT-6 Luna workers. Their integration work is saved; no worker or browser command remains active. Root is finishing this handoff. No commit, push, hosted migration execution or deployment was performed.
- `docs/PRD.md` V3.1 is authoritative. Newest audit: `docs/PROJECT_AUDIT_2026_10_13.md`; rolling ledger: `docs/superpowers/plans/2026-10-01-production-readiness-progress.md`.

### Implemented in the current dirty candidate

- Authoritative six-hole golf, timed badminton, illustrated pairs, private JPEG-backed photography, and bounded picnic/café placement, serving and consumption. Commands use membership/roster checks, exact retries and activity revision CAS.
- Native avatar identity geometry, fingers, blinking/laugh motion and outfit context mapping. External activity cameras show the head and restore the selected mode on close; café table/chairs/camera now clear the storefront. Artwork remains development art.
- Actor-owned bicycle/kayak rentals persist through reload, require first-time kayak safety acknowledgement, support resume and owned return, and carry prior acknowledgement into later outings. No rental price was invented.
- Rental retries preserve uncertain requests, resolve an earlier pending action before a different requested action, and rebase explicitly rejected stale returns after authoritative reconciliation. A parent-household atomic check prevents two service instances renting equipment to the same actor in separate activity rows.
- Native life jackets are attached to the actual avatar and removed/disposed with ownership. Helmet geometry is authored; this does not establish a complete scooter implementation.
- Single-instance socket lease cache warms saved rentals on connection and updates after committed rental commands. Unleased bicycle/kayak mode snapshots are rejected. Multi-instance cache invalidation is not implemented or verified.
- Earlier atomic transit, NPC obstacle guards and procedural audio remain integrated; full road-following auto travel, NPC routing/crowd avoidance and artistic listening acceptance remain open.

### Verification and active wrap-up

- Latest rental candidate: **849 automated checks**, all four typechecks, lint with zero errors (four existing warnings), content/repository validation, migration packaging and production builds passed. Evidence: `.art-review/production-readiness-2026-10-12-rental-verify.log`.
- Pre-rental leisure/avatar checkpoint: **823 checks and nine browser scenarios passed**. Preserved inspected captures: `.art-review/2026-10-12-verified-leisure`; log: `.art-review/production-readiness-2026-10-12-gameplay-browser-final.log`.
- **Rental browser acceptance passed:** physical bicycle/kayak travel and owned return; kayak waterline, steering and resting; checked-out reload/resume retaining its lease; lost-return recovery; prior safety acknowledgement in the next outing; and an unknown accepted departure resolved before a requested return. The initial run passed three scenarios; the fourth failed only because its observer replaced a newer outing with an older completed list entry. The corrected observer/recheck passed. Evidence: `.art-review/production-readiness-2026-10-13-rental-browser.log` and `...-rental-browser-recheck.log`. Production source stayed frozen during both runs.
- **No active verification command:** the browser runner exited and stopped its development servers. Preserved captures: `.art-review/2026-10-13-rental-first-browser` and `.art-review/2026-10-13-rental-recovery-verified`. Root inspected the actual kayak and jacket captures. Front safety pads are visible; rear pads are partly obscured by the outdoor garment and need final fitting/art polish. These captures are functional evidence, not hardware performance or final-art certification.
- Root owns `client/e2e/transportRental.helpers.ts`, `world-transport-activities.spec.ts`, `world-kayak-floating.spec.ts`, `world-rental-recovery.spec.ts`, and documentation. Production source is frozen during browser verification; change it only to repair a diagnosed failure, then recheck affected code.

### Resume commands and evidence

- `pnpm` attempts to fetch the declared version on this host and has hung. Use installed Node entrypoints.
- Set `TEMP` and `TMP` to `D:\ANTIGRAVITY\together\.art-review\runtime-temp` for checks.
- Complete gate: `node .art-review/verify-sports-candidate.mjs`. Optional argument is an exact stage label for a documented continuation, e.g. `'client types'` or `'pure tests'`; this does not independently certify earlier stages.
- Browser: `node client/node_modules/@playwright/test/cli.js test --config .art-review/playwright-sports.config.ts` followed by explicit spec filenames. It starts local server/client on ports 3190/5190, uses development auth, and runs one worker. Chromium/local-server checks have required sandbox escalation. Do not run broad tests or performance capture concurrently.
- Preserve `.art-review/sports-browser-results` before another browser command overwrites it. Existing saved candidate captures must not be deleted.
- Git read commands need command-scoped `-c safe.directory=D:/ANTIGRAVITY/together`.

### Hosted preparation and remaining scope

- Migration `016_transport_rental_authority.sql` is prepared and packaged, **not applied to hosted Supabase**. It replaces activity CAS with parent-household locking and cross-row lease collision checks, retaining service-role-only execution. Migrations 014/015 and hosted permissions/concurrency are also unverified.
- Hosted auth/RLS/private storage, TURN across separate networks, backups/restart/restore and Docker runtime remain unverified. Do not publish or call this production-ready from local tests.
- Kayak opening-hour/server-weather checks and local integrated rental acceptance passed in the continuation above. Natural weather progression, multi-instance socket invalidation and cache history growth still need work/soak review.
- Full PRD gaps include ambient leisure hydration after closing panels, bag/food inventory and physical shared handling, seated shared avatars, scooter/basket carrying, shared kayak hull, road-following auto journeys, complete NPC navigation/shelter, final art/audio, target-device/controller/performance and sustained resource acceptance.
- User asked to wrap and maintain this handoff. The current browser/failure-repair cycle is complete. Resume from this verified dirty-tree checkpoint when further work is requested; do not start another large feature slice during this wrap-up.

---

## Cumulative inventory — consolidated October 13, 2026

This inventory covers the repository foundations and the subsequent recovery, world-building, production-readiness, gameplay and rental work recorded so far. It supersedes conflicting historical status below. A feature being implemented means code/content exists; it does not mean its complete PRD acceptance, final art or hosted operation has passed. The dated audits and execution ledger preserve the detailed experiments, failures, fixes and evidence.

### Product and architecture we have built

- Browser-only private-household life simulator set in Amaya Bay: Couple and Friends modes, persistent shared home, gentle work, shopping, cooking, chores, leisure, stories and private memories.
- TypeScript workspace with `client`, `server`, `shared` and `content`. React/Vite owns application UI; Three.js owns the world and animation loop; Rapier owns collision; Express/Zod provides APIs; Socket.IO provides presence/movement/signaling; Web Audio and WebRTC provide audio/voice foundations.
- WebGPU-first graphics with explicit WebGL2 compatibility fallback. Renderer discovery, initialization, physics initialization and warmup have cancellation/deadlines and visible recovery. Failed startup can retry with a fresh canvas.
- StrictMode-safe engine ownership and disposal, structural household/user identity boundaries, callback forwarding and refreshed credentials without unnecessary world recreation. Refreshed authentication can reconnect an inactive rejected socket without disturbing healthy connections.
- Shared runtime contracts, deterministic rule modules, data-driven catalogs, local persistence and Supabase adapters, schema migrations, content/repository integrity validation and automated/browser verification tools. Legacy JavaScript runtime entrypoints were removed during integration cleanup.
- Current world-art direction is PRD V3.1: original code-authored Three.js assets compiled into shared runtime geometry/materials, batching, LOD and streaming. External GLB/DCC production is optional. Older statements requiring imported production GLBs are superseded.

### City, environment, rendering and world assets

- Approximately 900 × 900 metre semantic city; seven districts: Mogra Court, Lantern Street, Mogra Park, Bay Steps, Rain Tree Lane, The Common and Hill Garden. Catalog/layout foundations include 28 subareas and 45 everyday venues.
- Authored terrain/elevation, waterfront and landmarks; shared terrain-following road, path and promenade network; district building/prop/vegetation dressing; 128 metre chunk architecture with active, visual and horizon residency.
- Original procedural building, furniture, plant, tree, street-detail and surface families, generated colour/relief textures, static material-compatible batches and instanced ambient walkers. These remain development art where the final reference bar is unmet.
- Cooperative generator-based chunk construction, bounded buffer/index copying and bounds scans, cancellation of obsolete builds, completed-only registry publication and gradual resource retirement. Collider activation waits for commit; replacement activates before old occupied support is released; failed activation cleans partial colliders.
- Roadside planting compilation and vegetation/dressing batching reduce repeated construction/draw overhead without changing world transforms. Geometry/index/colour storage and ownership regressions cover the compiled output.
- Surface texture UV/world-scale/phase corrections, including road ribbons and caps; shoreline/foreshore guards, vegetation culling and bench ground support/contact repairs.
- Time-of-day lighting/palette interpolation across midnight and period boundaries, dawn/dusk emissive window/sign fades, original cloud shape/colour/depth refinements, rain/wetness state and correct restoration of original dry material roughness.
- Quality budgets now apply shadow resolution, vegetation detail, streaming radius and pixel ratio. Terminal adaptive reductions can use Low visual costs while retaining selected UI quality and gameplay collision; slow recovery prevents rapid oscillation.
- Debug telemetry includes CSS/backing resolution, elapsed interval/frame counts, rolling frame distributions, maxima/hitches, draw/triangle/chunk data and streaming stages. CPU construction improvements and local browser captures are diagnostics, not target-hardware acceptance.

### Input, cameras, embodiment and avatar assets

- First-person default, switchable third-person, collision-aware camera clearance, shoulder orbit/pitch limits, contextual activity views and ownership-aware restoration. External sports views now show the complete player rather than a hidden head.
- Pointer-lock/keyboard/gamepad foundations, configurable controls, delta-time controller look, focus/capture-loss reset, modal input suspension and measured-displacement locomotion.
- Forward/backward/strafe/diagonal motion uses correct body-frame conversion and normalized speed. Local and remote gait follows actual movement rather than key intent; blocked players stop stepping. Walk/jog phase is continuous; transitions, teleport reset and invalid-value handling are covered.
- Original avatar identity geometry: face variants, four hair silhouettes, brows/eyes/nose/ears, facial hair, glasses, fingers/collar and profile palette/selection forwarding to local and remote players. Blink/laugh motion and home/outdoor/sleep/work context geometry exist.
- Articulated ankle/sole ground-contact correction; fixed-length two-bone arm contact for kayak paddle grips; longer original paddles/blades and alternating water-reaching strokes.
- Original cotton/twill garment and home textile surfaces with owned colour/data textures; geometry/material/texture disposal repaired and made repeat-safe.
- Native transport life-jacket and helmet geometry. Life jackets attach to the actual avatar and follow owned cleanup. Front pads are visible in verified paddling captures; rear garment fitting remains unfinished. Authored helmet geometry does not imply completed scooter gameplay.
- Avatars still carry a development/placeholder designation. Full production rig quality, wardrobe context integration and contact animation across every action are outstanding.

### Households, home, economy and daily life foundations

- Couple/Friends creation and invite/join flow, six-character party codes, household roster/roles, shared property selection and voting rules; two-player Couple and six-player Friends browser presence/reconnect foundations.
- Five physical starter-home presets: Couple Studio, 1BHK, Courtyard 2BHK, PG House and Hostel Floor. Persistent home state, placement/ownership/customization, 92 furniture/decor definitions and 15 renovation definitions.
- Moving/packing decisions including keep, sell and donate, property transfer and versioned home state. Private-bedroom and mode-specific persistence rules have foundations; complete moving acceptance remains open.
- Personal/household wallets, server-owned prices/rewards, transaction/idempotency rules, shared-spend voting and economy tuning foundations. Do not assume every concurrent wallet writer is already atomic.
- Five job families: Café Roshan barista, Market Helper, Delivery Rider, Nursery/Garden Assistant and Freelance/Remote Work. Persisted job sessions, active-session ownership, authored steps and action completion hooks.
- Eight chore families, 23 grocery definitions and 20 recipe definitions; grocery/inventory services and persisted cooperative cooking sessions with dependencies, ingredient reservation, station ownership and outcomes.
- Interrupted/disposed/replaced animations cannot count as completed physical steps. Cooking station cleanup runs even after failed/interrupted saves; returned authoritative state is reconciled and owners can retry release. Completed steps release only their own station atomically.
- Internal life/household/relationship/time/sleep and progression foundations support visible low-pressure outputs rather than a numerical needs/XP HUD. Definition breadth is not evidence that every physical presentation is finished.

### Leisure and photography now implemented

- **Mini-golf:** authoritative six-hole round, canonical greens, angle/power aiming, terrain/friction/rail simulation, bounded ball trace, slow cup capture, strokes, turns and progression. Owned world balls/arrow/trace and saved state do not replay old shots on reload.
- **Badminton:** authoritative human/NPC match state, serve/hit/finish/cancel, net/boundary faults, timed reach and exact command identity. Original court/net/rackets/shuttle and articulated actors; stable Return/Serve controls, visible trajectory/contact cues and a 2.6 second flight. Human keyboard activation of the actual visible Return button passed; no injected gameplay state was used.
- **Cards:** seeded persisted illustrated pairs with 12 cards/six pairs, two-flip resolution, explicit mismatch continuation, household turns and completion only after all matches. Tables are reachable in all starter homes; mismatch/reload recovery passed.
- **Photography:** waterfront framing followed by nonmodal walking/looking and physical capture into a private JPEG-backed Memory. Upload/Memory retries retain the original bytes, image ID, context and request identity; accepted upload recovery verifies stored bytes. Completion requires the linked authorised Memory/image, rather than a checklist capture. Browser lost-reply recovery produced a readable private image without duplicate capture.
- **Picnic:** bounded mat placement, basket/cups/flowers/lantern arrangement, mangoes/sandwiches/samosas/idli/chai/soda portions, guest serving, consumption restricted to the served actor and deliberate finish. Joining after food placement preserves arrangement/roster.
- **Café:** six exclusive seats, order/serve/sip state and open-ended finish; original table/chairs/cups and an unobstructed storefront camera. Cup penetration, chair/table placement and panel readability were repaired.
- Picnic/café commands persist with exact receipts and CAS. Rendered presentations currently belong to open activity panels and clear on close: ambient-world hydration, shared seated bodies and real inventory/carry/handoff remain unfinished.
- All these activities use authorised household/roster commands, bounded data and exact retry reconciliation. Generic checklist endpoints reject specialised gameplay completion; legacy sports upgrade is explicit rather than a side effect of reading state.

### Transport and rental implementation

- Walking, bicycle/scooter/kayak presentation/control foundations and seven-district auto-rickshaw fares/journey/skip UI. Actual scooter completeness is still open.
- Free-roam outing ownership defers completion until measured departure and intentional park/return. Nonmodal controls, focus/menu/disposal cancellation, physics-time updates, mount readiness and retained finished-save retries are covered.
- Atomic transit debit plus receipt in Local repository; hosted migration 015 stages key/member locking and atomic debit/receipt. Client retains original origin/key across uncertain responses and prevents dismissed late responses from starting a ride. Current auto journeys interpolate through the city; road-following boarding/collision remains incomplete.
- Actor-owned bicycle/kayak rental state: rent, acknowledge first-time kayak safety, depart, resume and owned return. Kayaks cannot depart before saved safety acknowledgement; acknowledgement carries to later outings. No unsupported rental fee was invented.
- Reload retains the same checked-out lease. Exact uncertain commands are resolved before another requested action; explicitly rejected stale returns are rebased only after authoritative reconciliation. Old returns cannot return a newer lease.
- Cross-session duplicate active rentals are rejected atomically in Local CAS. Migration 016 stages household-parent locking before activity CAS and checks other rows for collisions, with schema-qualified objects and service-role-only execution.
- Socket lease authority warms saved leases on connection, updates after committed commands and rejects unleased bicycle/kayak movement modes. This is a single-instance cache; distributed invalidation and history-growth soak are pending.
- Browser evidence covers real riding, kayak waterline/steering/rest/bounds, intentional return, reload/resume, lost-return recovery, safety carry-over and an unknown accepted departure resolved before return.

### NPCs, story, communication, Memory and audio

- Named residents with schedules, persisted memory/relationship flags and dialogue; 12 resident definitions in the existing content inventory. Ambient walkers use two dynamic instanced body/head batches.
- Cached distance-based routes and smooth yaw avoid viewer-dependent motion and schedule-boundary teleporting. Rapier capsule casts guard static obstacles, with sidewalk patrol and wall regressions. Full rerouting/crowd avoidance/indoor door links/weather shelter remain unfinished.
- Seven progression stages, 36 story definitions (20 shared, eight Couple, eight Friends), persistent story/tasks, alternate outcomes and Memory integration. Narrative staging and all mode-specific human acceptance remain open.
- Private Memory Book with manual/automatic opportunities, captions and share export; local/Supabase image storage. Pagination uses 12 entries/page, three parallel requests, incremental results, abort and URL cleanup. Save/export/image errors have visible recovery and stale-operation guards.
- WebRTC off/household/proximity modes, mute/PTT, proximity attenuation and server-issued temporary TURN configuration; household sticky notes/text communication. Real separate-network relay/audio quality is not verified.
- Original code-generated wind/water/birds/rain, sparse contextual music and six cached activity FX with bounded voices and lifecycle/mute/suspend handling. Actual grounded gait contacts drive hard/soft footfalls; walls, airborne states, tasks and teleports do not fabricate steps.
- Music skips overdue notes after long frame gaps and resumes from phase without allocating suspended voices. Audio context visibility/lifecycle races are covered. Bell/paddle cues and final spatial/domestic/venue layering/listening balance remain incomplete.
- Audio/art provenance is documented in `docs/ASSET_REQUIREMENTS.md`; no external recordings, bought art or invented third-party licences were added.

### UI, accessibility, security and operational preparation

- Life/map/Memory/home/activity application surfaces, household board/notes, minimal world prompts and nonmodal physical photography/transport controls.
- Shared dialog focus entry/trap/restore, background inert/input handling, Escape within editable fields and prevention of Tab opening background Life. Keyed Memory lifecycle avoids stale reset effects.
- FOV/head-bob/reduced-motion/UI-scale/high-contrast/subtitles/master-volume/remapping and controller foundations. Physical-device coverage of every panel is pending.
- Supabase anonymous identity/Bearer refresh, REST/socket/voice credentials, development auth failing closed in production, production CORS/config validation, HTTP/socket flood budgets, request IDs, structured logs, health/readiness and graceful shutdown foundations.
- Production candidate assets: `deploy/Dockerfile`, `deploy/compose.yaml`, `deploy/Caddyfile`, migration runner/packaging, private Memory bucket setup and `docs/PRODUCTION_RUNBOOK.md`. Compose configuration passed with placeholders; Docker image/runtime, HTTPS and hosted writes were not certified.
- Current ordered migration chain is **001–016**, under `server/src/db/migrations`: initial; Amaya V1; property seeds; story/Memory runtime; inventory; cooking; profile; jobs; activities; audit hardening; atomic mutations; private Memory storage; active jobs; activity revision/CAS; atomic transit; transport rental authority. Latest hosted execution/permissions are unverified.

### Concrete source and evidence map

| Area | Primary location |
| --- | --- |
| Product requirements / phase criteria | `docs/PRD.md`, `docs/BUILD_PLAN.md` |
| Chronological work, failed experiments and fixes | `docs/superpowers/plans/2026-10-01-production-readiness-progress.md` |
| World-building / cleanup history | `docs/WORLD_BUILD_2026_09.md`, `docs/MERGE_CLEANUP_2026_10_01.md` |
| Current assessments | `docs/PROJECT_AUDIT_2026_10_08.md`, `...10_09.md`, `...10_11.md`, `...10_12.md`, `...10_13.md` |
| Pure activity rules | `shared/src/leisure/miniGolf.ts`, `badminton.ts`, `boardGame.ts`, `picnic.ts`, `cafe.ts` |
| Rental / transit rules | `shared/src/transport/rental.ts`, `autoRickshaw.ts`, `transport.ts` |
| Activity authority | `server/src/game/ActivityService.ts`, `server/src/db/LocalGameRepository.ts`, `SupabaseGameRepository.ts` |
| Transport authority | `server/src/game/TransitService.ts`, `TransportLeaseAuthority.ts` |
| World activity visuals | `client/src/game/interaction/*Presentation.ts`, `TransportOutingRuntime.ts` |
| Activity UI / orchestration | `client/src/ui/game/`, `GameCanvas.tsx` and `activitySnapshot.ts` within the client |
| Avatar / safety gear / ambience | `client/src/game/player/PlayerAvatar.ts`, `TransportSafetyEquipment.ts`, `client/src/game/audio/AudioZoneManager.ts` |
| Home world | `client/src/game/world/StarterHome.ts`, `PropertyInterior.ts` |
| Hosted operation / provenance | `docs/PRODUCTION_RUNBOOK.md`, `docs/ASSET_REQUIREMENTS.md` |
| Rental browser coverage | `client/e2e/transportRental.helpers.ts`, `world-transport-activities.spec.ts`, `world-kayak-floating.spec.ts`, `world-rental-recovery.spec.ts` |

Paths in this map are workspace-relative for portability; the workspace is `D:\ANTIGRAVITY\together`. Historical status documents can lag this handoff; consult their dated audit banners rather than treating every old “current” assertion as live.

### Verification history and its limits

- Earlier September recovery baseline recorded HEAD `5c08f8106ab1fa1914afee3ca1bf59aa9b1ea073` and GitHub run `35490206098`. Its green CI and 88.7 FPS diagnostic describe that historical candidate, not this dirty tree or release hardware.
- October 1: 515-check recovery gate; staged streaming refinement reached 524 checks and 13 browser passes/two opt-in skips. Separate stale venue fixture failed and was corrected/rechecked; do not collapse different runs into one green run.
- October 2: auth/camera/material work reached 536 checks; quality/audio reached 540; bounded merging/directional corrections reached 552. Ordinary home-to-Bay walking passed 11 checkpoints over about eight minutes, while Lantern performance still failed the target at that time.
- October 4–8: animated action/cooking cleanup, deployment preparation, textiles, world/surface/motion/footstep/paddle/outing work continued. Recorded intermediate checkpoints include 599, 603, 611, 632, 643 and 683 automated checks. These remain historical checkpoints, not independently rerun certification of the final candidate.
- October 8 sports integration recorded 753 checks before a final Vite helper-path failure; the separate corrected build does not turn that original command into an entirely green full gate.
- October 9–11 contained partial/failed/interrupted verification and browser attempts, including source edits/HMR during sports. Dated audits/ledger retain these limitations; interrupted runs are not acceptance passes.
- October 12 frozen leisure/avatar candidate: **823 checks**, typechecks/lint/validation/builds and **nine fresh browser scenarios** passed. Earlier human-return and visual failures led to actual camera/head/café/contact-cue repairs; inspected final captures are retained.
- Latest rental candidate: **849 = 172 shared + 8 content + 54 server + 318 client + 53 camera/player + 244 pure checks**. Four typechecks, lint (zero errors/four existing warnings), content/repository integrity, 16-migration packaging and server/client production builds passed.
- October 13 rentals: four unique scenarios passed across a three-pass initial run and one corrected-observer recheck. This was **not a single clean four-of-four command**. Production source stayed frozen between runs; only the observer choosing an older completed outing was fixed.
- Preserved current logs/captures and exact resume commands are in the live section above. Full-gate helper is `.art-review/verify-sports-candidate.mjs`; browser config is `.art-review/playwright-sports.config.ts`.
- Local Chromium/ANGLE/WebGL2 and CPU diagnostics do not certify 1080p Medium hardware, WebGPU devices, final human fun/art, hosted privacy or TURN. No new product tests were necessary for this documentation consolidation.

### Everything remaining — implementation and polish

1. Persist/hydrate leisure world presentations independently of panel ownership; reconcile ambient objects for returning/reconnecting clients.
2. Connect picnic/café/cooking food to real inventories and carrying capacity; implement bag/basket transfer, physical shared handoff/consumption and seated participant presentation. Preserve server authority and exact retries.
3. Complete bicycle basket/carry and actual bell binding; finish scooter purchase/rental/storage/parking/helmet/runtime controls and required passenger behaviour, rather than treating geometry as gameplay.
4. Replace straight auto-rickshaw interpolation with road-following, collision-safe boarding/journeys; finish transport contact/collision/embark/disembark presentation. Shared two-person kayak hull/coordination remains a quality feature to resolve against PRD scope.
5. Extend the locally verified kayak opening-hour/dangerous-weather rules through hosted/soak acceptance; finish natural weather progression and audit orphaned active gear, bounded history and cross-instance lease invalidation before multi-replica deployment.
6. Finish NPC global routing, obstacle detours/local crowd avoidance, safe route connectors, doors/interiors, weather shelter, schedule diversity and facial/gaze/contact presentation.
7. Integrate dynamic home/sleep/work wardrobe contexts; finish avatar rig/hand/foot/action contact quality, multiplayer consistency, garment/PFD clipping and complete safety-gear fitting.
8. Finish coherent reference-quality city/interior/furniture/vegetation/prop materials and measured LOD across seven districts; weather runoff/puddles/reflections/footprints and mirror/avatar presentation need final artistry.
9. Complete audio-zone spatial positioning, district/venue/domestic/micro-action sounds, bell/paddle wiring, musical state transitions and real-device comfort/mix/listening acceptance.
10. Audit other whole-household wallet mutation paths for concurrent-write races; transit atomicity does not establish globally atomic spending.
11. Complete physical presentations and human acceptance of all job/chore/story/cooking/home/moving loops. Catalog counts and animation hooks alone are insufficient.
12. Playtest automatic Memory framing for visible participants, occlusion and composition; finish share-export browser/design compatibility and large-book resource soak.
13. Review `AssetLoader.clear` GPU-cache ownership/disposal if used, streaming/resource retirement over long travel, context loss/recovery and repeated household/activity lifecycle changes.
14. Finish missing PRD debug/editor surfaces: navigation/collider/audio-zone/light-count inspection, packet-loss simulation and comprehensive hidden/NPC state tools.

### Everything remaining — acceptance, hosted services and release

- **Product playtests:** complete the PRD first 30 minutes and Evening Test, plus Quiet Walk, Shared Kitchen, Money, Rain, Moving, Memory, No-HUD and Solo Return tests. Existing route/activity checks cover pieces, not all eight acceptance tests end to end.
- **Performance:** supported target hardware at 1080p Medium; current candidate FPS/p95/p99/hitches/streaming budgets, actual backing resolution and GPU memory. Run controlled comparisons, not comparisons between unrelated dated diagnostics; Low must remain complete with consistent collision.
- **Devices:** real WebGPU and WebGL2 browser/GPU matrix, physical controller and every panel/remapping flow, comfort/accessibility and focus/input recovery.
- **Multiplayer:** sustained two-to-six-client Couple/Friends life-loop soak, latency/loss, reconnect/auth refresh, server restart, resource growth and accepted-write recovery; real separate-device behaviour.
- **Supabase:** execute/review the intended migration chain in a controlled hosted environment; auth/anonymous sessions/refresh, household membership and RLS, cross-household private JPEG bytes, service-role-only RPC permissions and concurrency/rollback of 014/015/016. Local contract tests do not prove hosted SQL execution.
- **Voice:** production TURN relay across separate networks for two-to-six people, off/mute/PTT/proximity/disconnect behaviour and practical sound quality/privacy.
- **Deployment:** Docker build/runtime, HTTPS/Caddy, real health/readiness database writes, environment/secret configuration, latest-candidate CI and release approval. Compose syntax validation is not a running deployment.
- **Operations:** database plus private-object backups, actual restore and measured RTO/RPO; accepted-write durability, logs/redaction/alerts, socket abuse/rate budgets and long-running failure recovery.
- **Scaling if introduced:** shared Socket.IO/presence/signaling, distributed rate control and rental-cache invalidation. Current implementation targets one server; do not silently advertise replica safety.
- **Release:** final art/audio/reference approval and human fun/comfort acceptance, all remaining strict phase exits and PRD definition of done, then an explicitly authorised publication. No hosted migration, commit, push or public deployment has occurred in this build/wrap pass.

### Suggested continuation order and handoff rules

1. Preserve the dirty candidate and evidence. Read the PRD, this live inventory, October 13 audit and rolling ledger before editing; establish the next bounded feature against the remaining list.
2. Prioritise a complete embodied household evening: inventory/carry/seated leisure and shared cooking/home/moving, then transport/NPC/art/audio gaps. Update this handoff and the ledger as work changes.
3. Keep source frozen during browser acceptance; diagnose failures before repair and recheck affected functionality. Run the full installed-tool gate once the next integrated candidate is ready.
4. Run real device/performance and sustained multiplayer acceptance, followed by controlled hosted migration/privacy/voice/restore/deployment verification. Record blocked external gates truthfully.
5. Avoid per-frame React updates, client-authoritative persistent outcomes, numerical needs/XP pressure, quality-dependent collisions and public stranger matchmaking. Keep first-person and private household presence primary.
6. User preference is Sol coordination/Luna workers when delegation is useful; no worker remains active and no unattended build continues after this documentation turn. No new feature was started while consolidating the handoff.

**Intentionally outside V1, rather than unfinished release obligations:** random stranger/MMO matchmaking, a second city, cars, deep pet simulation, VR and full mobile parity. Re-evaluate only if the authoritative PRD changes.

---

## Historical baseline notes

The remaining sections retain earlier project history. Their HEAD, CI, migration-count and “current” labels describe recorded older checkpoints, not the current uncommitted candidate.

## Product Summary

Together is a calm, beautiful, persistent browser-based 3D life simulator where real Couple or Friends households move into Amaya Bay, build a home, work gentle jobs, shop, cook, clean, decorate, explore, spend time together, experience authored life stories, and preserve shared history in a private Memory Book.

The product is about the feeling of living a life with someone. It is not a combat game, survival game, stat-dashboard simulator, public matchmaking product or MMO in V1.

## Authoritative Source

`docs/PRD.md` is the single source of truth. It supersedes every old Game Bible, prototype assumption, historical implementation note and old architecture wherever they conflict.

## Current integration — October 1

See `docs/MERGE_CLEANUP_2026_10_01.md` for merged branches, cleanup and current verification. Earlier verification statements below refer to their recorded recovery checkpoints. The coastal onboarding, guide, gaze, textures and native graphics recovery are included alongside production auth/network and embodied gameplay work.

## Current Repository State

- Project: Together V1 — Amaya Bay
- Integrated default branch: `build/amaya-bay-v1`
- Latest fully verified runtime HEAD: `5c08f8106ab1fa1914afee3ca1bf59aa9b1ea073`
- Verified GitHub Actions run: `35490206098` — **success**
- Documentation-only commits may descend from that runtime baseline; use `git rev-parse HEAD` for the current documentation SHA.
- Historical imported-prototype commit: `5c4730e`
- Implementation-plan commit: `bc415e8`
- Language: TypeScript for active application code
- Monorepo: pnpm workspaces
- Client: React + Vite + Three.js + WebGPU-first renderer + Rapier + Socket.IO + Web Audio/WebRTC
- Server: Express + Socket.IO + Zod + Supabase/Postgres adapters + Drizzle schema definitions
- Shared: deterministic rules/runtime schemas
- Content: data-driven items, recipes, NPCs, activities and stories

The active legacy JavaScript/JSX prototype runtime was removed. Git history preserves it.

## Implemented

### Foundation

- TypeScript monorepo and shared contracts.
- WebGPU-first renderer architecture with WebGL2 fallback.
- Fixed/update loop and Rapier character controller.
- Pointer-lock keyboard/mouse, gamepad and remappable controls.
- Asset loader foundation and performance/debug counters.
- Socket.IO household/presence/movement and remote interpolation.
- Local + Supabase persistence adapter architecture.
- Twelve ordered SQL migrations plus an advisory-locked/checksummed migration runner.

### Amaya Bay

- Approximately 900m × 900m semantic city footprint.
- Seven canonical districts: Mogra Court, Lantern Street, Mogra Park, Bay Steps, Rain Tree Lane, The Common, Hill Garden.
- 28 named subareas/colonies.
- 45 distributed everyday venues; the city intentionally has multiple groceries, cafés/tea spots, food places, repairs and laundries rather than one of each.
- 128m active/visual/horizon chunk streaming.
- Shared world-space road/path/promenade network with terrain-following streamed surfaces and shared procedural-clearance rules.
- Deterministic district dressing, terrain/elevation, statically batched vegetation, landmark/activity anchors, day/night/weather and district mood foundations.
- Low/Medium/High/Capture quality cost profiles.

### Player and identity

- First-person default with switchable third-person.
- Human-scale movement and camera collision.
- Persisted avatar identity/configuration.
- Shared local/remote identity presentation.
- Procedural development body and distinct locomotion/domestic/job/transport/social micro-motion hooks.

### Household and home

- Couple and Friends household creation/joining.
- Six-character invite codes.
- Couple/Friends membership and voting rules.
- Five physical starter property shells.
- Selected-property spawning.
- Server-authoritative furniture ownership and persistent place/move/remove/surface state.
- 92 furniture/decor definitions.
- Decorate mode with ghost preview, snapping and rotation.
- 15 renovation definitions and shared approval flow.
- Moving vote, packing, keep/sell/donate, property transfer and reconnect-safe state.

### Daily life and food

- Reusable embodied micro-action framework.
- Eight chore families with multi-step action/state sequences.
- 23 grocery/household item definitions.
- Multiple physical grocery venues.
- 20 recipes.
- Persistent co-op cooking sessions with station ownership, parallel dependencies, ingredient reservation and good/imperfect/burnt outcomes.

### Economy and work

- Personal and household wallets.
- Transaction ledger/idempotency.
- Server-owned prices/rewards.
- Shared-spend protection/voting rules.
- Physical job session definitions for Café Roshan, Market Helper, Delivery Rider, Nursery Assistant and Freelance/Remote Work.
- Payout requires authored step completion.

### Transport and leisure

- Walking, bicycle, scooter and kayak foundations.
- Seven-district auto-rickshaw destination/fare/visible-ride-or-skip flow.
- Eight persistent leisure activities with shared participation and embodied steps, intentionally without XP rewards.

### NPCs, story and Memory

- Ambient city-life NPC pool/update tiers rendered through two dynamic instanced body/head batches.
- 12 named residents with schedules, discrete household memory flags and authored contextual dialogue.
- Seven internal life stages based on active play rather than offline punishment.
- 36 data-driven story definitions: 20 shared, 8 Couple, 8 Friends.
- Persistent story tasks, alternate failure outcomes and Memory hooks.
- Private manual Memory capture.
- Sparse automatic activity/story Memory opportunities.
- Private local/Supabase image-store adapters, captions, authenticated retrieval and share-card export.

### Social/voice/accessibility

- WebRTC peer voice architecture with Socket.IO signaling.
- Off/household/proximity modes, mute/PTT and proximity attenuation hooks.
- Private household sticky notes.
- FOV, head bob, reduced motion, UI scaling, high-contrast prompt, subtitles, master volume, keyboard remapping and controller foundations.

## Verified

The current authoritative connected baseline is GitHub Actions run `35490206098` on runtime HEAD `5c08f8106ab1fa1914afee3ca1bf59aa9b1ea073`.

It passes:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm validate
pnpm validate:repo
pnpm build
pnpm --filter @together/client exec playwright install --with-deps chromium
pnpm test:e2e
```

The Playwright suite boots the real client and server, completes solo onboarding/playable-frame/movement/camera acceptance, then verifies a real two-context Couple create/join/property/movement flow and a six-context Friends create/join/property/movement/reload-reconnect flow. CI uses explicit WebGL2 compatibility mode because the GitHub headless GPU is not a reliable WebGPU target; normal product startup remains WebGPU-first and has regression coverage.

The same baseline includes regressions for the recovery bugs: StrictMode engine ownership/Rapier lifetime, renderer selection, focus-loss input reset, real-browser movement/camera switching, camera/movement math, terrain collider ownership, property/world clearance, world-space surface connectivity, static vegetation/dressing batching, bounded first-playable warmup, realtime home refresh, weather reactivity and ambient NPC instancing.

See `docs/VERIFICATION.md` for exact evidence and remaining manual/device gaps.

## Partially Implemented

The following systems are architecturally/functionally present but do not meet the PRD's final release-quality acceptance bar yet:

- final Amaya Bay art/terrain/road/facade assets;
- final stylized-realistic humanoid rig, facial system, authored animation clips and IK;
- baked NPC navmesh/path batching/local-avoidance production system;
- production weather runoff/puddle/reflection/footprint polish;
- complete district/interaction SFX and mastered music library;
- vehicle/activity tactile polish;
- production furniture/food/prop models for all stable content IDs;
- full browser/device/controller matrix;
- final automatic Memory framing playtest;
- production monitoring/alerting and socket-level abuse/latency soak;
- full PRD debug-editor suite.

## Not Implemented / Not Production-Verified

- random stranger matchmaking (intentionally postponed by PRD);
- second city (intentionally prohibited for V1);
- public MMO-scale other-household streets;
- cars/deep pets/mobile parity/VR (post-V1);
- production TURN connectivity testing;
- full public-city scaling/Redis Socket.IO adapter;
- final art source pipeline exports because final production art does not exist in this repository.

## Known Bugs / Reproduction

No deterministic crash from the reproduced recovery set remains on the verified baseline.

A browser-only Rapier/WASM crash was reproduced during this recovery: React development StrictMode invoked two overlapping asynchronous `GameEngine.create()` calls, and a later `RigidBody.translation()` could hit an invalid WASM wrapper. A StrictMode regression was added, engine creation is now serialized/owned per effect, and the full browser E2E passes.

Do not interpret this as release-complete verification. On the GitHub headless WebGL2 compatibility runner, the verified first-playable sample reported ~88.7 FPS, 11.3 ms smoothed CPU frame time, p95 17.2 ms, p99 18.2 ms, 148 draw calls and 223,782 triangles with zero sampled frames over 33 ms. These are CI diagnostics, not target-hardware claims. Remaining risks are target-hardware Medium/WebGPU performance, real browser/controller matrix, multiplayer/latency soak, production Supabase/TURN, and final art/audio acceptance.

## External Setup Required

### Connected development / CI

The committed dependency graph is already exercised in CI with `pnpm install --frozen-lockfile`. Use Node 24 + Corepack locally and run `pnpm verify` plus `pnpm test:e2e` before promoting runtime changes.

### Supabase

Provide `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and enable Supabase anonymous sign-in. Build the server and run its migration command to apply `001`–`012`; migration 012 creates the private `together-memories` bucket. Verify RLS/storage behavior in the actual project.

### TURN

Provide `TURN_URL` and server-only `TURN_SHARED_SECRET` (plus optional `STUN_URL`/`TURN_TTL_SECONDS`). The server mints short-lived authenticated credentials; no long-lived TURN secret belongs in the browser bundle. Run 2–6 member voice tests across different networks. No voice data should be recorded.

## Asset Gaps

The largest release blocker is production asset quality. See `docs/ASSET_REQUIREMENTS.md` for exact GLB/KTX2/audio requirements, suggested budgets, paths and replacement instructions.

The current world/characters are explicitly development/procedural art; never relabel them as final production art.

## Next Recommended Work

Dependency order:

1. Profile the verified browser build at 1080p Medium on PRD target hardware; record frame-time p95/p99, draw calls, triangles, hitches, scene resources and GPU memory before further performance tuning.
2. Run the real WebGPU/browser/controller matrix; keep WebGL2 as the complete compatibility fallback rather than the default.
3. Run two-browser Couple onboarding/movement/home sync, then Friends 2–6 client soak/reconnect/latency tests.
4. Continue the PRD visual-world pass: make Mogra Court → Lantern Street → Bay Steps and all seven districts meet the no-placeholder/Quiet Walk bar while preserving the shared surface network and measured batching/instancing.
5. Implement/import the final humanoid rig + authored locomotion/domestic clips + IK while preserving current interaction/state contracts.
6. Implement production NPC navmesh/path batching, door links and animation presentation.
7. Run shared-kitchen, furniture concurrency, moving and Memory acceptance tests with real people.
8. Production-test Supabase persistence/private Memories and TURN voice.
9. Finish art/audio/weather/LOD/compression polish without changing gameplay collision across quality tiers.
10. Execute PRD Quiet Walk, Rain, Money, Moving, Memory and No-HUD acceptance tests.

## Important Architectural Rules

Future work must not undo these:

- `docs/PRD.md` wins over old docs/code.
- One city only: Amaya Bay.
- First person remains primary; third person remains optional.
- React must not own per-frame world transforms.
- Server owns persistent consequences/economy/story/home authority.
- Client movement/camera stay locally responsive.
- No numeric hunger/energy/relationship/vibe HUD.
- No timer substitution for promised embodied chores/cooking.
- No blocky/proxy development art should be called shipping art.
- Couple and Friends share one engine; only rules/content weighting differ.
- City streets are largely open; progression unlocks capability, not arbitrary barriers.
- Money is aspirational, not survival pressure.
- Failure creates alternate stories/memories rather than harsh game-over.
- Stable content IDs must survive asset replacement and save migration.
- Quality tiers may change render cost, never gameplay collision/interaction behavior.

## V3.1 technical-direction supersession

As of 2026-09-15, `docs/PRD.md` V3.1 is the authoritative product and technical direction. Together V1 remains a browser-only TypeScript/Three.js product: WebGPU-first via `three/webgpu`, with WebGL2 compatibility fallback, Rapier, React for application UI only, Socket.IO, and the existing server/shared/content architecture. Core Amaya Bay art is code-authored, compiled once into shared immutable runtime assets, then rendered through measured merging, instancing, LOD, and streaming. Blender/Maya/hand-authored GLB/KTX2 exports are optional future inputs only and are not a V1 production dependency. Medium is the normal supported-desktop baseline; Low is a complete fallback. Hardware FPS claims remain unverified until a real browser profile is recorded.


## Current world-building pass — 2026-09-22

See [World build status](docs/WORLD_BUILD_2026_09.md) for implemented visuals, actual verification, and outstanding work. This pass is **in progress**; finished-reference quality, full route validation and optimization are not claimed. Earlier status entries below/above are historical.

