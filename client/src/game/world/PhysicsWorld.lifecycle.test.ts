import { describe, expect, it, vi } from 'vitest';
import { GameEngine } from '../GameEngine';
import { PhysicsWorld } from '../physics/PhysicsWorld';

describe('physics lifecycle', () => {
  it('frees the Rapier world exactly once when PhysicsWorld is disposed', () => {
    const free = vi.fn();
    const physics = Object.create(PhysicsWorld.prototype) as PhysicsWorld;
    Object.defineProperty(physics, 'world', { value: { free } });

    const dispose = (physics as unknown as { dispose: () => void }).dispose;
    dispose.call(physics);
    dispose.call(physics);

    expect(free).toHaveBeenCalledTimes(1);
  });

  it('releases the physics world after engine-owned physics handles are disposed', () => {
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const order: string[] = [];
    const worldStreamer = { dispose: vi.fn(() => order.push('streamer')) };
    const homeDecor = { dispose: vi.fn(() => order.push('home-decor')) };
    const player = { dispose: vi.fn(() => order.push('player')) };
    const physics = { dispose: vi.fn(() => order.push('physics')) };
    const disposable = () => ({ dispose: vi.fn() });

    const engine = Object.assign(Object.create(GameEngine.prototype), {
      disposed: false,
      animationFrame: 17,
      onResize: () => undefined,
      input: { disable: vi.fn() },
      debug: disposable(),
      audio: disposable(),
      weather: disposable(),
      npcs: disposable(),
      namedNpcs: disposable(),
      voice: null,
      network: null,
      remotePlayers: disposable(),
      interactions: disposable(),
      worldStreamer,
      homeDecor,
      player,
      avatar: disposable(),
      materials: disposable(),
      renderer: disposable(),
      physics,
    }) as GameEngine;

    engine.dispose();
    engine.dispose();

    expect(physics.dispose).toHaveBeenCalledTimes(1);
    expect(order.indexOf('physics')).toBeGreaterThan(order.indexOf('streamer'));
    expect(order.indexOf('physics')).toBeGreaterThan(order.indexOf('home-decor'));
    expect(order.indexOf('physics')).toBeGreaterThan(order.indexOf('player'));
  });
});
