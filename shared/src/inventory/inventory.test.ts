import assert from 'node:assert/strict';
import test from 'node:test';
import { addInventoryQuantity, consumeInventoryRequirements, type InventoryStack } from './inventory.js';

test('inventory stacks merge quantities without mutating the original collection', () => {
  const original: InventoryStack[] = [{ itemId: 'rice', quantity: 2, metadata: {} }];
  const next = addInventoryQuantity(original, 'rice', 3);
  assert.equal(original[0]?.quantity, 2);
  assert.deepEqual(next, [{ itemId: 'rice', quantity: 5, metadata: {} }]);
});

test('recipe consumption is atomic and never drives an ingredient below zero', () => {
  const inventory: InventoryStack[] = [
    { itemId: 'rice', quantity: 2, metadata: {} },
    { itemId: 'lentils', quantity: 1, metadata: {} },
  ];
  const consumed = consumeInventoryRequirements(inventory, [
    { itemId: 'rice', quantity: 1 },
    { itemId: 'lentils', quantity: 1 },
  ]);
  assert.equal(consumed.ok, true);
  if (consumed.ok) assert.deepEqual(consumed.inventory, [{ itemId: 'rice', quantity: 1, metadata: {} }]);

  const missing = consumeInventoryRequirements(inventory, [{ itemId: 'lentils', quantity: 2 }]);
  assert.deepEqual(missing, { ok: false, missing: [{ itemId: 'lentils', required: 2, available: 1 }] });
  assert.equal(inventory[1]?.quantity, 1);
});

test('optional recipe ingredients do not block cooking when absent', () => {
  const result = consumeInventoryRequirements(
    [{ itemId: 'tea', quantity: 1, metadata: {} }],
    [{ itemId: 'tea', quantity: 1 }, { itemId: 'sugar', quantity: 1, optional: true }],
  );
  assert.equal(result.ok, true);
});
