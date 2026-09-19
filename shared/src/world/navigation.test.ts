import assert from 'node:assert/strict';
import test from 'node:test';
import { AMAYA_BAY_LOCATION_ANCHORS } from './city.js';
import { createAmayaBayPatrolPath, planAmayaBaySurfacePath } from './navigation.js';
import { nearestAmayaBaySurfaceRoute } from './surfaces.js';

test('plans a connected cross-city walking path between distant resident anchors', () => {
  const start = { x: -246, z: -88 };
  const end = { x: 135, z: -325 };
  const plan = planAmayaBaySurfacePath(start, end);

  assert.ok(plan);
  assert.deepEqual(plan.points[0], start);
  assert.deepEqual(plan.points.at(-1), end);
  assert.ok(plan.points.length >= 6);
  assert.ok(plan.distanceMetres > Math.hypot(end.x - start.x, end.z - start.z));
  assert.ok(plan.startAccessDistance < 60);
  assert.ok(plan.endAccessDistance < 60);
});

test('uses the direct interval when both endpoints project onto the same street segment', () => {
  const plan = planAmayaBaySurfacePath({ x: -30, z: 100 }, { x: -30, z: 60 });
  assert.ok(plan);
  assert.ok(plan.distanceMetres < 45, `same-segment route was unexpectedly long: ${plan.distanceMetres.toFixed(1)}m`);
});

test('every canonical gameplay anchor can route to Café Roshan through the shared surface graph', () => {
  const cafe = AMAYA_BAY_LOCATION_ANCHORS.find((anchor) => anchor.id === 'lantern_cafe_roshan');
  assert.ok(cafe);
  for (const anchor of AMAYA_BAY_LOCATION_ANCHORS) {
    const plan = planAmayaBaySurfacePath(anchor.position, cafe.position);
    assert.ok(plan, `${anchor.id} should route to Café Roshan`);
    assert.ok(Number.isFinite(plan.distanceMetres));
  }
});


test('local NPC patrols stay on pedestrian-safe road/path corridors instead of orbiting through lots', () => {
  const patrol = createAmayaBayPatrolPath({ x: -43, z: 68 }, 26, 1);
  assert.ok(patrol.length >= 2);
  assert.ok(Math.hypot(
    patrol.at(-1)!.x - patrol[0]!.x,
    patrol.at(-1)!.z - patrol[0]!.z,
  ) > 8);

  for (const point of patrol) {
    const nearest = nearestAmayaBaySurfaceRoute(point.x, point.z);
    assert.ok(nearest);
    assert.ok(
      nearest.distance <= nearest.route.width / 2 + 1.6,
      `patrol point drifted ${nearest.distance.toFixed(2)}m from ${nearest.route.id}`,
    );
  }
});
