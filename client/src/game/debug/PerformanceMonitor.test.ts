import { describe, expect, it } from 'vitest';
import { PerformanceMonitor } from './PerformanceMonitor';

describe('PerformanceMonitor', () => {
  it('records p95, p99, and hitch thresholds from frame samples', () => {
    const monitor = new PerformanceMonitor();
    [10, 16, 35, 55, 18].forEach((milliseconds) => monitor.recordFrame(milliseconds));
    expect(monitor.read()).toMatchObject({ framesOver33ms: 2, framesOver50ms: 1, p95FrameMs: 55, p99FrameMs: 55 });
  });
});
