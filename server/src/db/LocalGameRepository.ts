import type { ActivitySessionRecord, CookingSessionRecord, GameRepository, HouseholdNoteRecord, HouseholdRecord, HomeStateRecord, InventoryRecord, JobPayoutCommit, JobSessionRecord, MemoryRecord, MovingCommit, NPCRelationshipRecord, PurchaseCommit, RenovationCommit, StoryInstanceRecord, TransactionRecord, UserProfileRecord, VoteRecord } from './GameRepository.js';

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class LocalGameRepository implements GameRepository {
  private readonly userProfiles = new Map<string, UserProfileRecord>();
  private readonly households = new Map<string, HouseholdRecord>();
  private readonly inviteIndex = new Map<string, string>();
  private readonly votes = new Map<string, VoteRecord>();
  private readonly homes = new Map<string, HomeStateRecord>();
  private readonly transactions = new Map<string, TransactionRecord>();
  private readonly inventories = new Map<string, InventoryRecord>();
  private readonly cookingSessions = new Map<string, CookingSessionRecord>();
  private readonly jobSessions = new Map<string, JobSessionRecord>();
  private readonly notes = new Map<string, HouseholdNoteRecord>();
  private readonly npcRelationships = new Map<string, NPCRelationshipRecord>();
  private readonly stories = new Map<string, StoryInstanceRecord>();
  private readonly memories = new Map<string, MemoryRecord>();
  private readonly activitySessions = new Map<string, ActivitySessionRecord>();

  async saveUserProfile(profile: UserProfileRecord): Promise<void> {
    this.userProfiles.set(profile.userId, clone(profile));
  }

  async getUserProfile(userId: string): Promise<UserProfileRecord | null> {
    const profile = this.userProfiles.get(userId);
    return profile ? clone(profile) : null;
  }

  async saveHousehold(household: HouseholdRecord): Promise<void> {
    this.households.set(household.id, clone(household));
    this.inviteIndex.set(household.inviteCode, household.id);
  }

  async getHousehold(id: string): Promise<HouseholdRecord | null> {
    const household = this.households.get(id);
    return household ? clone(household) : null;
  }

  async getHouseholdByInviteCode(inviteCode: string): Promise<HouseholdRecord | null> {
    const id = this.inviteIndex.get(inviteCode);
    return id ? this.getHousehold(id) : null;
  }

  async saveHomeState(home: HomeStateRecord): Promise<void> {
    this.homes.set(home.householdId, clone(home));
  }

  async getHomeState(householdId: string): Promise<HomeStateRecord | null> {
    const home = this.homes.get(householdId);
    return home ? clone(home) : null;
  }

  async saveInventory(record: InventoryRecord): Promise<void> {
    const key = `${record.ownerType}:${record.ownerId}:${record.itemId}`;
    if (record.quantity <= 0) this.inventories.delete(key);
    else this.inventories.set(key, clone(record));
  }

  async listInventory(ownerType: InventoryRecord['ownerType'], ownerId: string): Promise<InventoryRecord[]> {
    return [...this.inventories.values()]
      .filter((record) => record.ownerType === ownerType && record.ownerId === ownerId && record.quantity > 0)
      .sort((a, b) => a.itemId.localeCompare(b.itemId))
      .map(clone);
  }

  async saveTransaction(transaction: TransactionRecord): Promise<void> {
    this.transactions.set(transaction.idempotencyKey, clone(transaction));
  }

  async getTransactionByIdempotencyKey(key: string): Promise<TransactionRecord | null> {
    const transaction = this.transactions.get(key);
    return transaction ? clone(transaction) : null;
  }

  async listTransactions(householdId: string): Promise<TransactionRecord[]> {
    return [...this.transactions.values()]
      .filter((transaction) => transaction.householdId === householdId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(clone);
  }

  async commitPurchase(input: PurchaseCommit): Promise<void> {
    await this.atomicMutation(async () => {
      await this.saveHousehold(input.household);
      await this.saveInventory(input.inventory);
      await this.saveTransaction(input.transaction);
    });
  }

  async commitJobPayout(input: JobPayoutCommit): Promise<void> {
    await this.atomicMutation(async () => {
      await this.saveHousehold(input.household);
      if (input.session) await this.saveJobSession(input.session);
      await this.saveTransaction(input.transaction);
    });
  }

  async commitMoving(input: MovingCommit): Promise<void> {
    await this.atomicMutation(async () => {
      await this.saveHousehold(input.household);
      if (input.home) await this.saveHomeState(input.home);
      await this.saveTransaction(input.transaction);
    });
  }

  async commitRenovation(input: RenovationCommit): Promise<void> {
    await this.atomicMutation(async () => {
      await this.saveHousehold(input.household);
      await this.saveHomeState(input.home);
      await this.saveTransaction(input.transaction);
    });
  }

  async saveJobSession(session: JobSessionRecord): Promise<void> {
    this.jobSessions.set(session.id, clone(session));
  }

  async getJobSession(id: string): Promise<JobSessionRecord | null> {
    const session = this.jobSessions.get(id);
    return session ? clone(session) : null;
  }

  async getJobSessionByStartKey(key: string): Promise<JobSessionRecord | null> {
    const session = [...this.jobSessions.values()].find((candidate) => candidate.startIdempotencyKey === key);
    return session ? clone(session) : null;
  }

  async listJobSessions(householdId: string, userId?: string): Promise<JobSessionRecord[]> {
    return [...this.jobSessions.values()]
      .filter((session) => session.householdId === householdId && (!userId || session.userId === userId))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(clone);
  }

  async saveCookingSession(session: CookingSessionRecord): Promise<void> {
    this.cookingSessions.set(session.id, clone(session));
  }

  async getCookingSession(id: string): Promise<CookingSessionRecord | null> {
    const session = this.cookingSessions.get(id);
    return session ? clone(session) : null;
  }

  async getCookingSessionByIdempotencyKey(key: string): Promise<CookingSessionRecord | null> {
    const session = [...this.cookingSessions.values()].find((candidate) => candidate.idempotencyKey === key);
    return session ? clone(session) : null;
  }

  async listCookingSessions(householdId: string): Promise<CookingSessionRecord[]> {
    return [...this.cookingSessions.values()]
      .filter((session) => session.householdId === householdId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(clone);
  }

  async saveHouseholdNote(note: HouseholdNoteRecord): Promise<void> {
    this.notes.set(note.id, clone(note));
  }

  async listHouseholdNotes(householdId: string): Promise<HouseholdNoteRecord[]> {
    return [...this.notes.values()]
      .filter((note) => note.householdId === householdId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
      .map(clone);
  }

  async saveNPCRelationship(record: NPCRelationshipRecord): Promise<void> {
    this.npcRelationships.set(`${record.householdId}:${record.npcId}`, clone(record));
  }

  async getNPCRelationship(householdId: string, npcId: string): Promise<NPCRelationshipRecord | null> {
    const record = this.npcRelationships.get(`${householdId}:${npcId}`);
    return record ? clone(record) : null;
  }

  async listNPCRelationships(householdId: string): Promise<NPCRelationshipRecord[]> {
    return [...this.npcRelationships.values()]
      .filter((record) => record.householdId === householdId)
      .sort((a, b) => a.npcId.localeCompare(b.npcId))
      .map(clone);
  }

  async saveActivitySession(session: ActivitySessionRecord): Promise<void> {
    this.activitySessions.set(session.id, clone(session));
  }

  async getActivitySession(id: string): Promise<ActivitySessionRecord | null> {
    const session = this.activitySessions.get(id);
    return session ? clone(session) : null;
  }

  async getActivitySessionByIdempotencyKey(key: string): Promise<ActivitySessionRecord | null> {
    const session = [...this.activitySessions.values()].find((candidate) => candidate.idempotencyKey === key);
    return session ? clone(session) : null;
  }

  async listActivitySessions(householdId: string): Promise<ActivitySessionRecord[]> {
    return [...this.activitySessions.values()]
      .filter((session) => session.householdId === householdId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(clone);
  }

  async saveMemory(memory: MemoryRecord): Promise<void> {
    this.memories.set(memory.id, clone(memory));
  }

  async getMemory(id: string): Promise<MemoryRecord | null> {
    const memory = this.memories.get(id);
    return memory ? clone(memory) : null;
  }

  async getMemoryByIdempotencyKey(key: string): Promise<MemoryRecord | null> {
    const memory = [...this.memories.values()].find((candidate) => candidate.idempotencyKey === key);
    return memory ? clone(memory) : null;
  }

  async listMemories(householdId: string): Promise<MemoryRecord[]> {
    return [...this.memories.values()]
      .filter((memory) => memory.householdId === householdId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(clone);
  }

  async saveStoryInstance(instance: StoryInstanceRecord): Promise<void> {
    this.stories.set(instance.id, clone(instance));
  }

  async getStoryInstance(id: string): Promise<StoryInstanceRecord | null> {
    const instance = this.stories.get(id);
    return instance ? clone(instance) : null;
  }

  async getStoryInstanceByEvent(householdId: string, eventId: string): Promise<StoryInstanceRecord | null> {
    const match = [...this.stories.values()]
      .filter((instance) => instance.householdId === householdId && instance.eventId === eventId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
    return match ? clone(match) : null;
  }

  async listStoryInstances(householdId: string): Promise<StoryInstanceRecord[]> {
    return [...this.stories.values()]
      .filter((instance) => instance.householdId === householdId)
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
      .map(clone);
  }

  async saveVote(vote: VoteRecord): Promise<void> {
    this.votes.set(vote.id, clone(vote));
  }

  async getVote(id: string): Promise<VoteRecord | null> {
    const vote = this.votes.get(id);
    return vote ? clone(vote) : null;
  }

  async getLatestVote(householdId: string, type: VoteRecord['type']): Promise<VoteRecord | null> {
    const matches = [...this.votes.values()]
      .filter((vote) => vote.householdId === householdId && vote.type === type)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return matches[0] ? clone(matches[0]) : null;
  }

  private async atomicMutation(operation: () => Promise<void>): Promise<void> {
    const snapshots = {
      households: clone([...this.households.entries()]),
      inviteIndex: clone([...this.inviteIndex.entries()]),
      homes: clone([...this.homes.entries()]),
      transactions: clone([...this.transactions.entries()]),
      inventories: clone([...this.inventories.entries()]),
      jobSessions: clone([...this.jobSessions.entries()]),
    };
    try {
      await operation();
    } catch (error) {
      this.restoreMap(this.households, snapshots.households);
      this.restoreMap(this.inviteIndex, snapshots.inviteIndex);
      this.restoreMap(this.homes, snapshots.homes);
      this.restoreMap(this.transactions, snapshots.transactions);
      this.restoreMap(this.inventories, snapshots.inventories);
      this.restoreMap(this.jobSessions, snapshots.jobSessions);
      throw error;
    }
  }

  private restoreMap<K, V>(target: Map<K, V>, entries: Array<[K, V]>): void {
    target.clear();
    for (const [key, value] of entries) target.set(key, value);
  }
}
