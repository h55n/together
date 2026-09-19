import assert from 'node:assert/strict';
import test from 'node:test';
import { AMAYA_BAY_LOCATION_ANCHORS } from './city.js';
import { planAmayaBaySurfacePath } from './navigation.js';

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
