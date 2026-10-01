import type { NextFunction, Request, Response } from 'express';

type Bucket = { startedAt: number; count: number };

export type FixedWindowLimiterOptions = {
  maxRequests: number;
  windowMs: number;
  now?: () => number;
};

export function createFixedWindowRateLimiter(options: FixedWindowLimiterOptions) {
  const maxRequests = Math.max(1, Math.floor(options.maxRequests));
  const windowMs = Math.max(1_000, Math.floor(options.windowMs));
  const now = options.now ?? Date.now;
  const buckets = new Map<string, Bucket>();

  return (request: Request, response: Response, next: NextFunction): void => {
    const key = request.ip || request.socket.remoteAddress || 'unknown';
    const time = now();
    const previous = buckets.get(key);
    const bucket = !previous || time - previous.startedAt >= windowMs
      ? { startedAt: time, count: 0 }
      : previous;
    bucket.count += 1;
    buckets.set(key, bucket);

    const remaining = Math.max(0, maxRequests - bucket.count);
    response.setHeader('RateLimit-Limit', String(maxRequests));
    response.setHeader('RateLimit-Remaining', String(remaining));
    response.setHeader('RateLimit-Reset', String(Math.ceil((bucket.startedAt + windowMs) / 1000)));

    if (bucket.count > maxRequests) {
      response.status(429).json({ error: 'Too many requests. Please slow down and try again shortly.' });
      return;
    }

    if (buckets.size > 10_000) {
      for (const [candidate, value] of buckets) {
        if (time - value.startedAt >= windowMs) buckets.delete(candidate);
      }
    }
    next();
  };
}
