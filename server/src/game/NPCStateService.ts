import type { GameRepository, HouseholdRecord, NPCRelationshipRecord } from '../db/GameRepository.js';

export class NPCStateService {
  constructor(private readonly repository: GameRepository) {}

  async remember(
    householdId: string,
    userId: string,
    npcId: string,
    flag: string,
    familiarityDelta = 1,
  ): Promise<NPCRelationshipRecord> {
    await this.authorize(householdId, userId);
    if (!npcId || npcId.length > 80 || !flag || flag.length > 120) throw new Error('Invalid NPC memory');
    const current = await this.repository.getNPCRelationship(householdId, npcId) ?? {
      householdId,
      npcId,
      flags: [],
      familiarity: 0,
    };
    const flags = current.flags.includes(flag) ? [...current.flags] : [...current.flags, flag];
    const familiarity = Math.max(0, Math.min(100, current.familiarity + Math.max(0, Math.floor(familiarityDelta))));
    const next: NPCRelationshipRecord = {
      ...current,
      flags,
      familiarity,
      lastInteraction: new Date().toISOString(),
    };
    await this.repository.saveNPCRelationship(next);
    return next;
  }

  async list(householdId: string, userId: string): Promise<NPCRelationshipRecord[]> {
    await this.authorize(householdId, userId);
    return this.repository.listNPCRelationships(householdId);
  }

  private async authorize(householdId: string, userId: string): Promise<HouseholdRecord> {
    const household = await this.repository.getHousehold(householdId);
    if (!household) throw new Error('Household not found');
    if (!household.members.some((member) => member.userId === userId && member.membershipState === 'active')) throw new Error('User is not an active household member');
    return household;
  }
}
