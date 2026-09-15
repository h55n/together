# TOGETHER
## Product Requirements Document — V1 “Amaya Bay”
### Single Source of Truth

**Status:** Authoritative  
**Version:** 3.0  
**Date:** 2026-09-14  
**Product Type:** Browser-based multiplayer cozy life simulator  
**Primary Platform:** Desktop web  
**Rendering:** Three.js, WebGPU-first  
**Game Perspective:** Embodied first-person by default, switchable third-person  
**V1 City:** Amaya Bay  
**V1 Multiplayer:** Invite-only Couple and Friends households  
**V1 Scope Rule:** One complete city and one complete life loop before any second city, public matchmaking, or MMO-scale social layer.

---

# 0. DOCUMENT AUTHORITY

This document supersedes every previous Together PRD, Game Bible, World Systems specification, Story Event specification, asset manifest decision, continuation prompt, prototype assumption, and implementation note wherever they conflict with this file.

Previous documents remain useful as historical design input and content references, but they are not authoritative after this version.

The current V1 direction is:

> **Together is a calm, beautiful, persistent 3D life game where real people create a household, move into a living city, build a home, earn money, work gentle jobs, cook and clean with embodied interactions, explore together, spend time together, experience small life stories, and gradually create a shared history preserved in a Memory Book.**

The game is not trying to simulate every system in real life. It is trying to simulate the **feeling of living a life with someone**.

Every engineering, art, narrative, UI, audio, multiplayer, and economy decision must protect that feeling.

---

# 1. THE PRODUCT IN ONE PAGE

## 1.1 The fantasy

Two people in different cities open a browser.

They create characters that feel like themselves.

One creates a household and sends the other a short invite code.

They choose a modest apartment together in a beautiful coastal city called **Amaya Bay**. The apartment is functional but sparse. They have limited shared money, basic furniture, a small kitchen, and no obligation to rush.

They walk outside in first-person.

The city is alive: bicycles pass, an auto-rickshaw waits at a corner, café chairs are being set out, someone waters plants on a balcony, laundry moves in the breeze, a dog pulls its owner toward the park, the sea can be heard two lanes away, rainwater sits in a crack in the pavement after a morning shower.

They can go almost anywhere immediately.

They can walk to the market, sit beside the water, rent bicycles, drink coffee, visit a park, take a scooter, play badminton, picnic, watch the sunset, kayak, work a café shift, buy groceries, browse furniture, or simply go home.

They do not level up because a bar fills.

They progress because their life changes.

Their kitchen becomes nicer. Their shelves fill. Their plant grows. Their favourite café owner remembers them. Their shared wallet becomes healthier. Their apartment begins to look like them. A pipe bursts. Someone burns dinner. It rains for an evening. They move house months later and pack the objects they care about into boxes.

The game quietly photographs some of those moments.

Later, they open a Memory Book and discover that the game has been keeping their life.

That is Together.

## 1.2 Product promise

Together must simultaneously deliver three things:

1. **A world worth being inside.** The city must be calming, beautiful, believable, explorable, and alive enough that simply walking through it is pleasurable.
2. **A life worth playing.** Jobs, cooking, cleaning, shopping, decorating, travel, hobbies, events, NPC relationships, home improvement, and moving house must create meaningful long-term play without becoming grind.
3. **A relationship worth remembering.** The second player must never feel like another generic multiplayer avatar. Their presence must transform ordinary actions into shared experiences, and the Memory Book must turn those experiences into history.

If any one of these fails, V1 is not successful.

## 1.3 The V1 proof

V1 succeeds when two players can play for 20–30 minutes and naturally create a story such as:

> We left our apartment in the rain, cycled to the market, spent too much on a lamp, worked a café shift because we were short on money, came home, made dinner together, burned one part of it, fixed the sink, sat on the balcony while it rained, and the game saved a photo of us eating.

No tutorial should need to tell the player why that is meaningful.

---

# 2. CORE DESIGN PILLARS

## 2.1 Real people, real presence

The heart of the game is that the person beside you is real.

Presence must be visible through body orientation, gaze direction, hand and head movement, natural locomotion, gestures, sitting together, working side by side, jointly carrying objects, cooking at the same counter, hearing their voice spatially when enabled, seeing them return home through a doorway, seeing their belongings in the house, and noticing what they changed while you were away.

The game should create the feeling: **“You are here with me.”**

## 2.2 Low pressure, meaningful choice

Together is not a survival game.

There is no death, combat, hunger death, eviction game-over, relationship game-over, irreversible punishment for missing chores, FOMO battle pass, daily streak punishment, pay-to-win, or premium currency in V1.

Money matters because it enables aspiration, not because poverty threatens the player.

Failure is allowed because imperfect outcomes create stories.

## 2.3 The world should feel lived in

The city continues to feel active when the player does nothing.

NPCs have routines. Stores open and close. Weather changes. Lights come on. Cats move between familiar spots. A café sounds different at 08:00 than at 21:00. The bay becomes quieter at night. A bench may be occupied. A market delivery may block half a lane. A monsoon shower changes how everyone moves.

The city is not a backdrop. It is a quiet participant in the household’s life.

## 2.4 Micro-actions create the reality

The game’s emotional credibility comes from small details.

Washing dishes should not mean clicking “Wash Dishes” and watching a bar. The player should pick up a plate, turn on the tap, wet it, scrub it, rinse it, place it on a rack, hear ceramic contact, and watch the remaining dishes reduce physically.

Cooking should involve real counter positions, ingredients, utensils, heat, timing, steam, spills, serving, and sitting down. Cleaning should visibly change the room. Making tea or coffee should look like making tea or coffee.

The micro-action system is a first-class product system, not polish added later.

## 2.5 Invisible simulation, visible humanity

The game internally tracks many numerical states, but most are not shown numerically.

The player should not see Hunger 63/100, Relationship 78/100, Social 41/100, or House Vibe 72/100.

Instead they experience a stomach sound, the character glancing toward food, slower late-night movement, yawning, a warmer greeting animation, more comfortable idle proximity, clutter appearing, plants drooping, a remembered disagreement, or an NPC noticing the home has changed.

Numbers exist for simulation. Behaviour communicates them.

## 2.6 Progress is a life, not a ladder

The game has progression, but it is not centered on XP.

Players progress through better home conditions, better furniture, more personal possessions, home renovation, moving to another property, job trust and responsibility, stronger NPC familiarity, new recipes, new hobbies, transport access, deeper storylines, new shared rituals, a richer Memory Book, and greater understanding of the city.

The game should feel broader and more personal over time, not harder.

## 2.7 Memory is the final output

Every system should be evaluated with:

> **Could this produce a moment somebody would want to remember?**

The Memory Book is not a gallery bolted onto gameplay. It is the emotional record generated by gameplay.

---

# 3. WHAT TOGETHER IS NOT

Together is permanently not a combat game, crime game, survival game, MMO, social network, competitive economy simulator, farming grind, Roblox-style UGC platform, photorealistic technology demo, blocky low-poly toy world, pixel-art game, quest-marker checklist game, stat-management dashboard, dating app, AI companion game, or a game where NPCs replace the importance of real players.

Random stranger matching is explicitly **not V1 priority**.

---

# 4. V1 SCOPE

## 4.1 Must ship in V1

V1 must include one complete city, embodied first-person, switchable third-person, avatar creation, Couple households, Friends households for 2–6 players, invite-code joining, fixed-property selection, deep interior customization, persistent household state, personal and shared money, jobs, shopping, groceries, cooking, cleaning, laundry, plant care, repairs, home visual state, day/night cycle, weather, named NPC cast, ambient NPC simulation, bicycles, scooters, auto-rickshaw transit, leisure activities, story progression, contextual random events, path-specific Couple/Friends stories, housing renovation, moving house, Memory Book, optional built-in voice, text notes, server persistence, complete audio direction, high-quality visual treatment, WebGPU-first rendering, graceful WebGL2 fallback, and a 60fps target on the defined target machine.

## 4.2 Explicitly postponed

Not required for initial V1: random stranger household matching, hundreds of visible real players, player-owned cars, motorcycles beyond simple scooter, second city, fully free architectural house construction from an empty plot, public user-generated assets, mod marketplace, public economy/trading, large voice rooms, advanced public moderation infrastructure, mobile gameplay parity, VR, combat, or pets with deep simulation.

The architecture should avoid blocking these later, but V1 must not become dependent on them.

---

# 5. CANONICAL CITY — AMAYA BAY

## 5.1 Identity

**Amaya Bay** is a fictional compact coastal city.

Its visual rhythm is inspired by the calm spatial qualities associated with contemporary Japanese neighbourhoods: compact low-rise streets, careful proportions, quiet lanes, small gardens, layered signage, overhead cables, intimate storefronts, railings, tiled and concrete surfaces, pocket parks, clean framing, dense but calm detail, and beautiful transitions between private and public space.

Its actual everyday life is contemporary Indian: auto-rickshaws, scooters, bicycles, chai, filter coffee, modern cafés, local groceries, pressure cookers, tiffins, Indian food, apartment culture, PG/hostel living, balconies, clothes drying outside, local repair shops, monsoon rain, Indian plants, familiar Indian names, festival lighting, multilingual signage, and modern Indian domestic habits.

It is not “Japan transplanted into India.” It is a fictional city whose **spatial calm is Japanese-inspired and whose lived culture is Indian**.

## 5.2 Visual emotional target

The city must feel peaceful, warm, slightly nostalgic, clean without looking sterile, detailed without visual noise, realistic enough to inhabit, artistic enough to feel timeless, beautiful in ordinary weather, and especially beautiful at dawn, after rain, at golden hour, and at night.

A player should be able to stand still on a street and enjoy looking.

## 5.3 City size

V1 target footprint:

- approximately **900m × 900m** of contiguous playable terrain;
- approximately 0.8 km²;
- 1 world unit = 1 metre;
- walking end-to-end: roughly 10–14 minutes depending on route;
- bicycle traversal: roughly 4–5 minutes;
- scooter traversal: roughly 2–3 minutes;
- auto-rickshaw: fixed-point ride or optional skip.

The city must feel larger than it is through elevation, curved streets, sightline blocking, alleys, vegetation, layered facades, interior access, vertical terraces, waterfront changes, and distinct audio zones.

---

# 6. AMAYA BAY DISTRICTS

## 6.1 Mogra Court — Home Quarter

Primary residential area. Contains starter apartment blocks, Couple studio properties, 1BHK and 2BHK flats, PG-style shared properties, hostel-style shared floor, corner grocery, laundromat, small playground, side lanes, roof access on selected buildings, cycle parking, residential NPCs, caretaker office, and public seating.

Mood: mornings, laundry, pressure cooker sounds, scooters starting, quiet late evenings, rain against windows.

## 6.2 Lantern Street — Commercial Heart

The densest mixed-use street. Contains Café Roshan, grocery market, bakery, furniture shop, plant shop, stationery/book shop, repair shop, street-food corner, pharmacy exterior, clothing shop, small arcade, bank kiosk for wallet management, and auto stand.

Mood: lively but not loud; hanging signs; narrow awnings; warm storefront light; bicycles against walls; café cups; wet pavement reflections.

## 6.3 Mogra Park

Contains lawn, shade trees, picnic areas, fountain, walking loop, badminton court, small open pavilion, public garden, quiet seating, seasonal flowers, cat locations, and story event zones.

Activities: picnic, badminton, reading, photography, sitting, shared idle conversations, and small seasonal events.

## 6.4 Bay Steps

The city waterfront. Contains promenade, sea wall, stone steps, beach section, cycle route, rental hut, kayak launch, small pier, sunset lookout, food cart, seating, and lamps.

Activities: beach walk, sunset sitting, picnic, kayak, photography, cycling, skipping stones, tea/coffee, and date events.

This is a signature location and must be visually exceptional.

## 6.5 Rain Tree Lane

A quieter residential-commercial transition. Contains older homes, balconies, vines, clotheslines, repair yards, tiny food stall, plant nursery, small quiet reflection corner, narrow lanes, deep vegetation, and hidden benches.

This district sells the “lived-in city” feeling.

## 6.6 The Common

Community and service area. Contains post/community office, clinic exterior, library/co-working interior, community board, event hall, public courtyard, municipal garden, and larger auto stand.

Used for gift sending, community stories, moving paperwork, hobby groups, freelance work, and small festivals.

## 6.7 Hill Garden

Small elevated edge of the map. Contains sloped walk, lookout, mini-golf, tea hut, garden, scenic bicycle route, and future expansion gate.

This is not a locked zone. Players can visit from day one. Some activities may require equipment, fees, or story introductions.

---

# 7. CITY ACCESS PHILOSOPHY

Almost the entire city is open immediately.

The game does **not** use invisible walls to create progression.

Progression unlocks activities, equipment, NPC familiarity, job access, interior permissions, special recipes, renovation options, property options, and event chains.

Example: the kayak hut is visible from the first day. The player can walk to it immediately. However, renting a kayak requires enough money, the hut being open, and first completing the short safety introduction.

The world is open. **Capability grows.**

---

# 8. HOUSEHOLD CREATION FLOW

## 8.1 Principle

The order is:

> **People → Household → Home → Life**

Not:

> Host chooses everything → others join later.

The household is a shared entity created by people together.

## 8.2 First-time flow

### Step 1 — Player identity

Each player creates display name, avatar, voice preference, accessibility settings, and basic control settings. Account creation may begin anonymously and be upgraded later.

### Step 2 — Create or join household

Options: Create Household or Join Household.

Create Household generates a short invite code, shareable link, and temporary household lobby.

### Step 3 — Choose household type

V1: Couple or Friends.

The choice affects story tone, persistence rules, privacy defaults, event library, relationship simulation, and voting defaults. It does not create a separate game engine.

### Step 4 — Invite members

Couple: exactly 2 active household members in V1.

Friends: 2–6 members.

All members appear in the pre-home lobby as their avatars.

### Step 5 — Shared property selection

Once minimum membership is met, the group chooses a starting home. Every player can walk through a preview version or inspect a 3D model.

Couple: both must confirm.

Friends: simple majority; ties reopen discussion rather than silently assigning.

### Step 6 — Move-in sequence

Players spawn outside the building with boxes. The opening story is physical: unlock door, walk in, choose bedrooms if applicable, place starter boxes, inspect rooms, unpack core items, buy or arrange a first meal, and sleep/end the first day.

The first Memory Book page begins here.

---

# 9. STARTER PROPERTY SYSTEM

V1 uses fixed architectural shells. Players deeply customize interiors but do not create arbitrary structural buildings from zero.

This keeps performance predictable, networking manageable, collision reliable, art quality high, and multiplayer synchronization understandable.

## 9.1 Starter property presets

