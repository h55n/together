import assert from 'node:assert/strict';
import test from 'node:test';
import { CHUNK_SIZE_METRES } from './chunks.js';
import { generateChunkDressing } from './dressing.js';
import { nearestAmayaBaySurfaceRoute, pointClearsSurfaceRoutes } from './surfaces.js';

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


test('procedural dressing respects the same world-space surface network that the client renders', () => {
  const cases = [
    { chunkX: -2, chunkZ: 1, district: 'mogra_court' as const },
    { chunkX: -1, chunkZ: 0, district: 'lantern_street' as const },
    { chunkX: 1, chunkZ: 0, district: 'mogra_park' as const },
    { chunkX: 0, chunkZ: -3, district: 'bay_steps' as const },
    { chunkX: -2, chunkZ: -1, district: 'rain_tree_lane' as const },
    { chunkX: 1, chunkZ: -1, district: 'the_common' as const },
    { chunkX: 2, chunkZ: 2, district: 'hill_garden' as const },
  ];

  for (const entry of cases) {
    const dressing = generateChunkDressing(entry.chunkX, entry.chunkZ, entry.district);
    for (const building of dressing.buildings) {
      const worldX = entry.chunkX * CHUNK_SIZE_METRES + building.x;
      const worldZ = entry.chunkZ * CHUNK_SIZE_METRES + building.z;
      const nearest = nearestAmayaBaySurfaceRoute(worldX, worldZ);
      assert.ok(nearest);
      const footprintRadius = Math.hypot(building.width, building.depth) / 2;
      assert.ok(
        nearest.distance >= nearest.route.width / 2 + footprintRadius + 1.5,
        `${building.id} overlaps ${nearest.route.id}`,
      );
    }
    for (const prop of dressing.props) {
      const worldX = entry.chunkX * CHUNK_SIZE_METRES + prop.x;
      const worldZ = entry.chunkZ * CHUNK_SIZE_METRES + prop.z;
      assert.equal(pointClearsSurfaceRoutes(worldX, worldZ), true, `${prop.id} sits inside a route`);
    }
  }
});
