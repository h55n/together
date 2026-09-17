import type { NextFunction, Request, Response } from 'express';

type Bucket = { startedAt: number; count: number };

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
  ) {
    if (!Number.isInteger(maxRequests) || maxRequests < 1) throw new Error('maxRequests must be a positive integer');
    if (!Number.isFinite(windowMs) || windowMs < 1) throw new Error('windowMs must be positive');
  }

  allow(key: string, nowMs = Date.now()): boolean {
    const current = this.buckets.get(key);
    if (!current || nowMs - current.startedAt >= this.windowMs) {
      this.buckets.set(key, { startedAt: nowMs, count: 1 });
      this.prune(nowMs);
      return true;
    }
    if (current.count >= this.maxRequests) return false;
    current.count += 1;
    return true;
  }

  private prune(nowMs: number): void {
    if (this.buckets.size < 2_000) return;
    for (const [key, bucket] of this.buckets) {
      if (nowMs - bucket.startedAt >= this.windowMs) this.buckets.delete(key);
    }
  }
}

export function rateLimitMiddleware(options: {
  limiter: FixedWindowRateLimiter;
  scope: string;
  key?: (request: Request) => string;
}) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const identity = (request as Request & { identity?: { userId?: string } }).identity?.userId;
    const source = options.key?.(request) ?? identity ?? request.ip ?? request.socket.remoteAddress ?? 'unknown';
    if (options.limiter.allow(`${options.scope}:${source}`)) {
      next();
      return;
    }
    response.setHeader('Retry-After', '60');
    response.status(429).json({ error: 'Too many requests. Please try again shortly.' });
  };
}
