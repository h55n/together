export type DistrictId =
  | 'mogra_court'
  | 'lantern_street'
  | 'mogra_park'
  | 'bay_steps'
  | 'rain_tree_lane'
  | 'the_common'
  | 'hill_garden';

export type DistrictDefinition = {
  id: DistrictId;
  displayName: string;
  center: { x: number; z: number };
  radius: number;
  elevation: number;
  ambience: string;
  hero?: boolean;
};

export type CityDefinition = {
  id: 'amaya_bay';
  displayName: 'Amaya Bay';
  sizeMetres: 900;
  seaEdgeZ: number;
  districts: readonly DistrictDefinition[];
};

export const AMAYA_BAY_CITY: CityDefinition = {
  id: 'amaya_bay',
  displayName: 'Amaya Bay',
  sizeMetres: 900,
  seaEdgeZ: -365,
  districts: [
    { id: 'mogra_court', displayName: 'Mogra Court', center: { x: -225, z: 160 }, radius: 155, elevation: 7, ambience: 'residential_morning' },
    { id: 'lantern_street', displayName: 'Lantern Street', center: { x: -30, z: 75 }, radius: 150, elevation: 5, ambience: 'commercial_warm', hero: true },
    { id: 'mogra_park', displayName: 'Mogra Park', center: { x: 185, z: 110 }, radius: 145, elevation: 9, ambience: 'park_green' },
    { id: 'bay_steps', displayName: 'Bay Steps', center: { x: 75, z: -285 }, radius: 180, elevation: 1, ambience: 'waterfront', hero: true },
    { id: 'rain_tree_lane', displayName: 'Rain Tree Lane', center: { x: -210, z: -95 }, radius: 150, elevation: 10, ambience: 'leafy_lane', hero: true },
    { id: 'the_common', displayName: 'The Common', center: { x: 215, z: -80 }, radius: 145, elevation: 7, ambience: 'community' },
    { id: 'hill_garden', displayName: 'Hill Garden', center: { x: 265, z: 275 }, radius: 145, elevation: 26, ambience: 'hill_breeze' },
  ],
};

export type SubareaKind =
  | 'residential_colony'
  | 'commercial_lane'
  | 'park_pocket'
  | 'waterfront'
  | 'civic'
  | 'garden'
  | 'market'
  | 'service_lane';

export type CitySubareaDefinition = {
  id: string;
  districtId: DistrictId;
  displayName: string;
  kind: SubareaKind;
  center: { x: number; z: number };
  radius: number;
  character: string;
};

