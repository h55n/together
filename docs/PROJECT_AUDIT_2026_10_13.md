# Together wrap-up audit — October 13, 2026

The user requested a wrap-up and a continuously updated `HANDOFF.md`. The live handoff now supersedes its older historical sections. Existing dirty work is preserved; no commit, push, deployment or hosted migration execution occurred.

## Rental checkpoint

Actor-owned bicycle and kayak rentals persist in activity JSON with exact receipts and revision CAS. Kayaks require first-time safety acknowledgement; trusted saved household history carries it into later outings. Reload/resume retains the rental identity. Returns remain possible before acknowledging an unused kayak intro. No unprovided fee was invented.

Two independent services renting different outing rows reproduced duplicate ownership. Local atomic CAS now rejects the cross-row collision; prepared migration 016 provides parent-household locking and the hosted check. Socket mode validation uses a single-instance cache warmed from saved ownership and updated after accepted commands. Hosted migration execution and cross-process invalidation are unverified.

Request recovery preserves unknown outcomes, resolves an original pending command before a different requested action, and uses a new key/revision for a confirmed rejected stale return only after authoritative reconciliation. Focused regressions cover both failure cases. Native safety equipment attaches to the actual avatar and releases reparented groups with its geometry/material ownership.

## Evidence

- Complete installed-toolchain gate: **849 checks** (172 shared, eight content, 54 server, 318 client, 53 camera/player, 244 pure), all four typechecks, lint with zero errors/four existing warnings, content/repository validation, migration artifacts and production builds passed. Log: `.art-review/production-readiness-2026-10-12-rental-verify.log`.
- Four rental browser scenarios passed across the initial run and corrected recheck: real bicycle/kayak movement and owned return; waterline/steering/rest; checked-out reload/resume, lost return and retained first-time safety; unknown accepted departure followed by requested return. Logs: `.art-review/production-readiness-2026-10-13-rental-browser.log` and `...-rental-browser-recheck.log`.
- The initial fourth scenario failed because its HTTP observer could select an older completed session from a list. The observer now retains the newer creation time and monotonic revisions; production source did not change for the recheck.
- Actual kayak/safety captures were inspected and preserved under `.art-review/2026-10-13-rental-first-browser` and `.art-review/2026-10-13-rental-recovery-verified`. Front jacket geometry is visible; rear pads partly overlap the outdoor garment and need final art fitting. Captures are not final-art or target-hardware certification.
- Previous leisure/avatar checkpoint remains recorded separately: 823 automated checks and nine browser scenarios. Its inspected captures are preserved under `.art-review/2026-10-12-verified-leisure`.

## Handoff and remaining work

The browser runner has exited; workers are idle. `HANDOFF.md` records current branch/HEAD, dirty-tree preservation, file ownership, exact commands/logs, implementation status and what to do next. The production runbook now includes migration 016 and rental concurrency/permission/recovery acceptance.

Full PRD and production readiness remain open: hosted auth/RLS/private storage/RPC migrations, TURN across networks, restart/backup/restore, Docker runtime, multi-instance socket invalidation, rental hours/server weather, cache history soak, ambient leisure hydration, carry inventory/shared seated handling, scooter/basket/shared hull, road-following auto journeys, complete NPC navigation and final device/performance/art/audio acceptance. No further feature slice is being started during this wrap-up.

## Continued build — trusted kayak conditions (October 13)
The user resumed remaining PRD implementation after handoff consolidation. Canonical Kayak Cove hours (08:00–18:30) and dangerous-weather checks now gate server hire/departure. Return/safety acknowledgement and exact accepted retries remain usable after closure. Cycling has no invented schedule. Regression coverage includes boundary minutes, safe rain, storm/monsoon, invalid time and owned returns/recovery.

A new validated server-owned WorldWeatherService supplies both the activity provider and initial/periodic socket broadcasts. Connected clients consume valid weather and city-clock messages; the visible clock previously did not use server time synchronization. The rental panel displays catalog hours and return availability. No natural seasonal/weather scheduler exists yet: server weather starts clear until server-owned logic changes it.

Fresh installed-tool full gate passed 855 checks (172 shared + 8 content + 58 server + 320 client + 53 camera/player + 244 pure), all four typechecks, zero lint errors/four existing warnings, validation, migration packaging and production builds. Evidence: `.art-review/production-readiness-2026-10-13-rental-conditions-final-verify.log`. Preliminary restricted run hit seven localhost EACCES integration failures; the fresh localhost-enabled run passed. Four rental browser flows are running; results pending. No hosted schema, commit, push or deployment.

Rental browser result: all four scenarios passed in one clean run (1.6 minutes), exit 0; evidence `.art-review/production-readiness-2026-10-13-rental-conditions-browser.log`, preserved captures `.art-review/2026-10-13-verified-rental-conditions`. Development runner/servers exited. Latest verified candidate is 855 checks + four rental browser flows. Earlier pending statements in this continuation are superseded by this result; full PRD, natural weather progression and hosted/device release gates remain open.
