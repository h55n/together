import { describe, expect, it } from 'vitest';
import { cityHeightAt } from '@together/shared';
import { PhysicsWorld } from './PhysicsWorld';

describe('pedestrian obstacle checks', () => {
  it('allows a sidewalk but rejects a swept capsule crossing a real wall', async () => {
    const physics = await PhysicsWorld.create();
    const y = cityHeightAt(0, 0);
    physics.createFixedCuboid({ x: 1, y: y + 1, z: 0 }, { x: .1, y: 1, z: 2 });
    physics.step();
    try {
      expect(physics.canTraversePedestrian({ x: 0, z: 3 }, { x: 2, z: 3 })).toBe(true);
      expect(physics.canTraversePedestrian({ x: 0, z: 0 }, { x: 2, z: 0 })).toBe(false);
    } finally { physics.dispose(); }
  });
});
