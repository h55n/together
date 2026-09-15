// shared/constants.js
// Single source of truth for all game constants

export const GAME = {
  // Time
  REAL_MS_PER_GAME_HOUR: 60_000,       // 1 real minute = 1 game hour
  GAME_HOURS_PER_DAY: 24,
  REAL_MS_PER_GAME_DAY: 60_000 * 24,   // 24 real minutes = 1 game day

  // City
  CITY_ID: 'navrang_nagar',
  CITY_SIZE: 400,                        // world units

  // Player
  WALK_SPEED: 4,                         // world units/second
  RUN_SPEED: 8,
  PLAYER_HEIGHT: 1.7,
  PLAYER_RADIUS: 0.4,

  // Interaction
  INTERACTION_RADIUS_DOOR: 2.5,
  INTERACTION_RADIUS_NPC: 2.0,
  INTERACTION_RADIUS_FURNITURE: 1.5,
  INTERACTION_RADIUS_PLAYER: 3.0,

  // Camera
  CAMERA_DISTANCE_THIRD: 6,
  CAMERA_HEIGHT_THIRD: 3,
  CAMERA_DISTANCE_CINEMATIC: 10,
  CAMERA_HEIGHT_CINEMATIC: 5,
  CAMERA_SPRING_STIFFNESS: 80,
  CAMERA_SPRING_DAMPING: 16,

  // Economy
  STARTING_HOUSEHOLD_WALLET: 500,
  STARTING_PERSONAL_WALLET: 100,
  RENT_PER_GAME_WEEK: 100,
  UTILITIES_PER_GAME_WEEK: 20,
  SAFETY_NET_AMOUNT: 150,
  SAFETY_NET_MAX_USES: 3,

  // Vibe
  VIBE_MAX: 100,
  VIBE_MIN: 0,
  VIBE_DECAY_RATE: 1,                    // points per 10 real minutes below 80
  VIBE_DECAY_INTERVAL_MS: 600_000,

  // Relationship
  RELATIONSHIP_MAX: 100,
  RELATIONSHIP_MIN: 0,
  RELATIONSHIP_ARGUMENT_THRESHOLD: 35,   // triggers argument event

  // NPCs
  NPC_COUNT_MIN: 20,
  NPC_COUNT_MAX: 30,
  NPC_LOD_FULL: 30,                      // units — full mesh
  NPC_LOD_BILLBOARD: 80,                 // units — billboard sprite
  NPC_WALK_SPEED: 3.5,

  // Multiplayer
  POSITION_SEND_RATE_MS: 50,            // max 20 sends/second
  POSITION_THRESHOLD: 0.1,              // min movement to trigger send
};

export const VIBE_TIERS = {
  RADIANT:  { min: 80, max: 100, label: 'Radiant' },
  COSY:     { min: 60, max: 79,  label: 'Cosy' },
  LIVED_IN: { min: 40, max: 59,  label: 'Lived-in' },
  MESSY:    { min: 20, max: 39,  label: 'Messy' },
  DISASTER: { min: 0,  max: 19,  label: 'Disaster' },
};

export const CHORES = {
  WASH_DISHES:    { id: 'wash_dishes',    vibe: 5,  coins: 3,  duration: 30  },
  TAKE_OUT_TRASH: { id: 'take_out_trash', vibe: 5,  coins: 3,  duration: 20  },
  WATER_PLANTS:   { id: 'water_plants',   vibe: 3,  coins: 1,  duration: 30  },
  DO_LAUNDRY:     { id: 'do_laundry',     vibe: 10, coins: 6,  duration: 180 },
  COOK_DINNER:    { id: 'cook_dinner',    vibe: 12, coins: 8,  duration: 300 },
  BUY_GROCERIES:  { id: 'buy_groceries',  vibe: 5,  coins: 4,  duration: 300 },
  VACUUM_SWEEP:   { id: 'vacuum_sweep',   vibe: 8,  coins: 5,  duration: 120 },
  PAY_BILLS:      { id: 'pay_bills',      vibe: 5,  coins: 0,  duration: 30  },
  FIX_ITEM:       { id: 'fix_item',       vibe: 10, coins: 6,  duration: 180 },
  BATHROOM_CLEAN: { id: 'bathroom_clean', vibe: 8,  coins: 5,  duration: 120 },
};

