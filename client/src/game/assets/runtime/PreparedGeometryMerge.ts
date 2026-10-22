import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Stage plain static geometry copying and bounds; retain Three's morph/interleaved compatibility path. */
export function* prepareMergeGeometries(geometries: readonly THREE.BufferGeometry[]): Generator<void, THREE.BufferGeometry | null, void> {
  if (!geometries.length) return null;
  const first = geometries[0]!;
  const names = Object.keys(first.attributes);
  const indexed = first.index !== null;
  const simple = names.includes('position') && geometries.every(geometry =>
    (geometry.index !== null) === indexed &&
    geometry.morphTargetsRelative === first.morphTargetsRelative &&
    Object.keys(geometry.morphAttributes).length === 0 &&
    Object.keys(geometry.attributes).length === names.length &&
    names.every(name => {
      const attribute = geometry.attributes[name], reference = first.attributes[name];
      return attribute instanceof THREE.BufferAttribute && reference instanceof THREE.BufferAttribute && !(attribute instanceof THREE.Float16BufferAttribute) &&
        attribute.array.constructor === reference.array.constructor && attribute.itemSize === reference.itemSize &&
        attribute.normalized === reference.normalized && attribute.gpuType === reference.gpuType;
    }));
  if (!simple) {
    const fallback = mergeGeometries([...geometries], false);
    fallback?.computeBoundingBox(); fallback?.computeBoundingSphere();
    return fallback;
  }
  const result = new THREE.BufferGeometry();
  let finished = false;
  try {
    result.morphTargetsRelative = first.morphTargetsRelative;
    if (indexed) {
      const vertexCount = geometries.reduce((sum, geometry) => sum + geometry.attributes.position!.count, 0);
      const indexCount = geometries.reduce((sum, geometry) => sum + geometry.index!.count, 0);
      const indices = vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
      let destination = 0, vertexOffset = 0;
      for (const geometry of geometries) {
        const sourceIndex = geometry.index!;
        for (let start = 0; start < sourceIndex.count; start += 2048) {
          const end = Math.min(sourceIndex.count, start + 2048);
          for (let index = start; index < end; index++) indices[destination++] = sourceIndex.getX(index) + vertexOffset;
          yield;
        }
        vertexOffset += geometry.attributes.position!.count;
      }
      result.setIndex(new THREE.BufferAttribute(indices, 1));
    }
    for (const name of names) {
      // The fast-path compatibility check above excludes interleaved/half-float
      // storage. Preserve each plain attribute's numerical representation.
      const reference = first.attributes[name] as THREE.BufferAttribute;
      const length = geometries.reduce((sum, geometry) => sum + geometry.attributes[name]!.array.length, 0);
      const ArrayType = reference.array.constructor as new (length: number) => THREE.BufferAttribute['array'];
      const array = new ArrayType(length);
      let offset = 0;
      for (const geometry of geometries) {
        const source = geometry.attributes[name]!.array;
        for (let start = 0; start < source.length; start += 8192) {
          array.set(source.subarray(start, Math.min(source.length, start + 8192)), offset + start);
          yield;
        }
        offset += source.length;
      }
      const attribute = new THREE.BufferAttribute(array, reference.itemSize, reference.normalized);
      attribute.gpuType = reference.gpuType;
      result.setAttribute(name, attribute);
    }
    const positions = result.attributes.position!;
    const box = new THREE.Box3();
    const point = new THREE.Vector3();
    for (let start = 0; start < positions.count; start += 2048) {
      const end = Math.min(positions.count, start + 2048);
      for (let index = start; index < end; index++) box.expandByPoint(point.fromBufferAttribute(positions, index));
      yield;
    }
    result.boundingBox = box;
    const center = box.getCenter(new THREE.Vector3());
    let radiusSquared = 0;
    for (let start = 0; start < positions.count; start += 2048) {
      const end = Math.min(positions.count, start + 2048);
      for (let index = start; index < end; index++) radiusSquared = Math.max(radiusSquared, center.distanceToSquared(point.fromBufferAttribute(positions, index)));
      yield;
    }
    result.boundingSphere = new THREE.Sphere(center, Math.sqrt(radiusSquared));
    finished = true;
    return result;
  } finally { if (!finished) result.dispose(); }
}



