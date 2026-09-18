import { AMAYA_BAY_CITY } from './city.js';

export type SurfacePoint = { x: number; z: number };
export type CitySurfaceKind = 'road' | 'path' | 'promenade';

export type CitySurfaceRoute = {
  id: string;
  kind: CitySurfaceKind;
  width: number;
  points: readonly SurfacePoint[];
};

/**
 * Canonical connective surface graph for Amaya Bay. These routes are intentionally
 * authored in world space so rendering, procedural clearances, navigation/debug
 * tooling and future traffic logic can share one city layout.
 */
export const AMAYA_BAY_SURFACE_ROUTES: readonly CitySurfaceRoute[] = [
  {
    id: 'main-spine',
    kind: 'road',
    width: 7.6,
    points: [
      { x: -330, z: 170 }, { x: -265, z: 160 }, { x: -230, z: 150 },
      { x: -160, z: 120 }, { x: -90, z: 105 }, { x: -30, z: 75 },
      { x: 20, z: 25 }, { x: 55, z: -45 }, { x: 65, z: -125 },
      { x: 72, z: -210 }, { x: 75, z: -280 },
    ],
  },
  {
    id: 'east-arc',
    kind: 'road',
    width: 7.2,
    points: [
      { x: -55, z: 82 }, { x: 20, z: 92 }, { x: 105, z: 104 },
      { x: 185, z: 110 }, { x: 225, z: 160 }, { x: 250, z: 225 },
      { x: 265, z: 275 },
    ],
  },
  {
    id: 'common-cross',
    kind: 'road',
    width: 7,
    points: [
      { x: -245, z: -112 }, { x: -205, z: -95 }, { x: -140, z: -70 },
      { x: -70, z: -25 }, { x: 0, z: -20 }, { x: 85, z: -35 },
      { x: 160, z: -55 }, { x: 215, z: -80 }, { x: 270, z: -90 },
    ],
  },
  {
    id: 'waterfront-promenade',
    kind: 'promenade',
    width: 11,
    points: [
      { x: -80, z: -292 }, { x: -20, z: -290 }, { x: 45, z: -282 },
      { x: 110, z: -270 }, { x: 175, z: -248 },
    ],
  },
  {
    id: 'mogra-park-walk',
    kind: 'path',
    width: 4.2,
    points: [
      { x: 125, z: 80 }, { x: 145, z: 115 }, { x: 170, z: 145 },
      { x: 205, z: 165 }, { x: 232, z: 130 }, { x: 232, z: 82 },
    ],
  },
  {
    id: 'hill-garden-loop',
    kind: 'path',
    width: 4,
    points: [
      { x: 220, z: 260 }, { x: 260, z: 245 }, { x: 315, z: 225 },
      { x: 330, z: 270 }, { x: 300, z: 330 }, { x: 265, z: 290 },
      { x: 220, z: 260 },
    ],
  },
] as const;

export type NearestSurfaceRoute = {
  route: CitySurfaceRoute;
  distance: number;
};

export function distanceToSurfaceRoute(x: number, z: number, route: CitySurfaceRoute): number {
  let nearest = Number.POSITIVE_INFINITY;
  for (let index = 1; index < route.points.length; index += 1) {
    nearest = Math.min(nearest, distanceToSegment(x, z, route.points[index - 1]!, route.points[index]!));
  }
  return nearest;
}

export function nearestAmayaBaySurfaceRoute(x: number, z: number): NearestSurfaceRoute | null {
  let result: NearestSurfaceRoute | null = null;
  for (const route of AMAYA_BAY_SURFACE_ROUTES) {
    const distance = distanceToSurfaceRoute(x, z, route);
    if (!result || distance < result.distance) result = { route, distance };
  }
  return result;
}

export function buildingFootprintClearsSurfaceRoutes(
  x: number,
  z: number,
  width: number,
  depth: number,
  setback = 1.5,
): boolean {
  const nearest = nearestAmayaBaySurfaceRoute(x, z);
  if (!nearest) return true;
  const footprintRadius = Math.hypot(width, depth) / 2;
  return nearest.distance >= nearest.route.width / 2 + footprintRadius + setback;
}

export function pointClearsSurfaceRoutes(x: number, z: number, setback = 1.25): boolean {
  const nearest = nearestAmayaBaySurfaceRoute(x, z);
  return !nearest || nearest.distance >= nearest.route.width / 2 + setback;
}

export function surfaceRoutesStayInsideCity(): boolean {
  const halfCity = AMAYA_BAY_CITY.sizeMetres / 2;
  return AMAYA_BAY_SURFACE_ROUTES.every((route) =>
    route.points.every((point) => Math.abs(point.x) <= halfCity && Math.abs(point.z) <= halfCity)
  );
}

function distanceToSegment(x: number, z: number, start: SurfacePoint, end: SurfacePoint): number {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= 1e-10) return Math.hypot(x - start.x, z - start.z);
  const projection = ((x - start.x) * dx + (z - start.z) * dz) / lengthSquared;
  const t = Math.max(0, Math.min(1, projection));
  return Math.hypot(x - (start.x + dx * t), z - (start.z + dz * t));
}
