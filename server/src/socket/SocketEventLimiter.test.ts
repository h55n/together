import { describe, expect, it } from 'vitest';
import { SocketEventLimiter } from './SocketEventLimiter';

describe('SocketEventLimiter', () => {
  it('allows the configured burst and rejects excess events until the window resets', () => {
    let now = 1_000;
    const limiter = new SocketEventLimiter(3, 1_000, () => now);
    expect(limiter.allow()).toBe(true);
    expect(limiter.allow()).toBe(true);
    expect(limiter.allow()).toBe(true);
    expect(limiter.allow()).toBe(false);
    now += 1_001;
    expect(limiter.allow()).toBe(true);
  });

  it('rejects invalid limiter configuration', () => {
    expect(() => new SocketEventLimiter(0, 1_000)).toThrow();
    expect(() => new SocketEventLimiter(1, 0)).toThrow();
  });
});
