import assert from 'node:assert/strict';
import test from 'node:test';
import { AMAYA_BAY_CITY } from './city.js';
import {
  AMAYA_BAY_SURFACE_ROUTES,
  distanceToSurfaceRoute,
  nearestAmayaBaySurfaceRoute,
  surfaceNetworkConnected,
  surfaceRoutesStayInsideCity,
} from './surfaces.js';

test('surface routes stay inside the authored Amaya Bay footprint', () => {
  assert.equal(surfaceRoutesStayInsideCity(), true);
  assert.ok(AMAYA_BAY_SURFACE_ROUTES.length >= 6);
  for (const route of AMAYA_BAY_SURFACE_ROUTES) {
    assert.ok(route.points.length >= 2);
    assert.ok(route.width >= 3 && route.width <= 14);
  }
});

test('all seven district centres sit near the shared connective network', () => {
  for (const district of AMAYA_BAY_CITY.districts) {
    const nearest = nearestAmayaBaySurfaceRoute(district.center.x, district.center.z);
    assert.ok(nearest, `${district.displayName} should resolve a route`);
    assert.ok(nearest.distance <= 55, `${district.displayName} is ${nearest.distance.toFixed(1)}m from the route network`);
  }
});

test('route distance uses the nearest point on each polyline segment', () => {
  const route = {
    id: 'distance-test',
    kind: 'road' as const,
    width: 6,
    points: [{ x: 0, z: 0 }, { x: 10, z: 0 }],
  };
  assert.equal(distanceToSurfaceRoute(5, 4, route), 4);
  assert.equal(distanceToSurfaceRoute(15, 0, route), 5);
});


test('the authored street, promenade and walking routes form one connected city network', () => {
  assert.equal(surfaceNetworkConnected(), true);
  const ids = new Set(AMAYA_BAY_SURFACE_ROUTES.map((route) => route.id));
  for (const id of [
    'main-spine',
    'east-arc',
    'common-cross',
    'waterfront-promenade',
    'mogra-park-walk',
    'hill-garden-loop',
    'rain-tree-lane-walk',
    'mogra-neighbourhood-walk',
  ]) {
    assert.ok(ids.has(id), `missing connected surface route ${id}`);
  }
});
