export type InventoryStack = {
  itemId: string;
  quantity: number;
  metadata: Record<string, unknown>;
};

export type InventoryRequirement = {
  itemId: string;
  quantity: number;
  optional?: boolean;
};

export type InventoryConsumeResult =
  | { ok: true; inventory: InventoryStack[] }
  | { ok: false; missing: { itemId: string; required: number; available: number }[] };

function normalizedQuantity(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function addInventoryQuantity(
  inventory: readonly InventoryStack[],
  itemId: string,
  quantity: number,
  metadata: Record<string, unknown> = {},
): InventoryStack[] {
  const amount = normalizedQuantity(quantity);
  if (!itemId || amount === 0) return inventory.map((stack) => ({ ...stack, metadata: { ...stack.metadata } }));
  const next = inventory.map((stack) => ({ ...stack, metadata: { ...stack.metadata } }));
  const existing = next.find((stack) => stack.itemId === itemId);
  if (existing) existing.quantity += amount;
  else next.push({ itemId, quantity: amount, metadata: { ...metadata } });
  return next;
}

export function consumeInventoryRequirements(
  inventory: readonly InventoryStack[],
  requirements: readonly InventoryRequirement[],
): InventoryConsumeResult {
  const requiredByItem = new Map<string, number>();
  for (const requirement of requirements) {
    if (requirement.optional) continue;
    const quantity = normalizedQuantity(requirement.quantity);
    if (quantity === 0) continue;
    requiredByItem.set(requirement.itemId, (requiredByItem.get(requirement.itemId) ?? 0) + quantity);
  }

  const availableByItem = new Map<string, number>();
  for (const stack of inventory) {
    availableByItem.set(stack.itemId, (availableByItem.get(stack.itemId) ?? 0) + normalizedQuantity(stack.quantity));
  }

  const missing = [...requiredByItem.entries()]
    .map(([itemId, required]) => ({ itemId, required, available: availableByItem.get(itemId) ?? 0 }))
    .filter((entry) => entry.available < entry.required);
  if (missing.length > 0) return { ok: false, missing };

  const remaining = new Map(requiredByItem);
  const next: InventoryStack[] = [];
  for (const stack of inventory) {
    const take = Math.min(remaining.get(stack.itemId) ?? 0, normalizedQuantity(stack.quantity));
    const quantity = normalizedQuantity(stack.quantity) - take;
    if (take > 0) remaining.set(stack.itemId, (remaining.get(stack.itemId) ?? 0) - take);
    if (quantity > 0) next.push({ ...stack, quantity, metadata: { ...stack.metadata } });
  }
  return { ok: true, inventory: next };
}
