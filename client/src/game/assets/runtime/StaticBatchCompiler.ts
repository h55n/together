import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

type StaticBatch = {
  material: THREE.Material;
  geometries: THREE.BufferGeometry[];
  sourceMeshes: THREE.Mesh[];
  castShadow: boolean;
  receiveShadow: boolean;
};

/**
 * Compiles a static authored hierarchy into one mesh per compatible material
 * batch while leaving named groups in place for debug lookup and semantic identity.
 *
 * Source geometries are intentionally not disposed here because some authored
 * systems clone registry-owned meshes that share canonical geometry resources.
 * If Three.js rejects a merge because geometry attribute layouts differ, that
 * batch is left untouched so an optimization can never make world art disappear.
 */
export function compileStaticMeshesByMaterial(root: THREE.Group): THREE.Group {
  root.updateMatrixWorld(true);
  const rootInverse = root.matrixWorld.clone().invert();
  const batches = new Map<string, StaticBatch>();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
    const material = object.material as THREE.Material;
    let batch = batches.get(material.uuid);
    if (!batch) {
      batch = { material, geometries: [], sourceMeshes: [], castShadow: false, receiveShadow: false };
      batches.set(material.uuid, batch);
    }
    const localToRoot = rootInverse.clone().multiply(object.matrixWorld);
    batch.geometries.push(object.geometry.clone().applyMatrix4(localToRoot));
    batch.sourceMeshes.push(object);
    batch.castShadow ||= object.castShadow;
    batch.receiveShadow ||= object.receiveShadow;
  });

  let index = 0;
  for (const batch of batches.values()) {
    const geometry = mergeGeometries(batch.geometries, false);
    if (!geometry) continue;

    for (const mesh of batch.sourceMeshes) mesh.parent?.remove(mesh);
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
