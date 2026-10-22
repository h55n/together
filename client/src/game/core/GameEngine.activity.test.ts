import { describe, expect, it, vi } from 'vitest';
import { activityActionSequence } from '@together/shared';
import { GameEngine } from '../GameEngine';
import type { WeatherState } from '../weather/weatherModel';
import { GameLoop } from './GameLoop';

function harness(initialMode = 'on_foot', weatherState: WeatherState = 'clear') {
  let mode = initialMode;
  const position = { x: 0, y: 0, z: 0 };
  const actions: string[] = [];
  const docks = vi.fn();
  const wait = vi.fn<() => Promise<boolean>>(async () => true);
  const cancel = vi.fn();
  const engine = Object.assign(Object.create(GameEngine.prototype), {
    disposed: false,
    player: {
      getTransportMode: () => mode,
      getPosition: () => position,
      setTransportMode: (next: string) => { mode = next; },
      beginMicroAction: (action: string) => { if (mode !== 'on_foot') return false; actions.push(action); return true; },
      waitForMicroActionCompletion: wait,
      cancelMicroAction: cancel,
    },
    weather: { state: weatherState },
    interactions: { setEnabled: vi.fn() },
    launchKayak: () => { mode = 'kayak'; },
    returnKayakToHut: docks,
  }) as GameEngine;
  return { engine, actions, docks, wait, cancel, position, mode: () => mode };
}

