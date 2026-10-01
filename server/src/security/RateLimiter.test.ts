import { describe, expect, it } from 'vitest';
import { FixedWindowRateLimiter } from './RateLimiter.js';

describe('FixedWindowRateLimiter', () => {
  it('blocks requests after the configured budget and resets after the window', () => {
    const limiter = new FixedWindowRateLimiter(2, 1_000);
    expect(limiter.allow('user', 0)).toBe(true);
    expect(limiter.allow('user', 100)).toBe(true);
    expect(limiter.allow('user', 200)).toBe(false);
    expect(limiter.allow('user', 1_001)).toBe(true);
  });

  it('keeps independent callers isolated', () => {
    const limiter = new FixedWindowRateLimiter(1, 1_000);
    expect(limiter.allow('a', 0)).toBe(true);
    expect(limiter.allow('a', 1)).toBe(false);
    expect(limiter.allow('b', 1)).toBe(true);
  });
});