### A. Couple Studio
Capacity: 2. Combined living/sleep zone, compact kitchen, bathroom, balcony. Best for Couple path, low starting cost, high personalization.

### B. Couple / Friends 1BHK
Capacity: 2. Bedroom, living room, kitchen, bathroom, small balcony. Best for couples wanting separation of spaces or two friends.

### C. Courtyard 2BHK
Capacity: 2–4. Two bedrooms, shared living room, kitchen, two small bathrooms or one larger, courtyard/balcony.

### D. PG House
Capacity: 3–5. Small private/shared bedrooms, central common room, kitchen, utility corner, terrace access, multiple storage zones.

### E. Hostel Floor
Capacity: 4–6. Compact rooms, large common room, shared bathrooms, shared kitchen, large notice board, roof gathering zone.

## 9.2 Starter condition

Homes are functional but modest. A starting home includes usable bed(s), basic stove/hob, fridge, sink, table or counter, chairs, bathroom basics, one storage unit, basic ceiling lights, and one decorative object.

The home must not look broken or miserable.

The goal is:

> **“This is ours, but it could become much more ours.”**

---

# 10. HOME CUSTOMIZATION

## 10.1 V1 freedom

Players may customize furniture, furniture position, furniture orientation, wall colors, selected wall finishes, floors, rugs, curtains, lamps, artwork, plants, shelves, small decor, kitchen objects, bedding, cushions, balcony furniture, storage, room purpose, lighting warmth, and selected non-structural divider variants.

## 10.2 V1 structural limits

Players cannot in V1 move external load-bearing walls, create arbitrary floor plans from empty geometry, modify building exterior massing, create unsupported doors/windows anywhere, or stack procedural floors.

Instead, each property provides authored renovation sockets such as opening/closing a partition, converting a utility nook, adding a shelving wall, adding a balcony enclosure, expanding kitchen counter, creating a study corner, creating a plant wall, or converting a spare room.

This creates meaningful home growth without turning V1 into an architecture CAD tool.

---

# 11. HOME GROWTH AND MOVING

The home is a story system.

Players have two major long-term options.

## 11.1 Improve the current home

Possible upgrades include better finishes, better furniture, more storage, improved lighting, kitchen upgrade, bathroom upgrade, balcony garden, sound system, upgraded workstation, room conversion, and roof/terrace access where property supports it.

Some properties include one major authored extension.

## 11.2 Move to another home

Moving is not a “Change Property” menu button. It is an event chain.

### Moving flow

1. Browse listings.
2. Visit candidate homes physically.
3. Discuss / vote.
4. Confirm lease/purchase.
5. Choose what furniture to keep, sell, donate, or discard.
6. Pack objects into labeled boxes.
7. Finish remaining old-home tasks.
8. Take an automatic final-home Memory photo.
9. Movers / rented auto / small truck arrives.
10. Travel to new property.
11. Boxes appear in new home.
12. Unpack.
13. Rebuild familiar corners.
14. First night in new home.
15. Memory Book creates a moving spread: old home, packed room, new empty room, first finished corner.

Moving must feel bittersweet and meaningful.

---

# 12. ECONOMY PHILOSOPHY

Money is a **possibility system**, not a survival threat.

If players want nicer furniture, a bigger home, more hobbies, better equipment, more travel, home renovation, special food, or aesthetic upgrades, they need to earn.

If they simply want to walk, talk, sit, enjoy the park, watch the sunset, stay home, cook basic food, and live modestly, the game does not punish them.

---

# 13. CURRENCY AND WALLET MODEL

Use **₹** as the visible currency symbol.

Amounts are gameplay-tuned and are not intended to represent exact real-world economics.

## 13.1 Personal wallet

Each player has one. Used for clothing, personal accessories, gifts, personal hobby items, and optional personal furniture. Job income enters personal wallet by default.

## 13.2 Household wallet

Shared. Used for rent, groceries, utilities, shared furniture, repairs, renovation, moving, and shared activities. Players deposit from personal wallet. Chore-related household bonuses, story support, and shared rewards may enter directly.

## 13.3 Friends mode spending

Friends mode is persistent. Shared spending affects everyone immediately. Every shared transaction records player, amount, item, timestamp, and resulting balance.

Large decisions require household approval: moving, major renovation, purchases above configurable threshold, or spending more than 30% of current shared funds in one transaction.

## 13.4 Couple mode spending

Couple mode is co-presence-first. Either player may work, earn personal money, buy personal items, buy normal groceries, and perform basic upkeep.

Major shared actions pause for joint confirmation: moving, major renovation, major shared purchase, and resolving a major Couple story event.

The game should not allow one person to transform the shared life while the other is absent.

## 13.5 Starting economy target

Default starting household: shared funds ₹8,000; personal funds ₹1,500 per player.

This supports basic groceries and one or two low-cost decor purchases, but not a fully furnished dream home.

---

# 14. JOB SYSTEM

Jobs should feel like living in the city. They are not isolated menu minigames.

## 14.1 Job principles

A job session should last 6–12 real minutes, take place in the actual location, involve repeated embodied tasks, become familiar, have changing pace, be relaxing most of the time, occasionally create funny pressure, pay enough that work feels useful, and never become mandatory every session.

## 14.2 V1 jobs

### Café Roshan — Barista

Location: Lantern Street.

Actions: clock in, wear apron, take NPC order, grind coffee, prepare espresso, heat milk, brew tea, prepare simple food, place order, clear cups, wipe counter, and handle short rushes.

Progression is communicated through Roshan trusting the player with more tasks, better pay, new recipes, dialogue, access to opening/closing shift, and cosmetic apron variants.

No “Barista Level 2” bar is required.

### Market Helper

Location: Main market.

Actions: carry crates, restock produce, label shelves, bag groceries, help NPC locate items, clean spill, and close stall.

Calmer, lower-paying, low-stress job.

### Delivery Rider

Transport: bicycle at first, scooter later.

Actions: collect orders, place them in carrier, read addresses, travel through city, ring doorbell, hand delivery, and return.

Weather affects the experience. No crash punishment beyond delay.

### Plant Nursery / Garden Assistant

Location: Rain Tree Lane.

Actions: water plants, repot, sweep soil, arrange display, deliver plants, prune, and help an NPC choose a plant.

Unlocks more plant species, gardening knowledge, and home gardening options.

### Freelance / Remote Work

Location: home desk, library, or café.

Actions: short typing, planning, document arrangement, simple focus interactions.

Designed for solo play while partner is away and quiet rainy sessions.

---

# 15. WORK PROGRESSION

Job progression is hidden and contextual.

Internally track sessions completed, average quality, customer satisfaction, reliability, and special-event performance.

Externally show different dialogue, slightly better pay, new responsibility, shift choice, visual badge/object, story event, and NPC trust.

The game never needs to say “XP +150”.

---

# 16. PLAYER PHYSICAL STATES

Internally track hunger, energy, hygiene comfort, thermal/weather comfort, social warmth, stress/tension, and focus.

These are hidden.

## 16.1 Hunger communication

Instead of a bar: quiet stomach sound, subtle hand-to-stomach idle, contextual text, and food interactions becoming slightly more noticeable. Hunger never kills. Very low hunger may slightly reduce job focus and increase tired body language.

## 16.2 Tiredness communication

Yawning, rubbing eyes, slower idle, lower head posture, a more prominent bed interaction, and occasional automatic sitting if idle near a sofa. No stamina bar.

## 16.3 Social state

The simulation may internally track time spent together. High social warmth may create comfortable shared idle animations, spontaneous glance, closer seat selection, and richer story triggers. Low social warmth does not shame players; it may simply make a quiet reconnection event more likely.

---

# 17. HOUSEHOLD STATE

Internally track cleanliness, clutter, food stock, kitchen state, laundry state, plant state, utilities, maintenance, warmth/coziness, and unresolved repairs.

Do not show a “Home Vibe 73” bar.

Communicate through lighting, objects, clutter, sound, animations, NPC comments, room smell/steam/dust VFX, and story likelihood.

---

# 18. RELATIONSHIP SIMULATION

Relationship state exists but remains invisible.

## 18.1 Internal dimensions

For Couple mode: closeness, trust, reliability, novelty, shared-time quality, and unresolved tension.

For Friends mode: familiarity, reliability, shared-fun, household friction, contribution balance, and repair after conflict.

No value is presented as a score.

## 18.2 Visible outputs

Relationship state influences greetings, idle distance, story triggers, spontaneous animations, shared dialogue options, memory captions, event tone, NPC observations, and available joint actions.

---

# 19. TIME MODEL

The old 1 real minute = 1 game hour model is rejected. It is too fast for embodied first-person living.

Canonical V1 time:

> **1 real minute = 12 in-game minutes**

Therefore 5 real minutes = 1 game hour, a 30-minute session = 6 game hours, and a full 24-hour day = 120 real minutes.

This allows a meaningful morning, work shift, afternoon activity, evening home life, and visible lighting transition without rushing.

## 19.1 City time vs household obligations

City time is server-authoritative. However, household penalties do not accumulate aggressively while nobody is online.

Rules: city light/weather clock may continue; stores follow city time; seasonal state continues; household chore decay only advances while at least one member is actively playing; rent cycles count active household days, not real offline days; plants do not die because someone took a week off the game.

This protects the cozy promise.

---

# 20. SLEEP SYSTEM

Sleeping is optional. A player can use a bed to rest without time skip or sleep until a selected target time.

## Couple mode

If both active players are present, both confirm time skip, screen fades, city advances, and morning ambience plays.

If one player is offline, the active player may sleep for rest, but major shared-story time does not silently jump forward beyond protected events.

## Friends mode

If multiple members are online, a time skip vote appears. Majority approves. The default is to avoid forcing someone out of an activity.

---

# 21. WEATHER AND SEASONAL IDENTITY

Amaya Bay uses an Indian coastal climate interpretation.

## 21.1 Weather states

Clear, partly cloudy, overcast, light rain, monsoon rain, thunderstorm, misty morning, hot bright afternoon, and windy evening.

No routine snow in Amaya Bay.

## 21.2 Seasonal rhythm

### Bloom Season — approximately February–March
Mild weather, flowering trees, outdoor events, park activity.

### Summer — approximately April–June
Brighter sky, stronger noon light, slower NPC movement, cold-drink stalls, later waterfront crowds.

### Monsoon — approximately July–September
Wet surfaces, heavy foliage, umbrellas, dramatic rain, indoor stories, drains, puddles, roof water, strongest atmosphere.

### Cool / Festival Season — approximately October–January
Clearer air, comfortable evenings, decorative lights, event calendar, warm night interiors.

Seasonal mapping may follow real calendar, but V1 development builds must include debug controls to test any season instantly.

---

# 22. VISUAL DIRECTION

## 22.1 Canonical style

The style is **calm stylized realism**.

It is not pixel art, chunky primitive low-poly, flat-shaded toy geometry, or photoreal Unreal-style rendering.

It should have believable scale, believable materials, simplified but natural geometry, painterly color control, soft atmospheric depth, dense vegetation, warm surface variation, readable silhouettes, carefully authored lighting, and strong environmental composition.

## 22.2 Visual principle

> **Geometry may be simplified. Perception may not feel simplified.**

A tree can use stylized geometry, but it must still have trunk variation, branch logic, canopy layers, leaf mass hierarchy, color variation, wind response, contact shadow, species identity, and LOD behavior.

A building can be efficient, but it must still have facade depth, frames, awnings, ledges, wires, drain pipes, AC units, signs, balconies, curtains, interior glow, grime variation, plants, and contextual clutter.

No city block should look like colored boxes.

---

# 23. VISUAL FRAME QUALITY CHECKLIST

Every hero screenshot must pass:

**Environment density:** foreground detail, midground detail, background composition, no large empty unintentional planes, at least three vegetation scales in green spaces, and at least three facade depth layers on hero buildings.

**Material quality:** no perfectly uniform large surface, subtle albedo variation, roughness variation, contact darkening, edge differences, weather response.

**Lighting:** readable key direction, soft indirect fill, grounded contact shadows, natural sky contribution, controlled highlight rolloff, no pitch-black shadow holes.

**Atmosphere:** distance haze, color separation by depth, district audio identity, moving foliage, small motion somewhere in view.

**Human life:** at least one NPC, bicycle, moving curtain, shopkeeper, light turning on, bird/cat, distant auto, or player.

---

# 24. RENDERING ARCHITECTURE

## 24.1 Renderer

Use Three.js current stable at implementation, `three/webgpu`, `WebGPURenderer`, WebGPU backend preferred, WebGL2 backend fallback.

Custom shader work must be written using Three.js node materials and TSL (Three Shading Language).

Do not build V1 rendering architecture around legacy `ShaderMaterial` assumptions that are incompatible with the WebGPU renderer path.

## 24.2 Why WebGPU-first

Required benefits: modern GPU pipeline, stronger future compute options, node/TSL materials, modern post-processing, and a better fit for future world systems.

However, V1 must not hard-fail on a machine that only has supported WebGL2. Visual fallback may reduce vegetation density, shadow range, high-end post effects, and reflection quality. Gameplay must remain complete.

---

# 25. WORLD STREAMING

The entire city must not exist as thousands of independent always-active objects.

## 25.1 Chunk model

Partition Amaya Bay into **128m × 128m** world chunks.

Each chunk stores terrain patch, road/surface data, authored building references, prop instances, foliage distribution seed, collision proxies, audio zones, NPC navigation links, and interaction metadata.

## 25.2 Streaming rings

### Ring A — Active
Near player: full geometry, full collision, full vegetation, interactive objects, full shadows, named NPCs.

### Ring B — Visual
Mid-distance: LOD geometry, simplified collision or none, reduced vegetation, limited shadows, simplified NPC representation.

### Ring C — Horizon
Far: low LOD buildings, tree masses, silhouette geometry, no interaction.

Chunks unload outside residency radius.

## 25.3 Compilation

Chunk compilation tasks should use Web Workers where useful: static geometry merge, vegetation placement, instance matrices, collider metadata, and nav data preprocessing.

Old visible chunk remains until replacement is ready. Do not create or destroy large GPU resources repeatedly inside the frame loop.

---

# 26. TERRAIN AND PROCEDURAL ENVIRONMENT SYSTEM

Borrow the principles of advanced streamed terrain systems, not unnecessary editor complexity.

Amaya Bay uses authored terrain plus deterministic procedural dressing.

## 26.1 Terrain sources

Terrain consists of hand-authored base heightfield, road splines, path splines, waterfront spline, retaining wall definitions, park masks, garden masks, vegetation masks, and building pads.

## 26.2 Vegetation fields

Do not manually place every tree.

