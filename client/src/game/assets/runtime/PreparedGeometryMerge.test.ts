import assert from 'node:assert/strict';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { expect, it, vi } from 'vitest';
import { prepareMergeGeometries } from './PreparedGeometryMerge';

function drain(sources: THREE.BufferGeometry[]) {
  const iterator = prepareMergeGeometries(sources);
  let steps = 0;
  let step = iterator.next();
  while (!step.done) { steps++; step = iterator.next(); }
  return { geometry: step.value!, steps };
}

function compare(sources: THREE.BufferGeometry[]) {
  const expected = mergeGeometries(sources, false)!;
  expected.computeBoundingBox(); expected.computeBoundingSphere();
  const { geometry, steps } = drain(sources);
  try {
    assert.deepEqual(geometry.index?.array, expected.index?.array);
    for (const name of Object.keys(expected.attributes)) {
      assert.deepEqual(geometry.attributes[name]!.array, expected.attributes[name]!.array);
      expect(geometry.attributes[name]!.normalized).toBe(expected.attributes[name]!.normalized);
    }
    assert.deepEqual(geometry.boundingBox, expected.boundingBox);
    expect(geometry.boundingSphere!.center.distanceTo(expected.boundingSphere!.center)).toBeLessThan(1e-8);
    expect(Math.abs(geometry.boundingSphere!.radius - expected.boundingSphere!.radius)).toBeLessThan(1e-8);
    return steps;
  } finally { geometry.dispose(); expected.dispose(); }
}

it('yields throughout large copying and bounds while matching Three geometry', () => {
  const sources = Array.from({ length: 3 }, (_, index) => new THREE.BoxGeometry(1, 1, 1, 24, 24, 24).translate(index * 2, 0, 0));
  try { expect(compare(sources)).toBeGreaterThan(20); }
  finally { sources.forEach(geometry => geometry.dispose()); }
});

it('retains index precision when combined vertices exceed the 16-bit range', () => {
  const sources = [new THREE.PlaneGeometry(1, 1, 182, 182), new THREE.PlaneGeometry(1, 1, 182, 182).translate(2, 0, 0)];
  try { compare(sources); }
  finally { sources.forEach(geometry => geometry.dispose()); }
});

it('retains non-indexed layouts and normalized colour storage', () => {
  const sources = [new THREE.BoxGeometry().toNonIndexed(), new THREE.BoxGeometry().toNonIndexed().translate(2, 0, 0)];
  for (const geometry of sources) geometry.setAttribute('color', new THREE.Uint8BufferAttribute(new Uint8Array(geometry.attributes.position!.count * 3).fill(128), 3, true));
  try { compare(sources); }
  finally { sources.forEach(geometry => geometry.dispose()); }
});

it('discards only its partial result on cancellation and retains source geometry', () => {
  const source = new THREE.BoxGeometry(1, 1, 1, 24, 24, 24);
  source.userData.togetherShared = true;
  const sourceDisposed = vi.fn();
  source.addEventListener('dispose', sourceDisposed);
  const dispose = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
  const iterator = prepareMergeGeometries([source]);
  try {
    expect(iterator.next().done).toBe(false);
    iterator.return(null);
    expect(dispose).toHaveBeenCalledOnce();
    expect(sourceDisposed).not.toHaveBeenCalled();
    expect(source.userData.togetherShared).toBe(true);
  } finally { dispose.mockRestore(); source.dispose(); }
});

it('preserves morph targets through the compatibility fallback', () => {
  const sources = [new THREE.BoxGeometry(), new THREE.BoxGeometry().translate(2, 0, 0)];
  for (const geometry of sources) geometry.morphAttributes.position = [geometry.attributes.position!.clone() as THREE.BufferAttribute];
  const { geometry } = drain(sources);
  try { expect(geometry.morphAttributes.position?.[0]?.count).toBe(sources.reduce((sum, source) => sum + source.attributes.position!.count, 0)); }
  finally { geometry.dispose(); sources.forEach(source => source.dispose()); }
});
