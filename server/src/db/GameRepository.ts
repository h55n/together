import type { ActivityId, ActivityState, AvatarConfig, CookingSessionState, HouseholdType, JobId } from '@together/shared';

export type UserProfileRecord = { userId: string; displayName: string; avatarConfig: AvatarConfig; settings: Record<string, unknown>; updatedAt: string };
export type HouseholdMemberRecord = { userId: string; personalWallet: number; membershipState: 'active' | 'left'; bedroomId?: string; joinedAt: string };
export type HouseholdRecord = { id: string; type: HouseholdType; name: string; inviteCode: string; propertyId?: string; stage: number; sharedWallet: number; hiddenState: Record<string, unknown>; activeTimeSeconds: number; createdAt: string; members: HouseholdMemberRecord[] };
export type HomeObjectRecord = { objectId: string; definitionId: string; roomId: string; transform: { position: { x: number; y: number; z: number }; rotationY: number; scale: number } };
export type HomeStateRecord = { householdId: string; version: number; objects: HomeObjectRecord[]; surfaces: Record<string, string>; roomStates: Record<string, unknown>; processedMutations: Record<string, number>; updatedAt: string };
export type InventoryRecord = { ownerType: 'user' | 'household'; ownerId: string; itemId: string; quantity: number; metadata: Record<string, unknown> };
export type TransactionRecord = { id: string; idempotencyKey: string; householdId: string; userId: string; walletType: 'personal' | 'household'; amount: number; type: 'purchase' | 'job_payout' | 'deposit' | 'refund' | 'inventory_consumption' | 'moving' | 'renovation' | 'transport'; itemRef?: string; metadata: Record<string, unknown>; createdAt: string };
export type JobSessionRecord = { id: string; startIdempotencyKey: string; completionIdempotencyKey?: string; householdId: string; userId: string; jobId: JobId; state: 'active' | 'complete'; completedActions: string[]; mistakes: number; startedAt: string; updatedAt: string };
export type HouseholdNoteRecord = { id: string; householdId: string; authorUserId: string; text: string; placement: 'fridge' | 'corkboard' | 'desk' | 'door'; createdAt: string };
export type NPCRelationshipRecord = { householdId: string; npcId: string; flags: string[]; familiarity: number; lastInteraction?: string };
export type CookingSessionRecord = { id: string; idempotencyKey: string; householdId: string; recipeId: string; state: CookingSessionState; ingredientTransactionKey: string; createdAt: string; updatedAt: string };
export type ActivitySessionRecord = { id: string; idempotencyKey: string; householdId: string; activityId: ActivityId; state: ActivityState; createdAt: string; updatedAt: string };
export type MemoryRecord = { id: string; idempotencyKey: string; householdId: string; type: 'manual' | 'automatic' | 'story' | 'milestone' | 'moving'; screenshotPath: string; caption: string; locationId: string; weather: string; participants: string[]; eventId?: string; metadata: Record<string, unknown>; createdAt: string };
export type StoryInstanceRecord = { id: string; householdId: string; eventId: string; state: 'active' | 'resolved'; branch?: string; taskState: Record<string, 'pending' | 'complete' | 'failed' | 'skipped'>; failures: number; memoryTag?: string; startedAt: string; resolvedAt?: string };
export type VoteRecord = { id: string; householdId: string; type: 'property' | 'moving' | 'renovation' | 'shared_purchase' | 'sleep'; payload: Record<string, unknown>; ballots: Record<string, 'yes' | 'no'>; resolution: 'pending' | 'approved' | 'rejected' | 'tied'; createdAt: string; expiresAt?: string };

export type PurchaseCommit = { household: HouseholdRecord; inventory: InventoryRecord; transaction: TransactionRecord };
export type JobPayoutCommit = { household: HouseholdRecord; transaction: TransactionRecord; session?: JobSessionRecord };
export type MovingCommit = { household: HouseholdRecord; home: HomeStateRecord | null; transaction: TransactionRecord };
export type RenovationCommit = { household: HouseholdRecord; home: HomeStateRecord; transaction: TransactionRecord };