Define vegetation zones such as street_canopy, courtyard_green, park_dense, waterfront_palm, rain_tree_lane, balcony_planter, scrub_edge, and hill_garden.

Each zone defines species list, density, minimum spacing, scale range, rotation range, slope tolerance, moisture preference, seasonal response, and random seed.

Placement is deterministic.

## 26.3 V1 vegetation target

Trees: rain tree, gulmohar, palm, ficus, compact ornamental tree.

Shrubs: bougainvillea, jasmine-like flowering shrub, hedge, broadleaf tropical shrub.

Ground: grass clumps, fallen leaves, small flowers, dirt patches, moss/wet edge, weeds near drains.

The city must not rely on repeated spherical tree canopies.

---

# 27. MATERIAL SYSTEM

Use stylized PBR rather than flat toon shading for the world.

World materials should use controlled albedo, roughness, normal detail where useful, AO, vertex color variation, and TSL weather modifications.

Characters may use slightly more illustrative shading, but must still fit the world.

Material families: painted plaster, concrete, warm stone, asphalt, tile, wood, metal, glass, fabric, foliage, wet surfaces, skin, and hair.

Each family has authored parameter ranges rather than ad-hoc unique shaders.

---

# 28. WEATHER RENDERING

Rain must affect more than particles.

When rain begins, pavement darkens gradually, puddle regions gain reflection, roof runoff activates, umbrellas appear, NPC speed/routing changes, shop awnings become occupied, distant atmosphere becomes cooler, tire/scooter road sound changes, indoor window-rain audio becomes audible, clothing may add a rain layer, and wet footprints may briefly appear indoors near entrances.

Heavy rain is one of Amaya Bay’s signature visual moments.

---

# 29. LIGHTING

## 29.1 Outdoor lighting

Primary: one sun/moon directional key, sky/environment contribution, and local lights selectively.

Use a camera-relative shadow region with high quality near player and reduced/no dynamic shadows far away.

Do not create a real dynamic point light for every window or street lamp. Use emissive materials, fake/clustered glow, and selected real lights near player.

## 29.2 Lighting periods

Dawn, Morning, Midday, Afternoon, Golden Hour, Blue Hour, Evening, Late Night.

Transitions are continuous. Golden hour and post-rain evening are hero states.

## 29.3 Interior lighting

Each room combines exterior window light, ceiling source, practical lamps, emissive fixtures, and ambient probe/environment contribution.

Player-controlled lamps should change mood significantly. Interior light temperature should generally be warmer than exterior evening light.

---

# 30. POST-PROCESSING

Use restraint.

V1 stack: exposure/tone mapping, color grade, subtle bloom, ambient/contact occlusion where performance permits, distance fog/atmosphere, subtle optional vignette, subtle optional film grain, and higher-end effects only on high quality tiers.

Do not blur heavily, overuse chromatic aberration, crush blacks, oversaturate, or make the game look like a filter pack.

---

# 31. PERFORMANCE TARGET

## 31.1 Target machine

Primary minimum quality target: modern 4-core CPU, 16GB RAM, Intel Iris Xe-class integrated GPU or equivalent, current Chromium/Edge/Firefox with WebGPU or WebGL2 fallback.

Preferred: mid-range discrete GPU.

## 31.2 Frame targets

- 60fps target at 1080p Medium.
- 30fps minimum acceptable fallback.
- No recurring hitch above 50ms during ordinary movement.

## 31.3 Medium quality visible budgets

Guideline targets:

- visible triangles: < 900k typical;
- temporary peaks: < 1.3M;
- draw calls: < 160 typical;
- active full-detail skinned characters: <= 12;
- other NPCs: LOD/impostor;
- shadow casters tightly limited;
- GPU texture residency target: < 400MB;
- startup blocking download: < 25MB compressed;
- city streams afterward.

These are budgets, not excuses to reduce art quality. Use batching, LOD, compression, and streaming.

---

# 32. ASSET PIPELINE

Primary authoring tool: Blender.

Exports: glTF / GLB.

Textures: KTX2/Basis compressed for runtime where appropriate.

Geometry: Meshopt compression.

## 32.1 LOD

Hero building: LOD0 near, LOD1 medium, LOD2 far, silhouette/horizon representation when needed.

Trees: LOD0 full, LOD1 simplified, LOD2 billboard/impostor, cull beyond useful range.

Props: instanced where repeated.

## 32.2 Naming

Examples:

`env_amaya_lantern_cafe_roshan_lod0.glb`

`prop_street_bench_wood_01.glb`

`char_player_base_body_f_01.glb`

`anim_humanoid_wash_dish_01.glb`

Use consistent asset metadata: bounds, interaction sockets, material slots, collision reference, LOD links, animation tags.

---

# 33. CAMERA SYSTEM

First-person is the canonical gameplay camera.

Key: `V` toggles first/third person.

## 33.1 First-person

Default FOV: 78°, configurable 70–95.

Eye height based on avatar height, approximately 1.62–1.78m.

Requirements: camera attached to head/neck reference but stabilized; visible torso when looking down; visible arms/hands; visible legs when looking down; local head mesh hidden from camera; shadow still includes full body; mirror/reflection shows full avatar; subtle breathing; very subtle head bob; head bob slider; complete disable option; no weapon-style hand rig.

Interactions use body/hand animation whenever practical.

## 33.2 Third-person

Camera: 3.5–4.5m behind, 1.5–2.2m above player root, shoulder-neutral, spring damping, mouse orbit, collision push-in, configurable sensitivity.

Third-person is especially useful for social play, avatar appreciation, shared activities, screenshots, cycling, and decorating observation.

## 33.3 Context camera

Some activities may temporarily use authored cameras: cooking close counter view, furniture placement, mini-golf shot, kayak entry, Memory photo.

The player must always understand why control changed. Avoid abrupt cinematic theft of camera.

---

# 34. PLAYER MOVEMENT

Walking target: 1.5–1.7 m/s. Jog: 3.0–3.4 m/s. No endless sprint stamina bar. Shift toggles/holds jog.

Use Rapier kinematic character controller with capsule collider. Support stairs, slopes, ground snapping, moving platforms if introduced, step height, and collision correction.

Player movement remains locally responsive.

Footsteps vary by asphalt, tile, wood, grass, sand, water puddle, and interior concrete.

Movement animation and sound are core feel systems.

---

# 35. EMBODIED INTERACTION SYSTEM

The interaction system must be designed for first-person.

## 35.1 Detection

Use view ray, proximity volume, and interaction priority.

Prompt appears only when player is close enough, object is valid, and crosshair/view is sufficiently aligned or action is strongly contextual.

## 35.2 UI

Default HUD has no permanent interaction list.

Near an interaction:

`E · Wash plate`

or

`E · Sit`

or

`Hold E · Pack box`

Prompt fades quickly when not relevant.

## 35.3 Interaction sockets

Every interactive prop defines hand target, stance target, look target, object target, and animation tag.

Player aligns smoothly to stance before animation.

---

# 36. MICRO-ACTION FRAMEWORK

Every repeated life task is built from reusable interaction primitives rather than one-off scripted sequences.

Core primitives include:

- pick up;
- place;
- pour;
- hold;
- scrub;
- wipe;
- cut;
- stir;
- press;
- open;
- close;
- fold;
- carry;
- turn;
- plug;
- wash;
- water;
- sit;
- lie down;
- hand over;
- receive;
- point;
- inspect;
- switch on/off;
- attach/detach.

Each primitive has:

- animation tag;
- hand/stance sockets;
- object-state transition;
- optional timing/gesture input;
- sound event;
- network replication rule;
- persistence rule.

This framework is one of the central implementation systems because it allows hundreds of believable life interactions to be composed from a small set of polished actions.

## 36.1 Example — washing dishes

1. A dirty plate exists physically in the sink/counter state.
2. Player looks at it and presses E.
3. Hand IK picks it up.
4. Player aligns to sink.
5. Water tap turns on.
6. Plate becomes wet.
7. Sponge/brush is acquired in off-hand.
8. Circular movement or a short timed action scrubs visible dirt.
9. Foam appears and then clears.
10. Rinse action removes soap.
11. Player places plate on rack.
12. Remaining dirty objects visibly reduce.
13. Cleanliness state updates server-side.
14. Other players see the same plate move/state.
15. A first shared dish-cleaning moment may qualify for a Memory.

A fast-repeat mode may become available after a player has already performed the full interaction several times, but the complete embodied version remains available.

## 36.2 Example — making tea or coffee at home

1. Get mug.
2. Fill kettle.
3. Turn kettle on.
4. Choose tea/coffee preparation.
5. Add tea leaves/bag/coffee/filter.
6. Pour water.
7. Add milk/sugar optionally.
8. Carry mug.
9. Sit anywhere valid.
10. Drink over time.

This has almost no traditional “reward.” Its value is the ritual itself.

## 36.3 Example — packing for a move

1. Open box.
2. Pick object.
3. Inspect object if sentimental.
4. Choose Keep / Sell / Donate for eligible items.
5. Place in box.
6. Box contents update.
7. Label box by room.
8. Tape box.
9. Carry box to staging area.

Packing should make the player notice the objects they acquired over time.

---

# 37. CHORE SYSTEM

Chores are the domestic heartbeat of the household, but they must not feel like punishment.

V1 chore families:

- dishes;
- trash;
- laundry;
- floor cleaning;
- bathroom cleaning;
- plant watering;
- grocery restock;
- cooking;
- bills;
- broken-item repair;
- bed making;
- surface cleanup.

## 37.1 Chore presentation

There is no giant mandatory weekly dashboard by default.

Players notice state in the world:

- sink filling;
- laundry basket;
- trash bag;
- low groceries;
- wilted plant;
- dusty floor;
- bathroom marks;
- blinking utility notice;
- broken lamp;
- clutter accumulating.

A physical household board/journal may summarize tasks on demand.

## 37.2 Chore flexibility

Chores are not binary.

Examples:

- wash two plates and leave the rest;
- water only the plants that need it;
- take one full trash bag;
- fold laundry later;
- sweep one room;
- clean the bathroom sink without doing the full room.

Partial completion modifies state proportionally.

## 37.3 Chore co-op

When two players participate, the game should create natural role division.

Examples:

Dishes:
- one washes;
- one dries/puts away.

Laundry:
- one sorts;
- one loads;
- both fold.

Cleaning:
- one sweeps;
- one wipes surfaces.

No artificial “1.5x relationship bonus” should be shown. The hidden relationship simulation may react, but the player experience is the shared act itself.

---

# 38. FOOD AND COOKING SYSTEM

Cooking is one of the most important shared systems in Together.

## 38.1 Ingredient model

Ingredient categories:

- grains;
- lentils;
- vegetables;
- fruit;
- dairy;
- spices;
- oils;
- packaged foods;
- beverages;
- snacks;
- bakery items;
- household staples.

Food inventory tracks freshness at a forgiving level.

The game should not become a food-spoilage simulator. Freshness exists to create choices and occasional events, not waste anxiety.

## 38.2 Recipe architecture

Each recipe defines:

- ingredients;
- optional ingredients;
- tools;
- work surfaces;
- prep sequence;
- cook sequence;
- timing tolerances;
- possible mistakes;
- serving vessel;
- meal portions;
- visual outcome variants;
- smell/audio tags;
- Memory tags.

Example:

```ts
type RecipeDefinition = {
  id: string
  displayName: string
  ingredients: IngredientRequirement[]
  optionalIngredients?: IngredientRequirement[]
  tools: ToolTag[]
  steps: RecipeStep[]
  outcomes: RecipeOutcome[]
  servings: number
  unlock?: UnlockCondition
  memoryTags?: string[]
}
```

## 38.3 V1 food direction

The food library should feel like actual contemporary home life.

Initial examples:

- chai;
- filter coffee;
- poha;
- upma;
- omelette;
- toast;
- dal;
- rice;
- khichdi;
- simple sabzi;
- pasta;
- fried rice;
- sandwiches;
- noodles;
- pancakes;
- soup;
- cake;
- biscuits;
- simple curry;
- fruit bowl.

Food art must be appetizing and recognizable.

## 38.4 Co-op cooking

Two or more players can occupy distinct kitchen stations.

Example recipe split:

Player A:
- washes rice;
- chops onion;
- measures spices.

Player B:
- heats pan;
- chops vegetables;
- stirs sauce.

The recipe graph allows parallel steps and then synchronization points.

Players may make mistakes:

- overcook;
- undercook;
- forget one ingredient;
- spill;
- burn one component;
- plate badly.

Most imperfect meals remain edible.

The game should prefer “that was funny” over “mission failed.”

## 38.5 Eating

Meals are not consumed through an inventory button.

Players can:

- serve portions;
- carry plates;
- choose seat;
- sit;
- eat over time;
- talk/voice;
- clean afterwards.

Shared meals are one of the game’s most important social rituals.

---

# 39. GROCERY AND SHOPPING SYSTEM

The market is a real location rather than a menu.

Players:

- take basket/cart;
- browse aisles/stalls;
- look at products;
- pick products;
- compare price;
- place into basket;
- remove items;
- check household funds;
- checkout physically.

Shopping list may be generated from:

- selected recipes;
- low staples;
- household notes;
- story events.

A quick-buy convenience feature can unlock after repeated visits for players who prefer less repetition, but the physical shopping experience remains available.

Furniture and decor shops similarly allow physical browsing of staged objects or catalog kiosks embedded in-world.

---

# 40. TRANSPORT

## 40.1 Walking

Always available and intentionally enjoyable.

Primary movement through city.

## 40.2 Bicycle

Available early.

Features:

- mount/dismount;
- steering;
- braking;
- bell;
- parking;
- first-person and third-person support;
- shared bicycle racks;
- basket option;
- simple carrying capacity.

Bicycles are calming transport, not racing vehicles.

## 40.3 Scooter

Available after an affordable purchase/rental or story introduction.

Features:

- modest speed;
- helmet animation;
- parking;
- storage hook/box;
- passenger option only if implementation quality is acceptable.

No punishing crash simulation.

## 40.4 Auto-rickshaw

NPC transit.

Player chooses a known destination.

Options:

- ride in real time;
- skip after boarding.

Ride experience includes city movement, street sound, weather, driver ambience, and occasional contextual line.

Auto travel costs a small amount.

## 40.5 Cars

Post-V1.

---

# 41. LEISURE AND “JUST BEING” SYSTEMS

Together must provide activities with no productivity purpose.

V1 leisure target:

- picnic;
- waterfront sitting;
- beach walk;
- cycling;
- kayak;
- badminton;
- mini-golf;
- arcade;
- board games;
- café hangout;
- photography;
- park reading;
- rooftop gardening;
- sunset viewing;
- rainy-window sitting;
- casual cooking without chore need.

A cinema outing is desirable if interior/content capacity allows.

