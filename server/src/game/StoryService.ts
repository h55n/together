import { chooseStoryOutcome, storyIsEligible, storyTasksAreResolvable, type StoryDefinition, type StoryTaskStateValue } from '@together/shared';
import type { GameRepository, HouseholdRecord, StoryInstanceRecord } from '../db/GameRepository.js';

export class StoryService {
  private readonly definitions = new Map<string, StoryDefinition>();

  constructor(private readonly repository: GameRepository, definitions: readonly StoryDefinition[]) {
    for (const definition of definitions) this.definitions.set(definition.id, definition);
  }

  async start(householdId: string, userId: string, eventId: string): Promise<StoryInstanceRecord> {
    const household = await this.authorize(householdId, userId);
    const existing = await this.repository.getStoryInstanceByEvent(householdId, eventId);
    if (existing) return existing;
    const definition = this.definition(eventId);
    const flags = this.flags(household);
    if (!storyIsEligible(definition, { path: household.type, stage: household.stage, flags })) {
      throw new Error('Story event is not eligible for this household');
    }
    const startedAt = new Date().toISOString();
    const instance: StoryInstanceRecord = {
      id: crypto.randomUUID(),
      householdId,
      eventId,
      state: 'active',
      taskState: Object.fromEntries(definition.tasks.map((task) => [task.id, 'pending'] as const)),
      failures: 0,
      startedAt,
    };
    await this.repository.saveStoryInstance(instance);
    return instance;
  }

  async updateTask(householdId: string, userId: string, instanceId: string, taskId: string, state: StoryTaskStateValue): Promise<StoryInstanceRecord> {
    await this.authorize(householdId, userId);
    const instance = await this.repository.getStoryInstance(instanceId);
    if (!instance || instance.householdId !== householdId) throw new Error('Story instance not found');
    if (instance.state === 'resolved') throw new Error('Story is already resolved');
    const definition = this.definition(instance.eventId);
    if (!definition.tasks.some((task) => task.id === taskId)) throw new Error('Unknown story task');
    const next: StoryInstanceRecord = { ...instance, taskState: { ...instance.taskState, [taskId]: state } };
    await this.repository.saveStoryInstance(next);
    return next;
  }

  async resolve(householdId: string, userId: string, instanceId: string): Promise<StoryInstanceRecord> {
    const household = await this.authorize(householdId, userId);
    const instance = await this.repository.getStoryInstance(instanceId);
    if (!instance || instance.householdId !== householdId) throw new Error('Story instance not found');
    if (instance.state === 'resolved') return instance;
    const definition = this.definition(instance.eventId);
    if (!storyTasksAreResolvable(definition, instance.taskState)) throw new Error('Story required tasks are not resolved');
    const failures = Object.values(instance.taskState).filter((state) => state === 'failed').length;
    const outcome = chooseStoryOutcome(definition, failures);
    if (!outcome) throw new Error('Story has no matching outcome');

    const flags = { ...this.flags(household), ...(outcome.setFlags ?? {}) };
    household.hiddenState = { ...household.hiddenState, flags };
    await this.repository.saveHousehold(household);

    const resolved: StoryInstanceRecord = {
      ...instance,
      state: 'resolved',
      branch: outcome.id,
      failures: Math.max(0, Math.floor(failures)),
      ...(outcome.memoryTag ? { memoryTag: outcome.memoryTag } : {}),
      resolvedAt: new Date().toISOString(),
    };
    await this.repository.saveStoryInstance(resolved);
    return resolved;
  }

  async list(householdId: string, userId: string): Promise<StoryInstanceRecord[]> {
    await this.authorize(householdId, userId);
    return this.repository.listStoryInstances(householdId);
  }

  async eligible(householdId: string, userId: string): Promise<StoryDefinition[]> {
    const household = await this.authorize(householdId, userId);
    const existing = await this.repository.listStoryInstances(householdId);
    const started = new Set(existing.map((instance) => instance.eventId));
    const flags = this.flags(household);
    return [...this.definitions.values()].filter((definition) => !started.has(definition.id) && storyIsEligible(definition, { path: household.type, stage: household.stage, flags }));
  }

  private definition(id: string): StoryDefinition {
    const definition = this.definitions.get(id);
    if (!definition) throw new Error('Unknown story event');
    return definition;
  }

  private flags(household: HouseholdRecord): Record<string, boolean> {
    const raw = household.hiddenState.flags;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Boolean(value)]));
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
