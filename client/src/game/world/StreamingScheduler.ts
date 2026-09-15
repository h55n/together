import type { ResidencyRing } from '@together/shared';

export type StreamingJob = {
  key: string;
  x: number;
  z: number;
  ring: Exclude<ResidencyRing, 'unloaded'>;
  priority: number;
};

export type StreamingSchedulerMetrics = { pendingJobs: number };

export class StreamingScheduler {
  private jobs: StreamingJob[] = [];

  reconcile(jobs: readonly StreamingJob[]): void {
    this.jobs = [...jobs].sort((left, right) => left.priority - right.priority || left.key.localeCompare(right.key));
  }

  takeFrameBudget(budgetMs: number, commit: (job: StreamingJob) => number): StreamingJob[] {
    const committed: StreamingJob[] = [];
    let elapsedMs = 0;
    while (this.jobs.length > 0 && elapsedMs < budgetMs) {
      const job = this.jobs.shift()!;
      const costMs = Math.max(0, commit(job));
      committed.push(job);
      elapsedMs += costMs;
    }
    return committed;
  }

  metrics(): StreamingSchedulerMetrics {
    return { pendingJobs: this.jobs.length };
  }
}
