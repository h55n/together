import { activityParticipantLimit, advanceActivityState, createActivityState, joinActivityState, type ActivityId } from '@together/shared';
import type { ActivitySessionRecord, GameRepository, HouseholdRecord } from '../db/GameRepository.js';

export class ActivityService {
  constructor(private readonly repository: GameRepository) {}

  async start(householdId: string, userId: string, activityId: ActivityId, idempotencyKey: string): Promise<ActivitySessionRecord> {
    if (idempotencyKey.length < 8) throw new Error('Invalid idempotency key');
    await this.authorize(householdId, userId);
    const existing = await this.repository.getActivitySessionByIdempotencyKey(idempotencyKey);
    if (existing) {
      if (existing.householdId !== householdId || existing.activityId !== activityId || !existing.state.participants.includes(userId)) {
        throw new Error('Idempotency key belongs to a different activity session scope');
      }
      return existing;
    }
    const now = new Date().toISOString();
    const session: ActivitySessionRecord = {
      id: crypto.randomUUID(), idempotencyKey, householdId, activityId,
      state: createActivityState(activityId, userId), createdAt: now, updatedAt: now,
    };
    await this.repository.saveActivitySession(session);
    return session;
  }

  async join(sessionId: string, userId: string): Promise<ActivitySessionRecord> {
    const session = await this.requireSession(sessionId);
    await this.authorize(session.householdId, userId);
    session.state = joinActivityState(session.state, userId, activityParticipantLimit(session.activityId)[1]);
    session.updatedAt = new Date().toISOString();
    await this.repository.saveActivitySession(session);
    return session;
  }

  async advance(sessionId: string, userId: string, stepId: string): Promise<ActivitySessionRecord> {
    const session = await this.requireSession(sessionId);
    await this.authorize(session.householdId, userId);
    if (!session.state.participants.includes(userId)) throw new Error('Join this activity before taking a turn');
    session.state = advanceActivityState(session.state, stepId);
    session.updatedAt = new Date().toISOString();
    await this.repository.saveActivitySession(session);
    return session;
  }

  async list(householdId: string, userId: string): Promise<ActivitySessionRecord[]> {
    await this.authorize(householdId, userId);
    return this.repository.listActivitySessions(householdId);
  }

  private async requireSession(id: string): Promise<ActivitySessionRecord> {
    const session = await this.repository.getActivitySession(id);
    if (!session) throw new Error('Activity session not found');
    return session;
  }

  private async authorize(householdId: string, userId: string): Promise<HouseholdRecord> {
    const household = await this.repository.getHousehold(householdId);
    if (!household) throw new Error('Household not found');
    if (!household.members.some((member) => member.userId === userId && member.membershipState === 'active')) throw new Error('User is not an active household member');
    return household;
  }
}
