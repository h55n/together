import { addInventoryQuantity, applyWalletTransaction, consumeInventoryRequirements, type InventoryRequirement, type InventoryStack, type RecipeDefinition } from '@together/shared';
import type { GameRepository, HouseholdRecord, InventoryRecord, TransactionRecord } from '../db/GameRepository.js';

type MarketItem = { id: string; price: number };
type InventoryCatalog = { items: readonly MarketItem[]; recipes: readonly RecipeDefinition[] };

type GroceryPurchase = {
  itemId: string;
  quantity: number;
  wallet: 'personal' | 'household';
  idempotencyKey: string;
};

export type InventorySnapshot = {
  sharedWallet: number;
  personalWallet: number;
  inventory: InventoryRecord[];
  transaction?: TransactionRecord;
};

export class InventoryService {
  constructor(private readonly repository: GameRepository, private readonly catalog: InventoryCatalog) {}

  async listHouseholdInventory(householdId: string, userId: string): Promise<InventoryRecord[]> {
    await this.authorize(householdId, userId);
    return this.repository.listInventory('household', householdId);
  }

  async purchaseGrocery(householdId: string, userId: string, request: GroceryPurchase): Promise<InventorySnapshot> {
    const quantity = Number.isFinite(request.quantity) ? Math.floor(request.quantity) : 0;
    if (quantity < 1 || quantity > 99) throw new Error('Invalid grocery quantity');
    if (request.idempotencyKey.length < 8) throw new Error('Invalid idempotency key');
    const item = this.catalog.items.find((candidate) => candidate.id === request.itemId);
    if (!item || !Number.isFinite(item.price) || item.price <= 0) throw new Error('Unknown grocery item');

    const existing = await this.repository.getTransactionByIdempotencyKey(request.idempotencyKey);
    if (existing) return this.snapshot(householdId, userId, existing);

    const household = await this.authorize(householdId, userId);
    const total = Math.round(item.price * quantity);
    if (request.wallet === 'household') {
      const result = applyWalletTransaction(household.sharedWallet, -total);
      if (!result.ok) throw new Error('Insufficient household funds');
      household.sharedWallet = result.balance;
    } else {
      const member = household.members.find((candidate) => candidate.userId === userId)!;
      const result = applyWalletTransaction(member.personalWallet, -total);
      if (!result.ok) throw new Error('Insufficient personal funds');
      member.personalWallet = result.balance;
    }

    const current = await this.repository.listInventory('household', householdId);
    const stacks: InventoryStack[] = current.map((record) => ({ itemId: record.itemId, quantity: record.quantity, metadata: record.metadata }));
    const updated = addInventoryQuantity(stacks, item.id, quantity);
    await this.repository.saveHousehold(household);
    await this.persistHouseholdInventory(householdId, current, updated);
    const transaction: TransactionRecord = {
      id: crypto.randomUUID(), idempotencyKey: request.idempotencyKey, householdId, userId,
      walletType: request.wallet, amount: -total, type: 'purchase', itemRef: item.id,
      metadata: { category: 'grocery', quantity, unitPrice: item.price }, createdAt: new Date().toISOString(),
    };
    await this.repository.saveTransaction(transaction);
    return this.snapshot(householdId, userId, transaction);
  }

  /** Charges the payer's personal wallet once per key and adds the purchased item to household shelves. */
  async purchaseCafeDrink(householdId: string, userId: string, request: { itemId: string; price: number; idempotencyKey: string; metadata?: Record<string, unknown> }): Promise<InventorySnapshot> {
    if (request.idempotencyKey.length < 8) throw new Error('Invalid idempotency key');
    if (!Number.isFinite(request.price) || request.price <= 0 || !Number.isInteger(request.price)) throw new Error('Invalid café price');
    const existing = await this.repository.getTransactionByIdempotencyKey(request.idempotencyKey);
    if (existing) return this.snapshot(householdId, userId, existing);
    const household = await this.authorize(householdId, userId);
    const member = household.members.find((candidate) => candidate.userId === userId)!;
    const result = applyWalletTransaction(member.personalWallet, -request.price);
    if (!result.ok) throw new Error('Insufficient personal funds');
    member.personalWallet = result.balance;
    const current = await this.repository.listInventory('household', householdId);
    const stacks: InventoryStack[] = current.map((record) => ({ itemId: record.itemId, quantity: record.quantity, metadata: record.metadata }));
    const updated = addInventoryQuantity(stacks, request.itemId, 1);
    await this.repository.saveHousehold(household);
    await this.persistHouseholdInventory(householdId, current, updated);
    const transaction: TransactionRecord = {
      id: crypto.randomUUID(), idempotencyKey: request.idempotencyKey, householdId, userId,
      walletType: 'personal', amount: -request.price, type: 'purchase', itemRef: request.itemId,
      metadata: { category: 'cafe', ...request.metadata }, createdAt: new Date().toISOString(),
    };
    await this.repository.saveTransaction(transaction);
    return this.snapshot(householdId, userId, transaction);
  }

