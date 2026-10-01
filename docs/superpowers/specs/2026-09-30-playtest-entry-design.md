# Together playtest entry and game presentation

## Intent
The user requests a clear state report, a custom game onboarding informed by other games, richer world textures, cursor-driven gaze, reliable browser playtesting, clearer tasks, and incremental GitHub pushes. Continue directly under this authorization; do not ask for plan approval again.

## Current state
Seven districts and the city/gameplay scaffolding exist. Homes, economy, jobs/leisure, stories, progression, decoration, memories and voice interfaces are implemented, with rule tests. Current assets remain procedural development art. Production humanoid animation, audio, navmesh, multiplayer/voice/persistence soak and physical-device performance remain unfinished. Latest verified 960×540 WebGL2 samples are 38–60 FPS stationary and approximately 40 FPS walking. Cold construction hitches remain. No defensible whole-game completion percentage exists.

## Research and direction
Minecraft Education teaches movement in a playable tutorial. Sea of Thieves Pirate Academy separates first steps and later lessons. Apply that pattern through a small first-session guide, contextual controls and a discoverable next activity; retain free exploration and skip/replay. Sources: https://education.minecraft.net/en-us/trainings/tutorial-1-movement and https://www.seaofthieves.com/pirate-academy/gettingstarted.

## Entry experience
Original illustrated coastal artwork, editorial Together wordmark, sea-glass/cream/terracotta palette, named steps and readable control hints. Keep existing identity, solo explorer and household/invite APIs. Preserve accessible labels and working actions. Solo exploration should be prominent. Returning players keep their saved identity and household. No fake loading progress or feature promises.

## First session
A compact optional guide teaches mouse look, actual walking and successful interaction, then offers a town map to discover activities. Completion persists locally per explorer and may be reset. Opening menus must release pointer lock and suspend movement. Controls must reset on blur so held movement cannot stick after focus changes. First-person look follows locked mouse; dragging on canvas is a fallback when lock is unavailable. Third-person head gaze follows camera pitch/yaw with constrained smoothing; the head rotates about its neck. Do not steer the camera from cursor movement over menus.

## Surfaces
Original deterministic seamless maps for grass, asphalt, plaster, wood and paving, differentiated colour/roughness and physical-scale repeats. Keep shared material ownership and mipmaps; no per-frame texture work, new network dependency or density reductions. These maps improve development art and do not constitute production asset completion.

## Acceptance and publishing
Observed regression failures/passes for controls and tutorial progression. Full type/lint/rule/build checks. Browser test with real hardware-backed ANGLE verifies fresh identity → solo → entry → look/walk guide, menus and canvas; capture welcome/world. Recheck existing district capture where scene changes justify it. Commit current coherent world progress to a codex branch first, then verified entry/control/texture milestones. Push that branch to origin without force or merging; exclude server runtime state, secrets and generated media. Record every push outcome and remaining release gates.
