import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { AmbientNPCSystem } from './AmbientNPCSystem';
import { AMAYA_BAY_SURFACE_ROUTES } from '@together/shared';

describe('AmbientNPCSystem', () => {
  it('keeps every ambient walker on a cached pedestrian corridor through full patrol reversals', () => {
    const system = new AmbientNPCSystem(32);
    const matrix = new THREE.Matrix4(), position = new THREE.Vector3();
    const bodies = system.root.getObjectByName('ambient-npc-bodies') as THREE.InstancedMesh;
    try {
      for (let frame = 0; frame < 180; frame++) {
        system.update(1, new THREE.Vector3());
        for (let index = 0; index < bodies.count; index++) {
          bodies.getMatrixAt(index, matrix); position.setFromMatrixPosition(matrix);
          const clearance = Math.min(...AMAYA_BAY_SURFACE_ROUTES.flatMap(route => route.points.slice(1).map((end, segment) => {
            const start = route.points[segment]!, dx = end.x - start.x, dz = end.z - start.z;
            const t = Math.max(0, Math.min(1, ((position.x - start.x) * dx + (position.z - start.z) * dz) / (dx * dx + dz * dz)));
            return Math.hypot(position.x - start.x - dx * t, position.z - start.z - dz * t) - (route.kind === 'road' ? route.width / 2 + 1.7 : route.width / 2);
          })));
          expect(clearance, `walker ${index}`).toBeLessThanOrEqual(0.0001);
        }
      }
    } finally { system.dispose(); }
  });
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
  it('swings limbs only while a walker actually moves and keeps the gait in the shared body draw', () => {
    const free = new AmbientNPCSystem(24), blocked = new AmbientNPCSystem(24, () => false);
    try {
      const bodies = (system: AmbientNPCSystem) => system.root.getObjectByName('ambient-npc-bodies') as THREE.InstancedMesh;
      const limbs = bodies(free).geometry.getAttribute('limb');
      expect(new Set(Array.from(limbs.array)).size).toBe(5);
      for (let frame = 0; frame < 60; frame++) { free.update(1 / 30, new THREE.Vector3()); blocked.update(1 / 30, new THREE.Vector3()); }
      const swings = (system: AmbientNPCSystem) => {
        const gait = bodies(system).geometry.getAttribute('gait');
        return Array.from({ length: gait.count }, (_, index) => gait.getY(index));
      };
      // Most walkers stride; lingering people in busy places and guarded, blocked walkers stand still.
      expect(swings(free).filter(swing => swing > 0.3).length).toBeGreaterThan(12);
      expect(swings(free).some(swing => swing < 0.01)).toBe(true);
      expect(swings(blocked).every(swing => swing < 0.01)).toBe(true);
    } finally { free.dispose(); blocked.dispose(); }
  });

  it('gathers a third of the crowd on the bay promenade', () => {
    const system = new AmbientNPCSystem(60);
    try {
      const bodies = system.root.getObjectByName('ambient-npc-bodies') as THREE.InstancedMesh;
      const matrix = new THREE.Matrix4(), position = new THREE.Vector3();
      let promenade = 0;
      for (let index = 0; index < bodies.count; index++) {
        bodies.getMatrixAt(index, matrix); position.setFromMatrixPosition(matrix);
        if (position.z < -230 && position.z > -300 && position.x > -60 && position.x < 200) promenade++;
      }
      expect(promenade).toBeGreaterThanOrEqual(15);
    } finally { system.dispose(); }
  });
  it('sends most walkers indoors in heavy rain while a few stay out', () => {
    const system = new AmbientNPCSystem(40);
    try {
      const bodies = system.root.getObjectByName('ambient-npc-bodies') as THREE.InstancedMesh;
      const visible = () => {
        const matrix = new THREE.Matrix4();
        let count = 0;
        // Hidden walkers are written with a zero scale, so their basis columns collapse.
        for (let index = 0; index < bodies.count; index++) { bodies.getMatrixAt(index, matrix); if (Math.hypot(matrix.elements[0]!, matrix.elements[1]!, matrix.elements[2]!) > 0.5) count++; }
        return count;
      };
      // Stand on the promenade, where a third of the crowd gathers.
      const far = new THREE.Vector3(60, 0, -268);
      system.update(0.1, far, 0);
      const dry = visible();
      system.update(0.1, far, 1);
      const storm = visible();
      expect(storm).toBeLessThan(dry * 0.4);
      expect(storm).toBeGreaterThan(0);
    } finally { system.dispose(); }
  });
  it('sidesteps a player standing on its line instead of walking through them', () => {
    const system = new AmbientNPCSystem(1);
    try {
      const bodies = system.root.getObjectByName('ambient-npc-bodies') as THREE.InstancedMesh;
      const matrix = new THREE.Matrix4(), start = new THREE.Vector3(), position = new THREE.Vector3();
      bodies.getMatrixAt(0, matrix); start.setFromMatrixPosition(matrix);
      // Find the walker's heading, then stand one metre ahead of it.
      system.update(0.2, new THREE.Vector3(1e4, 0, 1e4));
      bodies.getMatrixAt(0, matrix); position.setFromMatrixPosition(matrix);
      const heading = position.clone().sub(start).setY(0).normalize();
      const blocker = position.clone().addScaledVector(heading, 1.0);
      let closest = Infinity;
      for (let frame = 0; frame < 90; frame++) {
        system.update(1 / 30, blocker);
        bodies.getMatrixAt(0, matrix); position.setFromMatrixPosition(matrix);
        closest = Math.min(closest, Math.hypot(position.x - blocker.x, position.z - blocker.z));
      }
      expect(closest).toBeGreaterThan(0.25);
    } finally { system.dispose(); }
  });
  it('lets walkers whose route ends at a shop front step inside for a while and come back out', () => {
    const system = new AmbientNPCSystem(1);
    try {
      const bodies = system.root.getObjectByName('ambient-npc-bodies') as THREE.InstancedMesh;
      const matrix = new THREE.Matrix4(), viewer = new THREE.Vector3();
      bodies.getMatrixAt(0, matrix); viewer.setFromMatrixPosition(matrix);
      let hiddenRun = 0, longestHidden = 0, reappeared = false;
      for (let frame = 0; frame < 60 * 240; frame++) {
        system.update(1 / 60, viewer);
        bodies.getMatrixAt(0, matrix);
        const visible = Math.hypot(matrix.elements[0]!, matrix.elements[1]!, matrix.elements[2]!) > 0.5;
        if (!visible) { hiddenRun++; continue; }
        if (hiddenRun > 0) { longestHidden = Math.max(longestHidden, hiddenRun); reappeared = true; hiddenRun = 0; }
        // Keep the viewer beside the walker so distance culling never hides it.
        viewer.setFromMatrixPosition(matrix);
      }
      expect(longestHidden / 60).toBeGreaterThanOrEqual(6);
      expect(longestHidden / 60).toBeLessThanOrEqual(14.1);
      expect(reappeared).toBe(true);
    } finally { system.dispose(); }
  });
});
