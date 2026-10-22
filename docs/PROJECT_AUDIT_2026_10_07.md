# Together release audit — October 7, 2026

Scope: project-local documents, source and recorded local verification. Continue the existing browser stack and production-readiness design. The game is not complete or production-ready; authored character/art/audio, full physical leisure journeys, target hardware and hosted acceptance remain open.

## Latest verified baseline

The October 6 natural-motion checkpoint passed 611 checks and the full repository gate. Five browser scenarios passed: third-person walk/jog/stop, directional movement, job recovery/payment, two-player and six-player multiplayer. The long ordinary-speed route passed all 11 checkpoints; its larger Lantern view still showed about 27 FPS and two frames over 50ms among 240 samples. These results predate the combined changes below.

## Combined polish candidate

- Ground texture UVs share world scale and phase across neighboring chunks and detail rings (2m tiles). Chunk geometry and material allocations are preserved. Regression failed before the fix; 11 chunk checks passed afterward.
- Leaf sprays use smooth radial normals instead of face normals, retaining exact positions, indices, colours, counts and batching. Regression failed before the fix; 13 vegetation checks passed afterward.
- Articulated ankles prevent flat-support shoe penetration without raising the body or stretching limbs. The garment stops below the face/neck and shoulders have a rounded silhouette. Vehicle groups use the corrected foot baseline, the kayak hull faces forward and straddles the mean waterline, and the seated body/eyes meet the seat. Twelve avatar checks passed. Terrain foot IK and final authored humanoid assets remain separate work.
- Activity requests have immediate duplicate protection, view ownership, saved-progress reconciliation, owned-animation cancellation and monotonic realtime updates. Corrected fixtures reproduced all four original failures; review reproduced four additional cancellation/freshness failures; 34 focused engine/UI/world-lifecycle checks passed after correction.
- Kayaks use bounded water support through Rapier while on-foot gravity is preserved. Four actual physics checks passed, including 600-step idle/paddling and gradual recovery. A review caught the initial visual/body offset mismatch despite these physics checks; actual avatar world-transform regressions now cover hull/seat alignment.
- Stationary kayaks rest their paddle; measured movement blends stroke amplitude. Nine shared animation checks passed. Existing ride/paddle modal steps still do not establish a full outing.

## Verification in progress

The frozen complete repository gate passed 632 checks, typecheck, lint, content validation, integrity and builds. Evidence: `.art-review/production-readiness-2026-10-07-combined-polish-verify.log`. Existing non-blocking hook-ref and bundle-size warnings remain. All seven combined browser scenarios passed (7.9 minutes): settled third-person motion, keyboard kayak travel/steering/braking/return, existing transport transitions, job recovery, two/six-player multiplayer and a 1280x720 district benchmark. Saved metrics: `.art-review/production-readiness-2026-10-07-combined-polish-metrics.json`; motion/kayak captures: `.art-review/2026-10-07-combined-captures`.

Performance acceptance failed despite functional browser success. The standard-density canvas used 1088x612 backing for a 1280x720 interface, confirming .85 fallback scaling. Settled districts were approximately 27–46 FPS. The ordinary keyboard crossing ended at z113.1 and recorded about 21.9 FPS, p95 66.7ms, p99 100ms and 34/240 sampled frames over 50ms, with no streaming jobs pending at the final sample. CPU averaged 19.4ms and final render timing was 21.6ms. These are automated local measurements, not a physical target-hardware certification. An explicit Low comparison on the same larger route is now in progress before further fallback changes.

Further read-only review confirmed another activity freshness defect: delayed local POST or reconciliation snapshots can still overwrite newer peer progress in the same view. The existing realtime guard needs to become one shared merge rule for every response path; delayed POST/reconciliation regressions are the next fix. Current verified candidate is not treated as complete.

## Remaining release gates

1. Target performance: 60 FPS at 1080p Medium, 30 FPS fallback and no recurring movement hitches over 50ms on supported hardware.
2. Final authored character, hands, face, clothing, action contact, hero textures and original sound/music acceptance.
3. Full physical cycling/paddling and recreation mechanics; complete interrupted/uninterrupted co-op life loop, moving, decorating, stories, memories and rejoin.
4. Hosted auth/RLS/migration execution/private storage, distinct-network multiplayer/TURN, restart/concurrency/soak and backup restoration.
5. Container build/CI and hosted HTTPS verification, plus browser/device/controller acceptance.

No public deployment, commit or push has been performed. User explicitly authorized subagents; root coordinates ownership and freezes checks across their changes.

## Afternoon continuation (not yet combined-verified)

The explicit Low comparison failed during settings selection, before district measurements: the exact-label locator never resolved despite an accessible Quality combobox. The test now selects that combobox by role with a bounded timeout. Previous metrics are Medium results and must not be presented as Low evidence.

Actual-transform regression reproduced a 0.479m hand-to-paddle gap. Fixed-length two-bone arm solving now follows the rigid paddle through strokes and body-size variants, with non-kayak recovery. Review also reproduced both paddle ends remaining above water; the longer shaft and original blade geometry now alternate through the mean waterline. All 14 avatar checks passed. Visual browser acceptance remains pending; the avatar remains a development placeholder.

Cloud regressions reproduced incorrect opaque depth, repeated cluster shapes and dark undersides. Five focused checks passed after deterministic shape/palette/depth changes with unchanged cloud instance and draw structure. Day/dusk/rain and foreground occlusion still require capture review.

Performance measurements now retain frame count, elapsed duration, maximum frame and hitch totals for the complete interval since reset, alongside the existing rolling 240-frame percentiles. Five monitor checks passed, including an early hitch that falls outside the rolling window. This improves evidence coverage; it does not improve or certify frame rate.

Activity freshness regressions reproduced delayed POST and reconciliation replies replacing four completed realtime steps with one. The shared accepted-snapshot fix is being verified; no combined gate or production completion is claimed from these focused changes.