## 41.1 Picnic

Flow:

1. Buy/prepare food.
2. Carry picnic bag.
3. Choose valid park/beach area.
4. Place mat.
5. Sit.
6. Unpack food.
7. Eat.
8. Talk/use voice.
9. Optional simple card game.
10. Automatic Memory opportunity.

No score.

## 41.2 Kayak

At Bay Steps.

Flow:

1. Rent.
2. Complete first-time safety intro.
3. Launch.
4. Paddle rhythm.
5. Steer.
6. Travel within safe bay.
7. Two-person kayak if quality permits.
8. Scenic stopping points.
9. Return equipment.

No race is required.

## 41.3 Badminton

Simple physics-light recreation.

Can be:

- two players;
- player vs NPC;
- doubles later.

Scoring is activity-local only.

## 41.4 Mini-golf

Small six-hole course.

Purpose:

- playful competition;
- friendly score;
- quick outing;
- fun failure.

Score exists because the activity naturally has one, not because the main game needs XP.

## 41.5 Photography

Players can carry a camera/phone camera tool.

Photography supports:

- city exploration;
- personal Memory capture;
- light hobby challenges;
- NPC photo requests;
- framing scenic locations.

No social-media follower system.

---

# 42. AVATAR SYSTEM

Avatar identity is mandatory.

Players should recognize themselves or the version of themselves they want to inhabit.

## 42.1 Character creator categories

- body frame;
- height range;
- skin tone;
- face base;
- eyes;
- brows;
- nose;
- lips;
- hair;
- facial hair;
- hair color;
- glasses;
- earrings;
- headwear;
- home outfit;
- outdoor outfit;
- sleep outfit;
- work outfit by job;
- shoes;
- accessories.

V1 should prioritize quality over hundreds of weak options.

## 42.2 Body proportions

Stylized realistic.

Not chibi. Not hyperreal.

Slightly softened proportions may support warmth, but characters use human height, believable hands, believable movement, and readable faces.

## 42.3 Animation set

Core:

- idle;
- walk;
- jog;
- turn;
- sit;
- stand;
- crouch;
- sleep;
- wave;
- point;
- laugh;
- nod;
- hug where path/context allows;
- high-five;
- carry;
- pick up;
- place;
- cook;
- scrub;
- wipe;
- fold;
- water;
- type;
- cycle;
- scooter;
- kayak.

Animation blending quality is a release blocker.

---

# 43. FIRST-PERSON BODY IMPLEMENTATION

The local first-person body uses the same underlying avatar rig.

Techniques:

- hide local head geometry from main camera;
- retain head in shadow/reflection layers;
- render torso, arms, and legs;
- stabilize camera separately from raw head bone;
- use interaction IK targets;
- use foot placement where useful;
- allow body yaw to lag camera slightly within comfort range;
- rotate upper torso before feet where natural;
- let feet catch up smoothly.

No floating hands. No invisible body.

Mirror/reflection behavior must show the complete avatar where the rendering approach permits.

---

# 44. NPC WORLD SIMULATION

There are two NPC layers.

## 44.1 Named NPCs

Persistent, authored, remembered.

Named NPCs have:

- schedule;
- home/work association;
- relationship memory;
- dialogue state;
- event involvement;
- known facts;
- stage progression.

They must be synchronized consistently enough that household members encounter the same relevant state.

## 44.2 Ambient NPCs

Create city life.

Ambient NPCs may use deterministic local simulation.

They walk, sit, browse, cycle, stand at stalls, carry umbrellas, walk dogs, talk in pairs, and enter/leave buildings.

They do not require persistent identities.

## 44.3 NPC update tiers

Near:
- full skinned mesh;
- animation every frame;
- local avoidance;
- facial/gaze reaction.

Medium:
- reduced animation update;
- simplified behavior.

Far:
- impostor/billboard or low LOD;
- sparse update.

Culled:
- schedule simulated logically only.

---

# 45. NAMED NPC CAST — V1

## Roshan
Café owner.

Role: barista job, warm mentor, knows regulars, observes household milestones.

## Kamla Aunty
Resident/caretaker figure in Mogra Court.

Role: move-in welcome, building gossip, gentle safety net, repair/event comments.

## Ravi
Repair-shop owner.

Role: tools, DIY teaching, repair event fallback, furniture assembly.

## Meera
Market grocer.

Role: grocery familiarity, recipe hints, food storylines, festival ingredients.

## Dev
Cycle and scooter rental/repair.

Role: transport introduction, cycle maintenance, later scooter access.

## Naina
Plant-shop/nursery worker.

Role: plant adoption, gardening job, home greenery.

## Arjun
Waterfront rental attendant.

Role: kayak, bay safety, beach events.

## Isha
Community office/library worker.

Role: city notices, moving paperwork, hobby/community events, freelance workspace.

## Sana
Street-food/café-side vendor.

Role: evening food, local stories, weather chatter.

## Kabir
Neighbourhood resident / flexible recurring friend NPC.

Role: neighbour story arc, board game, community event, city belonging.

At least two additional residents should be added during content production to prevent the city from feeling like ten quest dispensers.

---

# 46. NPC MEMORY

Named NPCs remember discrete authored facts rather than unbounded generative memory.

Examples:

- first meeting;
- player works here;
- player helped them;
- household moved;
- household bought a plant;
- player visits often;
- player missed a promised event;
- player completed a story branch;
- player gave a gift;
- household celebrated a milestone.

State flags change later dialogue and event availability.

---

# 47. NPC DIALOGUE

V1 dialogue language is primarily natural English with light contextual Hindi/Hinglish phrasing where it feels normal.

Never exaggerate accent or stereotype.

Subtitles are always available.

Dialogue sources:

- handcrafted static line;
- contextual template;
- branch-specific line;
- time/weather line;
- relationship-memory line.

No generative AI dialogue is required for V1.

---

# 48. STORY ARCHITECTURE

Together uses a hybrid story system:

1. authored household chapters;
2. path-specific Couple/Friends events;
3. NPC relationship arcs;
4. dynamic life events;
5. ambient micro-moments.

The city stays open while the story evolves.

There is no conventional main quest marker permanently telling the player what to do.

A story can create a suggestion or situation without hijacking the session.

---

# 49. HOUSEHOLD PROGRESSION STAGES

Stages are internal narrative chapters. They are not displayed as “Level 1, Level 2.”

## Stage 0 — Arrival

Target: 30–60 minutes.

Events:

- household formed;
- property chosen;
- move-in;
- first groceries;
- first shared meal;
- first sleep;
- first Memory Book page.

Purpose: create ownership, establish city, establish relationship presence.

## Stage 1 — First Days

Target cumulative play: 1–4 hours.

Events:

- learn local market;
- meet Roshan;
- meet Kamla;
- choose first job;
- first real chore cycle;
- first leisure outing;
- first minor home purchase.

The home still looks sparse.

## Stage 2 — Settling In

Target cumulative play: 4–10 hours.

Events:

- job routine;
- more recipes;
- plant adoption;
- weather event;
- furniture assembly;
- named NPC familiarity;
- one path-specific domestic story.

The apartment begins to feel distinct.

## Stage 3 — Belonging

Target cumulative play: 10–20 hours.

Events:

- community involvement;
- deeper job trust;
- group/couple outings;
- block event;
- NPC side story;
- bigger home improvement;
- transport expansion;
- deeper personal rituals.

The city begins to feel known.

## Stage 4 — Growing Home

Target cumulative play: 20–30 hours.

Players face a meaningful life decision:

- renovate current home;
- or move.

Savings goal emerges naturally.

Moving/renovation becomes a major story arc.

## Stage 5 — Our Life

Target cumulative play: 30–40 hours.

This stage is personalized.

Focus:

- memories;
- long-term rituals;
- path-specific milestone;
- established NPC relationships;
- a fully lived-in home;
- meaningful final V1 chapter.

The ending is not dramatic.

The emotional climax should be:

> **“This place feels like ours.”**

## Stage 6 — Open Living

After the core arc:

- all normal systems continue;
- seasonal events continue;
- jobs continue;
- hobbies continue;
- home improvement continues;
- Memory Book grows;
- recurring stories continue;
- future content can attach here.

There is no end screen that stops play.

---

# 50. CORE STORY EVENTS

The previous 15-event library remains a strong content foundation but is updated for the new philosophy and visual/interaction model.

Canonical V1 core events include:

1. Move-In Day
2. First Dinner
3. The Great Pipe Disaster
4. The Power Cut
5. New Neighbour
6. Somebody Ate My Leftovers — Friends
7. A Quiet Anniversary — Couple
8. The Flat-Pack Problem
9. Adopt a Plant
10. The Freelance Deadline
11. Stuck Indoors
12. Job Good News
13. Housemate Birthday — Friends
14. Something Needs to Be Said — Couple
15. Block Evening / Street Gathering
16. Monsoon Leak
17. First Kayak Day
18. The Expensive Thing We Bought
19. Moving Day
20. First Night in the New Place

Calendar events may include birthday, Diwali/festival lighting, Christmas for households that opt into it, Valentine’s Day for Couple path, and New Year.

Calendar events should be configurable and respectful rather than mandatory assumptions.

---

# 51. STORY EVENT FORMAT

Every story event is data-driven.

```ts
type StoryEvent = {
  id: string
  path: ('couple' | 'friends' | 'all')[]
  stageRange: [number, number]
  triggers: Trigger[]
  blockingConditions?: Condition[]
  intro: NarrativeBeat
  tasks: StoryTask[]
  branches: StoryBranch[]
  outcomes: Outcome[]
  memoryRules: MemoryRule[]
  npcStateChanges?: NPCStateChange[]
  householdStateChanges?: HouseholdStateChange[]
  cooldown?: GameDuration
}
```

Do not hardcode individual event logic into UI components.

Story tasks may be:

- interaction;
- location visit;
- micro-action sequence;
- activity completion;
- purchase;
- co-presence timer;
- choice;
- household vote;
- NPC conversation;
- wait-for-world-state;
- memory/photo;
- optional freeform goal.

---

# 52. STORY FAILURE

Failure must exist.

Failure may change a branch, cost money, leave a room messy, produce awkward dialogue, create a funny object, change future NPC dialogue, or become a Memory.

Failure should rarely remove access permanently, destroy hours of progress, or punish a player who had to log off.

Examples:

- burned meal becomes “The Night We Burned the Rice”;
- bad furniture assembly makes a slightly wobbly version;
- missed job shift causes Roshan to joke about it later;
- moving box breaks a cheap mug and adds a memory;
- unresolved argument delays warm interactions until repaired.

---

# 53. COUPLE PATH

Couple mode emphasizes co-presence, small rituals, home decisions, dates, emotional repair, shared domestic milestones, and long-distance togetherness.

Exclusive/weighted stories:

- anniversary;
- quiet date;
- difficult conversation;
- surprise meal;
- weekend bay evening;
- shared purchase;
- moving decision;
- first festival together.

Relationship numbers remain invisible.

## 53.1 Couple persistence rules

Solo activity is allowed, but the game protects high-emotion shared milestones.

Examples of actions allowed solo:

- work;
- shop personal items;
- cook basic meal;
- clean;
- explore;
- tend plants;
- leave note;
- take personal photos.

Examples normally requiring both:

- move home;
- major renovation;
- large shared purchase;
- major Couple story resolution;
- anniversary conclusion.

---

# 54. FRIENDS PATH

Friends mode emphasizes shared chaos, asynchronous persistence, private space vs common space, contributions, group activities, teasing domestic conflicts, birthdays, parties, and shared goals.

Exclusive/weighted stories:

- leftovers;
- fridge space;
- roommate birthday;
- late-night game;
- contribution disagreement;
- PG landlord inspection;
- group picnic;
- moving into a bigger shared place.

## 54.1 Private bedrooms

Friends properties assign private or shared bedrooms.

Default:

- bedroom owner(s) control furniture/decor;
- others may enter unless household setting restricts;
- common rooms use shared permissions.

---

# 55. MULTIPLAYER HOUSEHOLD MODEL

## 55.1 Household limits

Couple: 2 players.

Friends: 2–6 players.

## 55.2 Party code

Household creation generates a 6-character human-readable code and share URL.

Code can be disabled/rotated after household formation.

## 55.3 Roles

Avoid heavy admin hierarchy.

Technical roles:

- creator;
- member.

Creator does not become a “boss” of the household.

Major actions use household voting rules.

---

# 56. MULTIPLAYER PERSISTENCE RULES

## 56.1 Couple mode

Co-presence-first.

Solo player may explore, work, earn, shop personal items, cook, perform basic chores, leave notes, and decorate personal details.

Shared-story resolutions wait where practical. Major shared home transformations require both.

## 56.2 Friends mode

Persistent.

Any member may continue chores, work, cook, buy normal shared groceries, decorate permitted common areas, and progress personal jobs.

Major household changes require vote.

Returning players receive a calm recap rather than a notification dump.

---

# 57. REAL-TIME NETWORK MODEL

## 57.1 Server-authoritative

Server owns:

- wallet balances;
- inventories;
- purchases;
- property;
- furniture persistence;
- major decor state;
- story state;
- story rewards;
- hidden household state;
- NPC persistent flags;
- job payouts;
- vote state;
- Memory metadata.

## 57.2 Client-responsive

Client owns immediate feel of movement input, camera, and local animation intent.

Movement is sent to server/peers as snapshots.

Server applies sanity validation, world-bound validation, and transport-state validation.

No expensive competitive anti-cheat is necessary in V1.

## 57.3 Snapshot target

Movement send: 12–20Hz depending on load.

Render: 60fps locally.

Remote players: snapshot interpolation, short extrapolation, animation state interpolation.

Never snap normal movement if avoidable.

---

# 58. VOICE SYSTEM

Built-in voice is optional.

## 58.1 V1 architecture

Use WebRTC audio, Socket.IO signaling, STUN, and TURN fallback using managed or self-hosted coturn.

For 2–6 household members, audio-only peer mesh is acceptable for initial V1 if tested. Migrate to SFU when larger rooms/public-city voice become required.

## 58.2 Modes

- Off
- Household voice
- Proximity voice

Proximity voice uses Web Audio spatialization, attenuates with world distance, and may dampen through walls/interior boundaries.

## 58.3 Privacy

Voice is off until user grants microphone permission. Show clear mic state. Support mute and push-to-talk. Do not record or store voice.

Players physically sitting together can disable built-in voice.

---

# 59. TEXT COMMUNICATION

V1 includes household sticky notes, short in-world messages, and an optional small text-chat overlay.

Notes may be placed on fridge, corkboard, desk, or door.

Do not turn the product into Discord inside a game.

---

# 60. OTHER REAL HOUSEHOLDS

