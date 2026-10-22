import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { WorldStreamer } from './WorldStreamer';
import { PerformanceMonitor } from '../debug/PerformanceMonitor';

describe('WorldStreamer', () => {
  it('reduces neighbouring vegetation detail while retaining the occupied near chunk and active support ring', () => {
    const created: Array<{ ring: string; detail: string | undefined }> = [];
    const streamer = new WorldStreamer((_x, _z, ring, detail) => { created.push({ ring, detail }); return new THREE.Group(); });
    streamer.setVegetationScale(0.82);
    streamer.prepareInitial(new THREE.Vector3(), 100);
    const active = created.filter(chunk => chunk.ring === 'active');
    expect(active).toHaveLength(25);
    expect(active.filter(chunk => chunk.detail === 'near')).toHaveLength(1);
    streamer.dispose();
  });
  it('keeps resident collision during partial promotion and activates replacement before retiring support', () => {
    let clock = 0;
    let serial = 0;
    const live = new Set<number>();
    const events: string[] = [];
    const cancelled = vi.fn();
    const group = () => {
      const root = new THREE.Group();
      const id = ++serial;
      root.userData.activateChunk = () => { live.add(id); events.push(`activate:${id}`); };
      root.userData.disposeChunk = () => { live.delete(id); events.push(`release:${id}`); };
      root.userData.id = id;
      return root;
    };
    const factory = Object.assign(() => group(), { prepare: function* () {
      let completed = false;
      try {
        for (let i = 0; i < 5; i++) { clock += 5; yield; }
        completed = true;
        return group();
      } finally { if (!completed) cancelled(); }
    } });
    const timer = vi.spyOn(performance, 'now').mockImplementation(() => clock);
    const streamer = new WorldStreamer(factory);
    try {
      streamer.prepareInitial(new THREE.Vector3(), 25);
      const resident = streamer.root.getObjectByName('chunk:2:0:active')!;
      const previous = resident.userData.id as number;
      streamer.update(0.31, new THREE.Vector3(256, 0, 0));
      expect(live.has(previous)).toBe(true);
      streamer.refreshNow(new THREE.Vector3(128, 0, 0));
      expect(cancelled).toHaveBeenCalledTimes(1);
      expect(live.has(previous)).toBe(true);
      for (let i = 0; i < 5 && live.has(previous); i++) streamer.update(0.016, new THREE.Vector3(128, 0, 0));
      expect(live.has(previous)).toBe(false);
      const replacement = streamer.root.getObjectByName('chunk:2:0:active')!;
      expect(live.has(replacement.userData.id as number)).toBe(true);
      expect(events.indexOf(`activate:${replacement.userData.id}`)).toBeLessThan(events.indexOf(`release:${previous}`));
    } finally { streamer.dispose(); timer.mockRestore(); }
  });

  it('disposes a failed replacement activation while preserving the existing resident', () => {
    const disposeFailed = vi.fn();
    const factory = Object.assign(() => new THREE.Group(), { prepare: function* () {
      yield;
      const root = new THREE.Group();
      root.userData.activateChunk = () => { throw new Error('Collider creation failed'); };
      root.userData.disposeChunk = disposeFailed;
      return root;
    } });
    const streamer = new WorldStreamer(factory);
    try {
      streamer.prepareInitial(new THREE.Vector3(), 25);
      const previous = streamer.root.getObjectByName('chunk:2:0:active');
      expect(() => streamer.update(0.31, new THREE.Vector3(256, 0, 0))).toThrow('Collider creation failed');
      expect(disposeFailed).toHaveBeenCalledTimes(1);
      expect(streamer.root.getObjectByName('chunk:2:0:active')).toBe(previous);
    } finally { streamer.dispose(); }
  });
  it('advances staged construction across frames and cancels obsolete partial work', () => {
    let clock = 0;
    const cancelled = vi.fn();
    const direct = vi.fn(() => new THREE.Group());
    const factory = Object.assign(direct, { prepare: function* () {
      try {
        for (let step = 0; step < 5; step += 1) { clock += 5; yield; }
        return new THREE.Group();
      } finally { cancelled(); }
    } });
    const timer = vi.spyOn(performance, 'now').mockImplementation(() => clock);
    const streamer = new WorldStreamer(factory);
    try {
      streamer.update(0.31, new THREE.Vector3(-384, 0, -384));
      expect(direct).not.toHaveBeenCalled();
      expect(streamer.root.children).toHaveLength(0);
      expect(clock).toBe(10);
      streamer.update(0.31, new THREE.Vector3(384, 0, 384));
      expect(cancelled).toHaveBeenCalledTimes(1);
      expect(streamer.root.children).toHaveLength(0);
      streamer.dispose();
      expect(cancelled).toHaveBeenCalledTimes(2);
    } finally { streamer.dispose(); timer.mockRestore(); }
  });
  it('keeps all active collision chunks but reserves dense foliage for nearby chunks and promotes it on arrival', () => {
    const created: Array<{ x: number; z: number; ring: string; detail: string | undefined }> = [];
    const streamer = new WorldStreamer((x, z, ring, detail) => {
      created.push({ x, z, ring, detail }); return new THREE.Group();
    });
    for (let i = 0; i < 150; i += 1) streamer.update(0.016, new THREE.Vector3());
    const active = created.filter((chunk) => chunk.ring === 'active');
    expect(active).toHaveLength(25);
    expect(active.filter((chunk) => chunk.detail === 'near')).toHaveLength(9);
    expect(active.find((chunk) => chunk.x === 2 && chunk.z === 0)?.detail).toBe('far');
    streamer.refreshNow(new THREE.Vector3(256, 0, 0));
    expect([...created].reverse().find((chunk) => chunk.x === 2 && chunk.z === 0)?.detail).toBe('near');
    streamer.dispose();
  });
  it('cancels obsolete queued chunks and prioritizes the new occupied chunk during movement', () => {
    const created: Array<[number, number]> = [];
    const streamer = new WorldStreamer((x, z) => { created.push([x, z]); return new THREE.Group(); });
    streamer.update(0.31, new THREE.Vector3(-384, 0, -384));
    streamer.update(0.31, new THREE.Vector3(384, 0, 384));
    expect(created.at(-1)).toEqual([3, 3]);
    for (let i = 0; i < 8; i += 1) streamer.update(0.016, new THREE.Vector3(384, 0, 384));
    expect(created.slice(1).every(([x, z]) => x >= 1 && z >= 1)).toBe(true);
    streamer.dispose();
  });

  it('spreads retired geometry disposal over frames instead of disposing the entire departed district at once', () => {
    const disposed = vi.fn();
    const streamer = new WorldStreamer(() => {
      const group = new THREE.Group();
      const geometry = new THREE.BoxGeometry(); geometry.addEventListener('dispose', disposed);
      group.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial())); return group;
    });
    for (let i = 0; i < 150; i += 1) streamer.update(0.016, new THREE.Vector3());
    streamer.update(0.31, new THREE.Vector3(10000, 0, 10000));
    expect(disposed).toHaveBeenCalledTimes(1);
    expect(streamer.root.children).toHaveLength(0);
    streamer.update(0.016, new THREE.Vector3(10000, 0, 10000));
    expect(disposed).toHaveBeenCalledTimes(2);
    streamer.dispose();
    expect(disposed.mock.calls.length).toBeGreaterThan(20);
  });
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
