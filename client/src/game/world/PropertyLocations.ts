import type { StarterPropertyDefinition } from '@together/shared';
import { STARTER_HOME_CENTER, STARTER_HOME_RESERVE_RADIUS } from './StarterHome';

export type PropertyWorldPlacement = {
  center: { x: number; z: number };
  reserveRadius: number;
  width: number;
  depth: number;
  beds: number;
};

export const PROPERTY_WORLD_PLACEMENTS: Record<StarterPropertyDefinition['id'], PropertyWorldPlacement> = {
  couple_studio: { center: STARTER_HOME_CENTER, reserveRadius: STARTER_HOME_RESERVE_RADIUS, width: 11, depth: 9, beds: 1 },
  one_bhk: { center: { x: -262, z: 202 }, reserveRadius: 18, width: 13.5, depth: 10, beds: 1 },
  courtyard_2bhk: { center: { x: -205, z: 203 }, reserveRadius: 20, width: 16, depth: 12, beds: 2 },
  pg_house: { center: { x: -230, z: -135 }, reserveRadius: 22, width: 18, depth: 13, beds: 4 },
  hostel_floor: { center: { x: -305, z: 145 }, reserveRadius: 24, width: 20, depth: 14, beds: 6 },
};

export const PROPERTY_WORLD_RESERVATIONS = Object.values(PROPERTY_WORLD_PLACEMENTS).map(({ center, reserveRadius }) => ({ center, reserveRadius }));
