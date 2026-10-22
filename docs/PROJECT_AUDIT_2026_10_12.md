# Together implementation audit — October 12, 2026

The requested GPT-6.1 Sol coordinator and two GPT-6 Luna workers resumed the saved changes. Existing uncommitted work is preserved. No commit, push or deployment has been performed.

## Integrated candidate

Picnic and café visits now use persistent commands instead of checklist advancement. Guests arrange a mat and items, bring and serve portions, choose seats, order and serve drinks, and consume their own served portions. Completion is deliberate and open-ended. Server authority uses household membership, exact command receipts and revision compare-and-swap; late joins preserve existing arrangements and append the guest roster. Models cap items, portions and orders to bound state and scene work.

Native avatars retain selected face, hair, facial hair and glasses in local and remote appearance mapping. The saved extension includes fingers, blink and social-expression motion, plus outfit context geometry. These remain procedural development art pending rendered acceptance. Final context propagation and focused verification are in progress.

Participant names are being delivered from network profiles into React state through an engine callback, avoiding render-time ref access and raw participant IDs in picnic/café controls.

## Verification

The preliminary installed-toolchain gate in `.art-review/production-readiness-2026-10-12-integrated-verify.log` passed builds of shared/content, all four typechecks, lint with zero errors, 164 shared checks, eight content checks and 49 server checks. It stopped at the client suite: 301 passed and ten failed. Eight failures involved legacy picnic checklist fixtures reaching the new upgrade route; two presentation failures involved stale-revision handling and a direct-child count that excluded nested chair meshes. Corrections and focused retesting are in progress. These counts do not certify the final candidate. A frozen complete gate and browser scenarios for sports, cards, photography, solo leisure recovery and two-browser food sharing remain required.

The corrected frozen candidate passed all verification stages across `.art-review/production-readiness-2026-10-12-frozen-verify-recheck.log` and `.art-review/production-readiness-2026-10-12-remaining-verify.log`: 164 shared, eight content, 49 server, 315 client, 48 camera/player and 236 pure checks (820 total). All four typechecks and lint passed with zero errors; content/repository validation, server build, migration artifacts and Vite production build passed. The first frozen attempt found a panel fixture using the noncanonical `cafe` activity ID; the recheck reached two legacy pure-fixture expectations. Only those test fixtures changed before the remaining stages resumed; production source stayed frozen. Five lifecycle warnings and the existing bundle-size warning remain.

Focused integration passed 21 checks, including authoritative picnic lost-reply/dismissal recovery. Café world bounds reproduced cups 3.5 cm inside the planar tabletop; cup/liquid heights now derive from the tabletop and the contact regression passes. A read-only integration review found no reproducible correctness blocker. The nine-scenario browser run is now in progress in `.art-review/production-readiness-2026-10-12-gameplay-browser.log`; automated unit/build results do not establish rendered or full-PRD acceptance.

That browser run finished with eight passes and one failure. Cards, solo and shared picnic, café lost-reply/reload, ordinary third-person movement, real photography, six-hole golf and solo NPC badminton passed. The human badminton return did not reach the server; its trace showed about 800 ms of pointer action latency after the contact cue. The fixture now focuses the visible Return control before contact and activates it with Enter. This remains real control input, with no injected gameplay state.

Rendered inspection found actual defects despite the functional passes: first-person head hiding remained active during external picnic/sports views, and the café camera and chairs overlapped the authored façade. The café arrangement moved to `(-36.5, 60)` and its camera to an open street view; activity views reveal the complete local avatar and restore the selected mode on close. Focused geometry/visibility checks passed. A broader disposal test then caught restoration when no activity owned the view; the ownership guard was corrected and five focused camera/physics checks passed. Revalidation and fresh browser captures are pending in the camera recheck and final gameplay logs. Earlier captures are preserved under `.art-review/2026-10-12-gameplay-before-visual-fix`.

The camera-corrected checkpoint passed all remaining verification stages in `.art-review/production-readiness-2026-10-12-camera-verify-recheck.log`, with 318 client tests and 823 total checks across the unchanged shared/server and corrected client candidate. Production builds passed. The final browser run passed **nine of nine** in 3.5 minutes (`.art-review/production-readiness-2026-10-12-gameplay-browser-final.log`), including the human rally using the visible Return control. Fresh picnic/café captures were inspected: the complete player is visible and the table, chairs and cup are unobstructed outside the storefront. The activity header stays visible while scrolling and food/order text has readable separation. Evidence is preserved under `.art-review/2026-10-12-verified-leisure`.

The user's further continuation starts the next rental ownership and safety slice. That new work is not covered by this completed checkpoint until separately integrated and verified. These functional browser captures are not target-hardware performance measurements or final artistic acceptance.

## Open scope

Leisure arrangements are saved on the server and rendered while their activity view is open. Ambient world hydration after closing, carry-bag inventory, seated shared avatar interaction and complete physical food handling remain open. Rental ownership and safety, road-following auto journeys, shared kayak behavior, full NPC navigation and final art/audio acceptance remain unfinished.

Hosted migrations, auth/RLS/private storage, RPC concurrency/permissions, TURN across networks, backup/restart/restore and Docker runtime acceptance remain unverified. Target-device performance, controller behavior and sustained resource measurements remain open. No full-PRD or production-readiness claim is made.
