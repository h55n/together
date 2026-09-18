import assert from 'node:assert/strict';
import test from 'node:test';
import { AMAYA_BAY_CITY } from './city.js';
import {
  AMAYA_BAY_SURFACE_ROUTES,
  distanceToSurfaceRoute,
  nearestAmayaBaySurfaceRoute,
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
  const spine = AMAYA_BAY_SURFACE_ROUTES.find((route) => route.id === 'main-spine');
  assert.ok(spine);
  assert.ok(distanceToSurfaceRoute(-30, 75, spine) < 1e-8);
  assert.ok(distanceToSurfaceRoute(-30, 125, spine) > 20);
});
