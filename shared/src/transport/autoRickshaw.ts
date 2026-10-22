import type { DistrictId } from '../world/city.js';
import { planAmayaBaySurfacePath } from '../world/navigation.js';

export type AutoDestination = {
  id: string;
  displayName: string;
  districtId: DistrictId;
  position: { x: number; z: number };
};

export const AUTO_DESTINATIONS: readonly AutoDestination[] = [
  { id: 'auto_mogra_court', displayName: 'Mogra Court', districtId: 'mogra_court', position: { x: -200, z: 130 } },
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

export type AutoRideRoute = { points: Array<{ x: number; z: number }>; lengths: number[]; lengthMetres: number };

/** The street route an auto follows between two points, falling back to a direct line when no route connects. */
export function planAutoRideRoute(start: { x: number; z: number }, end: { x: number; z: number }): AutoRideRoute {
  const plan = planAmayaBaySurfacePath(start, end);
  const points = plan && plan.points.length >= 2 ? plan.points.map(point => ({ x: point.x, z: point.z })) : [{ ...start }, { ...end }];
  const lengths = [0];
  for (let index = 1; index < points.length; index += 1) {
    lengths.push(lengths[index - 1]! + Math.hypot(points[index]!.x - points[index - 1]!.x, points[index]!.z - points[index - 1]!.z));
  }
  return { points, lengths, lengthMetres: lengths.at(-1) ?? 0 };
}

/** Position and travel heading (atan2 of the direction) at a fraction 0..1 of the route. */
export function sampleAutoRideRoute(route: AutoRideRoute, fraction: number): { x: number; z: number; heading: number } {
  const distance = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0)) * route.lengthMetres;
  let segment = 1;
  while (segment < route.points.length - 1 && route.lengths[segment]! < distance) segment += 1;
  const from = route.points[segment - 1]!, to = route.points[segment] ?? from;
  const span = (route.lengths[segment] ?? 0) - (route.lengths[segment - 1] ?? 0);
  const t = span > 0 ? (distance - route.lengths[segment - 1]!) / span : 0;
  return { x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t, heading: Math.atan2(to.x - from.x, to.z - from.z) };
}