export const AMAYA_BAY_SUBAREAS: readonly CitySubareaDefinition[] = [
  { id: 'mogra_courtyard_colony', districtId: 'mogra_court', displayName: 'Mogra Courtyard Colony', kind: 'residential_colony', center: { x: -235, z: 175 }, radius: 62, character: 'starter flats, shaded court, laundry balconies' },
  { id: 'mogra_pg_row', districtId: 'mogra_court', displayName: 'PG Row', kind: 'residential_colony', center: { x: -305, z: 120 }, radius: 48, character: 'shared houses, scooters, terrace life' },
  { id: 'mogra_roof_blocks', districtId: 'mogra_court', displayName: 'Roof Garden Blocks', kind: 'garden', center: { x: -175, z: 210 }, radius: 44, character: 'roof access, planter terraces, quiet benches' },
  { id: 'mogra_corner_shops', districtId: 'mogra_court', displayName: 'Mogra Corner Shops', kind: 'commercial_lane', center: { x: -180, z: 125 }, radius: 38, character: 'grocery, laundromat, caretaker office' },

  { id: 'lantern_cafe_row', districtId: 'lantern_street', displayName: 'Café Row', kind: 'commercial_lane', center: { x: -42, z: 72 }, radius: 50, character: 'Café Roshan, bakery, warm awnings' },
  { id: 'lantern_bazaar', districtId: 'lantern_street', displayName: 'Lantern Bazaar', kind: 'market', center: { x: 15, z: 38 }, radius: 56, character: 'groceries, produce crates, evening food' },
  { id: 'lantern_furniture_lane', districtId: 'lantern_street', displayName: 'Furniture Lane', kind: 'commercial_lane', center: { x: -90, z: 18 }, radius: 46, character: 'furniture, plants, repair storefronts' },
  { id: 'lantern_auto_corner', districtId: 'lantern_street', displayName: 'Auto Corner', kind: 'service_lane', center: { x: 25, z: 115 }, radius: 36, character: 'auto stand, bank kiosk, stationer' },

  { id: 'park_picnic_lawn', districtId: 'mogra_park', displayName: 'Picnic Lawn', kind: 'park_pocket', center: { x: 168, z: 122 }, radius: 58, character: 'open lawn, shade trees, picnic mats' },
  { id: 'park_badminton_court', districtId: 'mogra_park', displayName: 'Badminton Court', kind: 'park_pocket', center: { x: 232, z: 82 }, radius: 34, character: 'court, pavilion, evening play' },
  { id: 'park_public_garden', districtId: 'mogra_park', displayName: 'Mogra Public Garden', kind: 'garden', center: { x: 205, z: 165 }, radius: 40, character: 'seasonal flowers, fountain, cats' },
  { id: 'park_walking_loop', districtId: 'mogra_park', displayName: 'Rain Walk Loop', kind: 'park_pocket', center: { x: 132, z: 80 }, radius: 34, character: 'curved path, hidden seats, tree canopy' },

  { id: 'bay_promenade', districtId: 'bay_steps', displayName: 'Bay Promenade', kind: 'waterfront', center: { x: 60, z: -270 }, radius: 72, character: 'sea wall, lamps, cycling route' },
  { id: 'bay_kayak_cove', districtId: 'bay_steps', displayName: 'Kayak Cove', kind: 'waterfront', center: { x: 135, z: -325 }, radius: 48, character: 'rental hut, launch, calm water' },
  { id: 'bay_sunset_steps', districtId: 'bay_steps', displayName: 'Sunset Steps', kind: 'waterfront', center: { x: 5, z: -315 }, radius: 46, character: 'stone steps, tea cart, sunset lookout' },
  { id: 'bay_beach_pocket', districtId: 'bay_steps', displayName: 'Small Beach', kind: 'waterfront', center: { x: -45, z: -360 }, radius: 38, character: 'sand pocket, driftwood, skipping stones' },

  { id: 'rain_tree_old_colony', districtId: 'rain_tree_lane', displayName: 'Old Rain Tree Colony', kind: 'residential_colony', center: { x: -235, z: -120 }, radius: 58, character: 'older homes, verandas, vines' },
  { id: 'rain_tree_nursery', districtId: 'rain_tree_lane', displayName: 'Nursery Bend', kind: 'garden', center: { x: -175, z: -78 }, radius: 42, character: 'plant nursery, pot stacks, wet soil' },
  { id: 'rain_tree_repair_yard', districtId: 'rain_tree_lane', displayName: 'Repair Yard', kind: 'service_lane', center: { x: -275, z: -62 }, radius: 36, character: 'Ravi repair shop, tools, bicycle parts' },
  { id: 'rain_tree_hidden_lane', districtId: 'rain_tree_lane', displayName: 'Hidden Bench Lane', kind: 'residential_colony', center: { x: -170, z: -140 }, radius: 34, character: 'narrow lane, clotheslines, hidden seating' },

  { id: 'common_civic_court', districtId: 'the_common', displayName: 'Civic Court', kind: 'civic', center: { x: 215, z: -74 }, radius: 55, character: 'community office, public courtyard' },
  { id: 'common_library_walk', districtId: 'the_common', displayName: 'Library Walk', kind: 'civic', center: { x: 165, z: -35 }, radius: 42, character: 'library, co-work tables, book benches' },
  { id: 'common_event_square', districtId: 'the_common', displayName: 'Event Square', kind: 'civic', center: { x: 260, z: -25 }, radius: 50, character: 'event hall, festival lights, community board' },
  { id: 'common_municipal_garden', districtId: 'the_common', displayName: 'Municipal Garden', kind: 'garden', center: { x: 260, z: -115 }, radius: 38, character: 'formal beds, shade, quiet lunch spot' },

  { id: 'hill_tea_terrace', districtId: 'hill_garden', displayName: 'Tea Terrace', kind: 'garden', center: { x: 278, z: 278 }, radius: 42, character: 'tea hut, terrace rail, city view' },
  { id: 'hill_minigolf', districtId: 'hill_garden', displayName: 'Hill Mini-Golf', kind: 'garden', center: { x: 220, z: 260 }, radius: 48, character: 'six compact holes, playful slopes' },
  { id: 'hill_cycle_loop', districtId: 'hill_garden', displayName: 'Hill Cycle Loop', kind: 'park_pocket', center: { x: 315, z: 225 }, radius: 54, character: 'scenic loop, breezy tree line' },
  { id: 'hill_lookout', districtId: 'hill_garden', displayName: 'Amaya Lookout', kind: 'garden', center: { x: 300, z: 330 }, radius: 34, character: 'overlook, benches, future expansion view' },
] as const;


