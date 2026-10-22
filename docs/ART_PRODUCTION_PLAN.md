# Together — Art Production Plan (painted-anime look)

Goal: take Amaya Bay from code-built low-poly to the hand-painted look of the four reference clips
(Paper Route lane, Natsu no Michi, Ghibli lane, Marine Drive sunset). This plan splits the work between
**you (create art assets)** and **me (integrate, light, grade, optimise, polish)**.

The reference comparison sheets are in `.art-review/reference-vs-game/` (local, ignored by git). The shortfall is
not lighting or colour any more. It is **painted surface detail and hand-modelled shapes**, which code cannot invent.

---

## 1. What stays code-driven (me) and what needs authored art (you)

| Area | Already good in code | Needs authored art |
| --- | --- | --- |
| Sky, clouds, sun, haze, hills | yes — painted gradients, bloom, grade | optional: hand-painted sky dome texture |
| Weather, lighting, shadows, post-process | yes (WebGL2 + WebGPU) | — |
| Grass, flowers, wind | yes (instanced) | optional: painted grass card textures |
| Characters (player + townsfolk) | rig/animation hooks exist | **modelled, textured, skinned characters** |
| Houses, shops, café, civic buildings | pastel colours, roofs, fences | **hand-modelled hero buildings + painted facade textures** |
| Trees, shrubs, street props | simple canopies | **painted tree/shrub/prop models** |
| Furniture (92 IDs), food, vehicles | simple boxes | **models for stable content IDs** |
| UI, audio | functional | optional painted UI paper textures; sound library |

---

## 2. Tools to install (once)

Everything below is free except where noted.

1. **Blender 4.x** — modelling, rigging, baking. Install: `winget install BlenderFoundation.Blender`.
2. **Krita** (or Photoshop/Procreate) — hand-painting textures. Install: `winget install KDE.Krita`.
3. **Node tooling for export optimisation** (I will add these to the repo, you do not install them):
   `gltf-transform` (Meshopt + KTX2 compression) and a GLB validator.
4. **Optional AI helpers** (be careful with licences, keep the source/licence note next to every file):
   Meshy / Tripo (image-to-3D drafts), Stable Diffusion/Krita AI (texture paint-overs). Treat outputs as
   *drafts* that you clean in Blender; raw AI meshes are usually too dense and badly UV'd for this game.
5. **Git LFS is not needed**: runtime exports are small (see budgets). Keep `.blend` sources in your art Drive,
   not in this repo.

---

## 3. Style bible (decide once, then everything follows)

Pick these on day 1 and write them in `docs/ART_STYLE_BIBLE.md` (I will add the file once you decide):

- **Shape language:** soft, slightly exaggerated, rounded houses with pitched roofs and deep eaves.
- **Surfaces:** hand-painted textures with visible brush strokes, no photoreal PBR. Baked soft shadow/AO in
  the texture, plus flat-shaded lighting from the engine.
- **Palette:** use the references. Suggested anchors: sky `#3f86d0`, warm sunset `#ffa868`, mint `#b7dcc0`,
  butter `#f3d98e`, rose `#ecb5a5`, tile red `#c4513c`, brick `#b88470`, deep foliage `#1f5a3a`.
- **Outlines:** none on meshes (the engine grade adds the painted finish). If you want ink outlines, tell me
  and I will add an inverted-hull outline pass.
- **Scale:** 1 Blender unit = 1 metre. Adult eye height 1.64 m. Door 2.1 m. Storey 3.05 m.

---

## 4. Asset pipeline you follow for every asset

