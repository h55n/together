import assert from 'node:assert/strict';
import test from 'node:test';
import { AMAYA_BAY_CITY, districtAtPosition } from './city.js';

test('Amaya Bay defines all seven canonical districts inside the 900m city footprint', () => {
  const ids = AMAYA_BAY_CITY.districts.map((district) => district.id);
  assert.deepEqual(ids, [
    'mogra_court',
    'lantern_street',
    'mogra_park',
    'bay_steps',
    'rain_tree_lane',
    'the_common',
    'hill_garden',
  ]);
  assert.equal(AMAYA_BAY_CITY.sizeMetres, 900);
  for (const district of AMAYA_BAY_CITY.districts) {
    assert.ok(Math.abs(district.center.x) <= 450);
    assert.ok(Math.abs(district.center.z) <= 450);
  }
});

test('district lookup resolves authored district centers', () => {
  for (const district of AMAYA_BAY_CITY.districts) {
    assert.equal(districtAtPosition(district.center.x, district.center.z)?.id, district.id);
  }
});

test('each canonical district contains multiple named lived-in subareas instead of one undifferentiated zone', async () => {
  const { AMAYA_BAY_SUBAREAS } = await import('./city.js');
  for (const district of AMAYA_BAY_CITY.districts) {
    const subareas = AMAYA_BAY_SUBAREAS.filter((area) => area.districtId === district.id);
    assert.ok(subareas.length >= 3, `${district.displayName} should contain at least three subareas`);
    for (const area of subareas) {
      assert.ok(Math.abs(area.center.x) <= 450 && Math.abs(area.center.z) <= 450, `${area.displayName} must stay inside Amaya Bay`);
      assert.ok(area.radius >= 18 && area.radius <= 95, `${area.displayName} should be human-scale`);
    }
  }
});

test('Amaya Bay subareas include residential colonies, commercial lanes, waterfront and civic pockets', async () => {
  const { AMAYA_BAY_SUBAREAS } = await import('./city.js');
  const kinds = new Set(AMAYA_BAY_SUBAREAS.map((area) => area.kind));
  for (const kind of ['residential_colony', 'commercial_lane', 'park_pocket', 'waterfront', 'civic', 'garden']) {
    assert.ok(kinds.has(kind as never), `missing subarea kind ${kind}`);
  }
  assert.ok(AMAYA_BAY_SUBAREAS.length >= 24, 'city should have enough named subareas to feel spatially varied');
});

test('authored location anchors are inside Amaya Bay and resolve to their declared district', async () => {
  const { AMAYA_BAY_LOCATION_ANCHORS, districtAtPosition } = await import('./city.js');
  for (const anchor of AMAYA_BAY_LOCATION_ANCHORS) {
    assert.ok(Math.abs(anchor.position.x) <= 450 && Math.abs(anchor.position.z) <= 450, `${anchor.id} outside city`);
    assert.equal(districtAtPosition(anchor.position.x, anchor.position.z)?.id, anchor.districtId, `${anchor.id} district mismatch`);
  }
});

test('Amaya Bay has repeated everyday businesses distributed across the city instead of one quest hub per service', async () => {
  const { AMAYA_BAY_VENUES } = await import('./city.js');
  assert.ok(AMAYA_BAY_VENUES.length >= 36, 'city should contain a meaningful everyday venue network');

  const count = (category: string) => AMAYA_BAY_VENUES.filter((venue) => venue.category === category).length;
  assert.ok(count('grocery') >= 5, 'city needs multiple grocery options');
  assert.ok(count('cafe') >= 5, 'city needs multiple cafés/tea spots');
  assert.ok(count('food') >= 5, 'city needs multiple everyday food places');
  assert.ok(count('repair') >= 3, 'city needs multiple repair/service options');
  assert.ok(count('laundry') >= 2, 'residential life needs more than one laundry option');

  const groceryDistricts = new Set(AMAYA_BAY_VENUES.filter((venue) => venue.category === 'grocery').map((venue) => venue.districtId));
  const cafeDistricts = new Set(AMAYA_BAY_VENUES.filter((venue) => venue.category === 'cafe').map((venue) => venue.districtId));
  assert.ok(groceryDistricts.size >= 4, 'groceries should be reachable from several districts');
  assert.ok(cafeDistricts.size >= 4, 'cafés should not all live on Lantern Street');

  const ids = new Set<string>();
  for (const venue of AMAYA_BAY_VENUES) {
    assert.ok(!ids.has(venue.id), `duplicate venue id ${venue.id}`);
    ids.add(venue.id);
    assert.ok(Math.abs(venue.position.x) <= 450 && Math.abs(venue.position.z) <= 450, `${venue.id} outside Amaya Bay`);
    assert.equal(districtAtPosition(venue.position.x, venue.position.z)?.id, venue.districtId, `${venue.id} district mismatch`);
  }
});
