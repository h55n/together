import {
  cookedDishItemId,
  claimCookingStation,
  completeCookingStep,
  createCookingSession,
  releaseCookingStation,
  type RecipeDefinition,
} from '@together/shared';
import type { CookingSessionRecord, GameRepository, HouseholdRecord } from '../db/GameRepository.js';
import type { InventoryService } from './InventoryService.js';

export class CookingService {
  private readonly sessionMutationTails = new Map<string, Promise<void>>();

  constructor(
    private readonly repository: GameRepository,
    private readonly inventory: InventoryService,
    private readonly recipes: readonly RecipeDefinition[],
  ) {}

  async start(householdId: string, userId: string, recipeId: string, idempotencyKey: string): Promise<CookingSessionRecord> {
    if (idempotencyKey.length < 8) throw new Error('Invalid idempotency key');
    await this.authorize(householdId, userId);
    const existing = await this.repository.getCookingSessionByIdempotencyKey(idempotencyKey);
    if (existing) {
      if (existing.householdId !== householdId) throw new Error('Idempotency key belongs to another household');
      return existing;
    }
    const recipe = this.recipe(recipeId);
    const ingredientTransactionKey = `${idempotencyKey}:ingredients`;
    await this.inventory.consumeRecipeIngredients(householdId, userId, recipe.id, ingredientTransactionKey);
    const now = new Date().toISOString();
    const session: CookingSessionRecord = {
      id: crypto.randomUUID(),
      idempotencyKey,
      householdId,
      recipeId: recipe.id,
      state: createCookingSession(crypto.randomUUID(), recipe),
      ingredientTransactionKey,
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.saveCookingSession(session);
    return session;
  }

  async list(householdId: string, userId: string): Promise<CookingSessionRecord[]> {
    await this.authorize(householdId, userId);
    return this.repository.listCookingSessions(householdId);
  }

  async claimStation(householdId: string, userId: string, sessionId: string, station: string): Promise<CookingSessionRecord> {
    return this.withSessionMutation(sessionId, async () => {
      const session = await this.sessionForMember(householdId, userId, sessionId);
      session.state = claimCookingStation(session.state, userId, station);
      return this.save(session);
    });
  }

  async releaseStation(householdId: string, userId: string, sessionId: string, station: string): Promise<CookingSessionRecord> {
    return this.withSessionMutation(sessionId, async () => {
      const session = await this.sessionForMember(householdId, userId, sessionId);
      session.state = releaseCookingStation(session.state, userId, station);
      return this.save(session);
    });
  }

  async completeStep(householdId: string, userId: string, sessionId: string, stepId: string, mistake: boolean): Promise<CookingSessionRecord> {
    return this.withSessionMutation(sessionId, async () => {
      const session = await this.sessionForMember(householdId, userId, sessionId);
      const recipe = this.recipe(session.recipeId);
      const wasComplete = session.state.status === 'completed';
      session.state = completeCookingStep(recipe, session.state, userId, stepId, mistake);
      if (!wasComplete && session.state.status === 'completed') {
        // Grant the dish before saving; the keyed grant is replay-safe if the save must be retried.
        await this.inventory.addProvisions(householdId, userId, [{ itemId: cookedDishItemId(recipe.id), quantity: recipe.servings }],
          `${session.id}:dish`, { sessionId: session.id, outcome: session.state.outcome?.id ?? null }, recipe.id);
      }
      return this.save(session);
    });
  }

  private async withSessionMutation<T>(sessionId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.sessionMutationTails.get(sessionId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const tail = previous.catch(() => undefined).then(() => gate);
    this.sessionMutationTails.set(sessionId, tail);

    await previous.catch(() => undefined);
    try {
      return await operation();
    } finally {
      release();
      if (this.sessionMutationTails.get(sessionId) === tail) this.sessionMutationTails.delete(sessionId);
    }
  }

  private async save(session: CookingSessionRecord): Promise<CookingSessionRecord> {
    session.updatedAt = new Date().toISOString();
    await this.repository.saveCookingSession(session);
    return session;
  }

  private async sessionForMember(householdId: string, userId: string, sessionId: string): Promise<CookingSessionRecord> {
    await this.authorize(householdId, userId);
    const session = await this.repository.getCookingSession(sessionId);
    if (!session || session.householdId !== householdId) throw new Error('Cooking session not found');
    return session;
  }

  private recipe(id: string): RecipeDefinition {
    const recipe = this.recipes.find((candidate) => candidate.id === id);
    if (!recipe) throw new Error('Unknown recipe');
    return recipe;
  }

  private async authorize(householdId: string, userId: string): Promise<HouseholdRecord> {
    const household = await this.repository.getHousehold(householdId);
    if (!household) throw new Error('Household not found');
    if (!household.members.some((member) => member.userId === userId && member.membershipState === 'active')) throw new Error('User is not an active household member');
    return household;
  }
}