Architecture should reserve a city-presence layer for future real households.

This is not required for initial V1 proof.

Future behavior:

- other households may appear on city streets;
- only nearby relevant transforms are subscribed;
- household interiors remain permissioned;
- public visibility is opt-in;
- city shards cap concurrency.

Do not delay V1 to solve MMO-scale presence.

---

# 61. MEMORY BOOK

The Memory Book is mandatory in V1.

## 61.1 Automatic memories

Possible automatic capture triggers:

- household move-in;
- first meal;
- first co-op chore;
- first rain outing;
- story completion;
- moving day;
- first night in new home;
- first kayak;
- birthday;
- meaningful NPC event;
- major home renovation;
- both players framed naturally during a special activity.

## 61.2 Smart capture

A memory screenshot should not fire simply because both avatars exist on screen.

Capture scoring considers:

- both players visible;
- not occluded;
- useful camera composition;
- story relevance;
- event state;
- time since previous automatic capture;
- scenic location;
- strong lighting state.

Automatic capture must be sparse enough to feel special.

## 61.3 Player capture

Dedicated photo key/button.

Photo mode may allow first/third-person, limited camera orbit, hide UI, expression/pose, timer, and small exposure adjustment.

No extreme filters required.

## 61.4 Memory entry

Each entry stores screenshot, household, participants, location, city time, weather, stage, story/event, caption, optional stickers, outcome, and associated NPCs.

## 61.5 Memory Book presentation

Scrapbook feel, but more mature than old pixel-art UI.

Visual materials:

- warm paper;
- subtle texture;
- photos;
- handwritten notes;
- tape;
- receipts;
- ticket stubs;
- map snippets;
- moving labels;
- pressed-leaf graphics.

A Moving Day page may include old-key illustration, last photo, box label, new address card, and first-night image.

---

# 62. USER INTERFACE PHILOSOPHY

The UI must disappear when not needed.

No permanent needs bars.

No permanent relationship bar.

No giant mini-map.

No floating icons covering the city.

## 62.1 Default HUD

Normally visible:

- tiny reticle/dot only when useful;
- contextual interaction prompt;
- subtle voice status when active;
- temporary notifications.

Optional small time/weather can be enabled in settings.

## 62.2 Life panel

`Tab`

Shows time, weather, personal money, household money, current household note, active story, and loose reminders.

Close returns to clean screen.

## 62.3 Map

`M`

Opens stylized city map.

Shows known locations, household home, party members, intentionally tracked story destination, and transport points.

No endless icon carpet.

## 62.4 Memory Book

`B`

Opens Memory Book.

## 62.5 Household board

Optional shortcut `C` or accessed physically.

Shows:

- current household notes;
- obvious chores;
- current shared goal;
- vote requests;
- recent shared transaction summary.

It must feel like a household object, not an admin dashboard.

---

# 63. UI VISUAL LANGUAGE

The UI should be warm and tactile without pretending the entire product is from the 1990s.

Visual qualities:

- soft off-white;
- warm neutral paper;
- charcoal text;
- muted sage/terracotta accents;
- restrained shadows;
- subtle physical texture;
- readable modern typography;
- handwritten accent only in Memory Book/notes.

Avoid:

- neon gamer HUD;
- excessive glassmorphism;
- oversized gradients;
- pixel fonts for normal reading;
- cluttered stat panels.

Recommended font strategy:

- UI sans: highly readable modern humanist sans;
- narrative/Memory accent: warm serif or handwritten style;
- monospaced font only for codes/invite fields.

Typography must support localization.

---

# 64. AUDIO DIRECTION

Audio must be realistic, warm, and spatial.

The old chiptune-only direction is retired.

## 64.1 Music philosophy

Music is sparse.

The world should often be heard without constant score.

Music appears around morning transition, home evening, café, story moments, Memory Book, waterfront golden hour, and special events.

Style direction:

- gentle piano;
- soft guitar;
- brushed percussion;
- warm synth;
- restrained ambient electronics;
- subtle Indian acoustic texture where appropriate.

Never melodramatic.

## 64.2 City sound layers

Per district combine base ambience, near traffic, distant traffic, birds, people, storefronts, fans/AC, sea, trees, electrical hum, scooters, autos, bells, pressure cooker, vendors, and weather.

Audio zones crossfade.

## 64.3 Indoor sound

Home includes fridge, ceiling fan, water, cloth, footsteps, dishes, balcony exterior bleed, rain on glass, and distant neighbour sounds.

Small domestic audio is critical.

---

# 65. TECHNICAL STACK

## 65.1 Programming language

Use **TypeScript** for all new application code.

Do not continue growing a large JavaScript-only codebase.

Reasons:

- shared network types;
- content schema safety;
- event contracts;
- renderer/system interfaces;
- database typing;
- refactor safety.

## 65.2 Monorepo

Use pnpm workspaces.

Recommended structure:

```text
together/
  client/
  server/
  shared/
  content/
  tools/
  docs/
```

## 65.3 Client

- TypeScript
- React 18+
- Vite
- Three.js current stable
- `three/webgpu`
- TSL
- Zustand
- Rapier JS/WASM
- Socket.IO Client
- Supabase JS
- Zod
- React Router
- Web Audio API
- WebRTC APIs
- Vitest
- Playwright

React controls UI.

Three.js controls world.

Do not put the primary real-time game loop inside React reconciliation.

## 65.4 Server

- Node.js 24 LTS (current LTS at this PRD date)
- TypeScript
- Express — preserve and modernize the existing server foundation; do not split V1 across multiple HTTP frameworks
- Socket.IO
- Zod validation
- PostgreSQL through Supabase
- Supabase Auth verification
- Supabase Storage
- Drizzle ORM + PostgreSQL driver for typed server-side schema/query access
- Redis only when required for horizontal scale / Socket.IO adapter / ephemeral coordination
- Vitest or Node test runner
- structured logging

## 65.5 Authentication

Use Supabase Auth.

Support:

- anonymous sign-in for first session;
- later account linking;
- email/passwordless/OAuth upgrade.

This fits the requirement that an invited person can join quickly without heavy account friction.

Anonymous users still receive an authenticated identity for household permissions.

## 65.6 Database

Supabase Postgres.

Use migrations, RLS where client data access is exposed, and server-owned writes for authoritative game systems.

## 65.7 Storage

Supabase Storage initially.

Store Memory screenshots, optional avatar thumbnails, and generated share cards.

Do not store voice audio or raw microphone data.

---

# 66. CLIENT ARCHITECTURE

```text
client/src/
  app/
    routes/
    providers/
  game/
    GameEngine.ts
    GameLoop.ts
    Renderer.ts
    SceneManager.ts
    WorldStreamer.ts
    InputManager.ts
    CameraController.ts
    physics/
    world/
    player/
    npc/
    interaction/
    transport/
    audio/
    weather/
    lighting/
    memory/
  network/
    socket.ts
    interpolation/
    voice/
  state/
    sessionStore.ts
    householdStore.ts
    uiStore.ts
    storyStore.ts
  ui/
    screens/
    panels/
    hud/
  assets/
    manifest.ts
```

Rule: the Three.js world must remain framework-independent enough to run/update without React rerendering every object.

---

# 67. SCENE / ZONE ARCHITECTURE

Do not create a heavy “one Three.Scene per room” model unless needed.

Preferred V1:

- persistent World Scene shell;
- streamed city chunks;
- streamed interior zones;
- activity sub-scenes only when a special camera/mechanic strongly benefits.

Interior transition may use fade, streamed geometry swap, or portal/zone technique.

The city does not need to remain fully rendered while inside a closed apartment.

Scene/zone responsibilities must be explicit:

- load/unload;
- audio environment;
- navmesh;
- collision;
- lighting profile;
- interaction registry;
- network subscription scope.

---

# 68. SERVER ARCHITECTURE

```text
server/src/
  index.ts
  auth/
  api/
  sockets/
    rooms/
    movement/
    household/
    story/
    economy/
    voiceSignaling/
  game/
    TimeService.ts
    WeatherService.ts
    StoryService.ts
    HouseholdService.ts
    EconomyService.ts
    NPCStateService.ts
    MemoryService.ts
    JobService.ts
  db/
    migrations/
    repositories/
  content/
  validation/
```

The server is authoritative for persistent game consequences, not every animation frame.

---

# 69. DATABASE MODEL

Core tables:

## users

- id
- auth_user_id
- display_name
- avatar_config
- settings
- created_at
- last_seen

## households

- id
- type
- name
- property_id
- stage
- shared_wallet
- hidden_state
- created_at
- active_time_seconds

## household_members

- household_id
- user_id
- personal_wallet
- membership_state
- bedroom_id
- joined_at

## properties

- id
- city_id
- property_type
- building_id
- unit_id
- base_layout_id

## household_home_state

- household_id
- surface_config
- furniture
- decor
- inventory
- room_states
- renovation_flags

## inventories

- owner_type
- owner_id
- item_id
- quantity
- metadata

## transactions

- id
- household_id
- user_id
- wallet_type
- amount
- type
- item_ref
- created_at

## jobs

- user_id
- job_id
- trust_state
- sessions
- quality_state
- unlock_flags

## story_instances

- id
- household_id
- event_id
- state
- branch
- task_state
- started_at
- resolved_at

## npc_relationships

- household_id
- npc_id
- flags
- familiarity
- last_interaction

## memories

- id
- household_id
- type
- screenshot_path
- caption
- metadata
- created_at

## household_notes

- id
- household_id
- author
- text
- placement
- created_at

## votes

- id
- household_id
- type
- payload
- state
- expires_at

No hidden simulation variable should require a schema migration for every tiny tuning parameter. Use typed JSON where variability is intentional, relational columns where query integrity matters.

---

# 70. SOCKET ROOM MODEL

Rooms:

- `user:{id}`
- `household:{id}`
- `city:{cityId}:shard:{shardId}`
- `interior:{householdId}:{zoneId}` where needed
- `voice:{householdId}` signaling only

A client subscribes only to rooms required by its current context.

City movement for future public households must use interest management rather than broadcasting every player to every client.

---

# 71. SOCKET EVENT FAMILIES

Movement:

- `player:join`
- `player:snapshot`
- `player:animation`
- `player:gesture`
- `player:transport_state`
- `player:leave`

Household:

- `household:snapshot`
- `household:member_state`
- `household:vote_open`
- `household:vote_cast`
- `household:vote_resolve`
- `household:move_prepare`
- `household:move_commit`

Home:

- `home:furniture_place`
- `home:furniture_move`
- `home:furniture_remove`
- `home:surface_change`
- `home:object_state`
- `home:chore_state`
- `home:repair_state`
- `home:renovation_state`

Story:

- `story:trigger`
- `story:task_update`
- `story:choice`
- `story:branch`
- `story:resolve`

Economy:

- `wallet:update`
- `wallet:transfer`
- `inventory:update`
- `purchase:request`
- `purchase:result`
- `job:shift_start`
- `job:shift_update`
- `job:shift_end`

Memory:

- `memory:capture_request`
- `memory:created`
- `memory:caption_update`

Voice signaling:

- `voice:join`
- `voice:offer`
- `voice:answer`
- `voice:ice`
- `voice:mute_state`
- `voice:leave`

All authoritative payloads are runtime-validated with shared schemas.

Never trust client-supplied price, reward amount, story reward, inventory quantity, or permission state.

---

# 72. CONTENT DATA ARCHITECTURE

Game content should be data-driven and validated at build time.

Store typed content for:

- recipes;
- jobs;
- NPC schedules;
- NPC dialogue;
- story events;
- items;
- furniture;
- shops;
- leisure activities;
- weather profiles;
- properties;
- renovation options;
- transport definitions;
- Memory rules;
- audio zones;
- interaction definitions.

Content changes should rarely require engine changes.

Recommended:

```text
content/
  items/
  recipes/
  properties/
  furniture/
  jobs/
  stories/
    shared/
    couple/
    friends/
    npc/
  npcs/
  dialogue/
  city/
  weather/
  activities/
```

Build-time validation should fail CI for invalid references.

---

# 73. ITEM SYSTEM

Each item defines a stable ID and typed behavior.

```ts
type ItemDefinition = {
  id: string
  category: string
  displayName: string
  description?: string
  price?: number
  stackSize?: number
  model?: AssetRef
  icon?: AssetRef
  interactionTags?: string[]
  useTags?: string[]
  placement?: PlacementRules
  recipeTags?: string[]
  persistence: 'personal' | 'household' | 'world'
  sellValue?: number
  sentimental?: boolean
}
```

Avoid special-case hardcoded furniture or groceries.

---

# 74. FURNITURE SYSTEM

Each furniture definition includes:

- stable ID;
- model;
- collision proxy;
- placement footprint;
- rotation rules;
- supported surfaces;
- interaction sockets;
- seat sockets;
- storage capacity if applicable;
- light component if applicable;
- home-state impact tags;
- price;
- sell value;
- room recommendations;
- variants/material options;
- LOD assets.

Furniture placement must be authoritative enough to prevent conflicting state but responsive locally.

Recommended flow:

1. Player enters decorate mode.
2. Client previews ghost object locally.
3. Placement rules validate locally.
4. On confirm, client submits placement intent.
5. Server validates ownership, funds if purchasing, room permission, and basic bounds.
6. Server commits.
7. All household clients receive canonical furniture state.

---

# 75. DECORATE MODE

Decoration should not require leaving the actual room.

When enabled:

- first-person control transitions to a controlled free/overhead camera;
- room remains visible in real 3D;
- catalog drawer appears;
- placement grid is optional and subtle;
- snapping can be toggled;
- rotation can be free or fixed increments depending on item;
- collision/overlap warnings appear softly.

For accessibility and ease, users can toggle:

- wall snapping;
- surface snapping;
- 15° rotation;
- 45° rotation;
- free rotation.

The system should support imperfect human placement rather than forcing every object into a rigid grid.

---

# 76. HOME CLUTTER SYSTEM

The home should visibly reflect life without generating random garbage everywhere.

Clutter is rule-based.

Examples:

Kitchen clutter candidates:

- cups;
- plate;
- grocery bag;
- spice container;
- dish towel.

Living room:

- book;
- mug;
- throw blanket;
- bag;
- slippers.

Bedroom:

- clothing item;
- charger;
- book;
- pillow state.

Clutter positions use authored sockets on surfaces.

No prop is placed where it blocks navigation or key interactions.

---

# 77. REPAIR SYSTEM

Objects can enter repairable states through story or gentle wear.

V1 repair targets:

- leaking pipe;
- flickering light;
- loose chair/table;
- bicycle tire;
- jammed drawer;
- faulty tap.

Player options:

- DIY if they have tool/knowledge;
- ask Ravi;
- pay for service;
- temporarily ignore.

