import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createActivityState, createCafeState, createPicnicState } from '@together/shared';
import { GameEngine } from '../GameEngine';
import { CameraController } from '../camera/CameraController';
import { PlayerAvatar } from '../player/PlayerAvatar';

describe('external activity camera ownership', () => {
  it('keeps hydrated leisure props when closing the panel and disposes them on completion', () => {
    const avatar = new PlayerAvatar(), camera = new CameraController(avatar, 16 / 9), scene = new THREE.Scene();
    const engine = Object.assign(Object.create(GameEngine.prototype), { avatar, camera, scene, disposed: false }) as GameEngine;
    const state = { ...createActivityState('cafe_hangout', 'a'), revision: 1, cafe: createCafeState(['a']) };
    const session = { id: 'cafe', activityId: 'cafe_hangout' as const, state, createdAt: '', updatedAt: '' };
    try {
      engine.syncAmbientActivities([session]);
      expect(scene.children.filter(child => child.name === 'cafe-presentation')).toHaveLength(1);
      const props = scene.children[0];
      engine.showSports(session.id, state);
      engine.clearSports();
      expect(scene.children[0]).toBe(props);
      expect(avatar.head.visible).toBe(false);
      engine.upsertAmbientActivity({ ...session, state: { ...state, revision: 2, status: 'complete' } });
      expect(scene.children).toHaveLength(0);
    } finally { engine.clearSports(); engine.syncAmbientActivities([]); avatar.dispose(); }
  });
  it.each(['first_person', 'third_person'] as const)('shows the whole local avatar and restores %s visibility on close', mode => {
    const avatar = new PlayerAvatar();
    const camera = new CameraController(avatar, 16 / 9);
    if (mode === 'third_person') camera.toggle();
    const scene = new THREE.Scene();
    const engine = Object.assign(Object.create(GameEngine.prototype), { avatar, camera, scene, disposed: false }) as GameEngine;
    const runtime = engine as unknown as { updateSports(dt: number): void };
    try {
      engine.showSports('picnic', { ...createActivityState('picnic', 'a'), picnic: createPicnicState(['a']) });
      expect(avatar.head.visible).toBe(true);
      camera.toggle();
      runtime.updateSports(1 / 60);
      expect(avatar.head.visible).toBe(true);
      camera.toggle();
      engine.clearSports();
      expect(avatar.head.visible).toBe(mode === 'third_person');
      expect(scene.children).toHaveLength(0);
    } finally { engine.clearSports(); engine.syncAmbientActivities([]); avatar.dispose(); }
  });

  it('keeps the café view and complete chair ring outside the authored façade', () => {
    const avatar = new PlayerAvatar(), camera = new CameraController(avatar, 16 / 9), scene = new THREE.Scene();
    const engine = Object.assign(Object.create(GameEngine.prototype), { avatar, camera, scene, disposed: false }) as GameEngine;
    try {
      const state = { ...createActivityState('cafe_hangout', 'a'), cafe: createCafeState(['a']) };
      engine.syncAmbientActivities([{ id: 'cafe', activityId: 'cafe_hangout', state }]);
      engine.showSports('cafe', state);
      (engine as unknown as { updateSports(dt: number): void }).updateSports(1 / 60);
      scene.updateMatrixWorld(true);
      camera.camera.updateMatrixWorld(true);
      // The authored café body ends at -39.8; the high awning can cover a seat.
      expect(camera.camera.position.x).toBe(-31.5);
      const chairs = scene.children[0]!.children.filter(child => child.name.startsWith('cafe-chair-'));
      expect(chairs).toHaveLength(6);
      for (const chair of chairs) expect(new THREE.Box3().setFromObject(chair).min.x).toBeGreaterThan(-39.8);
      const table = scene.children[0]!.children[0]!;
      const tablePoint = table.getWorldPosition(new THREE.Vector3());
      const screen = tablePoint.clone().project(camera.camera);
      expect(Math.abs(screen.x)).toBeLessThan(0.7);
      expect(Math.abs(screen.y)).toBeLessThan(0.7);
      const direction = tablePoint.clone().sub(camera.camera.position).normalize();
      const ray = new THREE.Ray(camera.camera.position, direction);
      const facade = new THREE.Box3(new THREE.Vector3(-48.6, -100, 53.75), new THREE.Vector3(-39.8, 100, 66.25));
      const hit = ray.intersectBox(facade, new THREE.Vector3());
      expect(hit === null || hit.distanceTo(camera.camera.position) > tablePoint.distanceTo(camera.camera.position)).toBe(true);
    } finally { engine.clearSports(); avatar.dispose(); }
  });
});
