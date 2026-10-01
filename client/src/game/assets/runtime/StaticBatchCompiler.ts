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
 * Geometry is partitioned by attribute/index layout before merging so one unusual
 * primitive cannot make an otherwise compatible material batch fall back to many
 * separate draw submissions. Singleton/incompatible meshes are left untouched.
 */
export function compileStaticMeshesByMaterial(root: THREE.Group): THREE.Group {
  root.updateMatrixWorld(true);
  const rootInverse = root.matrixWorld.clone().invert();
  const batches = new Map<string, StaticBatch>();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
    const material = object.material as THREE.Material;
    const compatibilityKey = geometryCompatibilityKey(object.geometry);
    const batchKey = `${material.uuid}:${compatibilityKey}`;
    let batch = batches.get(batchKey);
    if (!batch) {
      batch = { material, geometries: [], sourceMeshes: [], castShadow: false, receiveShadow: false };
      batches.set(batchKey, batch);
    }
    const localToRoot = rootInverse.clone().multiply(object.matrixWorld);
    batch.geometries.push(object.geometry.clone().applyMatrix4(localToRoot));
    batch.sourceMeshes.push(object);
    batch.castShadow ||= object.castShadow;
    batch.receiveShadow ||= object.receiveShadow;
  });

  let index = 0;
  for (const batch of batches.values()) {
    if (batch.geometries.length < 2) continue;
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

function geometryCompatibilityKey(geometry: THREE.BufferGeometry): string {
  const index = geometry.getIndex();
  const indexKey = index ? `indexed:${attributeStorageKey(index)}` : 'non-indexed';
  const attributes = Object.entries(geometry.attributes)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, attribute]) => `${name}:${attributeStorageKey(attribute)}`)
    .join('|');
  const morphAttributes = Object.entries(geometry.morphAttributes)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, morphs]) => `${name}[${(morphs ?? []).map(attributeStorageKey).join(',')}]`)
    .join('|');
  return `${indexKey};attrs=${attributes};morphRelative=${geometry.morphTargetsRelative ? 1 : 0};morph=${morphAttributes}`;
}

function attributeStorageKey(attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): string {
  const array = attribute instanceof THREE.InterleavedBufferAttribute ? attribute.data.array : attribute.array;
  const stride = attribute instanceof THREE.InterleavedBufferAttribute ? attribute.data.stride : attribute.itemSize;
  return `${attribute.itemSize}:${attribute.normalized ? 1 : 0}:${array.constructor.name}:stride${stride}`;
}
