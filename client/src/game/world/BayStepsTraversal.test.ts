import { expect, it } from 'vitest';
import { cityHeightAt } from '@together/shared';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { AmayaBayEnvironment } from './AmayaBayEnvironment';
import { createAmayaBayChunkFactory } from './AmayaBayChunkFactory';
import { coastalTerrainLowering, shorelineZAt } from './CoastalShoreline';
import { CoastalWater } from './CoastalWater';
import { MaterialLibrary } from './MaterialLibrary';
import * as THREE from 'three';

it('brings water to the central steps while keeping the kayak hut on dry shoreline', () => {
  expect(shorelineZAt(75)).toBeCloseTo(-312);
  expect(shorelineZAt(135)).toBeCloseTo(-335);
  expect(coastalTerrainLowering(75, -312)).toBeGreaterThan(1.5);
  expect(coastalTerrainLowering(75, -295)).toBeGreaterThan(0.25);
  expect(coastalTerrainLowering(135, -325)).toBe(0);
  const scene = new THREE.Scene();
  const materials = new MaterialLibrary();
  const water = new CoastalWater(scene, materials);
  const positions = water.mesh.geometry.getAttribute('position');
  const nearAtSteps: number[] = [];
  for (let i = 0; i < positions.count; i += 1) {
    if (Math.abs(positions.getX(i) - 75) < 0.1) nearAtSteps.push(positions.getZ(i));
  }
  expect(Math.max(...nearAtSteps)).toBeCloseTo(-312);
  water.dispose();
  materials.dispose();
});

it('lets a player pass the rail opening and descend Bay Steps without falling through the art', async () => {
  const physics = await PhysicsWorld.create();
  const materials = new MaterialLibrary();
  new AmayaBayEnvironment(materials, physics);
  const chunk = createAmayaBayChunkFactory(materials, physics)(0, -3, 'active');
  const player = physics.createPlayer({ x: 67.5, y: cityHeightAt(67.5, -278) + 1.1, z: -278 });
  for (let i = 0; i < 210; i += 1) {
    physics.moveCharacter(player, { x: 0, y: -0.075, z: -0.16 });
    physics.step();
  }
  const position = player.body.translation();
  physics.disposePlayer(player);
  (chunk.userData.disposeChunk as (() => void) | undefined)?.();
  physics.dispose();
  materials.dispose();
  expect(position.z).toBeLessThan(-309);
  expect(position.y).toBeGreaterThan(0.5);
}, 30_000);
