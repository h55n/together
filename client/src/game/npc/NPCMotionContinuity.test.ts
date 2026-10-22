import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { locationAnchor, planAmayaBaySurfacePath } from '@together/shared';
import { namedNpcs } from '@together/content';
import { NamedNPCSystem } from './NamedNPCSystem';
import { AmbientNPCSystem } from './AmbientNPCSystem';

describe('resident motion continuity', () => {
  it('holds named residents at a rejected physical segment and resumes after a temporary blocker clears', () => {
    let open = false;
    const system = new NamedNPCSystem(() => open), viewer = new THREE.Vector3(-235, 0, 175);
    try {
      system.update(0, 8 * 60, viewer);
      const actor = system.root.getObjectByName('named-npc:kamla')!, initial = actor.position.clone();
      system.update(1, 8 * 60, viewer);
      expect(actor.position.distanceTo(initial)).toBe(0);
      expect(actor.userData.navigationMode).toBe('blocked');
      open = true; system.update(1, 8 * 60, viewer);
      expect(actor.position.distanceTo(initial)).toBeCloseTo(0.75, 5);
      expect(actor.userData.navigationMode).toBe('surface_patrol');
    } finally { system.dispose(); }
  });

  it('preserves ambient route cursors when a physical segment is rejected', () => {
    let open = false;
    const system = new AmbientNPCSystem(1, () => open), control = new AmbientNPCSystem(1);
    const matrix = new THREE.Matrix4(), initial = new THREE.Vector3(), actual = new THREE.Vector3(), expected = new THREE.Vector3();
    try {
      const bodies = system.root.getObjectByName('ambient-npc-bodies') as THREE.InstancedMesh;
      const controlBodies = control.root.getObjectByName('ambient-npc-bodies') as THREE.InstancedMesh;
      bodies.getMatrixAt(0, matrix); initial.setFromMatrixPosition(matrix);
      system.update(1, initial);
      bodies.getMatrixAt(0, matrix); actual.setFromMatrixPosition(matrix);
      expect(actual.distanceTo(initial)).toBe(0);
      expect(system.root.userData.navigationMode).toBe('blocked');
      expect(system.root.userData.blockedWalkerIndices).toEqual([0]);
      open = true; system.update(1, initial); control.update(1, initial);
      bodies.getMatrixAt(0, matrix); actual.setFromMatrixPosition(matrix);
      controlBodies.getMatrixAt(0, matrix); expected.setFromMatrixPosition(matrix);
      expect(actual.distanceTo(expected)).toBeLessThan(0.0001);
      expect(system.root.userData.blockedWalkerIndices).toEqual([]);
    } finally { system.dispose(); control.dispose(); }
  });
  it('consumes the same path distance across frame rates and large schedule time jumps', () => {
    const fine = new NamedNPCSystem(), coarse = new NamedNPCSystem();
    const viewer = new THREE.Vector3(-235, 0, 175);
    try {
      fine.update(0, 8 * 60, viewer); coarse.update(0, 8 * 60, viewer);
      for (let second = 0; second < 150; second++) {
        for (let frame = 0; frame < 60; frame++) fine.update(1 / 60, 8 * 60, viewer);
        coarse.update(1, 8 * 60, viewer);
      }
      const a = fine.root.getObjectByName('named-npc:kamla')!, b = coarse.root.getObjectByName('named-npc:kamla')!;
      expect(a.position.distanceTo(b.position)).toBeLessThan(0.00001);
      const before = a.position.clone();
      fine.update(1 / 60, 15 * 60, viewer);
      expect(a.position.distanceTo(before)).toBeLessThanOrEqual(0.75 / 60 + 0.0001);
      fine.update(1 / 60, 17 * 60, viewer);
      expect(a.position.distanceTo(before)).toBeLessThanOrEqual(2 * 0.75 / 60 + 0.0001);
    } finally { fine.dispose(); coarse.dispose(); }
  });
  it.each([['roshan', 7 * 60], ['kamla', 9 * 60 + 30]] as const)('routes %s to work along the canonical surface graph at %s', (id, boundary) => {
    const system = new NamedNPCSystem(), player = new THREE.Vector3(-100, 0, 140);
    try {
      system.update(1 / 60, boundary - 1, player);
      const actor = system.root.getObjectByName(`named-npc:${id}`)!;
      const index = namedNpcs.findIndex(npc => npc.id === id), definition = namedNpcs[index]!;
      const anchor = locationAnchor(definition.homeOrWork)!, phase = index * 0.83;
      const destination = { x: anchor.position.x + Math.sin(phase * 2.2) * 2.4, z: anchor.position.z + Math.cos(phase * 1.7) * 2.4 };
      const route = planAmayaBaySurfacePath(actor.position, destination);
      expect(route).not.toBeNull();
      expect(route!.points.length).toBeGreaterThanOrEqual(2);
      const points = route!.points;
      for (let frame = 1; frame <= 600; frame++) {
        system.update(1 / 60, boundary, player);
        let remaining = frame * 0.75 / 60;
        const expected = new THREE.Vector2(points[0]!.x, points[0]!.z);
        for (let segment = 1; segment < points.length; segment++) {
          const target = points[segment]!, dx = target.x - expected.x, dz = target.z - expected.y;
          const length = Math.hypot(dx, dz), used = Math.min(remaining, length);
          if (length > 0.000001) { expected.x += dx / length * used; expected.y += dz / length * used; }
          remaining -= used;
          if (remaining <= 0.000001) break;
        }
        expect(Math.hypot(actor.position.x - expected.x, actor.position.z - expected.y)).toBeLessThan(0.00002);
      }
    } finally { system.dispose(); }
  });

  it('keeps named patrol phase independent of viewer culling', () => {
    const near = new NamedNPCSystem(), hidden = new NamedNPCSystem();
    try {
      for (let frame = 0; frame < 600; frame++) {
        near.update(1 / 60, 8 * 60, new THREE.Vector3(-235, 0, 175));
        hidden.update(1 / 60, 8 * 60, new THREE.Vector3(5000, 0, 5000));
        const a = near.root.getObjectByName('named-npc:kamla')!, b = hidden.root.getObjectByName('named-npc:kamla')!;
        expect(a.position.distanceTo(b.position)).toBeLessThan(0.00001);
      }
    } finally { near.dispose(); hidden.dispose(); }
  });

  it.each([
    ['roshan', 7 * 60, new THREE.Vector3(-43, 0, 68)],
    ['kamla', 9 * 60 + 30, new THREE.Vector3(-235, 0, 175)],
    ['roshan', 21 * 60 + 30, new THREE.Vector3(-43, 0, 68)],
    ['kamla', 16 * 60 + 30, new THREE.Vector3(-235, 0, 175)],
  ] as const)('keeps %s continuous across real schedule boundary %s', (id, boundary, player) => {
    const system = new NamedNPCSystem();
    try {
      system.update(1 / 60, boundary - 1, player);
      const actor = system.root.getObjectByName(`named-npc:${id}`)!;
      for (let i = 0; i < 120; i++) system.update(1 / 60, boundary - 1, player);
      const before = actor.position.clone();
      system.update(1 / 60, boundary, player);
      expect(Math.hypot(actor.position.x - before.x, actor.position.z - before.z)).toBeLessThanOrEqual(0.75 / 60 + 0.00001);
      for (let i = 0; i < 300; i++) {
        const previous = actor.position.clone();
        system.update(1 / 60, boundary, player);
        expect(Math.hypot(actor.position.x - previous.x, actor.position.z - previous.z)).toBeLessThanOrEqual(0.75 / 60 + 0.00001);
      }
    } finally { system.dispose(); }
  });

  it('turns named residents through a bounded shortest yaw at corridor corners and reversals', () => {
    const system = new NamedNPCSystem(), player = new THREE.Vector3(-235, 0, 175);
    try {
      system.update(1 / 60, 8 * 60, player);
      const actor = system.root.getObjectByName('named-npc:kamla')!;
      let totalTurn = 0;
      for (let i = 0; i < 9000; i++) {
        const before = actor.rotation.y;
        system.update(1 / 60, 8 * 60, player);
        const turn = Math.abs(Math.atan2(Math.sin(actor.rotation.y - before), Math.cos(actor.rotation.y - before)));
        expect(turn).toBeLessThanOrEqual(3 / 60 + 0.00001);
        totalTurn += turn;
      }
      expect(totalTurn).toBeGreaterThan(0.5);
    } finally { system.dispose(); }
  });

  it.each([70, 200])('keeps the same ambient actor physically identical with viewer %s metres away', offset => {
    const near = new AmbientNPCSystem(1), far = new AmbientNPCSystem(1);
    const matrix = new THREE.Matrix4(), initial = new THREE.Vector3(), nearPosition = new THREE.Vector3(), farPosition = new THREE.Vector3();
    try {
      const nearBodies = near.root.getObjectByName('ambient-npc-bodies') as THREE.InstancedMesh;
      const farBodies = far.root.getObjectByName('ambient-npc-bodies') as THREE.InstancedMesh;
      nearBodies.getMatrixAt(0, matrix); initial.setFromMatrixPosition(matrix);
      const remote = initial.clone().add(new THREE.Vector3(0, 0, offset));
      // The near viewer stays well inside the visible range but out of the walker's path:
      // walkers deliberately sidestep a player standing directly on their line.
      const nearViewer = initial.clone().add(new THREE.Vector3(30, 0, 0));
      const previous = initial.clone();
      let travelled = 0;
      for (let i = 0; i < 360; i++) {
        near.update(1 / 60, nearViewer); far.update(1 / 60, remote);
        nearBodies.getMatrixAt(0, matrix); nearPosition.setFromMatrixPosition(matrix);
        farBodies.getMatrixAt(0, matrix); farPosition.setFromMatrixPosition(matrix);
        expect(nearPosition.distanceTo(farPosition)).toBeLessThan(0.0001);
        travelled += nearPosition.distanceTo(previous); previous.copy(nearPosition);
      }
      // A sidewalk patrol can reverse during the interval; net displacement
      // must not be mistaken for physically travelled distance.
      expect(travelled).toBeGreaterThan(2);
    } finally { near.dispose(); far.dispose(); }
  });

  it('smooths ambient heading reversals without changing their patrol bounds', () => {
    const system = new AmbientNPCSystem(1), matrix = new THREE.Matrix4(), previous = new THREE.Quaternion(), current = new THREE.Quaternion(), position = new THREE.Vector3(), scale = new THREE.Vector3();
    try {
      const heads = system.root.getObjectByName('ambient-npc-heads') as THREE.InstancedMesh;
      heads.getMatrixAt(0, matrix); matrix.decompose(position, previous, scale);
      let totalTurn = 0, hiddenFrames = 0, resume = false;
      for (let i = 0; i < 15000; i++) {
        system.update(1 / 60, position);
        heads.getMatrixAt(0, matrix);
        // A walker inside a shop is hidden (zero scale) and has no meaningful rotation to compare.
        if (Math.hypot(matrix.elements[0]!, matrix.elements[1]!, matrix.elements[2]!) < 0.5) { hiddenFrames++; resume = true; continue; }
        matrix.decompose(position, current, scale);
        if (resume) { previous.copy(current); resume = false; continue; }
        const turn = previous.angleTo(current);
        expect(turn).toBeLessThanOrEqual(3 / 60 + 0.003);
        totalTurn += turn; previous.copy(current);
      }
      expect(totalTurn).toBeGreaterThan(1);
      expect(hiddenFrames).toBeLessThan(15000);
    } finally { system.dispose(); }
  });
});
