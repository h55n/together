import { describe, expect, it } from 'vitest';
import { TransportOutingRuntime } from './TransportOutingRuntime';

function frame(x: number, overrides: Partial<Parameters<TransportOutingRuntime['sample']>[0]> = {}) {
  return { position: { x, z: -360 }, mode: 'kayak', deltaSeconds: 1 / 60, enabled: true, safeWeather: true, ...overrides };
}
const outing = () => new TransportOutingRuntime('kayak', { x: 135, z: -360 });

describe('physical outing evidence and ownership', () => {
  it.each(['stationary', 'blocked'])('does not complete a %s outing', () => {
    const travel = outing();
    for (let tick = 0; tick < 600; tick++) travel.sample(frame(135));
    expect(travel.finish()?.underway).toBe(false);
  });
  it('waits for actual departure and the player finish choice, with no timer target', () => {
    const travel = outing();
    for (let tick = 1; tick <= 12; tick++) travel.sample(frame(135 + tick * 0.04));
    for (let tick = 0; tick < 600; tick++) travel.sample(frame(135.48));
    expect(travel.finish()).toEqual({ underway: true, kind: 'kayak' });
    expect(travel.finish()).toBeNull();
  });
  it('rejects an impossible jump rather than treating a teleport as travel', () => {
    const travel = outing(); travel.sample(frame(200));
    expect(travel.finish()).toBeNull();
  });
  it('does not count movement across a suspended frame or the next tiny step', () => {
    const travel = outing(); travel.sample(frame(140, { deltaSeconds: 8 }));
    travel.sample(frame(140.02));
    expect(travel.finish()?.underway).toBe(false);
  });
  it.each(['scooter', 'on_foot'])('cancels when transport changes to %s', mode => {
    const travel = outing(); travel.sample(frame(135, { mode }));
    expect(travel.finish()).toBeNull();
  });
  it('waits for the initial nonmodal input transition, then cancels a later menu', () => {
    const travel = outing(); travel.sample(frame(135, { enabled: false }));
    travel.sample(frame(135.04)); travel.sample(frame(135.04, { enabled: false }));
    expect(travel.finish()).toBeNull();
  });
  it('cannot finish after disposal or unsafe kayak weather', () => {
    const disposed = outing(); disposed.dispose(); expect(disposed.finish()).toBeNull();
    const unsafe = outing(); unsafe.sample(frame(135, { safeWeather: false })); expect(unsafe.finish()).toBeNull();
  });
  it.each(['transport_changed', 'unsafe_weather', 'menu', 'relocated', 'disposed'] as const)('settles owned completion automatically after %s without an end click', async reason => {
    const owned = outing();
    if (reason === 'menu') { owned.sample(frame(135)); owned.sample(frame(135, { enabled: false })); }
    else if (reason === 'transport_changed') owned.sample(frame(135, { mode: 'on_foot' }));
    else if (reason === 'unsafe_weather') owned.sample(frame(135, { safeWeather: false }));
    else if (reason === 'relocated') owned.sample(frame(200));
    else owned.dispose();
    expect(owned.snapshot()).toEqual({ state: 'cancelled', reason });
    await expect(owned.completion).resolves.toEqual({ state: 'cancelled', reason });
  });
  it('settles the old owner and leaves a replacement outing active', async () => {
    const old = outing(), replacement = outing();
    old.sample(frame(135, { mode: 'on_foot' }));
    await expect(old.completion).resolves.toEqual({ state: 'cancelled', reason: 'transport_changed' });
    expect(replacement.snapshot()).toEqual({ state: 'active', underway: false });
    replacement.dispose();
  });
});
