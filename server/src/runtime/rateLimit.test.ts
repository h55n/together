import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { createFixedWindowRateLimiter } from './rateLimit';

function responseHarness() {
  let status = 200;
  let body: unknown;
  const headers = new Map<string, string>();
  const response = {
    setHeader: (name: string, value: string) => { headers.set(name, value); },
    status: (value: number) => { status = value; return response; },
    json: (value: unknown) => { body = value; return response; },
  } as unknown as Response;
  return { response, getStatus: () => status, getBody: () => body, headers };
}

describe('fixed-window API limiter', () => {
  it('permits the configured budget and rejects the next request until the window resets', () => {
    let now = 1_000;
    const limiter = createFixedWindowRateLimiter({ maxRequests: 2, windowMs: 60_000, now: () => now });
    const request = { ip: '127.0.0.1', socket: {} } as Request;

    for (let index = 0; index < 2; index += 1) {
      const { response } = responseHarness();
      const next = vi.fn() as unknown as NextFunction;
      limiter(request, response, next);
      expect(next).toHaveBeenCalledTimes(1);
    }

    const blocked = responseHarness();
    const blockedNext = vi.fn() as unknown as NextFunction;
    limiter(request, blocked.response, blockedNext);
    expect(blocked.getStatus()).toBe(429);
    expect(blockedNext).not.toHaveBeenCalled();

    now += 60_001;
    const reset = responseHarness();
    const resetNext = vi.fn() as unknown as NextFunction;
    limiter(request, reset.response, resetNext);
    expect(resetNext).toHaveBeenCalledTimes(1);
  });
});
