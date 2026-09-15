import type { DistrictId } from '../world/city.js';

export type AutoDestination = {
  id: string;
  displayName: string;
  districtId: DistrictId;
  position: { x: number; z: number };
};

export const AUTO_DESTINATIONS: readonly AutoDestination[] = [
  { id: 'auto_mogra_court', displayName: 'Mogra Court', districtId: 'mogra_court', position: { x: -190, z: 130 } },
  { id: 'auto_lantern_street', displayName: 'Lantern Street', districtId: 'lantern_street', position: { x: 28, z: 112 } },
  { id: 'auto_mogra_park', displayName: 'Mogra Park', districtId: 'mogra_park', position: { x: 178, z: 70 } },
  { id: 'auto_bay_steps', displayName: 'Bay Steps', districtId: 'bay_steps', position: { x: 66, z: -258 } },
  { id: 'auto_rain_tree_lane', displayName: 'Rain Tree Lane', districtId: 'rain_tree_lane', position: { x: -250, z: -65 } },
  { id: 'auto_the_common', displayName: 'The Common', districtId: 'the_common', position: { x: 225, z: -54 } },
  { id: 'auto_hill_garden', displayName: 'Hill Garden', districtId: 'hill_garden', position: { x: 282, z: 248 } },
] as const;

export function autoFare(from: { x: number; z: number }, to: { x: number; z: number }): number {
  const distance = Math.hypot(to.x - from.x, to.z - from.z);
  return Math.min(220, Math.max(25, Math.round((25 + distance * 0.22) / 5) * 5));
}

export function autoRideSeconds(distanceMetres: number): number {
  return Math.max(5, Math.min(18, 4 + Math.max(0, distanceMetres) / 55));
}
