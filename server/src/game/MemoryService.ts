import type { GameRepository, HouseholdRecord, MemoryRecord } from '../db/GameRepository.js';

export type CreateMemoryInput = {
  idempotencyKey: string;
  type: MemoryRecord['type'];
  screenshotPath: string;
  caption: string;
  locationId: string;
  weather: string;
  participants: string[];
  eventId?: string;
  metadata?: Record<string, unknown>;
};

export class MemoryService {
  constructor(private readonly repository: GameRepository) {}

  async create(householdId: string, userId: string, input: CreateMemoryInput): Promise<MemoryRecord> {
    const household = await this.authorize(householdId, userId);
    if (!input.idempotencyKey || input.idempotencyKey.length < 8) throw new Error('Invalid idempotency key');
    const existing = await this.repository.getMemoryByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      if (existing.householdId !== householdId) throw new Error('Memory idempotency key belongs to another household');
      return existing;
    }
    if (!input.screenshotPath || input.screenshotPath.length > 500) throw new Error('Invalid screenshot path');
    if (!input.caption.trim() || input.caption.length > 240) throw new Error('Invalid memory caption');
    if (!input.locationId || input.locationId.length > 120) throw new Error('Invalid memory location');
    if (input.participants.length > 6) throw new Error('Too many memory participants');
    const participants = [...new Set(input.participants)];
    if (!participants.length) throw new Error('Memory must include at least one participant');
    if (!participants.includes(userId)) throw new Error('Memory must include the capturing household member');
    const activeMemberIds = new Set(household.members.filter((member) => member.membershipState === 'active').map((member) => member.userId));
    if (participants.some((participantId) => !activeMemberIds.has(participantId))) {
      throw new Error('Memory participants must be active household members');
    }

    const memory: MemoryRecord = {
      id: crypto.randomUUID(),
      idempotencyKey: input.idempotencyKey,
      householdId,
      type: input.type,
      screenshotPath: input.screenshotPath,
      caption: input.caption.trim(),
      locationId: input.locationId,
      weather: input.weather,
      participants,
      ...(input.eventId ? { eventId: input.eventId } : {}),
      metadata: structuredClone(input.metadata ?? {}),
      createdAt: new Date().toISOString(),
    };
    await this.repository.saveMemory(memory);
    return memory;
  }

  async list(householdId: string, userId: string): Promise<MemoryRecord[]> {
    await this.authorize(householdId, userId);
    return this.repository.listMemories(householdId);
  }

  async updateCaption(householdId: string, userId: string, memoryId: string, caption: string): Promise<MemoryRecord> {
    await this.authorize(householdId, userId);
    const memory = await this.repository.getMemory(memoryId);
    if (!memory || memory.householdId !== householdId) throw new Error('Memory not found');
    const nextCaption = caption.trim();
    if (!nextCaption || nextCaption.length > 240) throw new Error('Invalid memory caption');
    const updated = { ...memory, caption: nextCaption };
    await this.repository.saveMemory(updated);
    return updated;
  }

  private async authorize(householdId: string, userId: string): Promise<HouseholdRecord> {
    const household = await this.repository.getHousehold(householdId);
    if (!household) throw new Error('Household not found');
    if (!household.members.some((member) => member.userId === userId && member.membershipState === 'active')) {
      throw new Error('User is not an active household member');
    }
    return household;
  }
}