export const JOBS = {
  BARISTA:  { id: 'barista',  location: 'cafe_roshan', hours: [7, 15, 17, 22] },
  DELIVERY: { id: 'delivery', location: 'street',      hours: [10, 20] },
  MARKET:   { id: 'market',   location: 'the_market',  hours: [7, 13], seasonal: 'summer' },
  FREELANCE:{ id: 'freelance', location: 'apartment',  hours: null },
};

export const JOB_EARNINGS = {
  barista:  { level1: [40, 55], level2: [55, 70], level3: [65, 80] },
  delivery: { level1: [30, 45], level2: [45, 60], level3: [55, 70] },
  market:   { level1: [25, 50] },
  freelance:{ level1: [20, 35], level2: [35, 50], level3: [50, 65] },
};

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

export const WEATHER_WEIGHTS = {
  spring: { sunny: 0.50, cloudy: 0.25, light_rain: 0.20, heavy_rain: 0.05 },
  summer: { sunny: 0.70, cloudy: 0.20, light_rain: 0.08, heavy_rain: 0.02 },
  autumn: { sunny: 0.30, cloudy: 0.30, light_rain: 0.25, heavy_rain: 0.10, fog: 0.05 },
  winter: { sunny: 0.20, cloudy: 0.30, light_rain: 0.15, heavy_rain: 0.10, fog: 0.15, snow: 0.10 },
};

export const TIME_PERIODS = {
  DAWN:        { start: 5,  end: 7  },
  MORNING:     { start: 7,  end: 12 },
  AFTERNOON:   { start: 12, end: 17 },
  GOLDEN_HOUR: { start: 17, end: 19 },
  EVENING:     { start: 19, end: 22 },
  NIGHT:       { start: 22, end: 5  },
};

export const PATHS = {
  COUPLE:  'couple',
  FRIENDS: 'friends',
  OPEN:    'open',
};

export const EXPRESSIONS = {
  HAPPY:    'happy',
  TIRED:    'tired',
  GRUMPY:   'grumpy',
  EXCITED:  'excited',
  IN_LOVE:  'in_love',
  SAD:      'sad',
};

