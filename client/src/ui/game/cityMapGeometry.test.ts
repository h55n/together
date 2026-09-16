import assert from 'node:assert/strict';
import test from 'node:test';
import { CITY_MAP_ROADS, CITY_MAP_WATERFRONT, worldToMapPoint } from './cityMapGeometry.js';

test('world coordinates project with north/up map orientation', () => {
  assert.deepEqual(worldToMapPoint({ x: 120, z: -80 }), { x: 120, y: 80 });
  assert.deepEqual(worldToMapPoint({ x: -225, z: 160 }), { x: -225, y: -160 });
});

test('map contains a connected primary street spine across the city', () => {
  const primary = CITY_MAP_ROADS.find((road) => road.id === 'primary-spine');
  assert.ok(primary);
  assert.ok(primary.points.length >= 6);
  assert.ok(primary.points.some((point) => point.x < -200));
  assert.ok(primary.points.some((point) => point.x > 150));
  assert.ok(primary.points.some((point) => point.z < -220));
});

test('waterfront sits on the southern edge of Amaya Bay', () => {
  assert.ok(CITY_MAP_WATERFRONT.every((point) => point.z <= -300));
  assert.ok(CITY_MAP_WATERFRONT.length >= 4);
});
