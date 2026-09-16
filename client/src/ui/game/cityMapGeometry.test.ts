import { describe, expect, it } from 'vitest';
import { CITY_MAP_ROADS, CITY_MAP_WATERFRONT, worldToMapPoint } from './cityMapGeometry';

describe('Amaya Bay map geometry', () => {
  it('projects world coordinates with north/up map orientation', () => {
    expect(worldToMapPoint({ x: 120, z: -80 })).toEqual({ x: 120, y: 80 });
    expect(worldToMapPoint({ x: -225, z: 160 })).toEqual({ x: -225, y: -160 });
  });

  it('contains a connected primary street spine across the city', () => {
    const primary = CITY_MAP_ROADS.find((road) => road.id === 'primary-spine');
    expect(primary).toBeTruthy();
    expect(primary!.points.length).toBeGreaterThanOrEqual(6);
    expect(primary!.points.some((point) => point.x < -200)).toBe(true);
    expect(primary!.points.some((point) => point.x > 150)).toBe(true);
    expect(primary!.points.some((point) => point.z < -220)).toBe(true);
  });

  it('places the waterfront on the southern edge of Amaya Bay', () => {
    expect(CITY_MAP_WATERFRONT.every((point) => point.z <= -300)).toBe(true);
    expect(CITY_MAP_WATERFRONT.length).toBeGreaterThanOrEqual(4);
  });
});
