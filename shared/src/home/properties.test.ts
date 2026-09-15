import assert from 'node:assert/strict';
import test from 'node:test';
import { STARTER_PROPERTIES, eligibleStarterProperties } from './properties.js';

test('V1 exposes exactly the five canonical starter property shells', () => {
  assert.deepEqual(STARTER_PROPERTIES.map((property) => property.id), [
    'couple_studio', 'one_bhk', 'courtyard_2bhk', 'pg_house', 'hostel_floor',
  ]);
});

test('property eligibility respects household type and member capacity', () => {
  assert.ok(eligibleStarterProperties('couple', 2).some((property) => property.id === 'couple_studio'));
  assert.ok(!eligibleStarterProperties('friends', 5).some((property) => property.id === 'one_bhk'));
  assert.ok(eligibleStarterProperties('friends', 5).some((property) => property.id === 'pg_house'));
});
