import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { nearestAmayaBaySurfaceRoute } from '@together/shared';
import { NamedNPCSystem } from './NamedNPCSystem';

describe('NamedNPCSystem', () => {
  it('renders named residents as articulated people with deterministic locomotion', () => {
    const system = new NamedNPCSystem();
    try {
      const player = new THREE.Vector3(-43, 0, 68);
      system.update(0.1, 8 * 60, player);

      const roshan = system.root.getObjectByName('named-npc:roshan');
      expect(roshan).toBeTruthy();
      expect(roshan?.visible).toBe(true);
      expect(roshan?.getObjectByName('npc:left-arm')).toBeTruthy();
      expect(roshan?.getObjectByName('npc:right-arm')).toBeTruthy();
      expect(roshan?.getObjectByName('npc:left-leg')).toBeTruthy();
      expect(roshan?.getObjectByName('npc:right-leg')).toBeTruthy();
      expect(roshan?.getObjectByName('npc:head')).toBeTruthy();

      const leftArm = roshan?.getObjectByName('npc:left-arm');
      const firstSwing = leftArm?.rotation.x ?? 0;
      system.update(0.5, 8 * 60, player);
      expect(leftArm?.rotation.x ?? 0).not.toBe(firstSwing);
    } finally {
      system.dispose();
    }
  });
});


it('moves mobile scheduled residents along the authored pedestrian corridor instead of orbiting their anchor', () => {
  const system = new NamedNPCSystem();
  try {
    const player = new THREE.Vector3(-235, 0, 175);
    system.update(0.1, 8 * 60, player);

    const kamla = system.root.getObjectByName('named-npc:kamla');
    expect(kamla).toBeTruthy();
    expect(kamla?.visible).toBe(true);
    const before = kamla!.position.clone();

    system.update(2.0, 8 * 60, player);
    const moved = Math.hypot(kamla!.position.x - before.x, kamla!.position.z - before.z);
    expect(moved).toBeGreaterThan(0.25);

    const nearest = nearestAmayaBaySurfaceRoute(kamla!.position.x, kamla!.position.z);
    expect(nearest).toBeTruthy();
    expect(nearest!.distance).toBeLessThanOrEqual(nearest!.route.width / 2 + 1.6);
  } finally {
    system.dispose();
  }
});
