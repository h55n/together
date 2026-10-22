# Together release audit — October 8, 2026

Authority: project-local PRD, asset requirements, readiness design and saved verification. Continue the existing browser stack. The game remains incomplete; no production or AAA claim is made.

## Completed prior checkpoint

The October 7 contact/freshness candidate passed the complete gate: 643 checks (shared129, content8, server33, client228+45, pure200), typecheck, lint, validations and builds. Evidence: `.art-review/production-readiness-2026-10-07-contact-freshness-verify-recheck.log`. The first attempt timed out on a six-complete-chunk UV correctness test; its assertions were retained and its bounded timeout set to15seconds. All11 chunk checks then passed before the full recheck. Existing hook and bundle warnings remain.

Three real-browser scenarios passed in4.3minutes: corrected larger Low benchmark, keyboard kayaking and third-person walk/jog/stop. Evidence: `.art-review/production-readiness-2026-10-07-contact-low-browser.log`. Preserved metrics: `.art-review/production-readiness-2026-10-07-contact-low-metrics.json`; kayak captures: `.art-review/2026-10-07-contact-captures`.

Low at1280x720 on local Intel UHD/ANGLE recorded settled recent cadence about56–60FPS with no >50ms frames across each settled interval. The20-second keyboard crossing averaged57.1FPS across1158 measured frames, with0 frames >50ms and maximum50ms. Recent p95 was33.3ms. These are automated local measurements, not physical-device acceptance. Previous Medium moving capture remained21.9FPS/34hitches among240 recent samples; the builds differ, so this is diagnostic evidence rather than controlled attribution to one setting.

Actual capture inspection confirms both hands meet the paddle and the rider remains seated/floating. The development avatar, simplified boat and sky still require authored art acceptance. Offshore loose trees/props and unsupported procedural bench structures are the next bounded visual fixes.

## Current authorized work

Root: terminal Medium/High adaptive budget now reaches measured Low visual workload (shadows disabled, radius3, vegetation.65, DPRcap1) plus.85 backing scale; selected quality is retained. Each recovery step requires1800 stable samples to avoid immediate expensive-work oscillation. Fourteen renderer/adaptive focused checks passed after2 regressions failed. Fresh Medium performance verification remains pending.

Gameplay agent: implementing owned physical free-roam cycling/kayaking, nonmodal controls, actual departure, deliberate park/return, cancellation and ordered/recoverable saves. Drafts are not completion evidence; integrated source/tests/browser acceptance must pass.

Visual agent: regression-first curved-shore/foreshore loose-dressing guards and supported procedural benches. Authored docks, steps, venues, launches and terrain are preserved. Focused and visual acceptance remain pending.

Reviewer: independent read-only review of implementation, cancellation ownership, shoreline boundaries and release gaps. Root coordinates source freezes for complete checks and browser workloads.

## Integrated candidate now under full verification

Physical outing source is integrated into GameEngine/GameCanvas. Travel starts without persisting a completed travel step; the modal yields to a nonmodal, binding-aware controls hint. Only measured physical departure followed by deliberate equipment return and its owned animation can trigger ordered travel/final saves. Save retries retain the physically finished owner, reconcile lost replies and merge accepted progress monotonically. Stationary finish returns equipment without claiming travel completion. Menus, visibility/focus loss, transport changes, disposal and abort interrupt ownership.

Sixty-four focused runtime/UI checks passed. Independent review reproduced high-refresh false cancellation and immediate entry/finish-abort mounted leaks; physics-time sampling and captured cleanup fixed those. Root reproduced two more defects (end during mounting lost, cancellation resetting replacement transport), then focus loss during the return animation. All14 actual engine checks pass after those fixes. No claim of browser acceptance for this integrated journey is made yet.

World contact:22 focused checks pass. The shore predicate follows actual curvature/carved foreshore and filters loose props/trees before allocation. A16cm generated-bench ground gap was reproduced, then fixed using canonical terrain height only for props whose entire footprint clears paved surfaces. Exact terrain position/normal/index buffers are unchanged; paved and authored placements are preserved. Procedural benches have grounded support frames and an upright back, retaining seat centre and original footprint. Actual coastal fixture coordinates were corrected for128m chunks; earlier random-tree fixture coverage is not claimed as a reproduced coastal failure.

Source/tests/config are frozen for `.art-review/production-readiness-2026-10-08-integrated-verify.log`, followed only on success by `.art-review/production-readiness-2026-10-08-integrated-browser.log`. Browser scenarios cover two/six-player multiplayer, jobs/recovery, real physical outings, kayak floating/steering/braking, third-person movement and larger Medium benchmark with a generated-bench close-up. Final source changes require fresh verification; the current audit remains provisional.

The first full attempt stopped at a shoreline test generator stub with no yield. Corrected that test stub, then the frozen recheck passed683 checks (shared129/content8/server33/client268+45/pure200), typecheck, lint, validation, integrity and builds. Evidence: `.art-review/production-readiness-2026-10-08-integrated-verify-recheck.log`. Three existing hook warnings and bundle-size warnings remain. Browser verification is currently running; full build success is not browser or production acceptance.

Further read-only review identified named-resident schedule-boundary position jumps and ambient speed changing with viewer distance. NPC motion corrections are being prepared in unused drafts only during this freeze; they are not part of the683-check candidate.

## Open release gates

Target hardware/browser/controller performance; final authored character/actions/textures/audio; full recreation and interrupted co-op life loop; hosted auth/RLS/private-storage/migrations/TURN/soak/backups; container/CI/HTTPS acceptance. No public deployment, commit or push. Complete this cycle's implementation where verification permits; never convert an incomplete or externally unverified gate into a completion claim.
