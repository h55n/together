import type { ActivitySessionRecord, CookingSessionRecord, GameRepository, HouseholdNoteRecord, HouseholdRecord, HomeStateRecord, InventoryRecord, JobPayoutCommit, JobSessionRecord, MemoryRecord, MovingCommit, NPCRelationshipRecord, PurchaseCommit, RenovationCommit, StoryInstanceRecord, TransactionRecord, UserProfileRecord, VoteRecord } from './GameRepository.js';
import type { TransitCommit, TransitCommitResult } from './GameRepository.js';

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

  async commitTransit(input: TransitCommit): Promise<TransitCommitResult> {
    // No await: independent services share one atomic local repository section.
    if (!Number.isSafeInteger(input.fare) || input.fare < 25 || input.fare > 220 ||
        ![input.from.x, input.from.z].every(value => Number.isFinite(value) && Math.abs(value) <= 450) ||
        input.idempotencyKey.trim().length < 8 || input.idempotencyKey.length > 128) throw new Error('Invalid transit request');
    const household = this.households.get(input.householdId);
    if (!household) throw new Error('Household not found');
    const member = household.members.find(candidate => candidate.userId === input.userId && candidate.membershipState === 'active');
    if (!member) throw new Error('User is not an active household member');
    const existing = this.transactions.get(input.idempotencyKey);
    if (existing) {
      const from = existing.metadata.from as { x?: number; z?: number } | undefined;
      if (existing.householdId !== input.householdId || existing.userId !== input.userId || existing.type !== 'transport' ||
          existing.walletType !== 'personal' || existing.itemRef !== input.destinationId || existing.amount !== -input.fare ||
          from?.x !== input.from.x || from?.z !== input.from.z) throw new Error('Idempotency key belongs to a different transit request');
      return { personalWallet: member.personalWallet, transaction: clone(existing) };
    }
    if (!Number.isSafeInteger(member.personalWallet) || member.personalWallet < input.fare) throw new Error('Not enough personal funds for this auto ride');
    const balance = member.personalWallet - input.fare;
    const transaction: TransactionRecord = { id: crypto.randomUUID(), idempotencyKey: input.idempotencyKey,
      householdId: input.householdId, userId: input.userId, walletType: 'personal', amount: -input.fare,
      type: 'transport', itemRef: input.destinationId, metadata: { from: clone(input.from), destination: input.destinationName },
      createdAt: new Date().toISOString() };
    // Stage fallible cloning before either write; insertion precedes the infallible numeric assignment.
    const stored = clone(transaction), result = { personalWallet: balance, transaction: clone(transaction) };
    this.transactions.set(input.idempotencyKey, stored);
    member.personalWallet = balance;
    return result;
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

  async startOrResumeJobSession(session: JobSessionRecord): Promise<JobSessionRecord> {
    // No await between lookup and insertion: concurrent local starts share this atomic section.
    const retry = [...this.jobSessions.values()].find(candidate => candidate.startIdempotencyKey === session.startIdempotencyKey);
    if (retry) {
      if (retry.householdId !== session.householdId || retry.userId !== session.userId || retry.jobId !== session.jobId) throw new Error('Idempotency key belongs to a different job session');
      return clone(retry);
    }
    const active = [...this.jobSessions.values()].find(candidate => candidate.householdId === session.householdId && candidate.userId === session.userId && candidate.jobId === session.jobId && candidate.state === 'active');
    if (active) return clone(active);
    this.jobSessions.set(session.id, clone(session));
    return clone(session);
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

  async compareAndSwapActivitySession(session: ActivitySessionRecord, expectedRevision: number): Promise<boolean> {
    const current = this.activitySessions.get(session.id);
    if (!current || (current.state.revision ?? 0) !== expectedRevision) return false;
    const activeOwners = new Set((session.state.transportRental?.rentals ?? []).filter(rental => rental.status !== 'returned').map(rental => rental.ownerUserId));
    if ([...this.activitySessions.values()].some(other => other.id !== session.id && other.householdId === session.householdId && other.state.transportRental?.rentals.some(rental => rental.status !== 'returned' && activeOwners.has(rental.ownerUserId)))) return false;
    this.activitySessions.set(session.id, clone(session));
    return true;
  }

  async insertActivitySession(session: ActivitySessionRecord): Promise<ActivitySessionRecord> {
    const existing = [...this.activitySessions.values()].find(candidate => candidate.idempotencyKey === session.idempotencyKey);
    if (existing) return clone(existing);
    this.activitySessions.set(session.id, clone(session));
    return clone(session);
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
