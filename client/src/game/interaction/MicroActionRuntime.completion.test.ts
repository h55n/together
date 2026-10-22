import { describe, expect, it } from 'vitest';
import type { MicroActionStep } from '@together/shared';
import type { PlayerController } from '../player/PlayerController';
import { MicroActionRuntime } from './MicroActionRuntime';

const sequence: readonly MicroActionStep[] = [
  { id: 'take_plate', primitive: 'pick_up', persistence: 'object', replicate: true },
  { id: 'tap_on', primitive: 'open', objectState: 'tap_on', persistence: 'object', replicate: true },
];
function harness() {
  let settle!: (completed: boolean) => void;
  let completion = Promise.resolve(false);
  let accepts = true;
  const actions: string[] = [];
  const locks: boolean[] = [];
  const published: string[] = [];
  let finished = 0;
  const player = {
    setInteractionLock: (locked: boolean) => locks.push(locked),
    beginMicroAction: (action: string) => {
      if (!accepts) return false;
      actions.push(action);
      completion = new Promise<boolean>(resolve => { settle = resolve; });
      return true;
    },
    waitForMicroActionCompletion: () => completion,
    cancelMicroAction: () => settle(false),
  } as unknown as PlayerController;
  const runtime = new MicroActionRuntime(undefined, step => published.push(step.id), undefined, () => { finished++; });
  const start = () => runtime.start({ id: 'dishes', label: 'Wash dishes', sequence }, player);
  const complete = async (success = true) => { settle(success); await Promise.resolve(); runtime.update(1, false, player); };
  return { runtime, player, actions, locks, published, start, complete, finished: () => finished, reject: () => { accepts = false; } };
}

describe('physical domestic sequence', () => {
  it('publishes each step only after its actual animation completes', async () => {
    const h = harness(); h.start();
    expect(h.actions).toEqual(['pick_up']);
    expect(h.published).toEqual([]);
    h.runtime.update(10, true, h.player);
    expect(h.published).toEqual([]);
    expect(h.actions).toHaveLength(1);
    await h.complete();
    expect(h.published).toEqual(['take_plate']);
    h.runtime.update(1, true, h.player);
    await h.complete();
    expect(h.published).toEqual(['take_plate', 'tap_on']);
    expect(h.runtime.isActive()).toBe(false);
    expect(h.finished()).toBe(1);
  });
  it('does not persist an interrupted physical step', async () => {
    const h = harness(); h.start(); await h.complete(false);
    expect(h.published).toEqual([]);
    expect(h.runtime.isActive()).toBe(false);
    expect(h.locks.at(-1)).toBe(false);
  });
  it('unlocks and exits when the player rejects an action', () => {
    const h = harness(); h.reject(); h.start();
    expect(h.published).toEqual([]);
    expect(h.runtime.isActive()).toBe(false);
    expect(h.locks).toEqual([true, false]);
  });
  it('ignores late completion after cancellation and allows a new sequence', async () => {
    const h = harness(); h.start(); h.runtime.cancel(h.player); await h.complete();
    expect(h.published).toEqual([]);
    h.start(); await h.complete();
    expect(h.published).toEqual(['take_plate']);
  });
});
