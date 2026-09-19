# Together V1 — Known Limitations

This file is intentionally explicit. The current build is a large coherent implementation/handoff, but it is not honest to call it finished release-quality V1.

## Verification coverage that is still missing

Connected GitHub Actions now performs the authoritative Node 24 + frozen pnpm install, full typecheck/lint/test/content/repository/build gate, Chromium installation, and a real client+server playable-frame Playwright test. The verified baseline is recorded in `docs/VERIFICATION.md`.

Current verification limitations are therefore no longer dependency-install blockers. What remains unverified is primarily real-device/release acceptance:

- real WebGPU E2E across the supported desktop browser/GPU matrix;
- Medium 1080p performance on target hardware;
- full controller/UI matrix;
- two-browser Couple and 2–6 player Friends soak/reconnect/latency testing;
- production Supabase/RLS/private Memory storage;
- production TURN voice traversal;
- final production-art/audio/LOD/compression behavior.

The CI browser gate intentionally uses explicit WebGL2 compatibility mode because GitHub's headless virtual GPU is not a trustworthy WebGPU target. Normal application startup remains WebGPU-first and has automated renderer-selection coverage.

## Visual/asset quality

- Primary environment, property, furniture and character visuals are original procedural/development geometry, not final production GLBs.
- Hero routes therefore do not yet satisfy the PRD's final "no placeholder/blockout art" release bar.
- The current procedural avatar validates scale, embodiment, identity/palette, remote synchronization and micro-motion hooks, but is not the final high-quality humanoid rig.
- First-person hand/body interaction does not yet use production IK/animation clips.
- Mirrors/reflections do not yet provide a finished full-avatar production reflection solution.
- Wetness/rain is system-level and visually readable but lacks final runoff, footprint and reflection artistry.

## World/NPC simulation

- Amaya Bay has the full semantic 900m-class layout, seven districts, 28 subareas, streamed chunk architecture and a shared world-space road/path/promenade network, but final production-grade road/terrain art is still development-level.
- Ambient NPCs use deterministic local movement/update tiers and two dynamic instanced render batches; a fully baked per-chunk navmesh, batched path service and authored door/interior traversal network are not finished.
- Named NPC schedule/memory/dialogue state is implemented; animation/facial/gaze production polish is not.
- Public other-household street presence is intentionally not V1-critical and is not implemented.

## Home/micro-actions

- Five starter property shells, persistent customization, furniture ownership and moving/renovation logic are implemented.
- Property interiors are development shells rather than final art-complete authored interiors.
- Chores/cooking use real multi-step action/state sequences, but physical object manipulation is represented through procedural avatar action hooks rather than final IK-contact animation for every utensil/object.
- The furniture catalog has 92 stable definitions; production models are missing for most entries.

## Jobs/leisure

- Job and leisure sessions are server-authoritative and require authored step progression.
- Their current physical presentations are intentionally lightweight and rely on development geometry/micro-animation hooks.
- They need final props, NPC/customer animation, SFX and activity-specific tactile polish before release.

## Story/Memory

- 36 data-driven stories meet the current shared/Couple/Friends breadth target.
- Narrative presentation is a restrained situation/task surface, not fully authored cinematic staging.
- Manual and activity/story-based automatic Memories work architecturally. Automatic framing uses rule/scoring foundations but has not been extensively playtested for composition quality.
- Share export is client-side and needs design/compatibility testing across supported browsers.

## Voice

- WebRTC peer signaling, modes, mute/PTT and proximity-distance hooks are implemented.
- No TURN credentials were available, so production NAT traversal has not been verified.
- 2–6 person peer mesh needs real-device soak testing before release.

## Performance

- Frame/draw-call/triangle/chunk metrics exist, streaming is implemented, structural dressing/vegetation are statically batched, ambient walkers are instanced, and quality tiers change pixel ratio/shadows/far residency without changing gameplay collision.
- The PRD's 60fps Medium target on Iris Xe-class hardware has **not** been measured in this environment.
- No authoritative GPU-memory benchmark has been run.
- Final asset compression/LOD tuning cannot be completed until production assets exist.

## Accessibility/browser matrix

- FOV, head bob, reduced motion, UI scale, high-contrast prompts, subtitles, master volume, keyboard remapping and controller foundations exist.
- Full controller usability across every UI panel needs real-device testing.
- The WebGL2 Chromium playable-frame CI gate is green, but the real WebGPU/WebGL2/browser matrix remains outstanding.

## Authentication/security/production infrastructure

- Supabase-oriented adapters and server-authoritative permission boundaries exist.
- Production Supabase RLS/storage configuration must be verified against a real project.
- No production Redis adapter is required for single-instance V1 and none is wired; horizontal scaling would require Socket.IO coordination.
- Rate-limiting/production observability coverage is not yet at the full PRD release target.

## Debug tooling

The build includes performance/debug foundations but not every PRD-requested editor/viewer surface. Missing or incomplete developer UI includes full navmesh viewer, collider viewer, audio-zone viewer, light-count inspector, packet-loss simulator UI and comprehensive hidden-state/NPC-state editors.

## V3.1 technical-direction supersession

As of 2026-09-15, `docs/PRD.md` V3.1 is the authoritative product and technical direction. Together V1 remains a browser-only TypeScript/Three.js product: WebGPU-first via `three/webgpu`, with WebGL2 compatibility fallback, Rapier, React for application UI only, Socket.IO, and the existing server/shared/content architecture. Core Amaya Bay art is code-authored, compiled once into shared immutable runtime assets, then rendered through measured merging, instancing, LOD, and streaming. Blender/Maya/hand-authored GLB/KTX2 exports are optional future inputs only and are not a V1 production dependency. Medium is the normal supported-desktop baseline; Low is a complete fallback. Hardware FPS claims remain unverified until a real browser profile is recorded.
