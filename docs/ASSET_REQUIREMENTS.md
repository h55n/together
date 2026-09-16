# Together V1 — Asset Requirements

The current build intentionally uses substantial procedural **development art** so systems/world scale can be implemented without pretending placeholder geometry is shipping art. This document defines the replacement path.

## Runtime format rules

- 3D: glTF 2.0 / GLB.
- Runtime textures: KTX2/Basis where useful.
- Geometry compression: Meshopt where appropriate.
- 1 world unit = 1 metre.
- Every production world asset needs bounds, LOD metadata, collision strategy, material slots and interaction sockets where relevant.
- Animation clips use the common humanoid rig and stable semantic names.

## Player character

Expected root family: `client/public/assets/models/characters/`

Need:

- high-quality stylized-realistic base humanoid body/body-frame variants;
- believable hands/feet/face suitable for both 78° first-person embodiment and 3–5m third-person viewing;
- skin/hair material variants;
- modular everyday Indian urban clothing sets for home/outdoor/sleep and four job uniforms;
- glasses/facial-hair/accessory options;
- head-mesh camera masking compatible with full-body shadows/reflections.

Suggested LOD budget per dressed character:

- LOD0: ~35k–60k triangles;
- LOD1: ~18k–30k;
- LOD2: ~7k–12k;
- far impostor/very-low representation beyond full animation range.

Need blendshapes/bones for subtle eyes, jaw/mouth and expressions. Avoid glossy/plastic skin.

## Character animation

Expected root: `client/public/assets/models/animations/`

Required authored clips/loops include:

- idle variants, walk, jog, turns, crouch;
- sit/stand/sleep;
- wave, point, laugh, nod, high-five, contextual hug;
- pickup/place/carry/hand-over/receive;
- scrub/wipe/wash/fold/water;
- cut/stir/pour/measure/serve/eat/drink;
- typing/work;
- bicycle, scooter, kayak;
- box packing/unpacking.

Clips should support root-motion metadata where useful and hand/stance/look sockets for IK. The current procedural micro-motion system remains useful as fallback/blending logic but is not the final animation library.

## Environment buildings

Expected root: `client/public/assets/models/environment/amaya/`

Hero production assets are needed for at least:

- Mogra Court starter residential blocks and all five home shells/exteriors;
- Café Roshan / Lantern Street hero mixed-use frontage;
- main market and furniture shop;
- Mogra Park pavilion/fountain/court furniture;
- Bay Steps promenade, rental hut, pier and waterfront details;
- Rain Tree Lane older homes, Ravi Repairs and Naina Nursery;
- The Common library/community hall/civic facades;
- Hill Garden tea hut and mini-golf structures.

Each hero building should supply LOD0/1/2 with facade depth, windows/curtains, balcony/rail, drain/service details, AC/exhaust, signs/awnings, plants/clutter and grounded building-base contact.

## Vegetation

Need five tree species with unique silhouette/branch/canopy logic:

- rain tree;
- gulmohar;
- palm;
- ficus;
- compact ornamental tree.

Each needs near/mid/far LOD and wind-ready hierarchy/material attributes.

Shrubs/ground assets:

- bougainvillea;
- jasmine-like flowering shrub;
- hedge;
- broadleaf tropical shrub;
- grass clumps;
- small flowers;
- fallen leaves;
- weeds/moss/wet-edge cards.

Avoid repeated spherical canopies.

## Home/furniture

The catalog currently contains 92 stable definitions. Production art should map stable IDs to GLBs rather than replacing IDs.

Typical budgets:

- tiny decor: 200–2k triangles;
- chairs/tables/lamps/plants: 1k–8k;
- sofa/bed/storage/appliances: 4k–20k;
- authored collision should be simpler than render geometry.

Need physically readable interaction sockets for seats, storage, sink/kitchen work, lamps and sentimental/moving items.

## Food/kitchen

Twenty recipes currently exist in data. Need recognizable ingredient and meal outcome models/materials for the initial recipe set, plus:

- cookware;
- plates/bowls/mugs;
- kettle/filter-coffee equipment;
- prep utensils/boards;
- steam/foam/spill/burnt variants.

## Transport/leisure

Need production assets for:

- city bicycle + basket variant;
- scooter + helmet;
- auto-rickshaw exterior/interior passenger framing;
- one/two-person kayak and paddle;
- badminton rackets/shuttle/net;
- picnic mat/bag/food props;
- mini-golf club/ball/course dressing;
- board/card game props;
- camera/phone photography prop.

## Audio

Current audio is primarily procedural/foundation-level. Production library is needed for:

- district ambience beds for all seven districts;
- sea/wind/birds/rain/monsoon/thunder layers;
- scooters/autos/bicycles/footsteps by material;
- café/market/nursery/repair-shop details;
- home fridge/fan/water/dishes/cloth/appliance/neighbour layers;
- micro-action SFX;
- sparse original music cues for arrival, morning, café work, home evening, Bay Steps golden hour, story resolutions, Memory Book and festival states.

Audio should be original/licensed with source/license metadata stored alongside assets.

## UI/Memory materials

Need subtle original/licensed textures for warm paper, tape, receipts, ticket stubs, pressed-leaf motifs and map snippets. These should remain restrained and readable rather than becoming a heavy scrapbook filter.

## Replacement instructions

1. Preserve existing stable content IDs.
2. Add final files under `client/public/assets/` using PRD naming conventions.
3. Register the asset in the client asset manifest when introduced.
4. Declare LOD/collision/socket metadata.
5. Replace procedural proxy creation only after the final asset is loaded/tested.
6. Run content/asset validation and profile Medium quality before removing the proxy fallback.
7. Never commit source Blender working files if their size/licensing makes the runtime repository unsuitable; store them in the art source repository/Drive and commit runtime exports only.

## V3.1 technical-direction supersession

As of 2026-09-15, `docs/PRD.md` V3.1 is the authoritative product and technical direction. Together V1 remains a browser-only TypeScript/Three.js product: WebGPU-first via `three/webgpu`, with WebGL2 compatibility fallback, Rapier, React for application UI only, Socket.IO, and the existing server/shared/content architecture. Core Amaya Bay art is code-authored, compiled once into shared immutable runtime assets, then rendered through measured merging, instancing, LOD, and streaming. Blender/Maya/hand-authored GLB/KTX2 exports are optional future inputs only and are not a V1 production dependency. Medium is the normal supported-desktop baseline; Low is a complete fallback. Hardware FPS claims remain unverified until a real browser profile is recorded.
