import { AUTHORED_STREETS } from '../../game/world/StreetNetwork';

export type WorldMapPoint = { x: number; z: number };
export type MapPoint = { x: number; y: number };
export type CityMapRoad = {
  id: string;
  kind: 'primary' | 'secondary' | 'path';
  points: readonly WorldMapPoint[];
};

export function worldToMapPoint(point: WorldMapPoint): MapPoint {
  return { x: point.x, y: -point.z };
}

export const CITY_MAP_WATERFRONT: readonly WorldMapPoint[] = [
  { x: -450, z: -345 },
  { x: -250, z: -330 },
  { x: -70, z: -348 },
  { x: 110, z: -330 },
  { x: 280, z: -360 },
  { x: 450, z: -338 },
] as const;

export const CITY_MAP_ROADS: readonly CityMapRoad[] = AUTHORED_STREETS.map((road) => ({
  id: road.id, kind: road.kind, points: road.points.map(([x, z]) => ({ x, z })),
}));

export function mapPolyline(points: readonly WorldMapPoint[]): string {
  return points.map((point) => {
    const projected = worldToMapPoint(point);
    return `${projected.x},${projected.y}`;
  }).join(' ');
}