export interface GameRepository {
  saveUserProfile(profile: UserProfileRecord): Promise<void>;
  getUserProfile(userId: string): Promise<UserProfileRecord | null>;
  saveHousehold(household: HouseholdRecord): Promise<void>;
  getHousehold(id: string): Promise<HouseholdRecord | null>;
  getHouseholdByInviteCode(inviteCode: string): Promise<HouseholdRecord | null>;
  saveVote(vote: VoteRecord): Promise<void>;
  getVote(id: string): Promise<VoteRecord | null>;
  getLatestVote(householdId: string, type: VoteRecord['type']): Promise<VoteRecord | null>;
  saveHomeState(home: HomeStateRecord): Promise<void>;
  getHomeState(householdId: string): Promise<HomeStateRecord | null>;
  saveTransaction(transaction: TransactionRecord): Promise<void>;
  getTransactionByIdempotencyKey(key: string): Promise<TransactionRecord | null>;
  listTransactions(householdId: string): Promise<TransactionRecord[]>;
  saveJobSession(session: JobSessionRecord): Promise<void>;
  getJobSession(id: string): Promise<JobSessionRecord | null>;
  getJobSessionByStartKey(key: string): Promise<JobSessionRecord | null>;
  listJobSessions(householdId: string, userId?: string): Promise<JobSessionRecord[]>;
  saveInventory(record: InventoryRecord): Promise<void>;
  listInventory(ownerType: InventoryRecord['ownerType'], ownerId: string): Promise<InventoryRecord[]>;
  saveCookingSession(session: CookingSessionRecord): Promise<void>;
  getCookingSession(id: string): Promise<CookingSessionRecord | null>;
  getCookingSessionByIdempotencyKey(key: string): Promise<CookingSessionRecord | null>;
  listCookingSessions(householdId: string): Promise<CookingSessionRecord[]>;
  saveHouseholdNote(note: HouseholdNoteRecord): Promise<void>;
  listHouseholdNotes(householdId: string): Promise<HouseholdNoteRecord[]>;
  saveNPCRelationship(record: NPCRelationshipRecord): Promise<void>;
  getNPCRelationship(householdId: string, npcId: string): Promise<NPCRelationshipRecord | null>;
  listNPCRelationships(householdId: string): Promise<NPCRelationshipRecord[]>;
  saveStoryInstance(instance: StoryInstanceRecord): Promise<void>;
  getStoryInstance(id: string): Promise<StoryInstanceRecord | null>;
  getStoryInstanceByEvent(householdId: string, eventId: string): Promise<StoryInstanceRecord | null>;
  listStoryInstances(householdId: string): Promise<StoryInstanceRecord[]>;
  saveActivitySession(session: ActivitySessionRecord): Promise<void>;
  getActivitySession(id: string): Promise<ActivitySessionRecord | null>;
  getActivitySessionByIdempotencyKey(key: string): Promise<ActivitySessionRecord | null>;
  listActivitySessions(householdId: string): Promise<ActivitySessionRecord[]>;
  saveMemory(memory: MemoryRecord): Promise<void>;
  getMemory(id: string): Promise<MemoryRecord | null>;
  getMemoryByIdempotencyKey(key: string): Promise<MemoryRecord | null>;
  listMemories(householdId: string): Promise<MemoryRecord[]>;
}

export type AtomicGameRepository = GameRepository & {
  commitPurchase(input: PurchaseCommit): Promise<void>;
  commitJobPayout(input: JobPayoutCommit): Promise<void>;
  commitMoving(input: MovingCommit): Promise<void>;
  commitRenovation(input: RenovationCommit): Promise<void>;
};

export function requireAtomicGameRepository(repository: GameRepository): AtomicGameRepository {
  const candidate = repository as Partial<AtomicGameRepository>;
  if (
    typeof candidate.commitPurchase !== 'function'
    || typeof candidate.commitJobPayout !== 'function'
    || typeof candidate.commitMoving !== 'function'
    || typeof candidate.commitRenovation !== 'function'
  ) throw new Error('Configured game repository does not support atomic mutations');
  return repository as AtomicGameRepository;
}
