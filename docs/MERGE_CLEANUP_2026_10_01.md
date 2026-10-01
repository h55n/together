# Integrated branch and obsolete-file cleanup — October 1

## Integration
Default branch: `build/amaya-bay-v1`.

The integration preserves the coastal playtest work through `a8b4153`, recovery work through `77646da`, and audit hardening through `c3dc06d`. Local merge commits are `f2182ad`, `4a46da2` and `bf3fd05`. Git history is retained; no force push or history rewrite is used.

Resolved overlapping startup, input, graphics recovery, articulated avatar, lighting, street/terrain, vegetation and documentation changes. Kept serialized StrictMode creation, first-playable prewarm, optional saved tutorial, graphics recovery, auth/network/TURN protection and embodied actions. Fixed duplicated job retry code introduced by automatic merge. Authorization still precedes cached job/activity replies.

Review fixes: eyes/nose use coordinates local to the neck pivot; engines are disposed when first-playable preparation fails; regressions cover both. Facade/collider rotation and street-frontage angle conventions are reconciled. Shared vegetation retains painted foliage, detail levels and the tighter four-variant cache bound.

## Removed tracked files
- `ARCHIVE_INFO.json`: obsolete archive snapshot and build-blocked claims.
- `together-PRD-v2.md`: superseded by authoritative `docs/PRD.md` version 3.1.
- `server/src/content/story_events/new_neighbour_01.json`
- `server/src/content/story_events/pipe_burst_01.json`
- `server/src/content/story_events/power_cut_01.json`

The three unused story samples are superseded by the current authored library in `@together/content`; no runtime TypeScript references used the sample directory.

The default-branch merge also removes five previously deleted legacy JavaScript files: `shared/constants.js`, `shared/eventTypes.js`, `shared/index.js`, `shared/utils.js` and `shared/utils.test.js`. Current implementations and tests are under `shared/src/`.

Current migrations, test suites and useful design history are preserved. Removed files remain recoverable from Git history. The continuation instructions now point to the integrated default branch.

## Verification and publication
Final merged `pnpm verify` passed: 125 shared tests, 8 content tests, 119 client Vitest tests, 10 client Node tests, 30 server tests and 196 pure verification checks. Type checks, lint (one existing hook warning), content/repository validation and production build passed. Browser acceptance: 5 of 6 checks passed. Six-player Friends startup fails because a later world remains on Preparing Amaya Bay beyond 30 seconds. Publication is pending this regression; the integration is saved locally. Evidence logs: `.art-review/default-merge-verification.log` and `.art-review/default-merge-browser-native.log`.

The initial household browser run timed out while software graphics rendered below 1 FPS and socket heartbeats timed out. Windows Playwright now explicitly uses the native D3D11 graphics path, matching the successful earlier hardware-backed visual tests; Linux keeps its existing launch defaults. Native two-context Couple, solo playable world and all three onboarding/recovery tests passed. Six-context startup also failed with explicit tab focus and at 960x540; these unsuccessful harness experiments were removed. The underlying cause remains unconfirmed. Additional evidence: .art-review/default-merge-six-player-focused.log and .art-review/default-merge-six-player-960.log.

Pre-merge media/performance samples belong to their recorded checkpoints; merged world performance and physical WebGPU/hosted Supabase/TURN acceptance remain distinct release gates.
