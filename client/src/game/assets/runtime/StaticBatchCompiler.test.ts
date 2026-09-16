import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { compileStaticMeshesByMaterial } from './StaticBatchCompiler.js';

test('static compiler collapses compatible meshes into one draw submission per material', () => {
  const material = new THREE.MeshBasicMaterial();
  const root = new THREE.Group();
  const landmark = new THREE.Group();
  landmark.name = 'landmark:test';
  root.add(landmark);
  landmark.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material));
  const second = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), material);
  second.position.x = 3;
  landmark.add(second);

  const result = compileStaticMeshesByMaterial(root);
  let meshCount = 0;
  result.traverse((object) => { if (object instanceof THREE.Mesh) meshCount += 1; });

  assert.equal(meshCount, 1);
  assert.ok(result.getObjectByName('landmark:test'));
});

test('static compiler keeps different materials in separate batches', () => {
  const root = new THREE.Group();
  root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
  root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
  const result = compileStaticMeshesByMaterial(root);
  let meshCount = 0;
  result.traverse((object) => { if (object instanceof THREE.Mesh) meshCount += 1; });
  assert.equal(meshCount, 2);
});
