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
    while (this.jobs.length > 0) {
      const job = this.jobs[0]!;
      const costMs = Math.max(0, commit(job));
      if (committed.length > 0 && elapsedMs + costMs > budgetMs) break;
      this.jobs.shift();
      committed.push(job);
      elapsedMs += costMs;
    }
    return committed;
  }

  metrics(): StreamingSchedulerMetrics {
    return { pendingJobs: this.jobs.length };
  }
}
