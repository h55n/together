import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { WorldStreamer } from './WorldStreamer';
import { PerformanceMonitor } from '../debug/PerformanceMonitor';

describe('WorldStreamer', () => {
  it('prepares only a bounded set of nearest active chunks before gameplay starts', () => {
    const created: Array<{ x: number; z: number; ring: string }> = [];
    const streamer = new WorldStreamer((x, z, ring) => {
      created.push({ x, z, ring });
      return new THREE.Group();
    });

    streamer.prepareInitial(new THREE.Vector3(0, 0, 0), 5);

    expect(created).toHaveLength(5);
    expect(created[0]).toEqual({ x: 0, z: 0, ring: 'active' });
    expect(created.every((entry) => entry.ring === 'active')).toBe(true);
    expect(streamer.pendingJobs()).toBeGreaterThan(0);
  });

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

  it('records residency-generation time separately from the chunk commit', () => {
    const monitor = new PerformanceMonitor();
    const streamer = new WorldStreamer(() => new THREE.Group(), monitor);
    streamer.update(0.31, new THREE.Vector3(0, 0, 0));

    expect(monitor.read().streamingGenerationMs).toBeGreaterThan(0);
  });

  it('refreshes the destination active ring immediately after a teleport and drops stale queued work', () => {
    const created: Array<{ x: number; z: number; ring: string }> = [];
    const streamer = new WorldStreamer((x, z, ring) => {
      created.push({ x, z, ring });
      return new THREE.Group();
    });
    streamer.update(0.31, new THREE.Vector3(0, 0, 0));

    const refreshNow = (streamer as unknown as { refreshNow?: (position: THREE.Vector3) => void }).refreshNow;
    expect(refreshNow).toBeTypeOf('function');

    const destination = new THREE.Vector3(384, 0, 384);
    refreshNow?.call(streamer, destination);
    expect(created.at(-1)).toEqual({ x: 3, z: 3, ring: 'active' });

    streamer.update(0.016, destination);
    const next = created.at(-1);
    expect(next).toBeDefined();
    expect(Math.max(Math.abs((next?.x ?? 0) - 3), Math.abs((next?.z ?? 0) - 3))).toBeLessThanOrEqual(2);
  });
});
