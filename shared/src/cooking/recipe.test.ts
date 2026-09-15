import assert from 'node:assert/strict';
import test from 'node:test';
import { validateRecipeGraph, resolveRecipeOutcome, type RecipeDefinition } from './recipe.js';

const chai: RecipeDefinition = {
  id: 'chai', displayName: 'Chai', servings: 2,
  ingredients: [{ itemId: 'milk', quantity: 1 }, { itemId: 'tea', quantity: 1 }],
  tools: ['kettle', 'saucepan'],
  steps: [
    { id: 'boil', action: 'boil', station: 'hob', dependsOn: [] },
    { id: 'stir', action: 'stir', station: 'hob', dependsOn: ['boil'] },
    { id: 'serve', action: 'pour', station: 'counter', dependsOn: ['stir'] },
  ],
  outcomes: [
    { id: 'comforting', maxMistakes: 0, quality: 'good' },
    { id: 'still_chai', maxMistakes: 3, quality: 'imperfect' },
  ],
};

test('recipe graphs require valid acyclic dependencies', () => {
  assert.deepEqual(validateRecipeGraph(chai), []);
  const broken = structuredClone(chai);
  broken.steps[0]!.dependsOn = ['serve'];
  assert.ok(validateRecipeGraph(broken).some((issue) => issue.includes('cycle')));
});

test('cooking mistakes produce alternate edible outcomes rather than mission failure', () => {
  assert.equal(resolveRecipeOutcome(chai, 0)?.id, 'comforting');
  assert.equal(resolveRecipeOutcome(chai, 2)?.id, 'still_chai');
});