Ignoring changes the world/story but does not catastrophically destroy property.

---

# 78. TRANSACTION AND SAVE SAFETY

All consequence-changing operations use idempotency keys.

Examples:

- purchase;
- job payout;
- story reward;
- moving transaction;
- furniture purchase;
- refund;
- Memory creation triggered by story.

If a network retry repeats the same request, server returns the previous result rather than awarding twice.

Use database transactions for actions that modify multiple authoritative records.

---

# 79. SAVE MODEL

Persist meaningful state immediately or transactionally.

Immediate:

- purchase;
- wallet;
- furniture placement;
- story task;
- moving choice;
- property assignment;
- inventory transfer;
- renovation.

Debounced:

- last position;
- camera-independent local state;
- minor settings;
- some decor drag previews.

Crash recovery must restore the last committed household state without duplicating rewards.

---

# 80. NETWORK FAILURE HANDLING

If Socket.IO briefly disconnects:

- local camera and movement remain responsive for a short grace window;
- authoritative purchases/story actions disable temporarily;
- remote players fade to reconnect state instead of teleporting immediately;
- a small non-alarming connection indicator appears;
- reconnect requests a full household/zone snapshot;
- local stale writes are reconciled explicitly.

Never let a two-second connection drop destroy immersion.

If reconnection fails longer:

- return player to safe pause/connection screen;
- do not silently discard confirmed actions.

---

# 81. OFFLINE / ASYNC BEHAVIOR

V1 is online-first and does not require full offline gameplay.

If a household member is offline:

Couple:
- shared critical story pauses where appropriate.

Friends:
- others continue.

Returning member gets a gentle recap, for example:

> “While you were away: Mira bought a lamp, Kabir finished the laundry, and the pothos grew a new leaf.”

Avoid a feed of 17 system notifications.

---

# 82. AUTHENTICATION AND ONBOARDING IDENTITY

The fastest first session is more important than forcing account creation before emotional value is demonstrated.

Preferred flow:

1. Anonymous authenticated session created.
2. Player sets display name/avatar.
3. Player joins/creates household.
4. After first meaningful session, game offers to secure account with email/OAuth.
5. Anonymous account can be linked without losing household identity.

Do not allow an anonymous user who cleared storage to claim an existing account without proof.

---

# 83. ACCESSIBILITY

Required V1:

- rebindable keyboard controls;
- controller support target;
- FOV slider;
- head bob slider/off;
- camera shake slider/off;
- subtitle toggle;
- subtitle scale;
- UI scale;
- color-independent interaction indicators;
- reduced motion;
- audio sliders by category;
- voice volume/mute;
- high-contrast interaction prompt option;
- hold/toggle alternatives for repetitive interactions;
- mouse sensitivity sliders by perspective.

Accessibility settings must be reachable before entering the 3D world.

---

# 84. LANGUAGE AND LOCALIZATION

## 84.1 V1 language

UI and primary narrative: English.

Ambient dialogue may include natural Indian phrases and local words.

Do not require Hindi knowledge to understand game systems.

## 84.2 Localization architecture

All user-facing strings use localization keys from day one.

Future packs may include Hindi, Japanese, regional Indian languages, and others.

Do not hardcode UI copy deep inside game systems.

## 84.3 Signage

World signage can include tasteful multilingual texture:

- English primary where gameplay-relevant;
- Devanagari or regional script selectively;
- numbers/icons recognizable regardless of language.

Do not use decorative pseudo-Japanese text merely to create “Japan vibes.” Spatial design, not imitation typography, carries that influence.

---

# 85. ART DIRECTION — STREET DETAIL BIBLE

## 85.1 Streets

Believable combinations of:

- curbs;
- drains;
- manhole covers;
- road patches;
- lane markings;
- faded paint;
- utility poles;
- cable bundles;
- sign brackets;
- building numbers;
- plant spillover;
- parked bicycles;
- scooters;
- occasional auto;
- delivery crates;
- bins;
- planters;
- benches;
- awnings;
- puddle depressions;
- wall stains near drainage.

Never distribute clutter purely randomly. Use authored composition zones and semantic placement rules.

## 85.2 Building base contact

Every building must convincingly meet the ground.

Include some combination of:

- plinth;
- step;
- threshold;
- drain;
- planter;
- wall discoloration;
- curb transition;
- entry mat;
- service conduit.

Avoid “box floating on plane.”

---

# 86. ART DIRECTION — BUILDINGS

Hero buildings need:

- readable entrance;
- ground-floor depth;
- windows with inset;
- curtains/blinds;
- AC/exhaust units;
- balcony rail;
- drainage;
- signs;
- warm interior light;
- roof silhouette;
- plants;
- believable service side.

Residential windows should vary subtly based on household occupancy and time.

At night:

- some windows dark;
- some warm;
- some curtain silhouettes;
- active player home recognizable without becoming a beacon.

---

# 87. ART DIRECTION — INTERIORS

Interiors require:

- skirting/baseboards where style calls for it;
- switches;
- plugs;
- door frames;
- handles;
- shelves;
- small clutter;
- cloth;
- utensils;
- appliances;
- soft shadow grounding;
- different acoustic feel;
- slight material imperfections;
- believable storage.

A beautiful empty room is not enough.

Home interiors should gain detail as the household accumulates things.

---

# 88. ART DIRECTION — VEGETATION

Vegetation is a signature quality bar.

Trees must not look like repeated green spheres.

Each species needs:

- unique trunk silhouette;
- branch distribution;
- canopy mass pattern;
- leaf color range;
- season/weather response;
- near/mid/far LOD.

Wind:

- trunk mostly stable;
- branches subtle;
- small foliage more active;
- gust response during monsoon.

Bushes and grass must vary height and hue.

Use vegetation to frame views and hide streaming transitions.

---

# 89. ART DIRECTION — COLOR

Base palette is natural, warm, and restrained.

World families:

- warm concrete;
- sage foliage;
- deep green;
- off-white;
- muted terracotta;
- dusty blue;
- warm timber;
- desaturated mustard;
- charcoal;
- rainy cool grey;
- monsoon teal;
- evening amber.

Avoid neon game colors, plastic saturation, pure white, pure black, and uniform green vegetation.

Color changes by light and weather rather than simply swapping LUTs.

---

# 90. CHARACTER ART DIRECTION

Characters should read clearly at 5–20m, feel warm and approachable, use realistic clothing proportions, avoid glossy skin, avoid doll/plastic appearance, support expressive face and posture, and fit both first-person embodiment and third-person social viewing.

Facial expression should be subtle enough not to become cartoon-emote spam.

Outfits should reflect modern everyday Indian urban life without reducing identity to cultural costume.

---

# 91. AUDIO IMPLEMENTATION

Use a Web Audio API-based audio manager.

Mix buses:

- music;
- ambience;
- world SFX;
- UI;
- voice.

Support:

- positional emitters;
- distance curves;
- simple occlusion approximation;
- room reverb profiles;
- low-pass through walls where useful;
- smooth district crossfades;
- ducking during important dialogue only when necessary.

---

# 92. NAMED LOCATION AUDIO PROFILES

## Mogra Court

- ceiling fans from open windows;
- distant TV;
- pressure cooker;
- birds;
- scooter ignition;
- footsteps;
- children distant at certain hours.

## Lantern Street

- conversation;
- cups;
- shop doors;
- occasional auto horn;
- café machine;
- market bags/crates;
- food sizzle.

## Mogra Park

- leaves;
- birds;
- fountain;
- shuttlecock/badminton;
- children distant;
- quiet evening insects.

## Bay Steps

- sea;
- wind;
- birds;
- bicycle tires;
- distant city;
- pier creak;
- rain on stone during monsoon.

## Rain Tree Lane

- leaves;
- dripping water;
- repair shop;
- quiet voices;
- bicycle bell;
- workshop hand tools.

---

# 93. MUSIC STATES

Music should react to context without feeling like a constant game soundtrack.

States:

- main menu;
- first arrival;
- morning light;
- café work;
- home evening;
- golden-hour waterfront;
- gentle story resolution;
- Memory Book;
- festival/event.

Silence/ambience is a valid and frequent state.

---

# 94. LEISURE CONTENT TARGET — V1

At release-quality V1, at least eight activities must be genuinely playable, not menu placeholders:

1. Picnic
2. Cycling
3. Kayak
4. Badminton
5. Mini-golf
6. Café hangout
7. Board/card game
8. Photography

Nice-to-have ninth/tenth:

- cinema;
- arcade.

---

# 95. JOB CONTENT TARGET — V1

At least four meaningful jobs:

1. Café Barista
2. Market Helper
3. Delivery Rider
4. Plant Nursery Assistant

Freelance may be fifth if the interaction quality threshold is met.

---

# 96. CHORE CONTENT TARGET — V1

At least eight fully animated chore systems:

1. Dishes
2. Trash
3. Laundry
4. Sweep/vacuum
5. Plant watering
6. Grocery restock
7. Bathroom clean
8. Repair

Cooking is deeper than a chore and has its own system.

---

# 97. HOME CONTENT TARGET — V1

At least:

- five starting property presets;
- eighty furniture/decor items;
- twenty wall/floor finish combinations;
- twenty plants/decorative greenery options;
- fifteen lighting/decor options;
- three meaningful renovation options per eligible home category.

Quality beats inflated catalog count.

---

# 98. STORY CONTENT TARGET — V1

Minimum content target:

- six progression stages plus open living;
- twenty shared household events;
- eight Couple-weighted/exclusive events;
- eight Friends-weighted/exclusive events;
- ten named NPC mini-arcs;
- twenty ambient micro-events;
- complete moving-house arc;
- renovation arc;
- seasonal hooks.

Not all content must be long.

A good 90-second event can be more memorable than a 20-minute quest.

---

# 99. AMBIENT MICRO-EVENT EXAMPLES

- cat blocks staircase;
- neighbour asks player to hold a parcel;
- sudden light rain;
- street musician appears;
- market discount;
- lost umbrella;
- café is out of one ingredient;
- bicycle tire is low;
- household plant flowers;
- power flickers;
- bird lands on balcony;
- laundry gets caught by wind;
- delivery arrives while both players cook;
- auto driver remembers destination;
- construction reroutes one lane;
- café regular leaves behind a book;
- market closes early during heavy rain;
- waterfront vendor gives extra chai after a late shift;
- neighbour’s moving boxes temporarily fill hallway;
- stray dog follows the player for part of a walk.

These make repeated city life feel less static without becoming quests.

---

# 100. TUTORIAL DESIGN

Tutorial is contextual.

Do not begin with walls of text.

First day teaches move, look, interact, toggle camera, open map, pick/place, money, and household interaction only when relevant.

Players can ignore nonessential tutorial steps.

Tutorial prompts never pause another remote player’s game unless a shared onboarding beat explicitly requires both.

---

# 101. FIRST 30 MINUTES — REQUIRED EXPERIENCE

A polished V1 must make this flow possible:

1. Avatar created.
2. Household formed.
3. Partner/friends join.
4. Property chosen.
5. Move-in starts.
6. Boxes enter home.
7. One room personalized.
8. City explored.
9. Market visited.
10. First groceries bought.
11. First meal made.
12. First Memory captured.

This is the onboarding vertical slice.

---

# 102. V1 “EVENING TEST”

A build is not considered emotionally successful until two testers can independently describe an evening similar to:

- met after work;
- took bicycles to waterfront;
- bought something small;
- came home in rain;
- changed into home clothes;
- cooked;
- cleaned a little;
- sat together;
- checked Memory Book.

The systems must flow without a quest designer manually forcing each step.

---

# 103. PERFORMANCE QUALITY TIERS

## Low

- WebGL2 fallback possible;
- reduced vegetation;
- reduced shadows;
- reduced reflections;
- 30fps target.

## Medium

- default;
- WebGPU preferred;
- balanced vegetation;
- dynamic weather;
- 60fps target.

## High

- denser vegetation;
- longer LOD range;
- enhanced post;
- better reflections;
- high shadow quality.

## Ultra / Capture

- optional;
- not required for normal gameplay;
- intended for screenshots/high-end GPU.

Quality tier changes must not alter gameplay-relevant collision or interactions.

---

# 104. ENGINE RULES

1. Never create expensive Three.js objects every frame.
2. Dispose GPU resources explicitly.
3. Reuse geometry/materials.
4. Instance repeated props.
5. Merge static geometry where appropriate.
6. All authoritative economy/story writes go through server.
7. React never owns per-frame world transforms.
8. Content systems are data-driven.
9. No numeric needs/relationship HUD.
10. First-person interactions are designed before third-person polish.
11. Every new city object declares LOD, collision, and interaction behavior.
12. Every networked system has reconnect behavior.
13. Every story outcome is persistable and idempotent.
14. Every performance-sensitive system exposes debug metrics.
15. No second city until V1 Amaya Bay passes Definition of Done.
16. Shipping art cannot use prototype primitive trees/buildings where they are visible in primary routes.
17. Do not use timers as substitutes for promised embodied actions.
18. Avoid per-frame React state updates from the render loop.
19. Keep player input latency independent of server round trip.
20. Maintain deterministic content IDs across saves.

---

# 105. DEVELOPMENT DEBUG TOOLS

Required internal tools:

- free-fly camera;
- teleport menu;
- time slider;
- weather selector;
- season selector;
- hidden-state inspector;
- NPC schedule inspector;
- named-NPC state editor;
- network latency simulator;
- packet loss simulator;
- household money editor;
- story trigger panel;
- content unlock/reset;
- Memory capture debug;
- chunk bounds viewer;
- streaming residency viewer;
- draw-call counter;
- triangle counter;
- GPU timing where available;
- collider viewer;
- navmesh viewer;
- interaction socket viewer;
- audio-zone viewer;
- light count/shadow debug;
- LOD force selector.

A game this systemic cannot be efficiently built without strong debug tooling.

---

# 106. TESTING

## 106.1 Unit tests

Test economy, inventory, story conditions, story branch resolution, household voting, hidden-state transitions, time conversion, recipe validation, item definitions, save serialization, transaction idempotency, and permission rules.

## 106.2 Integration tests

Test create household, invite/join, purchase, shared wallet update, furniture sync, story sync, reconnect, duplicate reward prevention, moving-house transaction, Couple shared-decision rules, Friends async changes, and inventory transfer.

## 106.3 Browser E2E

Playwright covers login/anonymous entry, avatar flow, household create/join, property selection, basic world boot, settings, Memory Book, and reconnect UI.

3D interaction quality still requires manual and screenshot-based testing.

## 106.4 Multiplayer soak

Simulated/automated clients cover:

