import { randomUUID } from 'node:crypto';
import {
  eligibleStarterProperties,
  resolveHouseholdVote,
  starterPropertyById,
  type VoteChoice,
} from '@together/shared';
import type { GameRepository, VoteRecord } from '../db/GameRepository.js';
import type { HouseholdService } from './HouseholdService.js';

export class PropertySelectionService {
  constructor(
    private readonly repository: GameRepository,
    private readonly households: HouseholdService,
  ) {}

  async listEligible(householdId: string, userId: string) {
    const household = await this.households.getHouseholdForMember(householdId, userId);
    const activeCount = household.members.filter((member) => member.membershipState === 'active').length;
    return eligibleStarterProperties(household.type, activeCount);
  }

  async getLatestPropertyVote(householdId: string, userId: string): Promise<VoteRecord | null> {
    await this.households.getHouseholdForMember(householdId, userId);
    return this.repository.getLatestVote(householdId, 'property');
  }

  async openPropertyVote(householdId: string, userId: string, propertyId: string): Promise<VoteRecord> {
    const household = await this.households.getHouseholdForMember(householdId, userId);
    const activeMembers = household.members.filter((member) => member.membershipState === 'active');
    if (activeMembers.length < 2) throw new Error('At least two household members must be present before choosing a home');
    if (household.propertyId) throw new Error('Household already has a starting property');

    const property = starterPropertyById(propertyId);
    if (!property) throw new Error('Unknown starter property');
    const eligible = eligibleStarterProperties(household.type, activeMembers.length).some((candidate) => candidate.id === property.id);
    if (!eligible) throw new Error('Starter property does not fit this household');

    const vote: VoteRecord = {
      id: randomUUID(),
      householdId,
      type: 'property',
      payload: { propertyId: property.recordId, propertyDefinitionId: property.id },
      ballots: { [userId]: 'yes' },
      resolution: resolveHouseholdVote(household.type, activeMembers.map((member) => member.userId), { [userId]: 'yes' }),
      createdAt: new Date().toISOString(),
    };
    await this.repository.saveVote(vote);
    if (vote.resolution === 'approved') await this.assignApprovedProperty(vote, household.id);
    return vote;
  }

  async castPropertyVote(voteId: string, userId: string, choice: VoteChoice): Promise<VoteRecord> {
    const vote = await this.repository.getVote(voteId);
    if (!vote || vote.type !== 'property') throw new Error('Property vote not found');
    if (vote.resolution === 'approved' || vote.resolution === 'rejected') return vote;

    const household = await this.households.getHouseholdForMember(vote.householdId, userId);
    if (household.propertyId) {
      vote.resolution = 'approved';
      await this.repository.saveVote(vote);
      return vote;
    }
    const activeMemberIds = household.members
      .filter((member) => member.membershipState === 'active')
      .map((member) => member.userId);
    vote.ballots[userId] = choice;
    vote.resolution = resolveHouseholdVote(household.type, activeMemberIds, vote.ballots);
    await this.repository.saveVote(vote);
    if (vote.resolution === 'approved') await this.assignApprovedProperty(vote, household.id);
    return vote;
  }

  private async assignApprovedProperty(vote: VoteRecord, householdId: string): Promise<void> {
    const household = await this.repository.getHousehold(householdId);
    if (!household || household.propertyId) return;
    const propertyId = vote.payload.propertyId;
    if (typeof propertyId !== 'string') throw new Error('Property vote payload is invalid');
    household.propertyId = propertyId;
    household.hiddenState = { ...household.hiddenState, movedIn: false, propertyVoteId: vote.id };
    await this.repository.saveHousehold(household);
  }
}
