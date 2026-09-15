import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { WorldStreamer } from './WorldStreamer';

describe('WorldStreamer', () => {
  it('commits only one expensive initial chunk per update frame', () => {
    let created = 0;
    const streamer = new WorldStreamer(() => { created += 1; return new THREE.Group(); });
    streamer.update(0.31, new THREE.Vector3(0, 0, 0));
    expect(created).toBe(1);
    streamer.update(0.016, new THREE.Vector3(0, 0, 0));
    expect(created).toBe(2);
  });
});