- 2-player Couple room;
- 6-player Friends room;
- movement bursts;
- inventory changes;
- repeated reconnect;
- furniture edits;
- voice signaling;
- story progression.

---

# 107. CI / QUALITY GATES

Every PR to main requires:

- TypeScript check;
- lint;
- unit tests;
- integration tests;
- production build;
- content schema validation;
- asset-manifest validation;
- no missing referenced asset IDs.

Milestone branches additionally run:

- Playwright smoke;
- bundle-size report;
- performance benchmark;
- broken-link/content-reference scan.

---

# 108. OBSERVABILITY

V1 production should capture:

- client errors;
- server errors;
- disconnect rate;
- reconnect rate;
- world load time;
- chunk load time;
- frame-time bucket;
- story failure due to technical error;
- purchase transaction failure;
- Memory upload failure;
- voice connection failure counts.

Do not collect invasive personal analytics.

Voice data is never recorded.

---

# 109. SECURITY

Required:

- JWT validation;
- server authorization for household actions;
- request rate limiting;
- invite-code rate limiting;
- text length limits;
- input sanitization;
- storage access policy;
- no client-authoritative wallet mutation;
- no client-authoritative story rewards;
- signed/authorized Memory access;
- private household data by default;
- server-side validation of property/home permissions;
- audit log for high-value shared transactions.

---

# 110. PRIVACY

Default:

- household interior private;
- Memory Book private to household;
- screenshots private;
- notes private;
- voice ephemeral;
- no voice recording;
- no public profile required;
- no real name required.

Future public-city presence must be opt-in.

---

# 111. BUILD PLAN

The order is dependency-driven. A phase is not complete because code exists; it is complete when its experiential exit condition passes.

## Phase 0 — Technical Foundation

Goal: reliable WebGPU-first engine skeleton.

Deliver:

- TypeScript migration foundation;
- renderer;
- WebGL2 fallback;
- game loop;
- input;
- Rapier;
- debug overlay;
- asset loader;
- chunk framework;
- client/server shared types;
- auth proof;
- socket proof.

Exit: two browsers connect and see placeholder players.

## Phase 1 — World Feel Prototype

Goal: prove that walking through Amaya Bay feels good.

Deliver:

- one polished street;
- first-person embodied controller;
- third-person toggle;
- lighting cycle;
- vegetation;
- one hero building;
- weather test;
- audio zone;
- ambient NPC walkers;
- bicycle placeholder.

Exit criteria: a tester willingly walks around without needing a task.

Do not proceed if world feel is weak.

## Phase 2 — Complete City Shell

Goal: Amaya Bay exterior complete enough for traversal.

Deliver:

- all districts blockout;
- roads;
- paths;
- waterfront;
- park;
- hero landmarks;
- streaming;
- LOD;
- city audio;
- transport routes;
- navmesh;
- performance budgets.

Exit: city can be walked end to end and retains target frame time.

## Phase 3 — Character Identity

Goal: players feel embodied.

Deliver:

- avatar creator;
- proper rig;
- locomotion;
- first-person body;
- gestures;
- remote-avatar interpolation;
- clothing contexts.

Exit: two players can recognize each other and move naturally.

## Phase 4 — Household Formation

Goal: people become a household.

Deliver:

- anonymous entry;
- create/join code;
- Couple/Friends;
- property preview;
- vote;
- starter-property assignment;
- opening move-in sequence.

Exit: two separate devices can create a home together.

## Phase 5 — Home System

Goal: home is persistent and personal.

Deliver:

- interiors;
- furniture placement;
- surface changes;
- lighting;
- storage;
- persistence;
- shared sync;
- personal bedrooms;
- basic hidden home state.

Exit: players return after reload and home is unchanged.

## Phase 6 — Micro-Life Vertical Slice

Goal: prove daily living.

Deliver:

- dishes;
- trash;
- plant care;
- laundry;
- cooking base;
- grocery shopping;
- hunger/tired contextual state;
- sitting/sleeping.

Exit: a complete evening at home is enjoyable.

## Phase 7 — Economy and Jobs

Goal: create aspiration loop.

Deliver:

- wallets;
- transactions;
- Café job;
- Market job;
- Delivery;
- Nursery;
- shop purchasing;
- furniture economy.

Exit: players can earn, save, and visibly improve home without feeling trapped in grind.

## Phase 8 — City Life and Leisure

Goal: city becomes a place to spend time.

Deliver:

- bicycle;
- scooter;
- auto transit;
- picnic;
- badminton;
- kayak;
- mini-golf;
- café hangout;
- photography;
- NPC schedules.

Exit: a 30-minute session can contain no chores/jobs and still be worthwhile.

## Phase 9 — Story Engine

Goal: life acquires continuity.

Deliver:

- stage engine;
- shared-event foundation;
- Couple content;
- Friends content;
- named-NPC flags;
- failure branches;
- dynamic triggers.

Exit: two households can play the same number of hours and receive meaningfully different sequences.

## Phase 10 — Memory Book

Goal: turn play into history.

Deliver:

- capture scoring;
- manual photo;
- Memory Book;
- captions;
- moving/event layouts;
- share export.

Exit: testers voluntarily open it and discuss older sessions.

## Phase 11 — Home Growth and Moving

Goal: create long-term life progression.

Deliver:

- renovation;
- property listings;
- property visits;
- savings goals;
- moving boxes;
- keep/sell/donate;
- move transaction;
- unpack;
- moving memories.

Exit: moving house feels like a life event, not a save-slot operation.

## Phase 12 — Voice and Social Polish

Goal: remote togetherness feels natural.

Deliver:

- WebRTC;
- mic controls;
- household voice;
- proximity voice;
- sticky notes;
- gestures;
- spatialization.

Voice may ship earlier experimentally, but production hardening happens here.

## Phase 13 — Content Completion

Deliver:

- story target counts;
- NPC arcs;
- all jobs;
- all core leisure;
- all property presets;
- furniture catalog;
- complete sound pass;
- art replacement;
- tutorial copy;
- localization keys.

## Phase 14 — Performance / Polish / Release

Deliver:

- quality tiers;
- fallback testing;
- accessibility;
- onboarding;
- controller;
- network resilience;
- browser matrix;
- playtest;
- bug fixes.

---

# 112. V1 DEFINITION OF DONE

V1 is not done because the codebase has all named systems.

It is done when all of the following are true.

## World

- Amaya Bay is visually cohesive.
- All districts are traversable.
- Day/night works.
- Rain works.
- City sounds alive.
- Core named NPCs follow believable routines.
- 60fps Medium target is met on target class hardware.

## Presence

- Two players join easily.
- Remote movement looks smooth.
- First-person body feels correct.
- Third-person toggle feels correct.
- Shared interactions look embodied.
- Voice can be enabled without destabilizing gameplay.

## Home

- Property chosen together.
- Interior customizable.
- Furniture persists.
- Chores physically change environment.
- Couple and Friends persistence rules work.
- Renovation works.
- Moving works.

## Life

- Four jobs are playable.
- Eight chores are animated.
- Eight leisure activities are playable.
- Money enables home progression without stressful survival.
- Food/shopping loop works end to end.

## Story

- Stage progression works.
- Core events branch.
- Failure changes outcomes.
- Named NPCs remember important events.
- Couple/Friends contextual content differs.

## Memory

- Automatic capture works.
- Manual capture works.
- Memories persist.
- Moving Day produces a meaningful spread.
- Sharing export works.

## Quality

- No numeric relationship/needs HUD.
- No box-city placeholder assets remain on shipping primary routes.
- No core interaction is a fake timer where embodied action is promised.
- Reconnect does not corrupt household state.
- Production build passes automated suite.
- At least five real pairs/groups can complete onboarding without developer help.

---

# 113. PRODUCT ACCEPTANCE TESTS

## Test A — The Quiet Walk

Give a tester no mission.

Ask them to walk from Mogra Court to Bay Steps.

Success: they notice and mention lighting, vegetation, NPCs, sound, storefronts, weather, or city detail.

If they ask “what am I supposed to do?” within one minute, the world is not yet strong enough.

## Test B — The Shared Kitchen

Two players buy groceries and cook.

Success: they naturally divide tasks, communicate, notice each other, laugh at a mistake, and sit/eat.

If the experience feels like two separate minigames sharing a score, redesign it.

## Test C — The Money Test

Give players enough for basic life but not dream furniture.

Success:

> “Let’s do one café shift so we can afford that lamp/sofa.”

Failure:

> “We have to grind money or the game punishes us.”

## Test D — The Rain Test

Trigger evening rain.

Success: players willingly change what they were doing — go home, sit in café, walk in rain, watch from balcony, or cook.

Weather should create mood and choice.

## Test E — The Moving Test

Move a household after substantial simulated progression.

Success: players hesitate over what to keep.

That hesitation proves possessions have acquired emotional meaning.

## Test F — The Memory Test

Show Memory Book after multiple sessions.

Success: players remember events because images and objects trigger real shared recollection.

## Test G — The No-HUD Test

Hide all optional UI.

Success: player can still understand whether they are tired, hungry, at home, in rain, and near an interaction through world feedback.

## Test H — The Solo Return Test

A Friends member logs in after others played.

Success: changes feel like returning to a lived home, not opening a database diff.

---

# 114. ECONOMY TUNING TARGETS

These values are initial balancing anchors, not immutable final numbers.

Starting shared funds: ₹8,000.

Starting personal funds: ₹1,500 each.

Example low-cost items:

- cup/plate set: ₹150–300;
- small plant: ₹250–500;
- lamp: ₹500–900;
- rug: ₹700–1,500.

Mid-range:

- small table: ₹1,200–2,000;
- chair pair: ₹1,500–2,500;
- sofa: ₹3,000–5,500;
- bed: ₹3,500–6,500.

Aspirational:

- premium sofa: ₹8,000+;
- major appliance upgrade: ₹5,000–10,000;
- major renovation: ₹12,000–35,000;
- moving costs/deposit: tuned to require planning but not weeks of grind.

Typical 8-minute job payout target:

- early: ₹500–800;
- established: ₹800–1,200;
- high-trust/special shift: ₹1,100–1,500.

The goal is that one enjoyable shift can noticeably contribute toward a small desired purchase.

---

# 115. WORLD SCHEDULE PRINCIPLES

Named businesses use believable but gameplay-friendly hours.

Example:

Café Roshan:
- opens 07:00;
- closes 22:00.

Market:
- opens 07:00;
- closes 21:00.

Nursery:
- opens 09:00;
- closes 19:00.

Kayak rental:
- opens 08:00;
- closes near sunset;
- closes in dangerous weather.

Closed locations should still feel alive externally. The player can return later, use an auto time skip only through sleep/rest, or choose something else.

Do not make the player wait real-world minutes staring at a closed door.

---

# 116. NPC SCHEDULE MODEL

Named NPC schedule is authored as periods with conditional overrides.

Example:

```ts
{
  npcId: 'roshan',
  schedule: [
    { start: '06:30', end: '07:00', action: 'open_cafe' },
    { start: '07:00', end: '12:00', action: 'work_counter' },
    { start: '12:00', end: '13:00', action: 'break_back_table' },
    { start: '13:00', end: '18:00', action: 'work_counter' },
    { start: '18:00', end: '21:30', action: 'evening_service' },
    { start: '21:30', end: '22:00', action: 'close_cafe' }
  ]
}
```

Overrides may come from:

- story event;
- weather;
- festival;
- job shift;
- household relationship.

Ambient NPC schedules can be generated from weighted templates seeded by city day.

---

# 117. NPC PATHFINDING

Use a baked navigation representation per world chunk/zone.

Requirements:

- path requests batched;
- not every NPC repaths every frame;
- path invalidation on temporary blockers;
- local avoidance for close pedestrians;
- bicycle NPCs use separate route graph where useful;
- door/interior transitions use authored links.

Named NPC location must be logically available even when their mesh is not currently loaded.

---

# 118. PLAYER/NPC COLLISION PHILOSOPHY

Players should not get trapped by ambient crowds.

Ambient NPC collision can be soft:

- avoidance first;
- small slide around;
- no rigid-body shoving.

Players can pass closely without chaos.

Named interaction NPCs may reserve a conversational stance when engaged.

---

# 119. WEATHER GAMEPLAY RULES

Weather changes mood more than difficulty.

Light rain:
- normal activity;
- umbrella optional;
- wet surfaces.

Monsoon rain:
- kayak closes;
- some NPCs move indoors;
- autos become more attractive;
- delivery job becomes slightly slower but tips may improve;
- indoor story probability increases.

Thunderstorm:
- rare;
- power-cut event possible;
- strong ambience;
- no forced damage.

Weather never makes the player lose expensive items simply for being outside.

---

# 120. HOME STATE VISUALIZATION

Cleanliness and comfort should produce visible tiers, but not hard UI labels.

Very clean/settled:
- clear surfaces;
- plants healthy;
- warm lighting;
- fewer stray objects.

Lived-in:
- a cup here;
- folded blanket;
- shoes near door;
- minor normal clutter.

Messy:
- dishes;
- laundry;
- bins;
- dust;
- crowded surfaces.

Neglected:
- more pronounced clutter;
- plant droop;
- broken item remains;
- lighting/ambience slightly less comfortable.

The game should never turn the home into disgusting horror imagery.

---

# 121. COUPLE STORY TONE RULES

Romantic content should feel intimate and grounded, not overly scripted.

Avoid:

- constant heart effects;
- cheesy forced romance;
- public “love score”;
- manipulative jealousy systems;
- punishment for time offline.

Prefer:

- cooking together;
- buying an object after discussing it;
- leaving a note;
- walking home;
- remembering an anniversary;
- sitting in silence;
- repairing a disagreement;
- choosing a new home together.

---

# 122. FRIENDS STORY TONE RULES

Friend stories can be more chaotic and comedic.

Themes:

- shared fridge;
- borrowed items;
- contribution balance;
- birthdays;
- game nights;
- group outings;
- PG/hostel chaos;
- who forgot to buy milk;
- someone rearranged the living room;
- spontaneous late-night food.

Avoid turning friendship into a roommate-management spreadsheet.

---

# 123. MEMORY CAPTURE TECHNICAL NOTES

Manual capture can use rendered canvas output or a dedicated render target depending on renderer constraints.

Automatic capture should:

- temporarily hide UI;
- wait for stable frame if safe;
- render at configured capture resolution;
- compress client-side;
- upload asynchronously;
- never freeze gameplay for noticeable time.

If upload fails:

- keep local pending Memory metadata;
- retry later;
- do not lose the event outcome.

---

# 124. BROWSER SUPPORT POLICY

Primary supported desktop browsers at launch should include current stable Chromium-family browsers and other browsers that pass the renderer/physics/voice test matrix.

Because WebGPU availability is not universal, the renderer must have a tested WebGL2 compatibility profile.

