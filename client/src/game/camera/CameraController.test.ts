import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { CameraController } from './CameraController.js';
import type { PlayerAvatar } from '../player/PlayerAvatar.js';

function setup() {
  const root = new THREE.Group();
  let headHidden = false;
  const avatar = { root, eyeHeight: 1.6, setFirstPerson: (hidden: boolean) => { headHidden = hidden; } } as unknown as PlayerAvatar;
  const camera = new CameraController(avatar, 16 / 9);
  camera.yaw = 0;
  camera.toggle();
  return { camera, headHidden: () => headHidden };
}

test('third-person camera stays in front of a close wall and restores head visibility after clearing it', () => {
  const { camera, headHidden } = setup();
  const geometry = new THREE.PlaneGeometry(4, 4);
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const wall = new THREE.Mesh(geometry, material);
  wall.position.set(0, 1.35, 0.4);
  wall.updateMatrixWorld(true);
  camera.addCollisionRoot(wall);
  camera.update(1, false, false);
  assert.ok(camera.camera.position.z < 0.4);
  assert.equal(headHidden(), true);
  wall.position.z = 10;
  wall.updateMatrixWorld(true);
  camera.update(1, false, false);
  assert.ok(camera.camera.position.z > 3.5);
  assert.equal(headHidden(), false);
  geometry.dispose(); material.dispose();
});

test('third-person vertical look changes camera position around the shoulder', () => {
  const { camera } = setup();
  camera.update(1, false, false);
  const neutral = camera.camera.position.clone();
  camera.pitch = -0.5;
  camera.update(1, false, false);
  assert.ok(camera.camera.position.y > neutral.y);
  assert.ok(camera.camera.position.z < neutral.z);
  assert.ok(camera.camera.getWorldDirection(new THREE.Vector3()).y < 0);
});

test('first-person bob settles smoothly when walking stops and reduced motion removes it', () => {
  const { camera } = setup();
  camera.toggle();
  camera.update(0.2, true, false);
  const movingHeight = camera.camera.position.y;
  camera.update(0.001, false, false);
  assert.ok(Math.abs(camera.camera.position.y - movingHeight) < 0.001);
  for (let frame = 0; frame < 60; frame++) camera.update(1 / 60, false, false);
  assert.ok(Math.abs(camera.camera.position.y - 1.6) < 0.0001);
  camera.update(0.2, true, false);
  camera.headBobAmount = 0;
  camera.update(1 / 60, true, false);
  assert.equal(camera.camera.position.y, 1.6);
});
