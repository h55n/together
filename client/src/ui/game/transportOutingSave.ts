import type { ActivitySessionView } from './ActivityPanel';
import { mergeActivitySnapshot } from './activitySnapshot';

/** Owns save retries after equipment return has physically completed once. */
export class TransportOutingSave {
  private pending: Promise<ActivitySessionView> | null = null;
  constructor(private accepted: ActivitySessionView, private readonly underway: boolean) {}

  persist(saveStep: (stepId: string) => Promise<ActivitySessionView>, readSession: () => Promise<ActivitySessionView | null>, signal?: AbortSignal): Promise<ActivitySessionView> {
    if (this.pending) return this.pending;
    const operation = this.persistOrdered(saveStep, readSession, signal);
    this.pending = operation;
    void operation.finally(() => { if (this.pending === operation) this.pending = null; }).catch(() => undefined);
    return operation;
  }

  private async persistOrdered(saveStep: (stepId: string) => Promise<ActivitySessionView>, readSession: () => Promise<ActivitySessionView | null>, signal?: AbortSignal): Promise<ActivitySessionView> {
    if (!this.underway) return this.accepted;
    const steps = this.accepted.activityId === 'cycling' ? ['ride_route', 'park_cycle']
      : this.accepted.activityId === 'kayak' ? ['paddle', 'return']
        : this.accepted.activityId === 'scooter_ride' ? ['ride', 'park_scooter'] : null;
    if (!steps) throw new Error('This activity is not a transport outing');
    for (const step of steps) {
      signal?.throwIfAborted();
      if (this.accepted.state.completedStepIds.includes(step)) continue;
      try {
        const saved = await saveStep(step);
        if (saved.id !== this.accepted.id) throw new Error('Outing reply belongs to another activity');
        this.accepted = mergeActivitySnapshot(this.accepted, saved);
        if (!this.accepted.state.completedStepIds.includes(step)) throw new Error('Outing step was not confirmed');
      } catch (cause) {
        let current: ActivitySessionView | null = null;
        try { current = await readSession(); } catch { /* Preserve the original failure for retry. */ }
        if (current?.id === this.accepted.id) this.accepted = mergeActivitySnapshot(this.accepted, current);
        if (!this.accepted.state.completedStepIds.includes(step)) throw cause;
      }
      // Preserve a committed result even if cancellation followed the write;
      // the view generation decides whether it can be presented to the user.
      signal?.throwIfAborted();
    }
    return this.accepted;
  }
}