Unsupported or insufficient devices receive a clear compatibility message rather than a broken canvas.

HTTPS is mandatory in production because WebGPU-related features, microphone access, and modern browser security expectations require secure contexts.

---

# 125. MOBILE POLICY

V1 is desktop-first.

The UI should remain responsive, but full mobile game controls/performance are not a release blocker.

Do not compromise desktop embodied interaction quality to support touch too early.

Future mobile work may use:

- virtual joystick;
- touch camera;
- context interaction button;
- simplified quality profile;
- tap-to-interact assistance.

---

# 126. CONTROLLER POLICY

Controller support is desirable for V1 and required before a console-style future expansion.

Canonical mapping:

- left stick: move;
- right stick: camera;
- A/X: interact;
- left stick click or shoulder: jog;
- D-pad: quick panels;
- menu: Life panel;
- camera-mode button: first/third toggle.

All interactions must remain fully usable by keyboard/mouse.

---

# 127. CURRENT REPOSITORY MIGRATION PRINCIPLE

The existing Together codebase is not discarded simply because this PRD changes direction.

Reuse any implementation that satisfies this document after verification.

Do not preserve a system merely because it exists.

Likely reusable foundations include:

- Three.js game loop concepts;
- WebGPU experiments;
- Socket.IO groundwork;
- household stores;
- story-engine concepts;
- Memory Book concepts;
- some server schemas;
- build/test infrastructure after dependency cleanup.

Likely areas requiring major revision include:

- placeholder city geometry;
- old low-poly art assumptions;
- visible need/vibe HUD;
- timer-based fake chores;
- third-person-default camera assumptions;
- incomplete avatar persistence;
- story content quantity;
- time scale;
- old city identity;
- old Phaser/pixel-art language in historical documentation.

Implementation work begins only after auditing the current branch against this PRD.

---

# 128. RISKS AND MITIGATIONS

## Risk: visual ambition overwhelms browser performance

Mitigation: chunking, LOD, instancing, compressed assets, strict budgets, quality tiers, and testing integrated GPU continuously.

## Risk: 3D art becomes the bottleneck

Mitigation: establish modular city kit, semantic prop library, procedural vegetation placement, material families, hero-asset priority, and automated asset validation.

## Risk: chores become tedious

Mitigation: tactile micro-actions, repeat acceleration, optional quick interaction after mastery, co-op role division, visible payoff, and no mandatory daily checklist.

## Risk: city feels empty

Mitigation: named routines, ambient crowds, strong sound, storefront states, vegetation motion, layered props, weather, and micro-events.

## Risk: city becomes huge before life loop works

Mitigation: hard V1 boundary, no second city, density over area, world-feel exit gate in Phase 1.

## Risk: story feels like quests

Mitigation: minimal markers, contextual triggers, no XP, open city, optional tasks, small events, imperfect outcomes.

## Risk: multiplayer destroys immersion

Mitigation: interpolation, embodied shared interactions, synchronized major state, graceful reconnect, minimal party UI.

## Risk: Couple mode allows one person to progress shared life alone

Mitigation: co-presence rules for major story/home decisions.

## Risk: Friends mode blocks progress when someone is offline

Mitigation: asynchronous persistence, voting thresholds, personal/common budget separation.

## Risk: voice creates NAT/support complexity

Mitigation: TURN fallback, voice optional, game fully usable with external Discord/phone, migrate to SFU only when scale requires it.

## Risk: story scope explodes

Mitigation: reusable task primitives, data-driven events, short micro-events, strict content target, no branching tree requiring unique bespoke mechanics for every branch.

---

# 129. DESIGN NON-NEGOTIABLES

1. First-person is the default.
2. Third-person is always available.
3. No visible relationship meter.
4. No visible hunger/energy bars by default.
5. No pixel-art world direction.
6. No blocky primitive shipping city.
7. No second city before Amaya Bay is complete.
8. No random matching required for V1.
9. Couple and Friends share the same engine.
10. Context, not XP, drives progression.
11. Money enables a better life; it does not threaten basic existence.
12. Chores physically affect the home.
13. Key domestic actions use real animation/interaction, not fake timers.
14. The Memory Book is a core system.
15. Moving house is a story event.
16. The city is largely open from the start.
17. Major systems work for two real remote players.
18. Visual calm matters as much as feature count.
19. Audio is part of world simulation, not final polish.
20. The game remains comforting.
21. The player’s home becomes more personal over time.
22. Named NPCs remember important authored facts.
23. No important system requires public strangers to be fun.
24. Failure can become a memory.
25. Every expansion must protect intimacy over scale.

---

# 130. FUTURE EXPANSION AFTER V1

Only after Amaya Bay is complete:

- other visible real households;
- public city shards;
- random matching;
- additional cities;
- deeper home construction;
- player-owned cars;
- pets;
- public events;
- larger voice architecture;
- travel;
- second homes;
- mobile-native controls;
- additional cultures/regions.

A second city should not be a reskin. It should have different urban rhythm, jobs, weather, leisure, and stories.

---

# 131. SOURCE-OF-TRUTH CONFLICT RULES

When implementation or older documents disagree with this PRD:

1. This PRD wins.
2. If this PRD is ambiguous, choose the interpretation that best preserves:
   - real-player presence;
   - calm world quality;
   - embodied first-person life;
   - low-pressure progression;
   - persistent shared memory.
3. Document any unavoidable deviation in `docs/DECISIONS.md` with rationale.
4. Do not silently change product direction through code.

---

# 132. FINAL PRODUCT STATEMENT

Together is not about winning a simulated life.

It is about inhabiting one.

The V1 goal is to create a city beautiful enough to wander through, systems detailed enough to make ordinary actions feel human, multiplayer intimate enough that another real person changes the meaning of those actions, and a Memory Book strong enough that time spent inside the game becomes something the players can look back on.

The central design question for every feature is:

> **Does this help two or more people feel like they lived a little piece of life together?**

If yes, it belongs.

If not, it should not distract the team from what Together is trying to become.

---

# 133. AUTHORITATIVE IMPLEMENTATION SUMMARY

For implementation teams, the shortest correct interpretation of this PRD is:

- Build **one** dense coastal city: Amaya Bay.
- Use **TypeScript + Three.js WebGPURenderer + TSL + Rapier + React + Socket.IO + Supabase**.
- Build the world for **embodied first-person first**.
- Keep third-person as a seamless toggle.
- Use fixed property shells with deep interior personalization.
- Make household formation multiplayer-first.
- Couple mode protects shared milestones for co-presence.
- Friends mode allows persistent asynchronous shared living.
- Keep the city open; gate capabilities, not streets.
- Make money aspirational, not punitive.
- Make jobs physical.
- Make chores physical.
- Make leisure worthwhile without rewards.
- Keep needs and relationships hidden.
- Tell story through stages, NPC memory, environment, and events.
- Save meaningful moments automatically.
- Treat visual world quality, interaction feel, audio, and multiplayer presence as equal pillars.
- Do not expand scope until this single-city life loop is complete.

**This is the V1.**

---

# APPENDIX A — CANONICAL INPUT MAP

| Action | Keyboard/Mouse | Controller Target |
|---|---|---|
| Move | WASD | Left Stick |
| Look | Mouse | Right Stick |
| Interact | E | South Face Button |
| Jog | Shift | Stick/Shoulder |
| Camera Mode | V | Assigned Face/D-pad |
| Life Panel | Tab | Menu |
| Map | M | D-pad |
| Memory Book | B | D-pad/Menu |
| Photo | P / UI | Shoulder combo |
| Sit/Context Secondary | F when offered | West Face Button |
| Voice Push-to-talk | configurable | configurable |
| Pause/Settings | Esc | Start/Menu |

All inputs are remappable.

---

# APPENDIX B — CANONICAL HIDDEN STATE MODEL

The following numbers exist internally but are not displayed as raw meters:

Player:

- hunger 0–100;
- energy 0–100;
- comfort 0–100;
- socialWarmth 0–100;
- focus 0–100;
- stress 0–100.

Household:

- cleanliness 0–100;
- foodStock 0–100;
- clutter 0–100;
- maintenance 0–100;
- warmth 0–100.

Couple relationship:

- closeness 0–100;
- trust 0–100;
- reliability 0–100;
- novelty 0–100;
- tension 0–100.

Friends relationship:

- familiarity 0–100;
- reliability 0–100;
- sharedFun 0–100;
- friction 0–100;
- contributionBalance abstract state.

These values are tuning inputs for behavior, not player goals.

---

# APPENDIX C — MINIMUM ASSET GROUPS

## Player

- base avatar rigs;
- hair library;
- clothing library;
- accessories;
- hands suitable for first-person;
- interaction animations;
- locomotion animations;
- expressions.

## City

- modular residential facades;
- storefront modules;
- roads;
- curbs;
- drains;
- cables/poles;
- signs;
- benches;
- bins;
- bicycles;
- scooters;
- autos;
- market props;
- café props;
- waterfront props;
- park props.

## Nature

- five tree species;
- four shrub families;
- grass clusters;
- flowers;
- vines;
- potted plant variants;
- ground debris.

## Home

- kitchen set;
- bedroom set;
- living set;
- bathroom set;
- storage;
- lighting;
- decor;
- chore props;
- moving boxes.

## Activities

- kayak;
- paddles;
- badminton equipment;
- mini-golf equipment;
- picnic set;
- camera;
- board/card game set.

---

# APPENDIX D — INITIAL RELEASE SUCCESS METRICS

These are product quality signals, not monetization targets.

During closed testing, aim for:

- >80% of invited pairs complete household creation without help;
- >70% of pairs finish first shared meal;
- >60% voluntarily use at least one leisure activity in first two sessions;
- >60% open Memory Book again after first automatic memory;
- <5% of sessions end due to technical disconnect/crash;
- median world load after cached assets under target established during performance phase;
- majority of qualitative testers describe the world using words such as calm, cozy, alive, beautiful, comforting, or peaceful without being prompted.

A single engagement number cannot define success because the intended experience requires world quality, life systems, and relationship presence to work together.

---

# APPENDIX E — TECHNICAL DECISION NOTES

## WebGPU

Three.js `WebGPURenderer` is the canonical rendering path. Its universal renderer design permits a WebGL2 backend fallback, so the engine should use the WebGPU-compatible node/TSL material approach from the beginning rather than building a separate legacy shader architecture.

## Physics

Rapier’s kinematic character-controller model is appropriate for controlled player movement where the game, rather than dynamic forces, determines desired movement while collision queries adjust the final translation.

## Voice

WebRTC is used for browser-to-browser audio. Socket.IO provides signaling only; STUN/TURN handles connection establishment. Voice is optional and independent from gameplay state.

## Authentication

Supabase anonymous authentication supports a low-friction first session while still producing an authenticated user identity that can later be linked to a permanent login. Household data remains permissioned and server-validated.

---

# APPENDIX F — DOCUMENT MAINTENANCE

This PRD should change only when product direction genuinely changes.

Routine implementation details belong in:

- `docs/ARCHITECTURE.md`
- `docs/BUILD_PLAN.md`
- `docs/DECISIONS.md`
- `docs/CONTENT_GUIDE.md`
- `docs/ART_BIBLE.md`
- `docs/IMPLEMENTATION_STATUS.md`

Those files may expand this document but must not contradict it.

When a major product decision changes, update this PRD first, then update implementation plans.

---

# APPENDIX G — DEPLOYMENT AND ENVIRONMENTS

## Environments

Maintain three distinct environments:

### Local

- local client;
- local Node server;
- local/test database or isolated Supabase development project;
- debug tools enabled;
- asset hot reload where possible.

### Staging

- production-like HTTPS;
- real WebSocket endpoint;
- staging Supabase project;
- voice TURN test;
- seeded test households;
- automated E2E target.

### Production

- production client CDN;
- production authoritative game server;
- production Supabase project;
- production TURN;
- monitoring/alerts;
- debug mutation tools disabled.

## Hosting decisions

Client:

- Vercel static/Vite deployment initially.

Authoritative Node/Socket.IO server:

- containerized deployment on Railway initially, or equivalent long-running WebSocket-capable host if infrastructure changes;
- keep deployment Docker-compatible so the server is portable.

Database/Auth/Storage:

- Supabase managed services.

TURN:

- dedicated coturn-capable host or managed TURN endpoint;
- never assume direct peer connectivity will always work.

Redis:

- not a hard dependency for a single V1 game-server instance;
- introduce when horizontal Socket.IO scaling or shared ephemeral coordination is required.

## CI/CD

GitHub Actions:

1. install from frozen lockfile;
2. typecheck;
3. lint;
4. unit/integration tests;
5. content validation;
6. client production build;
7. server production build;
8. Playwright smoke on staging for release branches;
9. deploy only after required checks pass.

No production deployment from an unverified local build.

---

# APPENDIX H — REPOSITORY TOOLCHAIN

Package manager:

- pnpm with a committed lockfile.

Runtime:

- Node.js 24 LTS for server and tooling at the date of this PRD.

Database access:

- Drizzle ORM on the server;
- PostgreSQL/Supabase as the database;
- migrations committed to repository;
- no ad-hoc production schema editing.

Validation:

- Zod schemas shared where network/content contracts overlap.

Formatting/linting:

- ESLint;
- Prettier or a single equivalent formatter selected once and enforced in CI.

Testing:

- Vitest for unit/integration where appropriate;
- Playwright for browser flows.

Error tracking:

- Sentry or equivalent production error tracking may be integrated, with privacy-conscious configuration and no voice capture.

Asset checks:

- automated model/texture size validation;
- missing LOD detection;
- missing collision metadata detection;
- invalid content reference detection.

---

# APPENDIX I — DEFINITION OF A “COMPLETE CITY”

Amaya Bay is considered complete only when it is not merely a continuous mesh but a functioning place.

A complete city requires:

- all seven districts visually distinct;
- coherent road/path network;
- at least twelve meaningful enterable interiors or deeply interactive public spaces;
- named NPC schedules functioning;
- ambient NPCs functioning;
- every core job physically located;
- every V1 leisure activity physically located;
- public seating throughout;
- weather response across districts;
- day/night store states;
- transport network;
- property exteriors linked to household interiors;
- audio zones;
- district-specific props and vegetation;
- no major primary route made of shipping-placeholder boxes;
- no visible dead zone that exists only to make the map larger;
- stable streaming while traversing at scooter speed;
- stable multiplayer replication while moving between chunks;
- visual landmarks allowing players to learn the city without relying entirely on the map.

The city should become mentally navigable. Returning players should say things such as “meet me by the café,” “take the lane behind the plant shop,” or “I’m at the steps near the bay.”

That learned geography is part of the feeling of home.
