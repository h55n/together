# Together V1 — Known Limitations

This file is intentionally explicit. The current build is a large coherent implementation/handoff, but it is not honest to call it finished release-quality V1.

## Environment verification blockers

The supplied execution environment has:

- Node 22.16.0, while the project requires Node 24 LTS;
- no installed pnpm executable;
- Corepack but no npm-registry DNS access, so it cannot fetch pnpm 12.4.1;
- a copied Windows-era `node_modules` tree missing Linux Rollup native optional dependencies;
- an older dependency set missing the declared ESLint TypeScript plugins, Express/Supertest declarations and current Drizzle package shape.

Consequences:

- `pnpm install`, `pnpm verify`, full Vite production build, full server TypeScript and Playwright cannot be honestly completed here;
- no trustworthy `pnpm-lock.yaml` can be generated offline;
- the first connected Node 24 machine must run `pnpm install`, commit the generated lockfile, then run the complete quality gate.

The independent sandbox-safe suite is green; see `docs/VERIFICATION.md`.

## Visual/asset quality

- Primary environment, property, furniture and character visuals are original procedural/development geometry, not final production GLBs.
- Hero routes therefore do not yet satisfy the PRD's final "no placeholder/blockout art" release bar.
- The current procedural avatar validates scale, embodiment, identity/palette, remote synchronization and micro-motion hooks, but is not the final high-quality humanoid rig.
- First-person hand/body interaction does not yet use production IK/animation clips.
- Mirrors/reflections do not yet provide a finished full-avatar production reflection solution.
- Wetness/rain is system-level and visually readable but lacks final runoff, footprint and reflection artistry.

## World/NPC simulation

- Amaya Bay has the full semantic 900m-class layout, seven districts, 28 subareas and streamed chunk architecture, but final hand-authored road/terrain meshes are still development-level.
- Ambient NPCs use deterministic local movement/update tiers; a fully baked per-chunk navmesh, batched path service and authored door/interior traversal network are not finished.
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

- Frame/draw-call/triangle/chunk metrics exist, streaming is implemented and quality tiers now change pixel ratio/shadows/far residency without changing gameplay collision.
- The PRD's 60fps Medium target on Iris Xe-class hardware has **not** been measured in this environment.
- No authoritative GPU-memory benchmark has been run.
- Final asset compression/LOD tuning cannot be completed until production assets exist.

## Accessibility/browser matrix

- FOV, head bob, reduced motion, UI scale, high-contrast prompts, subtitles, master volume, keyboard remapping and controller foundations exist.
- Full controller usability across every UI panel needs real-device testing.
- Browser/WebGPU/WebGL2 matrix testing remains outstanding.

## Authentication/security/production infrastructure

- Supabase-oriented adapters and server-authoritative permission boundaries exist.
- Production Supabase RLS/storage configuration must be verified against a real project.
- No production Redis adapter is required for single-instance V1 and none is wired; horizontal scaling would require Socket.IO coordination.
- Rate-limiting/production observability coverage is not yet at the full PRD release target.

## Debug tooling

The build includes performance/debug foundations but not every PRD-requested editor/viewer surface. Missing or incomplete developer UI includes full navmesh viewer, collider viewer, audio-zone viewer, light-count inspector, packet-loss simulator UI and comprehensive hidden-state/NPC-state editors.

## V3.1 technical-direction supersession

As of 2026-09-15, `docs/PRD.md` V3.1 is the authoritative product and technical direction. Together V1 remains a browser-only TypeScript/Three.js product: WebGPU-first via `three/webgpu`, with WebGL2 compatibility fallback, Rapier, React for application UI only, Socket.IO, and the existing server/shared/content architecture. Core Amaya Bay art is code-authored, compiled once into shared immutable runtime assets, then rendered through measured merging, instancing, LOD, and streaming. Blender/Maya/hand-authored GLB/KTX2 exports are optional future inputs only and are not a V1 production dependency. Medium is the normal supported-desktop baseline; Low is a complete fallback. Hardware FPS claims remain unverified until a real browser profile is recorded.
