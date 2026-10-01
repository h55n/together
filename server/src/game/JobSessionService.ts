import { jobById, type JobId } from '@together/shared';
import type { GameRepository, JobSessionRecord } from '../db/GameRepository.js';
import type { EconomyService, EconomySnapshot } from './EconomyService.js';

export type JobSessionView = JobSessionRecord & { nextAction: string | null; totalActions: number };

export class JobSessionService {
  constructor(private readonly repository: GameRepository, private readonly economy: EconomyService) {}

  async start(householdId: string, userId: string, jobId: JobId, idempotencyKey: string): Promise<JobSessionView> {
    if (idempotencyKey.length < 8) throw new Error('Invalid idempotency key');
    await this.authorize(householdId, userId);
    const retry = await this.repository.getJobSessionByStartKey(idempotencyKey);
    if (retry) {
      if (retry.householdId !== householdId || retry.userId !== userId || retry.jobId !== jobId) throw new Error('Idempotency key belongs to a different job session');
      return this.view(retry);
    }
    const job = jobById(jobId);
    if (!job) throw new Error('Unknown job');
    const now = new Date().toISOString();
    const session: JobSessionRecord = {
      id: crypto.randomUUID(), startIdempotencyKey: idempotencyKey, householdId, userId, jobId,
      state: 'active', completedActions: [], mistakes: 0, startedAt: now, updatedAt: now,
    };
    await this.repository.saveJobSession(session);
    return this.view(session);
  }

  async advance(sessionId: string, userId: string, action: string): Promise<JobSessionView> {
    const session = await this.requireOwned(sessionId, userId);
    if (session.state !== 'active') return this.view(session);
    const job = jobById(session.jobId)!;
    const expected = job.actions[session.completedActions.length];
    if (!expected) return this.view(session);
    if (action !== expected) throw new Error(`Expected job action ${expected}`);
    session.completedActions.push(action);
    session.updatedAt = new Date().toISOString();
    await this.repository.saveJobSession(session);
    return this.view(session);
  }

  async complete(sessionId: string, userId: string, idempotencyKey: string): Promise<{ session: JobSessionView; economy: EconomySnapshot }> {
    const session = await this.requireOwned(sessionId, userId);
    if (session.state === 'complete') {
      if (session.completionIdempotencyKey !== idempotencyKey) throw new Error('Job session is already complete and already paid');
      const economy = await this.economy.completeJobShift(session.householdId, userId, session.jobId, session.mistakes === 0 ? 'standard' : 'early', idempotencyKey, session.id);
      return { session: this.view(session), economy };
    }
    const job = jobById(session.jobId)!;
    if (session.completedActions.length < job.actions.length) throw new Error('Job session is not complete');
    const quality = session.mistakes === 0 ? 'standard' : 'early';
    const completedSession: JobSessionRecord = {
      ...session,
      state: 'complete',
      completionIdempotencyKey: idempotencyKey,
      updatedAt: new Date().toISOString(),
    };
    const economy = await this.economy.completeJobShift(
      session.householdId,
      userId,
      session.jobId,
      quality,
      idempotencyKey,
      session.id,
      completedSession,
    );
    return { session: this.view(completedSession), economy };
  }

  async list(householdId: string, userId: string): Promise<JobSessionView[]> {
    await this.authorize(householdId, userId);
    return (await this.repository.listJobSessions(householdId, userId)).map((session) => this.view(session));
  }

  private view(session: JobSessionRecord): JobSessionView {
    const job = jobById(session.jobId)!;
    return { ...session, nextAction: job.actions[session.completedActions.length] ?? null, totalActions: job.actions.length };
  }

  private async requireOwned(sessionId: string, userId: string): Promise<JobSessionRecord> {
    const session = await this.repository.getJobSession(sessionId);
    if (!session) throw new Error('Job session not found');
    if (session.userId !== userId) throw new Error('Job session does not belong to this player');
    await this.authorize(session.householdId, userId);
    return session;
  }

  private async authorize(householdId: string, userId: string): Promise<void> {
    const household = await this.repository.getHousehold(householdId);
    if (!household) throw new Error('Household not found');
    if (!household.members.some((member) => member.userId === userId && member.membershipState === 'active')) throw new Error('User is not an active household member');
  }
}
