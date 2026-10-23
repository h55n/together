import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { AmbientCrowdLod, type AuthoredCrowdSource } from './AmbientCrowdLod';
import type { AmbientWalker } from './ambient-walker';

function walker(x: number, z: number, overrides: Partial<AmbientWalker> = {}): AmbientWalker {
  return {
    position: new THREE.Vector3(x, 0, z),
    speed: 1,
    path: [{ x, z }, { x, z: z + 1 }],
    lengths: [0, 1],
    pathLength: 1,
    direction: 1,
    phase: 0,
    patrolDistance: 0,
    yaw: 0.3,
    stride: 0,
    swing: 0,
    dodge: 0,
    doorEnds: [],
    indoorsUntil: 0,
    lastDirection: 1,
    ...overrides,
  };
}

function crowdSource(failing: string[] = []): AuthoredCrowdSource {
  return {
    async tryLoadWithClips(id: string) {
      if (failing.includes(id)) return null;
      const group = new THREE.Group();
      group.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.0, 0.4)));
      return { group, clips: [new THREE.AnimationClip('idle', 3), new THREE.AnimationClip('walk', 1)] };
    },
  };
}

type SlotProbe = { walk: { time: number }; root: THREE.Object3D; active: string };

const PLAYER = new THREE.Vector3(0, 0, 0);

describe('the authored crowd proximity layer', () => {
  it('disables the whole layer when any crowd GLB is missing', async () => {
    const lod = new AmbientCrowdLod(crowdSource(['crowd_03']));
    await expect(lod.attach()).resolves.toBe(false);
    const change = lod.update(PLAYER, [walker(2, 0)], new Uint8Array([1]), 0.016);
    expect([...change.hidden]).toEqual([]);
    expect(lod.isAssigned(0)).toBe(false);
  });

  it('gives authored slots only to the nearest visible walkers inside the radius', async () => {
    const lod = new AmbientCrowdLod(crowdSource());
    await expect(lod.attach()).resolves.toBe(true);
    // Six walkers rank nearer than index 6; index 7 is close but hidden in this frame's flags.
    const walkers = [2, 3, 4, 5, 6, 7, 10, 5].map((distance) => walker(distance, 0));
    const flags = new Uint8Array([1, 1, 1, 1, 1, 1, 1, 0]);
    const change = lod.update(PLAYER, walkers, flags, 0.016);
    expect([...change.hidden].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(lod.isAssigned(6)).toBe(false);
    expect(lod.isAssigned(7)).toBe(false);
  });

  it('keeps walk cycles phase-locked to the shared stride', async () => {
    const lod = new AmbientCrowdLod(crowdSource());
    await lod.attach();
    const walkers = [walker(3, 0, { swing: 0.4, stride: Math.PI })];
    lod.update(PLAYER, walkers, new Uint8Array([1]), 0.016);
    const slots = (lod as unknown as { slots: Map<number, SlotProbe> }).slots;
    expect(Math.abs(slots.get(0)!.walk.time - 0.5)).toBeLessThan(0.001);
    expect(slots.get(0)!.active).toBe('walk');
  });

  it('releases walkers that leave the radius and reuses pooled clones', async () => {
    const lod = new AmbientCrowdLod(crowdSource());
    await lod.attach();
    const walkers = [walker(4, 0), walker(8, 0)];
    lod.update(PLAYER, walkers, new Uint8Array([1, 1]), 0.016);
    const slots = (lod as unknown as { slots: Map<number, SlotProbe> }).slots;
    const firstRoot = slots.get(0)!.root;
    walkers[0] = walker(40, 0);
    const released = lod.update(PLAYER, walkers, new Uint8Array([1, 1]), 0.016);
    expect([...released.shown]).toEqual([0]);
    expect(lod.isAssigned(0)).toBe(false);
    walkers[0] = walker(2, 0);
    const reassigned = lod.update(PLAYER, walkers, new Uint8Array([1, 1]), 0.016);
    expect([...reassigned.hidden]).toEqual([0]);
    const after = (lod as unknown as { slots: Map<number, SlotProbe> }).slots;
    // Nearest walkers win the slots again, and the pooled clone comes back rather than a new one.
    expect(after.get(0)!.root).toBe(firstRoot);
    lod.dispose();
    expect(lod.isAssigned(0)).toBe(false);
  });
});
