export type FurnitureCategory = 'seat' | 'table' | 'storage' | 'lighting' | 'decor' | 'plant' | 'bed';

export type FurnitureDefinition = {
  id: string;
  displayName: string;
  category: FurnitureCategory;
  price: number;
  sellValue: number;
  footprint: { width: number; depth: number; clearance?: number };
  supportedRooms: readonly string[] | 'any';
  modelAsset?: string;
  placeholderAsset: boolean;
};

const BEDROOMS = ['bedroom', 'bedroom_a', 'bedroom_b', 'bedroom_c', 'room_a', 'room_b', 'room_c', 'room_d', 'living_sleep'] as const;
const LIVING = ['living', 'living_sleep', 'common'] as const;
const SHARED = ['living', 'living_sleep', 'common', 'kitchen'] as const;

function item(
  id: string,
  displayName: string,
  category: FurnitureCategory,
  price: number,
  width: number,
  depth: number,
  supportedRooms: readonly string[] | 'any' = 'any',
  clearance = 0.05,
): FurnitureDefinition {
  return {
    id, displayName, category, price, sellValue: Math.floor(price * 0.5),
    footprint: { width, depth, ...(clearance > 0 ? { clearance } : {}) },
    supportedRooms, placeholderAsset: true,
  };
}

/**
 * V1 development catalog. Stable IDs/prices/footprints are production-save compatible.
 * Visual geometry is intentionally procedural placeholder art until the GLB assets listed
 * in docs/ASSET_REQUIREMENTS.md replace them one-for-one without changing these IDs.
 */
