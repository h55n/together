import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { assessMemoryParticipantFraming } from './captureFraming';

test('memory framing reports only household members actually inside the camera frame', () => {
  const camera = new THREE.PerspectiveCamera(78, 16 / 9, 0.04, 100);
  camera.position.set(0, 1.6, 0);
  camera.lookAt(0, 1.6, -4);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  const framing = assessMemoryParticipantFraming(camera, [
    { userId: 'partner', position: { x: 0.4, y: 0, z: -4 } },
    { userId: 'offscreen', position: { x: 9, y: 0, z: -4 } },
    { userId: 'too-far', position: { x: 0, y: 0, z: -60 } },
  ]);

  assert.deepEqual(framing.visibleUserIds, ['partner']);
  assert.ok(framing.composition > 0.7);
});

test('solo framing keeps a healthy composition baseline without inventing participants', () => {
  const camera = new THREE.PerspectiveCamera(78, 1, 0.04, 100);
  const framing = assessMemoryParticipantFraming(camera, []);
  assert.deepEqual(framing.visibleUserIds, []);
  assert.equal(framing.composition, 0.82);
});
