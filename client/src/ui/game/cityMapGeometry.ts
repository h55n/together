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

export const CITY_MAP_ROADS: readonly CityMapRoad[] = [
  {
    id: 'primary-spine',
    kind: 'primary',
    points: [
      { x: -270, z: 195 },
      { x: -215, z: 150 },
      { x: -145, z: 115 },
      { x: -55, z: 82 },
      { x: 40, z: 55 },
      { x: 120, z: 15 },
      { x: 178, z: -70 },
      { x: 135, z: -165 },
      { x: 95, z: -265 },
    ],
  },
  {
    id: 'rain-tree-connector',
    kind: 'secondary',
    points: [
      { x: -215, z: 150 },
      { x: -235, z: 60 },
      { x: -220, z: -35 },
      { x: -205, z: -125 },
      { x: -150, z: -185 },
    ],
  },
  {
    id: 'park-common-connector',
    kind: 'secondary',
    points: [
      { x: -55, z: 82 },
      { x: 35, z: 120 },
      { x: 120, z: 132 },
      { x: 190, z: 110 },
      { x: 235, z: 45 },
    ],
  },
  {
    id: 'bay-promenade',
    kind: 'primary',
    points: [
      { x: -150, z: -275 },
      { x: -50, z: -282 },
      { x: 55, z: -270 },
      { x: 160, z: -274 },
      { x: 265, z: -288 },
    ],
  },
  {
    id: 'hill-approach',
    kind: 'secondary',
    points: [
      { x: 120, z: 132 },
      { x: 185, z: 185 },
      { x: 245, z: 245 },
      { x: 300, z: 302 },
    ],
  },
  {
    id: 'mogra-park-loop',
    kind: 'path',
    points: [
      { x: 152, z: 82 },
      { x: 190, z: 68 },
      { x: 222, z: 96 },
      { x: 212, z: 136 },
      { x: 172, z: 147 },
      { x: 145, z: 118 },
      { x: 152, z: 82 },
    ],
  },
] as const;

export function mapPolyline(points: readonly WorldMapPoint[]): string {
  return points.map((point) => {
    const projected = worldToMapPoint(point);
    return `${projected.x},${projected.y}`;
  }).join(' ');
}
