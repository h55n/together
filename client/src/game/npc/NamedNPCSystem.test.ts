import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
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
