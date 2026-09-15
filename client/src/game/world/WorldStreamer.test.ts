import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
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

  it('does not force another residency scan when an unchanged visual radius is reapplied', () => {
    const streamer = new WorldStreamer(() => new THREE.Group());
    const queueResidency = vi.spyOn(streamer as unknown as { queueResidency: (position: THREE.Vector3) => void }, 'queueResidency');
    streamer.update(0.31, new THREE.Vector3(0, 0, 0));
    streamer.setResidencyRadiusChunks(5);
    streamer.update(0.016, new THREE.Vector3(0, 0, 0));

    expect(queueResidency).toHaveBeenCalledTimes(1);
  });
});
