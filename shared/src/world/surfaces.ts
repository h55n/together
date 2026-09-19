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
      { x: -350, z: 100 }, { x: -300, z: 102 }, { x: -250, z: 105 },
      { x: -205, z: 108 }, { x: -160, z: 110 }, { x: -90, z: 128 }, { x: -30, z: 132 },
      { x: -30, z: 18 }, { x: 20, z: -10 }, { x: 55, z: -45 }, { x: 65, z: -125 },
      { x: 72, z: -210 }, { x: 75, z: -280 },
    ],
  },
  {
    id: 'east-arc',
    kind: 'road',
    width: 7.2,
    points: [
      { x: -30, z: 142 }, { x: 30, z: 138 }, { x: 90, z: 90 },
      { x: 130, z: 55 }, { x: 200, z: 55 }, { x: 260, z: 60 },
      { x: 270, z: 130 }, { x: 265, z: 200 }, { x: 260, z: 220 },
    ],
  },
  {
    id: 'common-cross',
    kind: 'road',
    width: 7,
    points: [
      { x: -300, z: -55 }, { x: -245, z: -58 }, { x: -205, z: -60 },
      { x: -140, z: -55 }, { x: -70, z: -25 }, { x: 0, z: -20 },
      { x: 85, z: -35 }, { x: 145, z: -75 }, { x: 160, z: -110 },
      { x: 215, z: -115 }, { x: 270, z: -105 },
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
      { x: 205, z: 165 }, { x: 225, z: 135 }, { x: 220, z: 100 },
    ],
  },
  {
    id: 'hill-garden-loop',
    kind: 'path',
    width: 4,
    points: [
      { x: 215, z: 250 }, { x: 245, z: 225 }, { x: 300, z: 215 },
      { x: 330, z: 245 }, { x: 330, z: 300 }, { x: 305, z: 335 },
      { x: 255, z: 330 }, { x: 225, z: 300 }, { x: 215, z: 250 },
    ],
  },
] as const;

export type NearestSurfaceRoute = {
  route: CitySurfaceRoute;
  distance: number;
  point: SurfacePoint;
};

export function distanceToSurfaceRoute(x: number, z: number, route: CitySurfaceRoute): number {
  let nearest = Number.POSITIVE_INFINITY;
  for (let index = 1; index < route.points.length; index += 1) {
    nearest = Math.min(nearest, nearestPointOnSegment(x, z, route.points[index - 1]!, route.points[index]!).distance);
  }
  return nearest;
}

export function nearestAmayaBaySurfaceRoute(x: number, z: number): NearestSurfaceRoute | null {
  let result: NearestSurfaceRoute | null = null;
  for (const route of AMAYA_BAY_SURFACE_ROUTES) {
    for (let index = 1; index < route.points.length; index += 1) {
      const nearest = nearestPointOnSegment(x, z, route.points[index - 1]!, route.points[index]!);
      if (!result || nearest.distance < result.distance) {
        result = { route, distance: nearest.distance, point: nearest.point };
      }
    }
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

function nearestPointOnSegment(
  x: number,
  z: number,
  start: SurfacePoint,
  end: SurfacePoint,
): { distance: number; point: SurfacePoint } {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= 1e-10) {
    return { distance: Math.hypot(x - start.x, z - start.z), point: { ...start } };
  }
  const projection = ((x - start.x) * dx + (z - start.z) * dz) / lengthSquared;
  const t = Math.max(0, Math.min(1, projection));
  const point = { x: start.x + dx * t, z: start.z + dz * t };
  return { distance: Math.hypot(x - point.x, z - point.z), point };
}