describe('transport activity transitions', () => {
  it('cancels its captured pickup immediately when the player ends before mounting completes', async () => {
    const h = harness(), abort = new AbortController();
    let release!: (completed: boolean) => void;
    const pickup = new Promise<boolean>(resolve => { release = resolve; });
    h.wait.mockReturnValue(pickup);
    h.cancel.mockImplementation(() => release(false));
    const outcome = h.engine.playTransportOuting('cycling', abort.signal).catch(error => error);
    try {
      h.engine.finishTransportOuting();
      await Promise.resolve(); await Promise.resolve();
      expect(h.cancel).toHaveBeenCalledOnce();
      expect(await outcome).toBeInstanceOf(Error);
      expect(h.mode()).toBe('on_foot');
    } finally { abort.abort(); release(false); await outcome; }
  });

  it('leaves replacement transport intact when the old outing detects a mode change', async () => {
    const h = harness('bicycle');
    const outcome = h.engine.playTransportOuting('cycling').catch(error => error);
    await Promise.resolve(); await Promise.resolve();
    const engine = h.engine as unknown as { player: { setTransportMode(mode: string): void }; sampleTransportOuting(dt: number): void };
    engine.player.setTransportMode('scooter');
    engine.sampleTransportOuting(1 / 60);
    expect(await outcome).toBeInstanceOf(Error);
    expect(h.mode()).toBe('scooter');
  });
  it('interrupts the owned return animation when focus leaves before physical completion', async () => {
    const h = harness('bicycle');
    let release!: (completed: boolean) => void;
    const action = new Promise<boolean>(resolve => { release = resolve; });
    h.wait.mockReturnValue(action);
    h.cancel.mockImplementation(() => release(false));
    const abort = new AbortController();
    const outcome = h.engine.playTransportOuting('cycling', abort.signal).catch(error => error);
    try {
      await Promise.resolve(); await Promise.resolve();
      h.engine.finishTransportOuting();
      await Promise.resolve(); await Promise.resolve();
      window.dispatchEvent(new Event('blur'));
      expect(h.cancel).toHaveBeenCalledOnce();
      expect(await outcome).toBeInstanceOf(Error);
    } finally { abort.abort(); release(false); await outcome; }
  });
  it('returns a synchronously mounted kayak when its start is immediately aborted', async () => {
    const h = harness(); const abort = new AbortController();
    const result = h.engine.playTransportOuting('kayak', abort.signal);
    abort.abort();
    await expect(result).rejects.toThrow();
    expect(h.mode()).toBe('on_foot'); expect(h.docks).toHaveBeenCalledOnce();
  });

  it('parks its owned bicycle when finish and abort occur before the continuation resumes', async () => {
    const h = harness('bicycle'); const abort = new AbortController();
    const result = h.engine.playTransportOuting('cycling', abort.signal);
    await Promise.resolve(); await Promise.resolve();
    h.engine.finishTransportOuting(); abort.abort();
    await expect(result).rejects.toThrow();
    expect(h.mode()).toBe('on_foot');
  });

  it.each([120, 144])('accepts physical bicycle steps through the actual %i Hz GameLoop', async hz => {
    const h = harness('bicycle');
    const result = h.engine.playTransportOuting('cycling');
    const outcome = result.catch(error => error);
    await Promise.resolve(); await Promise.resolve();
    const engine = h.engine as unknown as { sampleTransportOuting(dt: number): void; fixedUpdate(dt: number): void };
    Object.assign(h.engine, { camera: { yaw: 0 }, physics: { step: vi.fn() }, measureSystem: (_name: string, fn: () => void) => fn() });
    Object.assign((h.engine as unknown as { player: object }).player, { fixedUpdate: (dt: number) => { h.position.z += 5.4 * dt; } });
    const loop = new GameLoop(dt => engine.sampleTransportOuting(dt), dt => engine.fixedUpdate(dt));
    for (let frame = 0; frame <= hz; frame++) loop.frame(frame * 1000 / hz);
    h.engine.finishTransportOuting();
    expect(await outcome).toEqual({ underway: true });
    expect(h.mode()).toBe('on_foot');
  });
  it('does not mount after the owned pickup is dismissed and cancels that animation', async () => {
    const h = harness();
    let release!: (completed: boolean) => void;
    const pending = new Promise<boolean>(resolve => { release = resolve; });
    h.wait.mockReturnValue(pending);
    const abort = new AbortController();
    const result = h.engine.playActivityStep('cycling', activityActionSequence('cycling')[0]!, abort.signal);
    const rejection = expect(result).rejects.toThrow();
    abort.abort(); release(true);
    await rejection;
    expect(h.cancel).toHaveBeenCalledOnce();
    expect(h.mode()).toBe('on_foot');
  });

  it('does not cancel a newer animation when the old activity aborts', async () => {
    const h = harness();
    let release!: (completed: boolean) => void;
    const owned = new Promise<boolean>(resolve => { release = resolve; });
    h.wait.mockReturnValue(owned);
    const abort = new AbortController();
    const result = h.engine.playActivityStep('cycling', activityActionSequence('cycling')[0]!, abort.signal);
    const rejection = expect(result).rejects.toThrow();
    h.wait.mockReturnValue(new Promise<boolean>(() => undefined));
    abort.abort(); release(false);
    await rejection;
    expect(h.cancel).not.toHaveBeenCalled();
  });
  it('mounts, rides and parks a bicycle without rejecting its final physical action', async () => {
    const h = harness();
    for (const step of activityActionSequence('cycling')) await h.engine.playActivityStep('cycling', step);
    expect(h.mode()).toBe('on_foot');
    expect(h.actions).toContain('place');
  });
  it('checks safety and launches on foot, paddles mounted, then docks before returning the kayak', async () => {
    const h = harness();
    const modes: string[] = [];
    for (const step of activityActionSequence('kayak')) {
      await h.engine.playActivityStep('kayak', step);
      modes.push(h.mode());
    }
    expect(modes).toEqual(['on_foot', 'on_foot', 'kayak', 'on_foot']);
    expect(h.actions).toEqual(['point', 'carry', 'place']);
    expect(h.docks).toHaveBeenCalledOnce();
  });
  it('recovers an old mounted kayak session before its safety step', async () => {
    const h = harness('kayak');
    await h.engine.playActivityStep('kayak', activityActionSequence('kayak')[0]!);
    expect(h.mode()).toBe('on_foot');
    expect(h.docks).toHaveBeenCalledOnce();
    expect(h.actions).toEqual(['point']);
  });
  it('remounts when a saved cycling session resumes at its ride step after rejoining', async () => {
    const h = harness();
    await h.engine.playActivityStep('cycling', activityActionSequence('cycling')[1]!);
    expect(h.mode()).toBe('bicycle');
    expect(h.actions).toEqual(['pick_up']);
    await h.engine.playActivityStep('cycling', activityActionSequence('cycling')[2]!);
    expect(h.mode()).toBe('on_foot');
  });
  it('rejects a paddle launch in heavy weather without mounting', async () => {
    const h = harness('on_foot', 'monsoon_rain');
    await expect(h.engine.playActivityStep('kayak', activityActionSequence('kayak')[2]!)).rejects.toThrow(/weather/i);
    expect(h.mode()).toBe('on_foot');
  });
});
