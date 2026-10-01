import { expect, it } from 'vitest';
import { cityHeightAt, worldToChunk } from '@together/shared';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { buildLanternStreetHero } from './HeroStreet';
import { AmayaBayEnvironment } from './AmayaBayEnvironment';
import { createAmayaBayChunkFactory } from './AmayaBayChunkFactory';
import { MaterialLibrary } from './MaterialLibrary';
import { buildPropertyInterior } from './PropertyInterior';
import { streetCenterline } from './StreetNetwork';
import { WorldStreamer } from './WorldStreamer';
import * as THREE from 'three';

it('lets a resident walk from the 1BHK through Lantern Street to Bay Steps with real colliders', async () => {
  const physics = await PhysicsWorld.create();
  const materials = new MaterialLibrary();
  const createChunk = createAmayaBayChunkFactory(materials, physics);
  const route = streetCenterline('primary-spine');
  const streamer = new WorldStreamer(createChunk);
  let currentChunk = '';
  buildLanternStreetHero(materials, physics, { x: -30, y: cityHeightAt(-30, 75), z: 75 });
  new AmayaBayEnvironment(materials, physics);
  const home = buildPropertyInterior(materials, physics, 'one_bhk');

  const player = physics.createPlayer(home.spawn);
  const blocked: Array<{ target: { x: number; z: number }; actual: { x: number; z: number }; distance: number }> = [];
  let largestVerticalError = 0;
  const walkTo = (target: { x: number; z: number }): void => {
    const initial = player.body.translation();
    const limit = Math.ceil(Math.hypot(target.x - initial.x, target.z - initial.z) / 0.25) + 20;
    for (let step = 0; step < limit; step += 1) {
      const position = player.body.translation();
      const dx = target.x - position.x;
      const dz = target.z - position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 0.13) break;
      const length = Math.min(distance, 0.25);
      const nextX = position.x + dx / distance * length;
      const nextZ = position.z + dz / distance * length;
      const chunk = worldToChunk({ x: nextX, z: nextZ });
      const key = chunk.x + ',' + chunk.z;
      if (key !== currentChunk) { currentChunk = key; streamer.refreshNow(new THREE.Vector3(nextX, cityHeightAt(nextX, nextZ) + 1.1, nextZ)); }
      physics.moveCharacter(player, { x: dx / distance * length, y: -0.075, z: dz / distance * length });
      physics.step();
    }
    const position = player.body.translation();
    const distance = Math.hypot(target.x - position.x, target.z - position.z);
    if (distance > 0.55) blocked.push({ target, actual: { x: position.x, z: position.z }, distance });
    largestVerticalError = Math.max(largestVerticalError, Math.abs(position.y - (cityHeightAt(position.x, position.z) + 0.75)));
  };
  walkTo({ x: home.spawn.x, z: 193.5 });
  if (blocked.length === 0) walkTo({ x: home.spawn.x, z: 190 });
  const entryIndex = route.reduce((best, point, index) => {
    const distance = Math.hypot(point.x - home.spawn.x, point.z - 189);
    const bestDistance = Math.hypot(route[best]!.x - home.spawn.x, route[best]!.z - 189);
    return distance < bestDistance ? index : best;
  }, 0);
  if (blocked.length === 0) walkTo(route[entryIndex]!);
  for (const target of route.slice(entryIndex + 1)) {
    if (blocked.length > 0) break;
    walkTo(target);
  }
  const last = player.body.translation();
  physics.disposePlayer(player);
  streamer.dispose();
  physics.dispose();
  materials.dispose();
  expect(blocked).toEqual([]);
  expect(last.x).toBeGreaterThan(90);
  expect(last.z).toBeLessThan(-260);
  expect(largestVerticalError).toBeLessThan(1);
}, 60_000);
