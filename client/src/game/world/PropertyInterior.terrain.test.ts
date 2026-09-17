import { describe, expect, it, vi } from 'vitest';
import { cityHeightAt } from '@together/shared';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { MaterialLibrary } from './MaterialLibrary';
import { buildPropertyInterior } from './PropertyInterior';
import { PROPERTY_WORLD_PLACEMENTS } from './PropertyLocations';
import { STARTER_HOME_CENTER } from './StarterHome';
import { propertyRoofSpec } from './propertyShell';

describe('property terrain alignment', () => {
  it('places non-studio property shells, spawns and floor collision on the authored terrain height', () => {
    const materials = new MaterialLibrary();
    const createFixedCuboid = vi.fn(() => ({}) as never);
    const physics = { createFixedCuboid } as unknown as PhysicsWorld;
    const placement = PROPERTY_WORLD_PLACEMENTS.pg_house;
    const terrainY = cityHeightAt(placement.center.x, placement.center.z);

    const home = buildPropertyInterior(materials, physics, 'pg_house');

    expect(home.group.position.y).toBeCloseTo(terrainY, 6);
    expect(home.spawn.y).toBeCloseTo(terrainY + 1.1, 6);
    expect(createFixedCuboid).toHaveBeenCalledWith(
      { x: placement.center.x, y: terrainY + 0.09, z: placement.center.z },
      { x: placement.width / 2, y: 0.09, z: placement.depth / 2 },
    );

    materials.dispose();
  });

  it('keeps the couple-studio roof, spawn and floor collision on the same terrain base', () => {
    const materials = new MaterialLibrary();
    const createFixedCuboid = vi.fn(() => ({}) as never);
    const physics = { createFixedCuboid } as unknown as PhysicsWorld;
    const terrainY = cityHeightAt(STARTER_HOME_CENTER.x, STARTER_HOME_CENTER.z);
    const roof = propertyRoofSpec(11, 9, 3);

    const home = buildPropertyInterior(materials, physics, 'couple_studio');
    const roofMesh = home.group.getObjectByName('home:couple_studio:roof');

    expect(home.spawn.y).toBeCloseTo(terrainY + 1.1, 6);
    expect(roofMesh?.position.y).toBeCloseTo(terrainY + roof.centerY, 6);
    expect(createFixedCuboid).toHaveBeenCalledWith(
      { x: STARTER_HOME_CENTER.x, y: terrainY + 0.09, z: STARTER_HOME_CENTER.z },
      { x: 5.5, y: 0.09, z: 4.5 },
    );

    materials.dispose();
  });
});
