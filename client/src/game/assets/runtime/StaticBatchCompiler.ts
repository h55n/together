import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Compiles a static authored hierarchy into one mesh per material while leaving
 * named groups in place for debug lookup and semantic identity.
 *
 * Source geometries are intentionally not disposed here because some authored
 * systems clone registry-owned meshes that share canonical geometry resources.
 */
export function compileStaticMeshesByMaterial(root: THREE.Group): THREE.Group {
  root.updateMatrixWorld(true);
  const rootInverse = root.matrixWorld.clone().invert();
  const batches = new Map<string, { material: THREE.Material; geometries: THREE.BufferGeometry[]; castShadow: boolean; receiveShadow: boolean }>();
  const sourceMeshes: THREE.Mesh[] = [];

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
    const material = object.material as THREE.Material;
    let batch = batches.get(material.uuid);
    if (!batch) {
      batch = { material, geometries: [], castShadow: false, receiveShadow: false };
      batches.set(material.uuid, batch);
    }
    const localToRoot = rootInverse.clone().multiply(object.matrixWorld);
    batch.geometries.push(object.geometry.clone().applyMatrix4(localToRoot));
    batch.castShadow ||= object.castShadow;
    batch.receiveShadow ||= object.receiveShadow;
    sourceMeshes.push(object);
  });

  for (const mesh of sourceMeshes) mesh.parent?.remove(mesh);

  let index = 0;
  for (const batch of batches.values()) {
    const geometry = mergeGeometries(batch.geometries, false);
    if (!geometry) continue;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, batch.material);
    mesh.name = `static-batch:${index}`;
    mesh.castShadow = batch.castShadow;
    mesh.receiveShadow = batch.receiveShadow;
    mesh.frustumCulled = true;
    root.add(mesh);
    index += 1;
  }

  return root;
}
