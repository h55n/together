import assert from 'node:assert/strict';
import test from 'node:test';
import { venueVisualProfile } from './venues.js';

test('venue visual profiles keep groceries, cafés, repair shops and laundries visually distinct', () => {
  const grocery = venueVisualProfile('grocery', false);
  const cafe = venueVisualProfile('cafe', false);
  const repair = venueVisualProfile('repair', false);
  const laundry = venueVisualProfile('laundry', false);
  assert.notDeepEqual(grocery, cafe);
  assert.notDeepEqual(cafe, repair);
  assert.notDeepEqual(repair, laundry);
  assert.equal(grocery.canopy, true);
  assert.equal(cafe.windowGlow, true);
  assert.equal(repair.serviceClutter, true);
  assert.equal(laundry.windowBands >= 2, true);
});

test('hero venue profile is more layered without changing category identity', () => {
  const normal = venueVisualProfile('cafe', false);
  const hero = venueVisualProfile('cafe', true);
  assert.equal(hero.family, normal.family);
  assert.ok(hero.depthLayers > normal.depthLayers);
  assert.ok(hero.signScale > normal.signScale);
});

test('every everyday venue category maps to an in-world gameplay role', async () => {
  const { venueGameplayRole } = await import('./venues.js');
  assert.equal(venueGameplayRole('grocery'), 'grocery_shop');
  assert.equal(venueGameplayRole('cafe'), 'hangout');
  assert.equal(venueGameplayRole('repair'), 'repair_service');
  assert.equal(venueGameplayRole('furniture'), 'furniture_shop');
  assert.equal(venueGameplayRole('plants'), 'plant_shop');
  assert.equal(venueGameplayRole('rental'), 'rental');
});
