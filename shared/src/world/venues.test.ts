import assert from 'node:assert/strict';
import test from 'node:test';
import { venueDepth, venueFrontApproach, venueVisualProfile, venueYaw } from './venues.js';
import { AMAYA_BAY_VENUES } from './city.js';

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

test('ordinary venue prompts sit outside the rendered frontage and aligned collider', () => {
  for (const venue of AMAYA_BAY_VENUES) {
    if (['dev_cycle_hut', 'kayak_cove', 'hill_tea_hut'].includes(venue.id)) continue;
    const approach = venueFrontApproach(venue);
    const yaw = venueYaw(venue);
    const forward = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
    const offset = { x: approach.x - venue.position.x, z: approach.z - venue.position.z };
    const frontDistance = offset.x * forward.x + offset.z * forward.z;
    const sideways = offset.x * -forward.z + offset.z * forward.x;
    assert.ok(frontDistance > venueDepth(venue) / 2 + 0.5, `${venue.id} is inside its frontage`);
    assert.ok(Math.abs(sideways) < 1e-6, `${venue.id} is off-centre from its frontage`);
  }
});
