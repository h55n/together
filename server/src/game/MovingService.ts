import {
  applyWalletTransaction,
  completeMovingPlan,
  createMovingPlan,
  eligibleStarterProperties,
  packMovingObject,
  resolveHouseholdVote,
  starterPropertyById,
  type MovingDisposition,
  type MovingPlan,
  type VoteChoice,
} from '@together/shared';
import type { GameRepository, HouseholdRecord, TransactionRecord, VoteRecord } from '../db/GameRepository.js';
import type { HouseholdService } from './HouseholdService.js';

export type MoveCommitResult = { household: HouseholdRecord; transaction: TransactionRecord };
export type MovingStateView = { vote: VoteRecord | null; plan: MovingPlan | null };

export class MovingService {
  constructor(private readonly repository: GameRepository, private readonly households: HouseholdService) {}

  async getState(householdId: string, userId: string): Promise<MovingStateView> {
    const household = await this.households.getHouseholdForMember(householdId, userId);
    const candidate = household.hiddenState.moving;
    const plan = candidate && typeof candidate === 'object' && !Array.isArray(candidate)
      ? structuredClone(candidate) as MovingPlan
      : null;
    return { vote: await this.repository.getLatestVote(householdId, 'moving'), plan };
  }

  async openMoveVote(householdId: string, userId: string, targetPropertyId: string): Promise<VoteRecord> {
    const household = await this.households.getHouseholdForMember(householdId, userId);
    if (!household.propertyId) throw new Error('Household must already have a home before moving');
    const active = household.members.filter((member) => member.membershipState === 'active');
    if (active.length < 2) throw new Error('At least two household members must participate in moving');
    const target = starterPropertyById(targetPropertyId);
    if (!target) throw new Error('Unknown target property');
    if (target.recordId === household.propertyId) throw new Error('Target property is already the household home');
    if (!eligibleStarterProperties(household.type, active.length).some((candidate) => candidate.id === target.id)) throw new Error('Target property does not fit this household');
    const ballots = { [userId]: 'yes' as const };
    const vote: VoteRecord = {
      id: crypto.randomUUID(), householdId, type: 'moving',
      payload: { fromPropertyId: household.propertyId, targetPropertyId: target.recordId, propertyDefinitionId: target.id },
      ballots,
      resolution: resolveHouseholdVote(household.type, active.map((member) => member.userId), ballots),
      createdAt: new Date().toISOString(),
    };
    await this.repository.saveVote(vote);
    if (vote.resolution === 'approved') await this.beginPacking(household, vote);
    return vote;
  }

  async castMoveVote(voteId: string, userId: string, choice: VoteChoice): Promise<VoteRecord> {
    const vote = await this.repository.getVote(voteId);
    if (!vote || vote.type !== 'moving') throw new Error('Moving vote not found');
    const household = await this.households.getHouseholdForMember(vote.householdId, userId);
    if (vote.resolution === 'approved' || vote.resolution === 'rejected') return vote;
    const activeIds = household.members.filter((member) => member.membershipState === 'active').map((member) => member.userId);
    vote.ballots[userId] = choice;
    vote.resolution = resolveHouseholdVote(household.type, activeIds, vote.ballots);
    await this.repository.saveVote(vote);
    if (vote.resolution === 'approved') await this.beginPacking(household, vote);
    return vote;
  }

  async packObject(householdId: string, userId: string, objectId: string, disposition: MovingDisposition): Promise<MovingPlan> {
    const household = await this.households.getHouseholdForMember(householdId, userId);
    const plan = this.plan(household);
    const home = await this.repository.getHomeState(householdId);
    const placedObjects = home?.objects ?? [];
    const authoredStarterBox = placedObjects.length === 0 && objectId === 'starter-box:core';
    if (!authoredStarterBox && !placedObjects.some((object) => object.objectId === objectId)) throw new Error('Home object not found for packing');
    const next = packMovingObject(plan, objectId, disposition);
    household.hiddenState = { ...household.hiddenState, moving: next };
    await this.repository.saveHousehold(household);
    return next;
  }

  async commitMove(householdId: string, userId: string, idempotencyKey: string): Promise<MoveCommitResult> {
    if (idempotencyKey.length < 8) throw new Error('Invalid idempotency key');
    const household = await this.households.getHouseholdForMember(householdId, userId);
    const existing = await this.repository.getTransactionByIdempotencyKey(idempotencyKey);
    if (existing) {
      this.assertExisting(existing, householdId, userId);
      return { household, transaction: existing };
    }
    const plan = completeMovingPlan(this.plan(household));
    const target = starterPropertyById(plan.targetPropertyId);
    if (!target) throw new Error('Moving target no longer exists');
    const movingCost = 1_200 + target.starterCost;
    const wallet = applyWalletTransaction(household.sharedWallet, -movingCost);
    if (!wallet.ok) throw new Error('Insufficient household funds for moving');

    const home = await this.repository.getHomeState(householdId);
    if (home) {
      const movingBoxes = home.objects
        .filter((object) => plan.dispositionByObject[object.objectId] === 'keep')
        .map((object) => structuredClone(object));
      home.version += 1;
      home.objects = [];
      home.surfaces = {};
      home.roomStates = { ...home.roomStates, movingBoxes, previousPropertyId: plan.fromPropertyId };
      home.updatedAt = new Date().toISOString();
      await this.repository.saveHomeState(home);
    }

    household.sharedWallet = wallet.balance;
    household.propertyId = plan.targetPropertyId;
    const previousFlags = this.flags(household);
    household.hiddenState = {
      ...household.hiddenState,
      moving: plan,
      flags: { ...previousFlags, moved_home: true, moved_in: true, move_ready: false, first_night_new_place_ready: true },
    };
    await this.repository.saveHousehold(household);
    const transaction: TransactionRecord = {
      id: crypto.randomUUID(), idempotencyKey, householdId, userId, walletType: 'household', amount: -movingCost,
      type: 'moving', itemRef: target.id, metadata: { fromPropertyId: plan.fromPropertyId, targetPropertyId: plan.targetPropertyId, movingCost },
      createdAt: new Date().toISOString(),
    };
    await this.repository.saveTransaction(transaction);
    return { household, transaction };
  }

  private assertExisting(transaction: TransactionRecord, householdId: string, userId: string): void {
    if (transaction.householdId !== householdId || transaction.userId !== userId || transaction.type !== 'moving') {
      throw new Error('Idempotency key belongs to a different moving transaction');
    }
  }

  private async beginPacking(household: HouseholdRecord, vote: VoteRecord): Promise<void> {
    if (household.hiddenState.moving && typeof household.hiddenState.moving === 'object') return;
    const from = vote.payload.fromPropertyId;
    const target = vote.payload.targetPropertyId;
    if (typeof from !== 'string' || typeof target !== 'string') throw new Error('Moving vote payload is invalid');
    const home = await this.repository.getHomeState(household.id);
    const requiredPackedObjects = Math.max(1, Math.min(3, home?.objects.length ?? 1));
    household.hiddenState = {
      ...household.hiddenState,
      moving: createMovingPlan(from, target, requiredPackedObjects),
      flags: { ...this.flags(household), move_ready: true },
    };
    await this.repository.saveHousehold(household);
  }

  private plan(household: HouseholdRecord): MovingPlan {
    const candidate = household.hiddenState.moving;
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) throw new Error('Moving has not been approved');
    return structuredClone(candidate) as MovingPlan;
  }

  private flags(household: HouseholdRecord): Record<string, boolean> {
    const raw = household.hiddenState.flags;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Boolean(value)]));
  }
}
