import assert from 'node:assert/strict';
import test from 'node:test';
import { generateChunkDressing } from './dressing.js';

test('residential and commercial chunks receive deterministic human-scale building lots', () => {
  const first = generateChunkDressing(-2, 1, 'mogra_court');
  const second = generateChunkDressing(-2, 1, 'mogra_court');
  assert.deepEqual(first, second);
  assert.ok(first.buildings.length >= 4);
  for (const building of first.buildings) {
    assert.ok(building.width >= 6 && building.width <= 18);
    assert.ok(building.depth >= 7 && building.depth <= 22);
    assert.ok(building.height >= 4 && building.height <= 15);
    assert.ok(building.facadeLayers >= 2);
  }
});

test('park and waterfront chunks favor open space and props over dense buildings', () => {
  const park = generateChunkDressing(1, 0, 'mogra_park');
  const bay = generateChunkDressing(0, -3, 'bay_steps');
  assert.ok(park.buildings.length <= 3);
  assert.ok(park.props.length >= 6);
  assert.ok(bay.buildings.length <= 4);
  assert.ok(bay.props.some((prop) => prop.kind === 'lamp' || prop.kind === 'bench'));
});

test('dressing changes materially across districts instead of cloning one colony everywhere', () => {
  const residential = generateChunkDressing(-2, 1, 'mogra_court');
  const commercial = generateChunkDressing(-1, 0, 'lantern_street');
  const leafy = generateChunkDressing(-2, -1, 'rain_tree_lane');
  assert.notDeepEqual(residential.buildings.map((b) => b.style), commercial.buildings.map((b) => b.style));
  assert.ok(leafy.props.filter((prop) => prop.kind === 'planter').length >= 2);
});
