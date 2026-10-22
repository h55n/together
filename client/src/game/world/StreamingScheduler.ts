import type { ResidencyRing } from '@together/shared';

export type StreamingJob = {
  key: string;
  x: number;
  z: number;
  ring: Exclude<ResidencyRing, 'unloaded'>;
  vegetationDetail?: 'near' | 'far';
  priority: number;
};

export type StreamingSchedulerMetrics = { pendingJobs: number };
export type StreamingStep = { costMs: number; complete: boolean };

export class StreamingScheduler {
  private jobs: StreamingJob[] = [];

  reconcile(jobs: readonly StreamingJob[]): void {
    this.jobs = [...jobs].sort((left, right) => left.priority - right.priority || left.key.localeCompare(right.key));
  }

  enqueue(jobs: readonly StreamingJob[]): void {
    const byKey = new Map(this.jobs.map((job) => [job.key, job]));
    for (const job of jobs) byKey.set(job.key, job);
    this.jobs = [...byKey.values()].sort((left, right) => left.priority - right.priority || left.key.localeCompare(right.key));
  }

  clear(): void {
    this.jobs = [];
  }

  takeFrameBudget(budgetMs: number, commit: (job: StreamingJob) => number | StreamingStep, maxJobs = Number.POSITIVE_INFINITY): StreamingJob[] {
    const committed: StreamingJob[] = [];
    let elapsedMs = 0;
    let steps = 0;
    while (this.jobs.length > 0 && elapsedMs < budgetMs && committed.length < maxJobs && steps++ < 1024) {
      const job = this.jobs[0]!;
      const result = commit(job);
      const costMs = Math.max(0, typeof result === 'number' ? result : result.costMs);
      if (typeof result === 'number' || result.complete) {
        this.jobs.shift();
        committed.push(job);
      }
      elapsedMs += costMs;
    }
    return committed;
  }

  metrics(): StreamingSchedulerMetrics {
    return { pendingJobs: this.jobs.length };
  }
}
