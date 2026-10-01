# Playtest entry progress

Ruling: execute in the existing checkout under the user's explicit plan-and-proceed authorization — preserve all current world changes and publish on a new codex branch — cost if wrong: checkpoint includes the existing project work, so review its staged file list before push.

Research and current state are recorded in the design document. Initial plan self-review covered returning sessions, focus/menu input, genuine tutorial completion, neck pivot and small-window layout.

## Verified progress
- Base repository verification passed; checkpoint `ec4775c` was pushed to `origin/codex/playtest-polish-2026-09-30`. Automatic review initially rejected public publishing; repository inspection confirmed ADMIN access to public h55n/together, and the user explicitly confirmed that exact destination/payload. Remote commit matches local checkpoint. Local runtime state and review media are ignored.
- Custom original coastal SVG, split arrival layout, progress steps, clearer solo/household copy and controls are implemented without changing account/household APIs.
- Optional first-day guide records actual look, displacement and accepted interaction, persists per user and supports skip/replay. FirstSession tests failed before implementation and pass afterward.
- Drag look fallback and neutral movement on blur passed observed failing/passing tests. Cursor release now explicitly calls exitPointerLock on Escape: the first browser run reproduced the canvas intercepting guide clicks while cursor remained captured; subsequent browser test passes.
- Neck-pivot head gaze, shortest-angle clamping and damped body orientation implemented. Gaze regression failed with missing implementation, then passed.
- Distinct deterministic 256px grass/asphalt/plaster/wood/paving maps, mipmaps and anisotropy, shared library ownership and small plaster/wood bump detail implemented. No texture work occurs per frame.
- Final repository verification passed after review and renderer fixes: 95 client Vitest tests, 7 client Node tests, 12 server tests, content/shared tests, 176 pure checks, type checks, lint (existing warnings), content/repository validation and production build. Evidence: `.art-review/playtest-final-verification.log`.
- All three final browser tests passed (1.1 minutes), covering fresh entry, actual look/walk, closed-weather kayak rejection, map/cursor release, held movement behind menus, reload persistence/replay, 390px-wide arrival and ordinary URL automatic native WebGL2 recovery. The recovered home sample reached 60 FPS after loading; this is not whole-world performance acceptance. Evidence: `.art-review/playtest-entry-browser-final.log` and `.art-review/playtest-entry/`.
- Independent reviewer found no remaining Important/Critical issues after the final recovery corrections.

## Review and rulings
Important stylesheet ordering defect: legacy entry styles followed new styles and collapsed the postcard/scrolling. Fixed import order in main.tsx; screenshot reproduced blank postcard and new browser assertions verify width/card radius after correction.
Important rejected kayaking defect: an E press completed discovery before the weather guard. Added a browser regression which failed at the incomplete-lesson assertion after rejection; reporting now occurs after accepted dispatch. That browser test passes after the fix.
Reviewer minor coverage gaps were addressed by adding an actual reload/persistence check and exercising the map after pointer-lock release.
Ruling: report interaction when a local action is accepted, not after asynchronous server session completion — lesson teaches using an in-world target and transport boarding is local — cost if wrong: an online API failure can still follow a valid local interaction.
Ruling: retain procedural maps/avatars as development art — texture/gaze improvements preserve existing architecture and satisfy the current playtest pass — cost if wrong: these do not achieve the reference-level production art bar.

## Graphics recovery
The ordinary browser smoke initially rendered a white world with zero draws. Console evidence identified Windows `dxil.dll` device creation failure after successful adapter discovery, followed by Three silently substituting its universal WebGL backend and losing that context. The adapter-only preflight was insufficient.

Recovery now rebuilds a fresh canvas with native WebGL2 on universal fallback or device loss. Healthy WebGPU remains preferred. The ordinary URL renders with the native backend after recovery. Regression tests cover the internal compatibility override, fresh canvas, disposal, open-menu input neutrality and ignored stale callbacks; 17 focused tests pass. Reviewer Important findings about menu gating and canceled startup callbacks were fixed and retested.

Ruling: rebuild the engine after graphics failure to restore a usable browser session — a canvas cannot switch its established context type — cost if wrong: in-session world position/time and transient local activity state can reset. Persisted identity, household and guide state are retained; physical WebGPU, mid-session recovery continuity and production soak remain acceptance work.

## Final evidence and publishing — October 1
Implementation milestone `309a724a84b64b5a405e17a483a979c57779a187` was pushed successfully; `git ls-remote` matched local HEAD. All requested source changes in this milestone are on GitHub.

Refreshed world capture passed (2.1 minutes): seven district viewpoints, close street/cafe/shore surfaces, rain/sunset and actual 20-second ordinary walking. No page errors. Hardware: Intel UHD via ANGLE D3D11, viewport 960×540. Warm district FPS: Mogra 54.4, Lantern 58.5, Bay 37.1, Park 55.3, Rain Tree 42.1, Common 47.9, Hill 60.0. Walk 41.6 FPS. Cold loading p99 up to 1116.5 ms; peak warm draws 881. Evidence: `.art-review/playtest-world-refresh.log` and `.art-review/current-world/metrics.json`.

Inspected new arrival and player-height surface screenshots. Recorded `.art-review/amaya-bay-playtest-2026-10-01.mp4` and rebuilt seven-district overview. Review travel uses developer teleport between viewpoints; it is not a complete continuous world/venue acceptance route. Reference art quality, bounded cold construction, 1080p targets, final animation/audio, gameplay balancing and online/device acceptance remain unfinished as listed in the state report.
