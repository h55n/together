import assert from 'node:assert/strict';
import test from 'node:test';
import { FURNITURE_CATALOG } from './furniture.js';

test('V1 home catalog has enough breadth to make different households visibly distinct', () => {
  assert.ok(FURNITURE_CATALOG.length >= 80, `expected at least 80 items, got ${FURNITURE_CATALOG.length}`);
  assert.ok(FURNITURE_CATALOG.filter((item) => item.category === 'plant').length >= 20, 'expected at least 20 greenery options');
  assert.ok(FURNITURE_CATALOG.filter((item) => item.category === 'lighting' || item.category === 'decor').length >= 20, 'expected a substantial lighting/decor library');
});

test('furniture ids remain stable/unique and prices are non-negative', () => {
  const ids = FURNITURE_CATALOG.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const item of FURNITURE_CATALOG) {
    assert.ok(item.price >= 0);
    assert.ok(item.footprint.width > 0 && item.footprint.depth > 0);
  }
});