  async consumeRecipeIngredients(householdId: string, userId: string, recipeId: string, idempotencyKey: string): Promise<InventorySnapshot> {
    const recipe = this.catalog.recipes.find((candidate) => candidate.id === recipeId);
    if (!recipe) throw new Error('Unknown recipe');
    return this.consumeProvisions(householdId, userId, recipe.ingredients, idempotencyKey, { recipeId }, recipeId);
  }

  /** Spends household items once per idempotency key; an exact retry returns the original receipt without spending again. */
  async consumeProvisions(householdId: string, userId: string, requirements: readonly InventoryRequirement[], idempotencyKey: string, metadata: Record<string, unknown>, itemRef: string): Promise<InventorySnapshot> {
    if (idempotencyKey.length < 8) throw new Error('Invalid idempotency key');
    const existing = await this.repository.getTransactionByIdempotencyKey(idempotencyKey);
    if (existing) return this.snapshot(householdId, userId, existing);
    await this.authorize(householdId, userId);
    const current = await this.repository.listInventory('household', householdId);
    const stacks: InventoryStack[] = current.map((record) => ({ itemId: record.itemId, quantity: record.quantity, metadata: record.metadata }));
    const result = consumeInventoryRequirements(stacks, requirements);
    if (!result.ok) {
      const description = result.missing.map((entry) => `${entry.itemId} ${entry.available}/${entry.required}`).join(', ');
      throw new Error(`Missing ingredients: ${description}`);
    }
    await this.persistHouseholdInventory(householdId, current, result.inventory);
    const transaction: TransactionRecord = {
      id: crypto.randomUUID(), idempotencyKey, householdId, userId, walletType: 'household', amount: 0,
      type: 'inventory_consumption', itemRef, metadata, createdAt: new Date().toISOString(),
    };
    await this.repository.saveTransaction(transaction);
    return this.snapshot(householdId, userId, transaction);
  }

  /** Adds household items once per idempotency key (for example a finished dish); an exact retry adds nothing. */
  async addProvisions(householdId: string, userId: string, additions: readonly { itemId: string; quantity: number }[], idempotencyKey: string, metadata: Record<string, unknown>, itemRef: string): Promise<InventorySnapshot> {
    if (idempotencyKey.length < 8) throw new Error('Invalid idempotency key');
    const existing = await this.repository.getTransactionByIdempotencyKey(idempotencyKey);
    if (existing) return this.snapshot(householdId, userId, existing);
    await this.authorize(householdId, userId);
    const current = await this.repository.listInventory('household', householdId);
    let stacks: InventoryStack[] = current.map((record) => ({ itemId: record.itemId, quantity: record.quantity, metadata: record.metadata }));
    for (const addition of additions) stacks = addInventoryQuantity(stacks, addition.itemId, addition.quantity);
    await this.persistHouseholdInventory(householdId, current, stacks);
    const transaction: TransactionRecord = {
      id: crypto.randomUUID(), idempotencyKey, householdId, userId, walletType: 'household', amount: 0,
      type: 'inventory_consumption', itemRef, metadata: { ...metadata, added: true }, createdAt: new Date().toISOString(),
    };
    await this.repository.saveTransaction(transaction);
    return this.snapshot(householdId, userId, transaction);
  }

  private async persistHouseholdInventory(householdId: string, previous: readonly InventoryRecord[], next: readonly InventoryStack[]) {
    const nextById = new Map(next.map((stack) => [stack.itemId, stack]));
    for (const prior of previous) {
      if (!nextById.has(prior.itemId)) await this.repository.saveInventory({ ...prior, quantity: 0 });
    }
    for (const stack of next) {
      await this.repository.saveInventory({ ownerType: 'household', ownerId: householdId, itemId: stack.itemId, quantity: stack.quantity, metadata: { ...stack.metadata } });
    }
  }

  private async snapshot(householdId: string, userId: string, transaction?: TransactionRecord): Promise<InventorySnapshot> {
    const household = await this.authorize(householdId, userId);
    const member = household.members.find((candidate) => candidate.userId === userId)!;
    return {
      sharedWallet: household.sharedWallet,
      personalWallet: member.personalWallet,
      inventory: await this.repository.listInventory('household', householdId),
      ...(transaction ? { transaction } : {}),
    };
  }

  private async authorize(householdId: string, userId: string): Promise<HouseholdRecord> {
    const household = await this.repository.getHousehold(householdId);
    if (!household) throw new Error('Household not found');
    if (!household.members.some((member) => member.userId === userId && member.membershipState === 'active')) throw new Error('User is not an active household member');
    return household;
  }
}
