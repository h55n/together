import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { InstancePool } from './InstancePool';

describe('InstancePool', () => {
  it('reuses a released instance slot for another placement', () => {
    const pool = new InstancePool(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial(), 2);
    const first = pool.allocate(new THREE.Matrix4().makeTranslation(1, 0, 0));
    pool.release(first);
    const next = pool.allocate(new THREE.Matrix4().makeTranslation(2, 0, 0));

    expect(next).toBe(first);
    expect(pool.metrics()).toEqual({ capacity: 2, active: 1 });
  });
});
