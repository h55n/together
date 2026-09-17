import { randomUUID } from 'node:crypto';
import {
  createInviteCode,
  householdCreateSchema,
  normalizeInviteCode,
  starterPropertyById,
  type HouseholdType,
  stageForActiveSeconds,
} from '@together/shared';
import type { GameRepository, HouseholdRecord } from '../db/GameRepository.js';

const STARTING_SHARED_WALLET = 8_000;
const STARTING_PERSONAL_WALLET = 1_500;

export class HouseholdService {
  constructor(
    private readonly repository: GameRepository,
    private readonly random: () => number = Math.random,
  ) {}

  async createHousehold(
    creatorUserId: string,
    input: { name: string; type: HouseholdType },
  ): Promise<HouseholdRecord> {
    const parsed = householdCreateSchema.parse(input);
    const inviteCode = await this.createUniqueInviteCode();
    const now = new Date().toISOString();
    const household: HouseholdRecord = {
      id: randomUUID(),
      type: parsed.type,
      name: parsed.name,
      inviteCode,
      stage: 0,
      sharedWallet: STARTING_SHARED_WALLET,
      hiddenState: {},
      activeTimeSeconds: 0,
      createdAt: now,
      members: [
        {
          userId: creatorUserId,
          personalWallet: STARTING_PERSONAL_WALLET,
          membershipState: 'active',
          joinedAt: now,
        },
      ],
    };
    await this.repository.saveHousehold(household);
    return household;
  }

  async createSoloExplorer(creatorUserId: string): Promise<HouseholdRecord> {
    const household = await this.createHousehold(creatorUserId, { name: 'Solo Explorer', type: 'friends' });
    const property = starterPropertyById('one_bhk');
    if (!property) throw new Error('Solo Explorer property definition is missing');
    household.propertyId = property.recordId;
    household.hiddenState = {
      ...household.hiddenState,
      soloExplorer: true,
      flags: { ...this.flags(household), property_assigned: true, moved_in: true },
    };
    await this.repository.saveHousehold(household);
    return household;
  }

  async joinHousehold(userId: string, inviteCode: string): Promise<HouseholdRecord> {
    const code = normalizeInviteCode(inviteCode);
    const household = await this.repository.getHouseholdByInviteCode(code);
    if (!household) throw new Error('Household invite code not found');

    const existing = household.members.find((member) => member.userId === userId);
    if (existing) return household;

    const activeMembers = household.members.filter((member) => member.membershipState === 'active');
    const capacity = household.type === 'couple' ? 2 : 6;
    if (activeMembers.length >= capacity) {
      throw new Error(
        household.type === 'couple'
          ? 'Couple households are limited to 2 members'
          : 'Friends households are limited to 6 members',
      );
    }

    household.members.push({
      userId,
      personalWallet: STARTING_PERSONAL_WALLET,
      membershipState: 'active',
      joinedAt: new Date().toISOString(),
    });
    await this.repository.saveHousehold(household);
    return household;
  }

  async advanceActiveTime(householdId: string, seconds: number): Promise<HouseholdRecord> {
    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Active time increment must be positive');
    const household = await this.repository.getHousehold(householdId);
    if (!household) throw new Error('Household not found');
    const increment = Math.max(1, Math.floor(seconds));
    household.activeTimeSeconds += increment;
    household.stage = stageForActiveSeconds(household.activeTimeSeconds);
    await this.repository.saveHousehold(household);
    return household;
  }

  async getHouseholdForMember(householdId: string, userId: string): Promise<HouseholdRecord> {
    const household = await this.repository.getHousehold(householdId);
    if (!household) throw new Error('Household not found');
    if (!household.members.some((member) => member.userId === userId && member.membershipState === 'active')) {
      throw new Error('User is not an active member of this household');
    }
    return household;
  }

  private flags(household: HouseholdRecord): Record<string, boolean> {
    const raw = household.hiddenState.flags;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Boolean(value)]));
  }

  private async createUniqueInviteCode(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = createInviteCode(this.random);
      if (!(await this.repository.getHouseholdByInviteCode(code))) return code;
    }
    throw new Error('Unable to allocate a unique invite code');
  }
}
