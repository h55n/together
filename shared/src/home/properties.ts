import type { HouseholdType } from '../contracts.js';

export type StarterPropertyId = 'couple_studio' | 'one_bhk' | 'courtyard_2bhk' | 'pg_house' | 'hostel_floor';
export type StarterPropertyDefinition = {
  id: StarterPropertyId;
  displayName: string;
  recordId: string;
  minCapacity: number;
  maxCapacity: number;
  householdTypes: readonly HouseholdType[];
  rooms: readonly string[];
  roomBounds: Readonly<Record<string, { minX: number; maxX: number; minZ: number; maxZ: number }>>;
  starterCost: number;
  buildingId: string;
  unitId: string;
  baseLayoutId: string;
  authoredRenovationSockets: readonly string[];
};

export const STARTER_PROPERTIES: readonly StarterPropertyDefinition[] = [
  {
    id: 'couple_studio', displayName: 'Couple Studio', recordId: '10000000-0000-4000-8000-000000000001', minCapacity: 2, maxCapacity: 2,
    householdTypes: ['couple'], rooms: ['living_sleep', 'kitchen', 'bathroom', 'balcony'],
    roomBounds: { living_sleep: { minX: 0, maxX: 5.8, minZ: 0, maxZ: 4.8 }, kitchen: { minX: 0, maxX: 3.4, minZ: 0, maxZ: 2.8 }, bathroom: { minX: 0, maxX: 2.2, minZ: 0, maxZ: 2.1 }, balcony: { minX: 0, maxX: 4.8, minZ: 0, maxZ: 1.6 } },
    starterCost: 0, buildingId: 'mogra_court_a', unitId: 'a-102', baseLayoutId: 'studio_01',
    authoredRenovationSockets: ['study_corner', 'balcony_planter_wall', 'expanded_counter'],
  },
  {
    id: 'one_bhk', displayName: 'Mogra 1BHK', recordId: '10000000-0000-4000-8000-000000000002', minCapacity: 2, maxCapacity: 2,
    householdTypes: ['couple', 'friends'], rooms: ['bedroom', 'living', 'kitchen', 'bathroom', 'balcony'],
    roomBounds: { bedroom: { minX: 0, maxX: 4.2, minZ: 0, maxZ: 3.6 }, living: { minX: 0, maxX: 5.2, minZ: 0, maxZ: 4.1 }, kitchen: { minX: 0, maxX: 3.8, minZ: 0, maxZ: 3 }, bathroom: { minX: 0, maxX: 2.5, minZ: 0, maxZ: 2.2 }, balcony: { minX: 0, maxX: 4.5, minZ: 0, maxZ: 1.6 } },
    starterCost: 700, buildingId: 'mogra_court_b', unitId: 'b-204', baseLayoutId: 'one_bhk_01',
    authoredRenovationSockets: ['study_corner', 'shelving_wall', 'balcony_enclosure'],
  },
  {
    id: 'courtyard_2bhk', displayName: 'Courtyard 2BHK', recordId: '10000000-0000-4000-8000-000000000003', minCapacity: 2, maxCapacity: 4,
    householdTypes: ['couple', 'friends'], rooms: ['bedroom_a', 'bedroom_b', 'living', 'kitchen', 'bathroom_a', 'courtyard'],
    roomBounds: { bedroom_a: { minX: 0, maxX: 4.3, minZ: 0, maxZ: 3.8 }, bedroom_b: { minX: 0, maxX: 4.1, minZ: 0, maxZ: 3.7 }, living: { minX: 0, maxX: 6.4, minZ: 0, maxZ: 4.8 }, kitchen: { minX: 0, maxX: 4.6, minZ: 0, maxZ: 3.4 }, bathroom_a: { minX: 0, maxX: 2.6, minZ: 0, maxZ: 2.4 }, courtyard: { minX: 0, maxX: 5.2, minZ: 0, maxZ: 4.4 } },
    starterCost: 1600, buildingId: 'mogra_court_c', unitId: 'c-101', baseLayoutId: 'courtyard_2bhk_01',
    authoredRenovationSockets: ['open_partition', 'plant_wall', 'kitchen_extension'],
  },
  {
    id: 'pg_house', displayName: 'Rain Tree PG House', recordId: '10000000-0000-4000-8000-000000000004', minCapacity: 3, maxCapacity: 5,
    householdTypes: ['friends'], rooms: ['bedroom_a', 'bedroom_b', 'bedroom_c', 'common', 'kitchen', 'utility', 'terrace'],
    roomBounds: { bedroom_a: { minX: 0, maxX: 3.4, minZ: 0, maxZ: 3.2 }, bedroom_b: { minX: 0, maxX: 3.4, minZ: 0, maxZ: 3.2 }, bedroom_c: { minX: 0, maxX: 3.6, minZ: 0, maxZ: 3.2 }, common: { minX: 0, maxX: 6.2, minZ: 0, maxZ: 5.2 }, kitchen: { minX: 0, maxX: 4.6, minZ: 0, maxZ: 3.5 }, utility: { minX: 0, maxX: 2.5, minZ: 0, maxZ: 2.4 }, terrace: { minX: 0, maxX: 8, minZ: 0, maxZ: 5.5 } },
    starterCost: 900, buildingId: 'rain_tree_pg_01', unitId: 'house', baseLayoutId: 'pg_house_01',
    authoredRenovationSockets: ['terrace_garden', 'utility_storage', 'common_room_divider'],
  },
  {
    id: 'hostel_floor', displayName: 'Mogra Hostel Floor', recordId: '10000000-0000-4000-8000-000000000005', minCapacity: 4, maxCapacity: 6,
    householdTypes: ['friends'], rooms: ['room_a', 'room_b', 'room_c', 'room_d', 'common', 'shared_bath', 'shared_kitchen', 'roof'],
    roomBounds: { room_a: { minX: 0, maxX: 3.1, minZ: 0, maxZ: 3 }, room_b: { minX: 0, maxX: 3.1, minZ: 0, maxZ: 3 }, room_c: { minX: 0, maxX: 3.1, minZ: 0, maxZ: 3 }, room_d: { minX: 0, maxX: 3.1, minZ: 0, maxZ: 3 }, common: { minX: 0, maxX: 7.2, minZ: 0, maxZ: 5.4 }, shared_bath: { minX: 0, maxX: 4.5, minZ: 0, maxZ: 3 }, shared_kitchen: { minX: 0, maxX: 5.1, minZ: 0, maxZ: 3.8 }, roof: { minX: 0, maxX: 9, minZ: 0, maxZ: 6 } },
    starterCost: 500, buildingId: 'mogra_hostel_01', unitId: 'floor-3', baseLayoutId: 'hostel_floor_01',
    authoredRenovationSockets: ['roof_gathering', 'notice_wall', 'kitchen_storage'],
  },
] as const;

export function eligibleStarterProperties(type: HouseholdType, memberCount: number): StarterPropertyDefinition[] {
  return STARTER_PROPERTIES.filter((property) =>
    property.householdTypes.includes(type)
    && memberCount >= property.minCapacity
    && memberCount <= property.maxCapacity,
  );
}

export function starterPropertyById(id: string): StarterPropertyDefinition | undefined {
  return STARTER_PROPERTIES.find((property) => property.id === id || property.recordId === id);
}
