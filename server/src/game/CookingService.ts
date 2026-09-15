import {
  claimCookingStation,
  completeCookingStep,
  createCookingSession,
  releaseCookingStation,
  type RecipeDefinition,
} from '@together/shared';
import type { CookingSessionRecord, GameRepository, HouseholdRecord } from '../db/GameRepository.js';
import type { InventoryService } from './InventoryService.js';

export class CookingService {
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
    const session = await this.sessionForMember(householdId, userId, sessionId);
    session.state = claimCookingStation(session.state, userId, station);
    return this.save(session);
  }

  async releaseStation(householdId: string, userId: string, sessionId: string, station: string): Promise<CookingSessionRecord> {
    const session = await this.sessionForMember(householdId, userId, sessionId);
    session.state = releaseCookingStation(session.state, userId, station);
    return this.save(session);
  }

  async completeStep(householdId: string, userId: string, sessionId: string, stepId: string, mistake: boolean): Promise<CookingSessionRecord> {
    const session = await this.sessionForMember(householdId, userId, sessionId);
    session.state = completeCookingStep(this.recipe(session.recipeId), session.state, userId, stepId, mistake);
    return this.save(session);
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