1. Model in Blender at 1 unit = 1 m, +Y up when exporting (Blender's glTF exporter handles this).
2. Name objects with the **stable IDs** in section 6 so the game can find them.
3. UV unwrap, paint textures in Krita (1024² for props, 2048² for heroes, 4096² only for the player).
4. Export **GLB** (glTF 2.0) with: Apply Modifiers, +Y Up, Materials, Tangents off, Draco off (I compress later).
5. Save under `client/public/assets/models/<family>/<id>.glb` (folders already created).
6. Drop a licence/source note next to it: `<id>.source.md` ("made by X in Blender, textures hand-painted").
7. Tell me which IDs you added. I wire them in, profile, and push to `main`.

### Budgets (triangles, runtime)
- Player/townsperson LOD0 20–35k (far LOD 4k); props 200–3k; furniture 1–8k; houses 8–25k LOD0; trees 3–8k.
- Whole-scene target on Medium quality: under 600 draw calls and 2 M triangles in view (we are at ~400 draws).

---

## 5. Phases (build order = biggest visible win first)

### Phase 0 — Pipeline (me, ~1 day) — *I do this first*
- Asset manifest (`client/src/game/assets/manifest.ts`) mapping stable ID → GLB path, LOD and fallback.
- Loader hook so every system uses the GLB when present and **keeps the current procedural model as fallback**
  (so the game never breaks while art is half done).
- Export optimiser script (Meshopt + KTX2) and a validation check in the gate.
- Folders + README in `client/public/assets/` (done in this commit).

### Phase 1 — The player and townsfolk character (you, 2–4 weeks) — *biggest single upgrade*
Deliverables:
- `characters/body_average.glb`, `body_slim.glb`, `body_broad.glb` (one rig, three body frames).
- Heads: `face_01..03.glb`, hair `hair_01..04.glb`, facial hair, glasses (modular attachment sockets).
- Outfits: `outfit_home_*`, `outfit_outdoor_*` (terracotta, blue, sage, mustard), `outfit_sleep_*`, 4 job uniforms.
- Common humanoid skeleton with named bones (`hips, spine, chest, neck, head, shoulder.L/R, upper_arm, forearm,
  hand, thigh, shin, foot`) and **finger bones**.
- Animation clips (names in `docs/ASSET_REQUIREMENTS.md`): idle, walk, jog, sit, wave, point, carry, cook,
  wipe, cycle, scooter, kayak. Start with idle/walk/jog/sit; I keep the procedural fallback for the rest.
- 5–8 ambient townsfolk variants (shared rig, different outfits/skin/hair) so crowds stop looking identical.

My side: skin the avatar loader to GLB, retarget gaze/blink/hand IK sockets, shader-based limb swing is
replaced by real clips, colour variants through material parameters, LODs, crowd instancing.

### Phase 2 — Hero buildings (you, 3–6 weeks)
Order of impact: **Café Roshan frontage → Rain Tree Lane houses (3 styles) → Mogra Court blocks → shop row
→ Bay Steps rental huts/pier → civic (library, hall) → Hill Garden tea hut.**
Each: LOD0/1/2, painted facade atlas, windows with interior depth card, awnings, balconies, signs as
separate meshes (I keep the sign atlas), roof with eaves, door sockets named `door_main`.
My side: replace `NeighborhoodDressing`/`HeroStreet` proxies, keep colliders, keep per-lot colour variation
through a tint mask channel, bake lightmaps if wanted.

### Phase 3 — Vegetation and props (you, 2–3 weeks)
- 5 tree species (rain tree, gulmohar, palm, ficus, ornamental), near/mid/far.
- Shrubs: bougainvillea, hedge, jasmine-like, tropical broadleaf; grass clump cards and flower cards.
- Street props: bench, lamp, bin, bollard, bicycle, planter, signboards, utility pole with insulators.
- Promenade: tetrapod rocks (sea wall) — the Marine Drive reference relies on these.
My side: instancing, wind shader on your vertex colours, density/LOD.

### Phase 4 — Interiors and furniture (you, 3–5 weeks)
- Starter-home shells with painted wall/floor textures; kitchen set; bed, sofa, table, shelves, lamps (92 IDs,
  start with the ~25 in the starter home and shop).
- Food/cookware: chai, sandwiches, samosas, idli, mango, kettle, plates, cups.
My side: map stable IDs to GLBs, interaction sockets, collision proxies, placement/ghost preview.

### Phase 5 — Vehicles and leisure (you, 1–2 weeks)
Bicycle + basket, scooter + helmet, auto-rickshaw, kayak + paddle, rackets/shuttle, picnic mat/bag, golf
props, camera prop.

### Phase 6 — Painted sky/water/UI finish (shared, 1–2 weeks)
- Painted sky dome and cloud sprite sheet (you); water normal/foam textures and shoreline foam (you or me).
- UI paper textures (you); audio library or commissioned pack (you).

### Phase 7 — Polish and acceptance (me, continuous)
Lighting retune per asset, LOD/streaming profiling, WebGPU parity, 60 fps budgets, side-by-side comparison
against the reference clips after each phase, regression tests.

---

## 6. Stable IDs to name your files after

- Characters: `body_average|slim|broad`, `face_01..03`, `hair_01..04`, `beard_short`, `glasses_round`.
- Buildings: `bldg_cafe_roshan`, `bldg_shop_row`, `bldg_mogra_block_a..c`, `bldg_rain_tree_home_a..c`,
  `bldg_pg_veranda`, `bldg_hill_terrace`, `bldg_cycle_hut`, `bldg_kayak_hut`, `bldg_library`, `bldg_community_hall`.
- Vegetation: `tree_rain`, `tree_gulmohar`, `tree_palm`, `tree_ficus`, `tree_ornamental`, `shrub_bougainvillea`,
  `shrub_hedge`, `grass_clump`, `flowers_mix`.
- Props: `prop_bench`, `prop_lamp`, `prop_bin`, `prop_planter`, `prop_pole`, `prop_tetrapod`, `prop_bicycle`.
- Furniture: the catalogue IDs in `shared/src/home/furniture.ts` (e.g. `lamp_floor_01`, `lamp_table_01`).
- Vehicles: `veh_bicycle`, `veh_scooter`, `veh_auto_rickshaw`, `veh_kayak`.

---

## 7. How we will judge "pixel-perfect"

After each phase I will regenerate the review captures and the **reference-vs-game comparison sheets**, then
we compare four things per reference clip: silhouette, palette, surface detail, lighting mood. A phase is
accepted when you sign it off against the sheet. The art-review test (`client/e2e/world-art-review.spec.ts`)
already captures nine fixed viewpoints, so before/after is directly comparable.

---

## 8. Parallel external work (not art, but needed for a release)

These still require your accounts or devices and are independent of the art plan:
hosted Supabase migrations 014–016, TURN voice across networks, real-device/performance testing, Docker/HTTPS
deployment, and a human check of the WebGPU townsfolk animation. See `HANDOFF.md` and `docs/PRODUCTION_RUNBOOK.md`.

---

## 9. Realistic timeline

If you build alone and part-time: Phase 1 (4 wk) → Phase 2 (6 wk) → Phase 3 (3 wk) → Phase 4 (5 wk) →
Phases 5–6 (3 wk) ≈ **5–6 months**. With a small team (one character artist, one environment artist,
one painter) in parallel: **8–10 weeks**. I can start Phase 0 immediately and stay ahead of you by
keeping the fallback proxies working at every step.
