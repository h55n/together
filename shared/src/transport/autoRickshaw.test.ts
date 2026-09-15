import assert from 'node:assert/strict';
import test from 'node:test';
import { AUTO_DESTINATIONS, autoFare, autoRideSeconds } from './autoRickshaw.js';
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
