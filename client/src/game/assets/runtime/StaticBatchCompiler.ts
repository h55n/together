import * as THREE from 'three';
import { prepareMergeGeometries } from './PreparedGeometryMerge';
import { geometryCellSize, prepareGeometryCellKey, validateCellSize, type SpatialBatchOptions } from './SpatialBatch';

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
export function compileStaticMeshesByMaterial(root: THREE.Group, options: SpatialBatchOptions = {}): THREE.Group {
  const iterator = prepareStaticMeshesByMaterial(root, options);
  let step = iterator.next();
  while (!step.done) step = iterator.next();
  return step.value;
}

export function* prepareStaticMeshesByMaterial(root: THREE.Group, options: SpatialBatchOptions = {}): Generator<void, THREE.Group, void> {
  validateCellSize(options.cellSize);
  root.updateMatrixWorld(true);
  const rootInverse = root.matrixWorld.clone().invert();
  const batches = new Map<string, StaticBatch>();
  let pendingGeometry: THREE.BufferGeometry | null = null;

  const meshes: THREE.Mesh[] = [];
  root.traverse(object => { if (object instanceof THREE.Mesh && !Array.isArray(object.material)) meshes.push(object); });
  try {
  for (const object of meshes) {
    const material = object.material as THREE.Material;
    const compatibilityKey = geometryCompatibilityKey(object.geometry);
    const localToRoot = rootInverse.clone().multiply(object.matrixWorld);
    const temporary = object.geometry.clone().applyMatrix4(localToRoot);
    delete temporary.userData.togetherShared;
    pendingGeometry = temporary;
    const cell = yield* prepareGeometryCellKey(temporary, geometryCellSize(temporary, options));
    const batchKey = `${material.uuid}:${compatibilityKey}:${cell}`;
    let batch = batches.get(batchKey);
    if (!batch) {
      batch = { material, geometries: [], sourceMeshes: [], castShadow: false, receiveShadow: false };
      batches.set(batchKey, batch);
    }
    batch.geometries.push(temporary);
    pendingGeometry = null;
    batch.sourceMeshes.push(object);
    batch.castShadow ||= object.castShadow;
    batch.receiveShadow ||= object.receiveShadow;
    yield;
  }

  let index = 0;
  for (const batch of batches.values()) {
    if (batch.geometries.length < 2) continue;
    const geometry = yield* prepareMergeGeometries(batch.geometries);
    if (!geometry) continue;

    for (const mesh of batch.sourceMeshes) mesh.parent?.remove(mesh);
    const mesh = new THREE.Mesh(geometry, batch.material);
    mesh.name = `static-batch:${index}`;
    mesh.castShadow = batch.castShadow;
    mesh.receiveShadow = batch.receiveShadow;
    mesh.frustumCulled = true;
    root.add(mesh);
    index += 1;
    yield;
  }

  return root;
  } finally {
    pendingGeometry?.dispose();
    for (const batch of batches.values()) for (const geometry of batch.geometries) geometry.dispose();
  }
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
