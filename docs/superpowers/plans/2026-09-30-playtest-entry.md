# Together Playtest Entry Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task in the current workspace. User authorized direct execution and incremental GitHub pushes.

**Goal:** Deliver a custom, understandable entry and first session with better surfaces and reliable browser controls, and publish verified milestones.

**Architecture:** Preserve existing React entry APIs and Three/Rapier gameplay. Isolate tutorial state as a tested pure model, report real actions from the engine, and render a compact React guide. Retain shared procedural texture ownership.

**Tech Stack:** React, TypeScript, Three.js, Rapier, Vitest, Playwright, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-30-playtest-entry-design.md`.

## Global constraints
- Browser only; WebGPU preferred, WebGL2 usable. Existing world and household rules retained.
- Preserve user changes. Push only a codex branch, without force or merge.
- No percentage or production-quality/performance claim without evidence.
- Guide optional, resumable, accessible; input neutral while menus/focus loss.
- Local runtime state, secrets and generated review media excluded from Git.

## Review focus
- Returning identity/household must not be lost or duplicate a session.
- Dialogs and browser focus changes must not retain movement or cursor capture.
- Walking against a wall or pressing E without a target must not complete lessons.
- Gaze must rotate about the neck with safe angles and stable frame-rate smoothing.
- Tutorial should fit small windows and not obscure central interactions.

## Task 1 — Preserve and publish current progress
- [ ] Inspect status/remote and exclude runtime state; create `codex/playtest-polish-2026-09-30`.
- [ ] Run repository verification and review staged source/document changes.
- [ ] Commit coherent current world checkpoint; push new branch and inspect result.

## Task 2 — Custom entry
Files: `client/src/App.tsx`, `client/src/ui/entry/CoastalArrival.tsx`, `client/src/ui/entry/arrival.css`.
- [ ] Implement original coastal SVG composition and responsive split entry layout, step indicators and control cards.
- [ ] Preserve Display name, Continue, solo/household/invite actions and retry errors; put solo first and use human copy.
- [ ] Verify fresh and returning entry paths in the browser; save screenshot.

## Task 3 — Playable first-session guide
Files: `client/src/game/core/FirstSession.ts`, test; `GameEngine.ts`, `GameCanvas.tsx`, `ui/game/FirstSessionGuide.tsx`.
Interface: `FirstSessionAction = 'look' | 'walk' | 'interact'`; engine optional `onFirstSessionAction(action)` callback; model `advanceFirstSession(completed, action)` preserves unique observed actions.
- [ ] Write/run failing tests for ordered next lesson, unique actions, skip/resume state and no invented completion.
- [ ] Implement actual look accumulation, displacement-only walking (>1.5 m), successful-target interaction events and persistent optional UI with map action/replay.
- [ ] Run tests and browser guide action assertions; commit verified entry/tutorial milestone and push.

## Task 4 — Reliable look and gaze
Files: `InputManager.ts/test.ts`, `PlayerAvatar.ts`, `CameraController.ts`, `player/gazeMath.ts/test.ts`.
- [ ] Write/run failing tests for drag look, neutral input on blur, and constrained shortest-angle gaze.
- [ ] Add canvas drag fallback and graceful pointer-lock rejection, clear held input on blur, neck pivot and damped head gaze; retain normal camera/control settings.
- [ ] Verify menu input gating and actual pointer/drag movement in browser; run tests/typecheck.

## Task 5 — Surface identity
Files: `SurfaceTextures.ts`, `MaterialLibrary.ts`.
- [ ] Generate distinct seamless grass/asphalt/plaster/wood/paving maps and assign stable shared materials with matching repeat/roughness.
- [ ] Inspect close player-height surfaces in daylight/evening; verify no extra per-frame texture work or disposed shared maps.

## Task 6 — Verification and evidence
- [ ] Run `pnpm verify`, new entry/guide browser test and targeted world capture. Save screenshots and state report.
- [ ] Independent whole-change review; fix Important/Critical findings with regression proof, record minor items.
- [ ] Commit verified control/texture changes, push branch and verify remote commit. Update state/progress with exact unfinished release work.
