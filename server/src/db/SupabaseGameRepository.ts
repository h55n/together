import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActivitySessionRecord, CookingSessionRecord, GameRepository, HouseholdMemberRecord, HouseholdNoteRecord, HouseholdRecord, HomeStateRecord, InventoryRecord, JobSessionRecord, MemoryRecord, NPCRelationshipRecord, StoryInstanceRecord, TransactionRecord, UserProfileRecord, VoteRecord } from './GameRepository.js';

export class SupabaseGameRepository implements GameRepository {
  constructor(private readonly client: SupabaseClient) {}

  async saveUserProfile(profile: UserProfileRecord): Promise<void> {
    const { error } = await this.client.from('users').upsert({
      id: profile.userId,
      auth_user_id: profile.userId,
      display_name: profile.displayName,
      avatar_config: profile.avatarConfig,
      settings: profile.settings,
      last_seen: profile.updatedAt,
    }, { onConflict: 'id' });
    if (error) throw error;
  }

  async getUserProfile(userId: string): Promise<UserProfileRecord | null> {
    const { data, error } = await this.client.from('users').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      userId: String(data.id),
      displayName: String(data.display_name ?? data.username ?? 'Player'),
      avatarConfig: (data.avatar_config as UserProfileRecord['avatarConfig']),
      settings: (data.settings as Record<string, unknown> | null) ?? {},
      updatedAt: String(data.last_seen ?? data.created_at ?? new Date(0).toISOString()),
    };
  }

  async saveHousehold(household: HouseholdRecord): Promise<void> {
    const { error: householdError } = await this.client.from('households').upsert({
      id: household.id,
      type: household.type,
      name: household.name,
      invite_code: household.inviteCode,
      property_id: household.propertyId ?? null,
      stage: household.stage,
      shared_wallet: household.sharedWallet,
      hidden_state: household.hiddenState,
      active_time_seconds: household.activeTimeSeconds,
      created_at: household.createdAt,
    });
    if (householdError) throw householdError;

    const rows = household.members.map((member) => ({
      household_id: household.id,
      user_id: member.userId,
      personal_wallet: member.personalWallet,
      membership_state: member.membershipState,
      bedroom_id: member.bedroomId ?? null,
      joined_at: member.joinedAt,
    }));
    const { error: membersError } = await this.client
      .from('household_members')
      .upsert(rows, { onConflict: 'household_id,user_id' });
    if (membersError) throw membersError;
  }

  async getHousehold(id: string): Promise<HouseholdRecord | null> {
    const { data, error } = await this.client.from('households').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return this.inflate(data);
  }

  async getHouseholdByInviteCode(inviteCode: string): Promise<HouseholdRecord | null> {
    const { data, error } = await this.client
      .from('households')
      .select('*')
      .eq('invite_code', inviteCode)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return this.inflate(data);
  }


  async saveHomeState(home: HomeStateRecord): Promise<void> {
    const { error } = await this.client.from('household_home_state').upsert({
      household_id: home.householdId,
      version: home.version,
      surface_config: home.surfaces,
      furniture: home.objects,
      room_states: home.roomStates,
      processed_mutations: home.processedMutations,
      updated_at: home.updatedAt,
    });
    if (error) throw error;
  }

  async getHomeState(householdId: string): Promise<HomeStateRecord | null> {
    const { data, error } = await this.client.from('household_home_state').select('*').eq('household_id', householdId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      householdId: String(data.household_id),
      version: Number(data.version ?? 0),
      objects: (data.furniture as HomeStateRecord['objects'] | null) ?? [],
      surfaces: (data.surface_config as Record<string, string> | null) ?? {},
      roomStates: (data.room_states as Record<string, unknown> | null) ?? {},
      processedMutations: (data.processed_mutations as Record<string, number> | null) ?? {},
      updatedAt: data.updated_at ? String(data.updated_at) : new Date(0).toISOString(),
    };
  }


  async saveInventory(record: InventoryRecord): Promise<void> {
    if (record.quantity <= 0) {
      const { error } = await this.client
        .from('inventories')
        .delete()
        .eq('owner_type', record.ownerType)
        .eq('owner_id', record.ownerId)
        .eq('item_id', record.itemId);
      if (error) throw error;
      return;
    }
    const { error } = await this.client.from('inventories').upsert({
      owner_type: record.ownerType,
      owner_id: record.ownerId,
      item_id: record.itemId,
      quantity: record.quantity,
      metadata: record.metadata,
    }, { onConflict: 'owner_type,owner_id,item_id' });
    if (error) throw error;
  }

  async listInventory(ownerType: InventoryRecord['ownerType'], ownerId: string): Promise<InventoryRecord[]> {
    const { data, error } = await this.client
      .from('inventories')
      .select('*')
      .eq('owner_type', ownerType)
      .eq('owner_id', ownerId)
      .gt('quantity', 0)
      .order('item_id', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      ownerType: row.owner_type === 'user' ? 'user' : 'household',
      ownerId: String(row.owner_id),
      itemId: String(row.item_id),
      quantity: Number(row.quantity ?? 0),
      metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    }));
  }

  async saveTransaction(transaction: TransactionRecord): Promise<void> {
    const { error } = await this.client.from('transactions').upsert({
      id: transaction.id,
      idempotency_key: transaction.idempotencyKey,
      household_id: transaction.householdId,
      user_id: transaction.userId,
      wallet_type: transaction.walletType,
      amount: transaction.amount,
      type: transaction.type,
      item_ref: transaction.itemRef ?? null,
      metadata: transaction.metadata,
      created_at: transaction.createdAt,
    }, { onConflict: 'idempotency_key' });
    if (error) throw error;
  }

  async getTransactionByIdempotencyKey(key: string): Promise<TransactionRecord | null> {
    const { data, error } = await this.client.from('transactions').select('*').eq('idempotency_key', key).maybeSingle();
    if (error) throw error;
    return data ? this.inflateTransaction(data) : null;
  }

  async listTransactions(householdId: string): Promise<TransactionRecord[]> {
    const { data, error } = await this.client.from('transactions').select('*').eq('household_id', householdId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => this.inflateTransaction(row));
  }

  async saveStoryInstance(instance: StoryInstanceRecord): Promise<void> {
    const { error } = await this.client.from('story_instances').upsert({
      id: instance.id,
      household_id: instance.householdId,
      event_id: instance.eventId,
      state: instance.state,
      branch: instance.branch ?? null,
      task_state: instance.taskState,
      failures: instance.failures,
      memory_tag: instance.memoryTag ?? null,
      started_at: instance.startedAt,
      resolved_at: instance.resolvedAt ?? null,
    });
    if (error) throw error;
  }

  async getStoryInstance(id: string): Promise<StoryInstanceRecord | null> {
    const { data, error } = await this.client.from('story_instances').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? this.inflateStoryInstance(data) : null;
  }

  async getStoryInstanceByEvent(householdId: string, eventId: string): Promise<StoryInstanceRecord | null> {
    const { data, error } = await this.client
      .from('story_instances')
      .select('*')
      .eq('household_id', householdId)
      .eq('event_id', eventId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? this.inflateStoryInstance(data) : null;
  }

  async listStoryInstances(householdId: string): Promise<StoryInstanceRecord[]> {
    const { data, error } = await this.client
      .from('story_instances')
      .select('*')
      .eq('household_id', householdId)
      .order('started_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => this.inflateStoryInstance(row));
  }


  async saveJobSession(session: JobSessionRecord): Promise<void> {
    const { error } = await this.client.from('job_sessions').upsert({
      id: session.id,
      start_idempotency_key: session.startIdempotencyKey,
      household_id: session.householdId,
      user_id: session.userId,
      job_id: session.jobId,
      state: session.state,
      completed_actions: session.completedActions,
      mistakes: session.mistakes,
      started_at: session.startedAt,
      updated_at: session.updatedAt,
    }, { onConflict: 'start_idempotency_key' });
    if (error) throw error;
  }

  async getJobSession(id: string): Promise<JobSessionRecord | null> {
    const { data, error } = await this.client.from('job_sessions').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? inflateJobSession(data) : null;
  }

  async getJobSessionByStartKey(key: string): Promise<JobSessionRecord | null> {
    const { data, error } = await this.client.from('job_sessions').select('*').eq('start_idempotency_key', key).maybeSingle();
    if (error) throw error;
    return data ? inflateJobSession(data) : null;
  }

  async listJobSessions(householdId: string, userId?: string): Promise<JobSessionRecord[]> {
    let query = this.client.from('job_sessions').select('*').eq('household_id', householdId);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query.order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(inflateJobSession);
  }

  async saveCookingSession(session: CookingSessionRecord): Promise<void> {
    const { error } = await this.client.from('cooking_sessions').upsert({
      id: session.id,
      idempotency_key: session.idempotencyKey,
      household_id: session.householdId,
      recipe_id: session.recipeId,
      state: session.state,
      ingredient_transaction_key: session.ingredientTransactionKey,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
    }, { onConflict: 'idempotency_key' });
    if (error) throw error;
  }

  async getCookingSession(id: string): Promise<CookingSessionRecord | null> {
    const { data, error } = await this.client.from('cooking_sessions').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? this.inflateCookingSession(data) : null;
  }

  async getCookingSessionByIdempotencyKey(key: string): Promise<CookingSessionRecord | null> {
    const { data, error } = await this.client.from('cooking_sessions').select('*').eq('idempotency_key', key).maybeSingle();
    if (error) throw error;
    return data ? this.inflateCookingSession(data) : null;
  }

  async listCookingSessions(householdId: string): Promise<CookingSessionRecord[]> {
    const { data, error } = await this.client
      .from('cooking_sessions')
      .select('*')
      .eq('household_id', householdId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => this.inflateCookingSession(row));
  }


  async saveHouseholdNote(note: HouseholdNoteRecord): Promise<void> {
    const { error } = await this.client.from('household_notes').upsert({
      id: note.id,
      household_id: note.householdId,
      author: note.authorUserId,
      text: note.text,
      placement: note.placement,
      created_at: note.createdAt,
    });
    if (error) throw error;
  }

  async listHouseholdNotes(householdId: string): Promise<HouseholdNoteRecord[]> {
    const { data, error } = await this.client.from('household_notes').select('*').eq('household_id', householdId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: String(row.id),
      householdId: String(row.household_id),
      authorUserId: String(row.author),
      text: String(row.text ?? ''),
      placement: normalizeNotePlacement(row.placement),
      createdAt: String(row.created_at),
    }));
  }

  async saveNPCRelationship(record: NPCRelationshipRecord): Promise<void> {
    const { error } = await this.client.from('npc_relationships').upsert({
      household_id: record.householdId,
      npc_id: record.npcId,
      flags: record.flags,
      familiarity: record.familiarity,
      last_interaction: record.lastInteraction ?? null,
    }, { onConflict: 'household_id,npc_id' });
    if (error) throw error;
  }

  async getNPCRelationship(householdId: string, npcId: string): Promise<NPCRelationshipRecord | null> {
    const { data, error } = await this.client
      .from('npc_relationships')
      .select('*')
      .eq('household_id', householdId)
      .eq('npc_id', npcId)
      .maybeSingle();
    if (error) throw error;
    return data ? this.inflateNPCRelationship(data) : null;
  }

  async listNPCRelationships(householdId: string): Promise<NPCRelationshipRecord[]> {
    const { data, error } = await this.client
      .from('npc_relationships')
      .select('*')
      .eq('household_id', householdId)
      .order('npc_id', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => this.inflateNPCRelationship(row));
  }

  async saveActivitySession(session: ActivitySessionRecord): Promise<void> {
    const { error } = await this.client.from('activity_sessions').upsert({
      id: session.id,
      idempotency_key: session.idempotencyKey,
      household_id: session.householdId,
      activity_id: session.activityId,
      state: session.state,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
    }, { onConflict: 'idempotency_key' });
    if (error) throw error;
  }

  async getActivitySession(id: string): Promise<ActivitySessionRecord | null> {
    const { data, error } = await this.client.from('activity_sessions').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? this.inflateActivitySession(data) : null;
  }

  async getActivitySessionByIdempotencyKey(key: string): Promise<ActivitySessionRecord | null> {
    const { data, error } = await this.client.from('activity_sessions').select('*').eq('idempotency_key', key).maybeSingle();
    if (error) throw error;
    return data ? this.inflateActivitySession(data) : null;
  }

  async listActivitySessions(householdId: string): Promise<ActivitySessionRecord[]> {
    const { data, error } = await this.client.from('activity_sessions').select('*').eq('household_id', householdId).order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => this.inflateActivitySession(row));
  }

  async saveMemory(memory: MemoryRecord): Promise<void> {
    const { error } = await this.client.from('memories').upsert({
      id: memory.id,
      idempotency_key: memory.idempotencyKey,
      household_id: memory.householdId,
      type: memory.type,
      screenshot_path: memory.screenshotPath,
      caption: memory.caption,
      location_id: memory.locationId,
      weather: memory.weather,
      participants: memory.participants,
      event_id: memory.eventId ?? null,
      metadata: memory.metadata,
      created_at: memory.createdAt,
    }, { onConflict: 'idempotency_key' });
    if (error) throw error;
  }

  async getMemory(id: string): Promise<MemoryRecord | null> {
    const { data, error } = await this.client.from('memories').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? this.inflateMemory(data) : null;
  }

  async getMemoryByIdempotencyKey(key: string): Promise<MemoryRecord | null> {
    const { data, error } = await this.client.from('memories').select('*').eq('idempotency_key', key).maybeSingle();
    if (error) throw error;
    return data ? this.inflateMemory(data) : null;
  }

  async listMemories(householdId: string): Promise<MemoryRecord[]> {
    const { data, error } = await this.client
      .from('memories')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => this.inflateMemory(row));
  }

  private inflateActivitySession(row: Record<string, unknown>): ActivitySessionRecord {
    return {
      id: String(row.id),
      idempotencyKey: String(row.idempotency_key),
      householdId: String(row.household_id),
      activityId: String(row.activity_id) as ActivitySessionRecord['activityId'],
      state: row.state as ActivitySessionRecord['state'],
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  private inflateCookingSession(row: Record<string, unknown>): CookingSessionRecord {
    return {
      id: String(row.id),
      idempotencyKey: String(row.idempotency_key),
      householdId: String(row.household_id),
      recipeId: String(row.recipe_id),
      state: row.state as CookingSessionRecord['state'],
      ingredientTransactionKey: String(row.ingredient_transaction_key),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  private inflateNPCRelationship(row: Record<string, unknown>): NPCRelationshipRecord {
    const flags = Array.isArray(row.flags) ? row.flags.map(String) : [];
    return {
      householdId: String(row.household_id),
      npcId: String(row.npc_id),
      flags,
      familiarity: Number(row.familiarity ?? 0),
      ...(row.last_interaction ? { lastInteraction: String(row.last_interaction) } : {}),
    };
  }

  private inflateStoryInstance(row: Record<string, unknown>): StoryInstanceRecord {
    return {
      id: String(row.id),
      householdId: String(row.household_id),
      eventId: String(row.event_id),
      state: row.state === 'resolved' ? 'resolved' : 'active',
      ...(row.branch ? { branch: String(row.branch) } : {}),
      taskState: (row.task_state as StoryInstanceRecord['taskState'] | null) ?? {},
      failures: Number(row.failures ?? 0),
      ...(row.memory_tag ? { memoryTag: String(row.memory_tag) } : {}),
      startedAt: String(row.started_at),
      ...(row.resolved_at ? { resolvedAt: String(row.resolved_at) } : {}),
    };
  }

  private inflateMemory(row: Record<string, unknown>): MemoryRecord {
    const rawParticipants = Array.isArray(row.participants) ? row.participants : [];
    return {
      id: String(row.id),
      idempotencyKey: String(row.idempotency_key),
      householdId: String(row.household_id),
      type: normalizeMemoryType(row.type),
      screenshotPath: String(row.screenshot_path ?? ''),
      caption: String(row.caption ?? ''),
      locationId: String(row.location_id ?? 'unknown'),
      weather: String(row.weather ?? 'unknown'),
      participants: rawParticipants.map(String),
      ...(row.event_id ? { eventId: String(row.event_id) } : {}),
      metadata: (row.metadata as Record<string, unknown> | null) ?? {},
      createdAt: String(row.created_at),
    };
  }

  private inflateTransaction(row: Record<string, unknown>): TransactionRecord {
    const type = row.type === 'job_payout' || row.type === 'deposit' || row.type === 'refund' || row.type === 'inventory_consumption' || row.type === 'moving' || row.type === 'renovation' ? row.type : 'purchase';
    return {
      id: String(row.id),
      idempotencyKey: String(row.idempotency_key),
      householdId: String(row.household_id),
      userId: String(row.user_id),
      walletType: row.wallet_type === 'household' ? 'household' : 'personal',
      amount: Number(row.amount),
      type,
      ...(row.item_ref ? { itemRef: String(row.item_ref) } : {}),
      metadata: (row.metadata as Record<string, unknown> | null) ?? {},
      createdAt: String(row.created_at),
    };
  }

  async saveVote(vote: VoteRecord): Promise<void> {
    const { error } = await this.client.from('votes').upsert({
      id: vote.id,
      household_id: vote.householdId,
      type: vote.type,
      payload: vote.payload,
      state: { ballots: vote.ballots, resolution: vote.resolution, createdAt: vote.createdAt },
      expires_at: vote.expiresAt ?? null,
    });
    if (error) throw error;
  }

  async getVote(id: string): Promise<VoteRecord | null> {
    const { data, error } = await this.client.from('votes').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? this.inflateVote(data) : null;
  }

  async getLatestVote(householdId: string, type: VoteRecord['type']): Promise<VoteRecord | null> {
    const { data, error } = await this.client
      .from('votes')
      .select('*')
      .eq('household_id', householdId)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? this.inflateVote(data) : null;
  }

  private inflateVote(row: Record<string, unknown>): VoteRecord {
    const state = (row.state as Record<string, unknown> | null) ?? {};
    const ballots = (state.ballots as Record<string, 'yes' | 'no'> | null) ?? {};
    const resolution = state.resolution;
    return {
      id: String(row.id),
      householdId: String(row.household_id),
      type: normalizeVoteType(row.type),
      payload: (row.payload as Record<string, unknown> | null) ?? {},
      ballots,
      resolution: resolution === 'approved' || resolution === 'rejected' || resolution === 'tied' ? resolution : 'pending',
      createdAt: typeof state.createdAt === 'string' ? state.createdAt : new Date(0).toISOString(),
      ...(row.expires_at ? { expiresAt: String(row.expires_at) } : {}),
    };
  }

  private async inflate(row: Record<string, unknown>): Promise<HouseholdRecord> {
    const householdId = String(row.id);
    const { data: memberRows, error } = await this.client
      .from('household_members')
      .select('*')
      .eq('household_id', householdId);
    if (error) throw error;
    const members: HouseholdMemberRecord[] = (memberRows ?? []).map((member) => ({
      userId: String(member.user_id),
      personalWallet: Number(member.personal_wallet ?? 1500),
      membershipState: member.membership_state === 'left' ? 'left' : 'active',
      ...(member.bedroom_id ? { bedroomId: String(member.bedroom_id) } : {}),
      joinedAt: String(member.joined_at),
    }));
    return {
      id: householdId,
      type: row.type === 'friends' ? 'friends' : 'couple',
      name: String(row.name),
      inviteCode: String(row.invite_code),
      ...(row.property_id ? { propertyId: String(row.property_id) } : {}),
      stage: Number(row.stage ?? 0),
      sharedWallet: Number(row.shared_wallet ?? 8000),
      hiddenState: (row.hidden_state as Record<string, unknown> | null) ?? {},
      activeTimeSeconds: Number(row.active_time_seconds ?? 0),
      createdAt: String(row.created_at),
      members,
    };
  }
}



function inflateJobSession(row: Record<string, unknown>): JobSessionRecord {
  return {
    id: String(row.id),
    startIdempotencyKey: String(row.start_idempotency_key),
    householdId: String(row.household_id),
    userId: String(row.user_id),
    jobId: String(row.job_id) as JobSessionRecord['jobId'],
    state: row.state === 'complete' ? 'complete' : 'active',
    completedActions: Array.isArray(row.completed_actions) ? row.completed_actions.map(String) : [],
    mistakes: Number(row.mistakes ?? 0),
    startedAt: String(row.started_at),
    updatedAt: String(row.updated_at),
  };
}


function normalizeNotePlacement(value: unknown): HouseholdNoteRecord['placement'] {
  if (value === 'corkboard' || value === 'desk' || value === 'door') return value;
  return 'fridge';
}

function normalizeVoteType(value: unknown): VoteRecord['type'] {
  if (value === 'moving' || value === 'renovation' || value === 'shared_purchase' || value === 'sleep') return value;
  return 'property';
}

function normalizeMemoryType(value: unknown): MemoryRecord['type'] {
  if (value === 'automatic' || value === 'story' || value === 'milestone' || value === 'moving') return value;
  return 'manual';
}
