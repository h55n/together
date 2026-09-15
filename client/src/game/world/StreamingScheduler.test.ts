import { describe, expect, it } from 'vitest';
import { StreamingScheduler } from './StreamingScheduler';

describe('StreamingScheduler', () => {
  it('commits the current chunk before distant horizon work within the frame budget', () => {
    const scheduler = new StreamingScheduler();
    scheduler.reconcile([
      { key: '2:0', x: 2, z: 0, ring: 'horizon', priority: 30 },
      { key: '0:0', x: 0, z: 0, ring: 'active', priority: 0 },
      { key: '1:0', x: 1, z: 0, ring: 'active', priority: 10 },
    ]);
    const committed = scheduler.takeFrameBudget(2, () => 1);
    expect(committed.map((job) => job.key)).toEqual(['0:0', '1:0']);
    expect(scheduler.metrics().pendingJobs).toBe(1);
  });

  it('does not start another job after a commit consumes the frame budget', () => {
    const scheduler = new StreamingScheduler();
    scheduler.reconcile([
      { key: '0:0', x: 0, z: 0, ring: 'active', priority: 0 },
      { key: '1:0', x: 1, z: 0, ring: 'active', priority: 1 },
    ]);
    let calls = 0;
    expect(scheduler.takeFrameBudget(2, () => { calls += 1; return 3; }).map((job) => job.key)).toEqual(['0:0']);
    expect(calls).toBe(1);
    expect(scheduler.metrics().pendingJobs).toBe(1);
  });
});
