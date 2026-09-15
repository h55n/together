import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RENOVATIONS,
  applyRenovation,
  renovationsForProperty,
  type RenovationState,
} from './renovation.js';

test('every V1 starter property exposes at least three authored renovations', () => {
  for (const propertyId of ['couple_studio', 'one_bhk', 'courtyard_2bhk', 'pg_house', 'hostel_floor'] as const) {
    const options = renovationsForProperty(propertyId);
    assert.ok(options.length >= 3, `${propertyId} should expose at least three renovations`);
    assert.ok(options.every((option) => option.cost >= 8_000 && option.cost <= 35_000));
  }
  assert.equal(new Set(RENOVATIONS.map((option) => `${option.propertyId}:${option.id}`)).size, RENOVATIONS.length);
});

test('renovation state applies an authored socket only once', () => {
  const initial: RenovationState = { installed: [] };
  const first = applyRenovation(initial, 'couple_studio', 'study_corner');
  assert.deepEqual(first.installed, ['study_corner']);
  assert.throws(() => applyRenovation(first, 'couple_studio', 'study_corner'), /already installed/);
  assert.throws(() => applyRenovation(initial, 'couple_studio', 'roof_gathering'), /not available/);
});
