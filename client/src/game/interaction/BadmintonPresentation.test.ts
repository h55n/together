import { expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { BADMINTON_SURFACE_Y, commandBadminton, createBadmintonMatch, badmintonShuttlePosition } from '@together/shared';
import { BadmintonPresentation } from './BadmintonPresentation';

it('renders authoritative moving shuttle and releases every owned scene resource', () => {
  const scene = new THREE.Scene();
  const presentation = new BadmintonPresentation(scene);
  const served = commandBadminton(createBadmintonMatch('a', 0, 'b'), 'a', { id: 's', expectedRevision: 0, kind: 'serve' }, 0);
  presentation.update(served, 900);
  const shuttle = scene.getObjectByName('badminton-shuttle')!;
  expect(shuttle.visible).toBe(true);
  expect(shuttle.position.x).toBeCloseTo(badmintonShuttlePosition(served.flight!, 900).x);
  const first = shuttle.position.clone();
  presentation.update(served, 1000);
  expect(shuttle.position.x).not.toEqual(first.x);
  const disposals: ReturnType<typeof vi.spyOn>[] = [];
  scene.traverse(object => { if (object instanceof THREE.Mesh) disposals.push(vi.spyOn(object.geometry, 'dispose')); });
  presentation.update({ ...served, phase: 'cancelled', flight: null }, 1000);
  expect(shuttle.visible).toBe(false);
  presentation.dispose(); presentation.dispose();
  expect(scene.children).toHaveLength(0);
  expect(disposals.every(spy => spy.mock.calls.length === 1)).toBe(true);
});

it('grounds both players, grips rackets in hands and moves the receiving body with the shuttle', () => {
  const scene = new THREE.Scene(); const presentation = new BadmintonPresentation(scene);
  const served = commandBadminton(createBadmintonMatch('a', 0), 'a', { id: 's', expectedRevision: 0, kind: 'serve', aimZ: 2 }, 0);
  presentation.update(served, 1200);
  const court = scene.getObjectByName('badminton-presentation')!;
  expect(court.position.y).toBe(BADMINTON_SURFACE_Y);
  const receiver = scene.getObjectByName('badminton-player-1')!;
  expect(receiver.position.y).toBe(0);
  expect(receiver.position.z).toBeGreaterThan(0);
  const racket = scene.getObjectByName('badminton-racket-1')!;
  expect(racket.parent?.name).toBe('badminton-hand-1');
  const arm = scene.getObjectByName('badminton-arm-0')!;
  const settled = arm.rotation.x;
  presentation.update(served, 80);
  expect(arm.rotation.x).not.toBeCloseTo(settled);
  presentation.update({ ...served, phase: 'ready', flight: null }, 1900);
  expect(receiver.position.z).toBe(0);
  presentation.dispose();
});
