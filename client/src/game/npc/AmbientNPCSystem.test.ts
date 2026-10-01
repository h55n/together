import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { AmbientNPCSystem } from './AmbientNPCSystem';

describe('AmbientNPCSystem', () => {
  it('renders the ambient population through two instanced meshes instead of one mesh pair per walker', () => {
    const system = new AmbientNPCSystem(12);
    try {
      const instanced = system.root.children.filter((child): child is THREE.InstancedMesh => child instanceof THREE.InstancedMesh);

      expect(instanced).toHaveLength(2);
      expect(instanced.every((mesh) => mesh.count === 12)).toBe(true);
      expect(system.root.children.every((child) => child instanceof THREE.InstancedMesh)).toBe(true);

      const body = instanced.find((mesh) => mesh.name === 'ambient-npc-bodies');
      const heads = instanced.find((mesh) => mesh.name === 'ambient-npc-heads');
      expect(body).toBeTruthy();
      expect(heads).toBeTruthy();
      expect(body?.instanceColor).toBeTruthy();
    } finally {
      system.dispose();
    }
  });

  it('updates instance transforms without rebuilding the instanced meshes', () => {
    const system = new AmbientNPCSystem(4);
    try {
      const bodies = system.root.getObjectByName('ambient-npc-bodies');
      expect(bodies).toBeInstanceOf(THREE.InstancedMesh);
      const mesh = bodies as THREE.InstancedMesh;
      const before = mesh.instanceMatrix.version;

      system.update(0.5, new THREE.Vector3(0, 0, 0));

      expect(mesh.instanceMatrix.version).toBeGreaterThan(before);
      expect(system.root.children).toHaveLength(2);
    } finally {
      system.dispose();
    }
  });
});
