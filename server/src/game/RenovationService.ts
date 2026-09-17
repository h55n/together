import {
  applyRenovation,
  applyWalletTransaction,
  renovationFor,
  resolveHouseholdVote,
  starterPropertyById,
  type RenovationState,
  type VoteChoice,
} from '@together/shared';
import type { GameRepository, HomeStateRecord, HouseholdRecord, TransactionRecord, VoteRecord } from '../db/GameRepository.js';
import type { HouseholdService } from './HouseholdService.js';

export type RenovationStateView = { vote: VoteRecord | null; installed: string[] };

export type RenovationCommitResult = {
  household: HouseholdRecord;
  home: HomeStateRecord;
  transaction: TransactionRecord;
};

export class RenovationService {
  constructor(private readonly repository: GameRepository, private readonly households: HouseholdService) {}

  async getState(householdId: string, userId: string): Promise<RenovationStateView> {
    await this.households.getHouseholdForMember(householdId, userId);
    const home = await this.homeState(householdId);
    return {
      vote: await this.repository.getLatestVote(householdId, 'renovation'),
      installed: this.renovationState(home).installed,
    };
  }

  async openVote(householdId: string, userId: string, renovationId: string): Promise<VoteRecord> {
    const household = await this.households.getHouseholdForMember(householdId, userId);
    const property = household.propertyId ? starterPropertyById(household.propertyId) : undefined;
    if (!property) throw new Error('Household must have a supported property before renovating');
    const definition = renovationFor(property.id, renovationId);
    if (!definition) throw new Error('Renovation is not available for this property');
    const home = await this.homeState(householdId);
    const current = this.renovationState(home);
    if (current.installed.includes(renovationId)) throw new Error('Renovation is already installed');
    const activeIds = household.members.filter((member) => member.membershipState === 'active').map((member) => member.userId);
    if (activeIds.length < 2) throw new Error('At least two household members must participate in renovation');
    const ballots = { [userId]: 'yes' as const };
    const vote: VoteRecord = {
      id: crypto.randomUUID(), householdId, type: 'renovation',
      payload: { renovationId, propertyId: property.recordId, cost: definition.cost },
      ballots,
      resolution: resolveHouseholdVote(household.type, activeIds, ballots),
      createdAt: new Date().toISOString(),
    };
    await this.repository.saveVote(vote);
    return vote;
  }

  async castVote(voteId: string, userId: string, choice: VoteChoice): Promise<VoteRecord> {
    const vote = await this.repository.getVote(voteId);
    if (!vote || vote.type !== 'renovation') throw new Error('Renovation vote not found');
    const household = await this.households.getHouseholdForMember(vote.householdId, userId);
    if (vote.resolution === 'approved' || vote.resolution === 'rejected') return vote;
    const activeIds = household.members.filter((member) => member.membershipState === 'active').map((member) => member.userId);
    vote.ballots[userId] = choice;
    vote.resolution = resolveHouseholdVote(household.type, activeIds, vote.ballots);
    await this.repository.saveVote(vote);
    return vote;
  }

  async commit(voteId: string, userId: string, idempotencyKey: string): Promise<RenovationCommitResult> {
    if (idempotencyKey.length < 8) throw new Error('Invalid idempotency key');
    const vote = await this.repository.getVote(voteId);
    if (!vote || vote.type !== 'renovation') throw new Error('Renovation vote not found');
    const household = await this.households.getHouseholdForMember(vote.householdId, userId);
    if (vote.resolution !== 'approved') throw new Error('Renovation vote is not approved');
    const existing = await this.repository.getTransactionByIdempotencyKey(idempotencyKey);
    if (existing) {
      this.assertExisting(existing, household.id, userId, voteId);
      return { household, home: await this.homeState(household.id), transaction: existing };
    }

    const property = household.propertyId ? starterPropertyById(household.propertyId) : undefined;
    if (!property || property.recordId !== vote.payload.propertyId) throw new Error('Household property changed before renovation');
    const renovationId = vote.payload.renovationId;
    if (typeof renovationId !== 'string') throw new Error('Renovation vote payload is invalid');
    const definition = renovationFor(property.id, renovationId);
    if (!definition) throw new Error('Renovation is not available for this property');

    const home = await this.homeState(household.id);
    const nextRenovations = applyRenovation(this.renovationState(home), property.id, renovationId);
    const wallet = applyWalletTransaction(household.sharedWallet, -definition.cost);
    if (!wallet.ok) throw new Error('Insufficient household funds for renovation');

    home.version += 1;
    home.roomStates = { ...home.roomStates, renovations: nextRenovations };
    home.updatedAt = new Date().toISOString();
    await this.repository.saveHomeState(home);

    household.sharedWallet = wallet.balance;
    household.hiddenState = {
      ...household.hiddenState,
      flags: { ...this.flags(household), renovated_home: true, [`renovation_${renovationId}`]: true },
    };
    await this.repository.saveHousehold(household);

    const transaction: TransactionRecord = {
      id: crypto.randomUUID(), idempotencyKey, householdId: household.id, userId,
      walletType: 'household', amount: -definition.cost, type: 'renovation', itemRef: renovationId,
      metadata: { voteId, propertyId: property.recordId, renovationId, displayName: definition.displayName },
      createdAt: new Date().toISOString(),
    };
    await this.repository.saveTransaction(transaction);
    return { household, home, transaction };
  }

  private assertExisting(transaction: TransactionRecord, householdId: string, userId: string, voteId: string): void {
    if (transaction.householdId !== householdId || transaction.userId !== userId || transaction.type !== 'renovation' || transaction.metadata.voteId !== voteId) {
      throw new Error('Idempotency key belongs to a different renovation transaction');
    }
  }

  private async homeState(householdId: string): Promise<HomeStateRecord> {
    return (await this.repository.getHomeState(householdId)) ?? {
      householdId, version: 0, objects: [], surfaces: {}, roomStates: {}, processedMutations: {}, updatedAt: new Date().toISOString(),
    };
  }

  private renovationState(home: HomeStateRecord): RenovationState {
    const raw = home.roomStates.renovations;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { installed: [] };
    const installed = (raw as { installed?: unknown }).installed;
    return { installed: Array.isArray(installed) ? installed.filter((value): value is string => typeof value === 'string') : [] };
  }

  private flags(household: HouseholdRecord): Record<string, boolean> {
    const raw = household.hiddenState.flags;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Boolean(value)]));
  }
}