export type CityVenueCategory =
  | 'grocery'
  | 'cafe'
  | 'food'
  | 'repair'
  | 'laundry'
  | 'bakery'
  | 'furniture'
  | 'plants'
  | 'books'
  | 'clothing'
  | 'pharmacy'
  | 'bank'
  | 'arcade'
  | 'community'
  | 'rental';

export type CityVenueDefinition = {
  id: string;
  displayName: string;
  districtId: DistrictId;
  category: CityVenueCategory;
  position: { x: number; z: number };
  frontageMetres: number;
  open: string;
  close: string;
  character: string;
  hero?: boolean;
};

/**
 * Everyday venue network. Hero locations remain memorable, but basic city life
 * never depends on one quest-like shop: residents have multiple groceries,
 * tea/cafe choices, food stalls, repair points and laundries across Amaya Bay.
 */
export const AMAYA_BAY_VENUES: readonly CityVenueDefinition[] = [
  // Mogra Court — local residential conveniences.
  { id: 'mogra_fresh_mart', displayName: 'Mogra Fresh Mart', districtId: 'mogra_court', category: 'grocery', position: { x: -184, z: 128 }, frontageMetres: 8, open: '07:00', close: '22:00', character: 'compact daily grocery under apartments' },
  { id: 'asha_kirana', displayName: 'Asha Kirana', districtId: 'mogra_court', category: 'grocery', position: { x: -286, z: 136 }, frontageMetres: 5, open: '07:30', close: '21:30', character: 'small family-run staples shop' },
  { id: 'mogra_chai_window', displayName: 'Mogra Chai Window', districtId: 'mogra_court', category: 'cafe', position: { x: -205, z: 112 }, frontageMetres: 4, open: '06:30', close: '20:30', character: 'standing chai counter with morning regulars' },
  { id: 'courtyard_tiffin', displayName: 'Courtyard Tiffin', districtId: 'mogra_court', category: 'food', position: { x: -252, z: 126 }, frontageMetres: 6, open: '08:00', close: '21:00', character: 'simple breakfast and home-style lunch' },
  { id: 'mogra_wash_house', displayName: 'Mogra Wash House', districtId: 'mogra_court', category: 'laundry', position: { x: -170, z: 145 }, frontageMetres: 6, open: '08:00', close: '21:00', character: 'laundromat with folding counter' },
  { id: 'pg_lane_laundry', displayName: 'PG Lane Laundry', districtId: 'mogra_court', category: 'laundry', position: { x: -304, z: 102 }, frontageMetres: 5, open: '08:30', close: '20:30', character: 'wash and iron service for shared houses' },
  { id: 'mogra_meds', displayName: 'Mogra Pharmacy', districtId: 'mogra_court', category: 'pharmacy', position: { x: -198, z: 214 }, frontageMetres: 6, open: '08:00', close: '22:00', character: 'quiet neighbourhood chemist exterior' },

  // Lantern Street — dense commercial heart with alternatives rather than one shop each.
  { id: 'cafe_roshan', displayName: 'Café Roshan', districtId: 'lantern_street', category: 'cafe', position: { x: -43, z: 68 }, frontageMetres: 10, open: '07:00', close: '22:00', character: 'warm mentor-run café and barista workplace', hero: true },
  { id: 'lantern_filter_house', displayName: 'Filter House', districtId: 'lantern_street', category: 'cafe', position: { x: -5, z: 104 }, frontageMetres: 7, open: '07:30', close: '21:30', character: 'small filter-coffee room with window seating' },
  { id: 'lantern_market', displayName: 'Lantern Market', districtId: 'lantern_street', category: 'grocery', position: { x: 12, z: 40 }, frontageMetres: 15, open: '07:00', close: '21:00', character: 'main produce and grocery market', hero: true },
  { id: 'saffron_provisions', displayName: 'Saffron Provisions', districtId: 'lantern_street', category: 'grocery', position: { x: -78, z: 34 }, frontageMetres: 8, open: '08:00', close: '22:00', character: 'packaged goods and household staples' },
  { id: 'lantern_bakery', displayName: 'Lantern Bakery', districtId: 'lantern_street', category: 'bakery', position: { x: -66, z: 96 }, frontageMetres: 7, open: '07:00', close: '20:00', character: 'bread, biscuits and warm evening light' },
  { id: 'sanas_food_corner', displayName: 'Sana’s Food Corner', districtId: 'lantern_street', category: 'food', position: { x: 20, z: 22 }, frontageMetres: 5, open: '16:00', close: '23:00', character: 'evening street food and weather chatter', hero: true },
  { id: 'lantern_dosa_counter', displayName: 'Lantern Dosa Counter', districtId: 'lantern_street', category: 'food', position: { x: 58, z: 82 }, frontageMetres: 6, open: '07:30', close: '22:00', character: 'quick breakfast and late snack counter' },
  { id: 'monsoon_noodles', displayName: 'Monsoon Noodles', districtId: 'lantern_street', category: 'food', position: { x: 42, z: 132 }, frontageMetres: 6, open: '12:00', close: '22:30', character: 'tiny rainy-evening noodle shop' },
  { id: 'lantern_furniture', displayName: 'Room & Rail', districtId: 'lantern_street', category: 'furniture', position: { x: -88, z: 116 }, frontageMetres: 11, open: '10:00', close: '20:00', character: 'staged compact-city furniture store' },
  { id: 'paper_leaf_books', displayName: 'Paper & Leaf', districtId: 'lantern_street', category: 'books', position: { x: -10, z: 22 }, frontageMetres: 6, open: '09:00', close: '21:00', character: 'books, stationery and postcards' },
  { id: 'lantern_threads', displayName: 'Lantern Threads', districtId: 'lantern_street', category: 'clothing', position: { x: 62, z: 42 }, frontageMetres: 8, open: '10:00', close: '21:00', character: 'everyday clothing and accessories' },
  { id: 'lantern_arcade', displayName: 'Afterglow Arcade', districtId: 'lantern_street', category: 'arcade', position: { x: 73, z: 110 }, frontageMetres: 9, open: '12:00', close: '23:00', character: 'small social arcade, warm not neon-heavy' },
  { id: 'lantern_bank_kiosk', displayName: 'Amaya Bank Kiosk', districtId: 'lantern_street', category: 'bank', position: { x: -28, z: 142 }, frontageMetres: 5, open: '06:00', close: '23:00', character: 'embedded wallet-management kiosk' },
  { id: 'lantern_cycle_courier', displayName: 'Lantern Courier Desk', districtId: 'lantern_street', category: 'repair', position: { x: 48, z: 72 }, frontageMetres: 7, open: '08:00', close: '21:00', character: 'bicycle delivery pickup, carrier racks and parcel shelves' },

  // Mogra Park — food/café choices around a real public park edge.
  { id: 'park_leaf_cafe', displayName: 'Leaf Café', districtId: 'mogra_park', category: 'cafe', position: { x: 138, z: 84 }, frontageMetres: 7, open: '08:00', close: '20:30', character: 'open-sided park café under shade trees' },
  { id: 'park_fruit_cart', displayName: 'Park Fruit & Juice', districtId: 'mogra_park', category: 'food', position: { x: 214, z: 150 }, frontageMetres: 4, open: '09:00', close: '20:00', character: 'fruit, juice and small picnic supplies' },
  { id: 'park_snack_kiosk', displayName: 'Loop Snack Kiosk', districtId: 'mogra_park', category: 'food', position: { x: 130, z: 146 }, frontageMetres: 4, open: '11:00', close: '21:00', character: 'small snacks beside the walking loop' },

  // Bay Steps — waterfront choices spread along the promenade.
  { id: 'bay_tea_cart', displayName: 'Bay Tea Cart', districtId: 'bay_steps', category: 'cafe', position: { x: 12, z: -272 }, frontageMetres: 4, open: '06:30', close: '22:00', character: 'tea and coffee at the sea wall' },
  { id: 'pier_coffee_room', displayName: 'Pier Coffee Room', districtId: 'bay_steps', category: 'cafe', position: { x: 120, z: -252 }, frontageMetres: 7, open: '08:00', close: '21:30', character: 'quiet indoor seating looking over the pier' },
  { id: 'bay_provisions', displayName: 'Bay Provisions', districtId: 'bay_steps', category: 'grocery', position: { x: 174, z: -232 }, frontageMetres: 7, open: '08:00', close: '21:00', character: 'picnic basics, drinks and household staples' },
  { id: 'bay_bhel_cart', displayName: 'Sea Wall Bites', districtId: 'bay_steps', category: 'food', position: { x: 82, z: -286 }, frontageMetres: 4, open: '15:30', close: '22:30', character: 'evening waterfront snack cart' },
  { id: 'dev_cycle_hut', displayName: 'Dev Cycle & Scooter', districtId: 'bay_steps', category: 'repair', position: { x: 55, z: -252 }, frontageMetres: 8, open: '08:00', close: '19:00', character: 'rental, bicycle fixes and scooter access', hero: true },
  { id: 'kayak_cove', displayName: 'Kayak Cove', districtId: 'bay_steps', category: 'rental', position: { x: 135, z: -325 }, frontageMetres: 8, open: '08:00', close: '18:30', character: 'kayak rental and bay safety introduction', hero: true },

  // Rain Tree Lane — older mixed residential/service fabric.
  { id: 'rain_tree_grocer', displayName: 'Rain Tree Grocer', districtId: 'rain_tree_lane', category: 'grocery', position: { x: -196, z: -42 }, frontageMetres: 6, open: '07:30', close: '21:00', character: 'small produce and essentials shop' },
  { id: 'ravi_repairs', displayName: 'Ravi Repairs', districtId: 'rain_tree_lane', category: 'repair', position: { x: -246, z: -88 }, frontageMetres: 9, open: '09:00', close: '19:30', character: 'tools, household repairs and DIY teaching', hero: true },
  { id: 'lane_cycle_fix', displayName: 'Lane Cycle Fix', districtId: 'rain_tree_lane', category: 'repair', position: { x: -278, z: -132 }, frontageMetres: 5, open: '09:30', close: '19:00', character: 'quick puncture and chain repairs' },
  { id: 'naina_nursery', displayName: 'Naina Nursery', districtId: 'rain_tree_lane', category: 'plants', position: { x: -167, z: -118 }, frontageMetres: 12, open: '09:00', close: '19:00', character: 'dense plants, wet soil and home gardening', hero: true },
  { id: 'rain_tree_breakfast', displayName: 'Veranda Breakfast', districtId: 'rain_tree_lane', category: 'food', position: { x: -226, z: -175 }, frontageMetres: 6, open: '07:00', close: '13:00', character: 'poha, upma and tea from an old-home veranda' },
  { id: 'rain_tree_tea_room', displayName: 'Quiet Kettle', districtId: 'rain_tree_lane', category: 'cafe', position: { x: -142, z: -72 }, frontageMetres: 6, open: '08:00', close: '20:00', character: 'tiny tea room beside deep vegetation' },

  // The Common — civic everyday services and quiet work food.
  { id: 'common_coffee_desk', displayName: 'Common Coffee Desk', districtId: 'the_common', category: 'cafe', position: { x: 176, z: -45 }, frontageMetres: 6, open: '08:00', close: '19:00', character: 'library-side coffee and quiet work tables' },
  { id: 'common_canteen', displayName: 'Courtyard Canteen', districtId: 'the_common', category: 'food', position: { x: 244, z: -62 }, frontageMetres: 8, open: '08:00', close: '20:30', character: 'simple community meals and tiffin' },
  { id: 'common_daily_store', displayName: 'Common Daily Store', districtId: 'the_common', category: 'grocery', position: { x: 272, z: -98 }, frontageMetres: 7, open: '08:00', close: '21:00', character: 'groceries near civic housing and offices' },
  { id: 'common_fix_desk', displayName: 'Common Fix Desk', districtId: 'the_common', category: 'repair', position: { x: 150, z: -92 }, frontageMetres: 5, open: '09:00', close: '18:30', character: 'small electronics and household repair counter' },
  { id: 'common_pharmacy', displayName: 'Common Pharmacy', districtId: 'the_common', category: 'pharmacy', position: { x: 276, z: -35 }, frontageMetres: 6, open: '08:00', close: '22:00', character: 'clinic-adjacent pharmacy exterior' },
  { id: 'community_hall', displayName: 'Amaya Community Hall', districtId: 'the_common', category: 'community', position: { x: 252, z: -18 }, frontageMetres: 14, open: '08:00', close: '22:00', character: 'events, hobby groups and seasonal gatherings' },

  // Hill Garden — fewer venues, but still more than a single tea hut.
  { id: 'hill_tea_hut', displayName: 'Hill Tea Hut', districtId: 'hill_garden', category: 'cafe', position: { x: 283, z: 272 }, frontageMetres: 7, open: '08:00', close: '20:00', character: 'tea, warm snacks and the city view' },
  { id: 'lookout_snacks', displayName: 'Lookout Snacks', districtId: 'hill_garden', category: 'food', position: { x: 318, z: 302 }, frontageMetres: 4, open: '10:00', close: '20:30', character: 'small scenic snack kiosk' },
  { id: 'hill_cycle_service', displayName: 'Hill Cycle Service', districtId: 'hill_garden', category: 'repair', position: { x: 318, z: 226 }, frontageMetres: 5, open: '09:00', close: '18:30', character: 'water, air and basic cycle service on the loop' },
] as const;