export const FURNITURE_CATALOG = [
  // Seating
  { id: 'sofa_2seat',   name: 'Two-Seat Sofa',    category: 'seating',  cost: 65,  size: [3,2], interaction: 'sit',   vibe: 8  },
  { id: 'sofa_3seat',   name: 'Three-Seat Sofa',   category: 'seating',  cost: 90,  size: [4,2], interaction: 'sit',   vibe: 10 },
  { id: 'armchair',     name: 'Armchair',           category: 'seating',  cost: 45,  size: [2,2], interaction: 'sit',   vibe: 6  },
  // Tables
  { id: 'coffee_table', name: 'Coffee Table',       category: 'tables',   cost: 30,  size: [2,1], interaction: null,    vibe: 4  },
  { id: 'dining_table', name: 'Dining Table',       category: 'tables',   cost: 55,  size: [3,2], interaction: 'sit',   vibe: 7  },
  { id: 'desk',         name: 'Work Desk',          category: 'tables',   cost: 40,  size: [2,1], interaction: 'work',  vibe: 5  },
  // Beds
  { id: 'single_bed',   name: 'Single Bed',         category: 'beds',     cost: 60,  size: [2,3], interaction: 'sleep', vibe: 8,  required_for: 'sleep' },
  { id: 'double_bed',   name: 'Double Bed',         category: 'beds',     cost: 80,  size: [3,3], interaction: 'sleep', vibe: 10, required_for: 'sleep' },
  // Kitchen — required
  { id: 'stove',        name: 'Stove',              category: 'kitchen',  cost: 80,  size: [2,1], interaction: 'cook',  vibe: 0,  required_for: 'cooking' },
  { id: 'fridge',       name: 'Refrigerator',       category: 'kitchen',  cost: 70,  size: [1,1], interaction: null,    vibe: 0,  required_for: 'cooking' },
  { id: 'kitchen_sink', name: 'Kitchen Sink',       category: 'kitchen',  cost: 40,  size: [1,1], interaction: 'dishes',vibe: 0,  required_for: 'dishes'  },
  // Bathroom — required
  { id: 'toilet',       name: 'Toilet',             category: 'bathroom', cost: 30,  size: [1,1], interaction: null,    vibe: 0  },
  { id: 'bath_sink',    name: 'Bathroom Sink',      category: 'bathroom', cost: 25,  size: [1,1], interaction: null,    vibe: 0  },
  { id: 'shower',       name: 'Shower',             category: 'bathroom', cost: 50,  size: [1,1], interaction: null,    vibe: 0  },
  // Laundry
  { id: 'washing_machine', name: 'Washing Machine', category: 'bathroom', cost: 90,  size: [1,1], interaction: 'laundry', vibe: 0, required_for: 'laundry' },
  // Decor
  { id: 'floor_lamp',   name: 'Floor Lamp',         category: 'lighting', cost: 18,  size: [1,1], interaction: null,    vibe: 5  },
  { id: 'plant_small',  name: 'Potted Plant (Small)',category: 'decor',   cost: 12,  size: [1,1], interaction: 'water', vibe: 4  },
  { id: 'plant_large',  name: 'Potted Plant (Large)',category: 'decor',   cost: 22,  size: [1,1], interaction: 'water', vibe: 6  },
  { id: 'photo_frame',  name: 'Photo Frame',        category: 'decor',   cost: 8,   size: [1,1], interaction: null,    vibe: 3  },
  { id: 'bookshelf',    name: 'Bookshelf',          category: 'storage', cost: 55,  size: [2,1], interaction: null,    vibe: 7  },
  { id: 'tv_stand',     name: 'TV + Stand',         category: 'decor',   cost: 90,  size: [2,1], interaction: 'watch', vibe: 6  },
  { id: 'fairy_lights', name: 'Fairy Lights',       category: 'lighting', cost: 15,  size: [2,1], interaction: null,    vibe: 5  },
  { id: 'rug_large',    name: 'Area Rug',           category: 'decor',   cost: 35,  size: [3,2], interaction: null,    vibe: 4  },
];

export const COLOURS = {
  WARM_CREAM:    '#FFF8E7',
  DEEP_BROWN:    '#2C1810',
  RUST_RED:      '#C0392B',
  MUSTARD_GOLD:  '#D4A017',
  SAGE_GREEN:    '#7A9E7E',
  DUSTY_BLUE:    '#5B7FA6',
  WARM_GRAY:     '#8B7355',
  LIGHT_TAN:     '#F5E6C8',
  TERRACOTTA:    '#C46B47',
  SOFT_BLACK:    '#1A1208',
  NAVRANG_GOLD:  '#E8A838',
  MAUVE_EVENING: '#9B7BA6',
  WARM_SHADOW:   '#3D2B1F',
  NIGHT_INDIGO:  '#1C1F3A',
};

export const WALL_COLOURS = [
  { id: 'cream',       hex: '#FFF8E7', name: 'Warm Cream'    },
  { id: 'terracotta',  hex: '#C46B47', name: 'Terracotta'    },
  { id: 'sage',        hex: '#7A9E7E', name: 'Sage Green'    },
  { id: 'dusty_blue',  hex: '#5B7FA6', name: 'Dusty Blue'    },
  { id: 'mustard',     hex: '#D4A017', name: 'Mustard'       },
  { id: 'mauve',       hex: '#9B7BA6', name: 'Mauve'         },
  { id: 'rust',        hex: '#C0392B', name: 'Rust Red'       },
  { id: 'tan',         hex: '#F5E6C8', name: 'Light Tan'     },
  { id: 'warm_white',  hex: '#F0EAD6', name: 'Plaster White' },
  { id: 'charcoal',    hex: '#3D2B1F', name: 'Warm Charcoal' },
];

export const FLOOR_MATERIALS = [
  { id: 'wood',     name: 'Hardwood',  texture: 'floor_wood.jpg'     },
  { id: 'tile',     name: 'Tile',      texture: 'floor_tile.jpg'     },
  { id: 'carpet',   name: 'Carpet',    texture: 'floor_carpet.jpg'   },
  { id: 'concrete', name: 'Concrete',  texture: 'floor_concrete.jpg' },
];
