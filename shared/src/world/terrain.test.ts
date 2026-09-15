import assert from 'node:assert/strict';
import test from 'node:test';
import { cityHeightAt, isInsideAmayaBay } from './terrain.js';

test('Amaya Bay terrain stays within the authored 900m footprint', () => {
  assert.equal(isInsideAmayaBay(449, -449), true);
  assert.equal(isInsideAmayaBay(451, 0), false);
});

test('Hill Garden is elevated while Bay Steps stays near sea level', () => {
  assert.ok(cityHeightAt(265, 275) > 12);
  assert.ok(cityHeightAt(75, -285) < 3);
});