export function subareaAtPosition(x: number, z: number): CitySubareaDefinition | undefined {
  let closest: CitySubareaDefinition | undefined;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const area of AMAYA_BAY_SUBAREAS) {
    const distance = Math.hypot(x - area.center.x, z - area.center.z);
    if (distance <= area.radius && distance < closestDistance) {
      closest = area;
      closestDistance = distance;
    }
  }
  return closest;
}

export function districtAtPosition(x: number, z: number): DistrictDefinition | undefined {
  let closest: DistrictDefinition | undefined;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const district of AMAYA_BAY_CITY.districts) {
    const distance = Math.hypot(x - district.center.x, z - district.center.z);
    if (distance <= district.radius && distance < closestDistance) {
      closest = district;
      closestDistance = distance;
    }
  }
  return closest;
}

export type CityLocationAnchor = {
  id: string;
  displayName: string;
  districtId: DistrictId;
  position: { x: number; z: number };
  category: 'home' | 'shop' | 'job' | 'leisure' | 'service' | 'civic' | 'transport';
};

/** Stable authored anchors used by NPC schedules, stories, transport and activities. */
export const AMAYA_BAY_LOCATION_ANCHORS: readonly CityLocationAnchor[] = [
  { id: 'mogra_court', displayName: 'Mogra Court', districtId: 'mogra_court', position: { x: -235, z: 175 }, category: 'home' },
  { id: 'lantern_cafe_roshan', displayName: 'Café Roshan', districtId: 'lantern_street', position: { x: -43, z: 68 }, category: 'job' },
  { id: 'lantern_market', displayName: 'Lantern Market', districtId: 'lantern_street', position: { x: 12, z: 40 }, category: 'shop' },
  { id: 'lantern_food_corner', displayName: 'Sana’s Food Corner', districtId: 'lantern_street', position: { x: 20, z: 22 }, category: 'shop' },
  { id: 'lantern_delivery', displayName: 'Lantern Courier Desk', districtId: 'lantern_street', position: { x: 48, z: 72 }, category: 'job' },
  { id: 'rain_tree_repair', displayName: 'Ravi Repairs', districtId: 'rain_tree_lane', position: { x: -246, z: -88 }, category: 'service' },
  { id: 'rain_tree_nursery', displayName: 'Naina Nursery', districtId: 'rain_tree_lane', position: { x: -167, z: -118 }, category: 'job' },
  { id: 'bay_cycle_hut', displayName: 'Dev Cycle Hut', districtId: 'bay_steps', position: { x: 55, z: -252 }, category: 'transport' },
  { id: 'bay_kayak_hut', displayName: 'Kayak Cove', districtId: 'bay_steps', position: { x: 135, z: -325 }, category: 'leisure' },
  { id: 'bay_cycle_route', displayName: 'Bay Cycle Route', districtId: 'bay_steps', position: { x: 58, z: -276 }, category: 'leisure' },
  { id: 'the_common_library', displayName: 'Amaya Library & Co-work', districtId: 'the_common', position: { x: 215, z: -80 }, category: 'civic' },
  { id: 'park_picnic_lawn', displayName: 'Picnic Lawn', districtId: 'mogra_park', position: { x: 168, z: 122 }, category: 'leisure' },
  { id: 'park_badminton', displayName: 'Badminton Court', districtId: 'mogra_park', position: { x: 232, z: 82 }, category: 'leisure' },
  { id: 'hill_minigolf', displayName: 'Hill Garden Mini-golf', districtId: 'hill_garden', position: { x: 278, z: 252 }, category: 'leisure' },
] as const;

export function locationAnchor(id: string): CityLocationAnchor | undefined {
  return AMAYA_BAY_LOCATION_ANCHORS.find((location) => location.id === id);
}
