# Together — current state and remaining game work

## Ready to try
The seven-district city, starter homes and interiors, transport, jobs/leisure, household economy, home decoration/growth, story/progression rules and memory/voice interfaces exist. Local browser entry and play work. These are implemented systems with automated coverage, not proof that every real-world combination works.

This pass adds an original illustrated coastal arrival, prominent solo exploration, readable controls, an optional first-day guide with saved progress, cursor/drag look, focus-safe input, constrained head gaze, distinct surface textures and clearer map/journal direction. Existing social and gameplay rules remain intact.

## How much remains
There is no reliable single percentage: implementation, production assets and release acceptance are different kinds of work. Five substantial workstreams remain:

1. **World production art:** richer building shapes, foregrounds, terrain/shore composition, props and interiors matching the supplied references. Current procedural assets are still development art.
2. **Character and atmosphere:** final humanoid models/rigs/clips/IK, NPC pathing/facial animation, district soundscapes and interaction audio.
3. **Comfort and performance:** cold chunk work split into bounded preparation, fewer draw submissions, sustained 1080p Medium/Low targets and the full continuous normal-speed route. Refreshed 960×540 Intel UHD/ANGLE samples were 37.1–60.0 FPS stationary and 41.6 FPS walking. Cold district loading p99 reached 1116.5 ms and the densest view reached 881 draw calls; smoothness targets are still unmet. These short automated samples are not 1080p acceptance.
4. **Gameplay polish:** player testing of story/job/task clarity, pacing, activity locations, progression and onboarding retention. First-day tasks now teach the basic controls; all progression and activities still need a complete playtest/balancing pass.
5. **Online release testing:** production Supabase/storage, TURN/voice, multiplayer/device/controller/accessibility matrix, physical WebGPU and mid-session recovery continuity, and soak/observability. The ordinary browser URL now automatically recovers to native WebGL2 when the preferred renderer fails on this machine.

## Test the current game
Open http://127.0.0.1:5188/ while the local preview and game service are running. Enter a name, choose solo exploration, then enter Amaya Bay. Click the world to look; drag is available if cursor capture is denied. W A S D walks, Shift jogs, E interacts, V switches view, Esc releases the cursor, M opens the map and J opens the story journal. The guide can be dismissed and replayed.

The local service uses an in-memory repository and needs `ALLOW_DEV_AUTH=true`; restarting it resets that local session data. A remembered household can be replaced by starting solo exploration again. This setup does not validate production persistence.

Graphics recovery rebuilds the local engine on a fresh canvas, preserving identity/household and guide progress. Mid-session position/time and transient local activity state can reset; seamless recovery still needs acceptance testing.

## GitHub
Work is published in verified milestones to `h55n/together`, branch `codex/playtest-polish-2026-09-30`. The world checkpoint is `ec4775c`; the onboarding/control/texture/recovery milestone is `309a724`. Both remote commits were verified. Generated media and local runtime state are excluded.

## Latest evidence — October 1
Full repository verification passed. All three arrival/guide/browser recovery tests passed, and the refreshed district capture passed in 2.1 minutes with no page errors. Local screenshots are in `.art-review/playtest-entry/` and `.art-review/current-world/`. The recording `.art-review/amaya-bay-playtest-2026-10-01.mp4` includes all seven district viewpoints, close surface views, rain/sunset and a 20-second walking sample. District transitions in this review use developer travel; it is not a continuous traversal of every street or venue.
