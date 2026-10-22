# Together implementation audit — October 9, 2026

This continues the October 8 checkpoint and preserves the existing uncommitted work. The user requested solo execution on October 9; no further agent work is being dispatched. No commit, push or deployment has been performed.

## Integrated behavior

- Six-hole mini-golf has canonical world greens, terrain-aware rolling trajectories, rails, cup capture, aim/power controls, strokes, alternating turns and round progression. World presentation follows accepted shots and does not replay them after reload.
- Badminton has a leveled court and open net, serve/return trajectories, timed reach, legal low shots that can strike the net, boundary faults, points, a reachable NPC opponent and a two-person roster. NPC service waits for the player's next-rally action, allowing deliberate finish/cancellation.
- Sports and the illustrated pairs game use authenticated commands, participant checks, bounded exact-request receipts and repository revision compare-and-swap. Legacy active checklists upgrade explicitly; generic step requests cannot complete these games. Household observers may watch started rounds.
- The card game persists its shuffled twelve-card deck, two-card attempts, mismatches, explicit continuation, six matched pairs and turns. All starter homes expose a card table separately from home planning. A reachability regression covers those homes.
- NPCs use cached distance-based routes and smooth yaw independent of viewer distance. Rapier capsule checks prevent crossing fixed obstacles. Full rerouting, local crowd avoidance, indoor links and weather shelter remain open.
- Fare retries retain the original command key and origin; dismissing the panel prevents a late reply starting a ride. Local fare debit/receipt is atomic. Hosted migration 015 provides the transactional counterpart; it has not been run on a hosted database.
- Original procedural district/weather ambience and activity effects have cached buffers, bounded voices, immediate mute, suspension handling and disposal. Automated checks do not establish listening acceptance.

## Verification in progress

The initial October 9 full run captured the new card reachability test before its studio integration was finished; it failed because the studio lacked a board interaction. The completed focused four-test property suite subsequently passed. A fresh full gate is running on the frozen candidate in `.art-review/production-readiness-2026-10-09-complete-verify-recheck.log`. Results will be recorded after the command exits.

Earlier sports browser evidence includes completed six-hole golf with a miss, lost reply and reload, plus two-household-browser golf turns and a badminton rally. Solo NPC return failed in that candidate and prompted stable Return controls and manual next-rally service. Those fixes, card-game completion and rendered panel/camera corrections still require fresh browser evidence. Earlier successful checks do not certify the latest source.

## Deployment preparation and open acceptance

The production runbook documents activity CAS migration 014 and atomic transit migration 015, service-role permissions, concurrency/retry checks and mixed-version cutover/rollback constraints. Compose configuration passed with the checked-in example environment. Docker Desktop's Linux engine was unavailable; image builds and runtime/container acceptance remain open.

Hosted migration execution, RPC concurrency/permissions, authentication/RLS, private Memory objects, TURN across separate networks, restart/restore and backup acceptance remain unverified. Other wallet writers still need an audit for concurrent whole-household replacement. No hosted credentials or physical-device acceptance are inferred from local tests.

The complete PRD is not finished: picnic/food placement and sharing, cafe interactions, photography activity integration, persistent rental/safety state, road-following auto journeys, fully shared kayak behavior, final humanoid appearance/actions and artistic audio acceptance remain open. Current avatar geometry remains explicitly development art. Device/controller performance, streaming hitches and sustained resource behavior require fresh measurements. No AAA or production-ready claim is made.
