import assert from 'node:assert/strict';
import test from 'node:test';
import { AUTO_DESTINATIONS, autoFare, autoRideSeconds, planAutoRideRoute, sampleAutoRideRoute } from './autoRickshaw.js';
import { nearestAmayaBaySurfaceRoute } from '../world/surfaces.js';
import { AMAYA_BAY_CITY } from '../world/city.js';

test('auto-rickshaw destinations cover every Amaya Bay district', () => {
  const districts = new Set(AUTO_DESTINATIONS.map((entry) => entry.districtId));
  for (const district of AMAYA_BAY_CITY.districts) assert.ok(districts.has(district.id), `missing auto destination in ${district.id}`);
});

test('auto fare stays small and distance-sensitive rather than becoming progression punishment', () => {
  const near = autoFare({ x: 0, z: 0 }, { x: 80, z: 0 });
  const far = autoFare({ x: -300, z: 250 }, { x: 250, z: -300 });
  assert.ok(near >= 20 && near <= 80);
  assert.ok(far > near && far <= 220);
});

test('real-time auto rides are compressed but still visible', () => {
  assert.ok(autoRideSeconds(100) >= 5);
  assert.ok(autoRideSeconds(700) <= 18);
});

test('auto rides follow city streets between destinations instead of cutting across blocks', () => {
  for (const [from, to] of [[0, 3], [1, 5], [2, 6]] as const) {
    const start = AUTO_DESTINATIONS[from]!.position, end = AUTO_DESTINATIONS[to]!.position;
    const route = planAutoRideRoute(start, end);
    assert.ok(route.points.length > 2, 'a cross-city ride turns along the network');
    assert.ok(route.lengthMetres >= Math.hypot(end.x - start.x, end.z - start.z) - 1e-6);
    // Interior samples stay on a surface route (within its half width plus a small access margin).
    for (let step = 1; step < 20; step += 1) {
      const point = sampleAutoRideRoute(route, step / 20);
      const nearest = nearestAmayaBaySurfaceRoute(point.x, point.z)!;
      const access = Math.max(route.lengths[1]!, route.lengthMetres - route.lengths.at(-2)!);
      assert.ok(nearest.distance <= nearest.route.width / 2 + 0.5 || step / 20 * route.lengthMetres <= access + 1e-6 || (1 - step / 20) * route.lengthMetres <= access + 1e-6, `sample ${step} left the streets`);
    }
    const first = sampleAutoRideRoute(route, 0), last = sampleAutoRideRoute(route, 1);
    assert.ok(Math.hypot(first.x - start.x, first.z - start.z) < 1e-6 && Math.hypot(last.x - end.x, last.z - end.z) < 1e-6);
  }
});