export const FURNITURE_CATALOG: readonly FurnitureDefinition[] = [
  // Seats — varied compact-city proportions.
  item('chair_wood_01', 'Warm Wood Chair', 'seat', 850, 0.55, 0.58),
  item('sofa_2seat_01', 'Mogra Two-Seater', 'seat', 3600, 1.75, 0.82, LIVING, 0.08),
  item('chair_cane_01', 'Cane Reading Chair', 'seat', 1200, 0.72, 0.74),
  item('chair_cafe_01', 'Roshan Café Chair', 'seat', 760, 0.52, 0.55),
  item('chair_fold_01', 'Foldaway Balcony Chair', 'seat', 540, 0.5, 0.55),
  item('chair_upholstered_01', 'Sage Lounge Chair', 'seat', 1900, 0.82, 0.84, LIVING),
  item('stool_kitchen_01', 'Kitchen Counter Stool', 'seat', 680, 0.44, 0.44, SHARED),
  item('bench_entry_01', 'Entryway Bench', 'seat', 1450, 1.2, 0.42),
  item('sofa_3seat_01', 'Rainy Evening Sofa', 'seat', 5200, 2.2, 0.88, LIVING, 0.1),
  item('sofa_daybed_01', 'Daybed Sofa', 'seat', 4400, 1.9, 0.9, LIVING),
  item('floor_cushion_01', 'Floor Cushion Pair', 'seat', 620, 0.72, 0.72, LIVING, 0),
  item('ottoman_01', 'Woven Ottoman', 'seat', 900, 0.65, 0.52, LIVING),

  // Tables/work surfaces.
  item('table_dining_01', 'Compact Dining Table', 'table', 1650, 1.2, 0.75, SHARED, 0.12),
  item('table_side_01', 'Cane Side Table', 'table', 620, 0.45, 0.45),
  item('desk_work_01', 'Rain Tree Work Desk', 'table', 1850, 1.25, 0.62),
  item('table_round_01', 'Round Tea Table', 'table', 1350, 0.9, 0.9, LIVING),
  item('table_dining_02', 'Four-Person Dining Table', 'table', 2450, 1.55, 0.9, SHARED),
  item('desk_wall_01', 'Slim Wall Desk', 'table', 1500, 1.1, 0.48),
  item('desk_shared_01', 'Shared Study Desk', 'table', 2800, 1.8, 0.68, LIVING),
  item('table_balcony_01', 'Balcony Tea Table', 'table', 820, 0.65, 0.65),
  item('table_low_01', 'Low Common Table', 'table', 980, 1.05, 0.62, LIVING),
  item('table_fold_01', 'Folding Utility Table', 'table', 740, 0.9, 0.55),
  item('console_entry_01', 'Entry Console', 'table', 1180, 1.05, 0.36),
  item('table_bedside_01', 'Bedside Table', 'table', 690, 0.48, 0.42, BEDROOMS),

  // Storage.
  item('shelf_low_01', 'Low Book Shelf', 'storage', 1250, 1.15, 0.36),
  item('shelf_tall_01', 'Tall Book Shelf', 'storage', 2100, 0.95, 0.4),
  item('cabinet_kitchen_01', 'Freestanding Kitchen Cabinet', 'storage', 2200, 1.1, 0.52, ['kitchen', 'shared_kitchen', 'living_sleep']),
  item('wardrobe_01', 'Two-Door Wardrobe', 'storage', 3100, 1.25, 0.62, BEDROOMS),
  item('dresser_01', 'Low Bedroom Dresser', 'storage', 1950, 1.15, 0.48, BEDROOMS),
  item('shoe_rack_01', 'Entry Shoe Rack', 'storage', 720, 0.82, 0.32),
  item('basket_laundry_01', 'Woven Laundry Basket', 'storage', 450, 0.48, 0.48),
  item('cabinet_media_01', 'Low Media Cabinet', 'storage', 1700, 1.45, 0.42, LIVING),
  item('shelf_wall_01', 'Open Display Shelf', 'storage', 1350, 1.2, 0.32),
  item('trunk_storage_01', 'Cotton Storage Trunk', 'storage', 980, 0.9, 0.5),

  // Practical lighting — enough to visibly change home mood.
  item('lamp_floor_01', 'Amber Floor Lamp', 'lighting', 780, 0.42, 0.42),
  item('lamp_floor_02', 'Paper Shade Floor Lamp', 'lighting', 960, 0.46, 0.46),
  item('lamp_table_01', 'Warm Bedside Lamp', 'lighting', 520, 0.3, 0.3),
  item('lamp_table_02', 'Terracotta Table Lamp', 'lighting', 640, 0.34, 0.34),
  item('lamp_desk_01', 'Small Work Lamp', 'lighting', 590, 0.28, 0.28),
  item('lamp_arc_01', 'Arc Reading Lamp', 'lighting', 1400, 0.62, 0.62, LIVING),
  item('lamp_tripod_01', 'Timber Tripod Lamp', 'lighting', 1280, 0.55, 0.55, LIVING),
  item('lamp_bamboo_01', 'Bamboo Shade Lamp', 'lighting', 850, 0.42, 0.42),
  item('lamp_glass_01', 'Smoked Glass Lamp', 'lighting', 1050, 0.36, 0.36),
  item('lamp_reading_01', 'Adjustable Reading Light', 'lighting', 760, 0.38, 0.38),
  item('lamp_festival_01', 'Festival String Light Stand', 'lighting', 900, 0.5, 0.35),
  item('lamp_cane_01', 'Cane Lantern', 'lighting', 680, 0.35, 0.35),
  item('lamp_mushroom_01', 'Mushroom Table Lamp', 'lighting', 720, 0.32, 0.32),
  item('lamp_sage_01', 'Sage Ceramic Lamp', 'lighting', 690, 0.32, 0.32),
  item('lamp_balcony_01', 'Balcony Lantern', 'lighting', 600, 0.34, 0.34),

  // Rugs / soft decor / visual identity.
  item('rug_woven_01', 'Muted Woven Rug', 'decor', 1100, 1.6, 2.2, LIVING, 0),
  item('rug_jute_01', 'Natural Jute Rug', 'decor', 980, 1.5, 2.0, 'any', 0),
  item('rug_blue_01', 'Rainy Blue Rug', 'decor', 1350, 1.7, 2.3, LIVING, 0),
  item('rug_runner_01', 'Hall Runner', 'decor', 760, 0.8, 2.4, 'any', 0),
  item('rug_bedside_01', 'Soft Bedside Rug', 'decor', 620, 0.85, 1.25, BEDROOMS, 0),
  item('mat_entry_01', 'Woven Entry Mat', 'decor', 320, 0.7, 0.45, 'any', 0),
  item('cushion_floor_01', 'Terracotta Floor Mat', 'decor', 540, 1.1, 1.1, LIVING, 0),
  item('decor_blanket_01', 'Folded Throw Blanket', 'decor', 380, 0.65, 0.45, LIVING, 0),
  item('decor_books_01', 'Small Book Stack', 'decor', 280, 0.32, 0.24, 'any', 0),
  item('decor_tray_01', 'Tea Tray', 'decor', 260, 0.38, 0.28, SHARED, 0),
  item('decor_vase_01', 'Simple Ceramic Vase', 'decor', 420, 0.26, 0.26, 'any', 0),
  item('decor_basket_01', 'Market Basket', 'decor', 350, 0.4, 0.34, 'any', 0),
  item('decor_photo_01', 'Household Photo Frame', 'decor', 450, 0.28, 0.18, 'any', 0),
  item('decor_clock_01', 'Quiet Table Clock', 'decor', 390, 0.22, 0.16, 'any', 0),
  item('decor_incense_01', 'Small Incense Tray', 'decor', 220, 0.24, 0.14, 'any', 0),

  // Beds.
  item('bed_double_01', 'Cotton Double Bed', 'bed', 4300, 1.55, 2.05, BEDROOMS, 0.1),
  item('bed_single_01', 'Simple Single Bed', 'bed', 2800, 1.0, 2.0, BEDROOMS, 0.08),
  item('bed_single_storage_01', 'Storage Single Bed', 'bed', 3600, 1.0, 2.0, BEDROOMS, 0.08),
  item('bed_double_low_01', 'Low Platform Double Bed', 'bed', 4900, 1.62, 2.08, BEDROOMS, 0.1),
  item('bed_double_cane_01', 'Cane Headboard Bed', 'bed', 5600, 1.65, 2.1, BEDROOMS, 0.1),
  item('bed_bunk_01', 'Hostel Bunk Bed', 'bed', 4200, 1.05, 2.05, ['room_a', 'room_b', 'room_c', 'room_d'], 0.1),
  item('bed_day_01', 'Guest Day Bed', 'bed', 3200, 1.05, 2.0, [...BEDROOMS, 'common'], 0.08),
  item('bed_floor_01', 'Low Floor Bed', 'bed', 3000, 1.35, 2.0, BEDROOMS, 0.08),

  // Greenery — species/scale options are stable content IDs even while procedural art is temporary.
  item('plant_pothos_01', 'Pothos', 'plant', 320, 0.32, 0.32, 'any', 0),
  item('plant_snake_01', 'Snake Plant', 'plant', 420, 0.34, 0.34, 'any', 0),
  item('plant_rubber_01', 'Rubber Plant', 'plant', 650, 0.46, 0.46, 'any', 0),
  item('plant_areca_01', 'Areca Palm', 'plant', 900, 0.62, 0.62, 'any', 0),
  item('plant_ficus_01', 'Compact Ficus', 'plant', 780, 0.55, 0.55, 'any', 0),
  item('plant_jasmine_01', 'Jasmine Pot', 'plant', 520, 0.42, 0.42, 'any', 0),
  item('plant_bougainvillea_01', 'Bougainvillea Pot', 'plant', 720, 0.52, 0.52, 'any', 0),
  item('plant_tulsi_01', 'Tulsi Planter', 'plant', 380, 0.4, 0.4, 'any', 0),
  item('plant_fern_01', 'Boston Fern', 'plant', 560, 0.48, 0.48, 'any', 0),
  item('plant_monstera_01', 'Monstera', 'plant', 760, 0.55, 0.55, 'any', 0),
  item('plant_peace_lily_01', 'Peace Lily', 'plant', 520, 0.42, 0.42, 'any', 0),
  item('plant_spider_01', 'Spider Plant', 'plant', 360, 0.36, 0.36, 'any', 0),
  item('plant_zz_01', 'ZZ Plant', 'plant', 480, 0.4, 0.4, 'any', 0),
  item('plant_aloe_01', 'Aloe Pot', 'plant', 300, 0.32, 0.32, 'any', 0),
  item('plant_herb_01', 'Kitchen Herb Trio', 'plant', 440, 0.5, 0.28, ['kitchen', 'shared_kitchen', 'living_sleep'], 0),
  item('plant_balcony_01', 'Balcony Flower Box', 'plant', 620, 0.72, 0.3, 'any', 0),
  item('plant_hanging_01', 'Hanging Vine Basket', 'plant', 540, 0.38, 0.38, 'any', 0),
  item('plant_cactus_01', 'Small Cactus Trio', 'plant', 280, 0.34, 0.24, 'any', 0),
  item('plant_bamboo_01', 'Lucky Bamboo', 'plant', 390, 0.28, 0.28, 'any', 0),
  item('plant_calathea_01', 'Calathea', 'plant', 580, 0.44, 0.44, 'any', 0),
] as const;

export function furnitureById(id: string): FurnitureDefinition | undefined {
  return FURNITURE_CATALOG.find((definition) => definition.id === id);
}
