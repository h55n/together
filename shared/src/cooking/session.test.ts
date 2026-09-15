import test from 'node:test';
import assert from 'node:assert/strict';
import { createCookingSession, claimCookingStation, completeCookingStep, releaseCookingStation } from './session.js';
import type { RecipeDefinition } from './recipe.js';

const recipe: RecipeDefinition = {
  id: 'fried_rice', displayName: 'Fried Rice', servings: 2,
  ingredients: [{ itemId: 'rice', quantity: 1 }], tools: ['wok','knife'],
  steps: [
    { id: 'wash', action: 'wash', station: 'sink', dependsOn: [], parallelGroup: 'prep' },
    { id: 'cut', action: 'cut', station: 'counter', dependsOn: [], parallelGroup: 'prep' },
    { id: 'boil', action: 'boil', station: 'hob_a', dependsOn: ['wash'] },
    { id: 'fry', action: 'fry', station: 'hob_b', dependsOn: ['cut'] },
    { id: 'stir', action: 'stir', station: 'hob_b', dependsOn: ['boil','fry'] },
  ],
  outcomes: [{ id: 'good', maxMistakes: 0, quality: 'good' }, { id: 'imperfect', minMistakes: 1, quality: 'imperfect' }],
};

test('two players can claim different kitchen stations while one station cannot be double-booked', () => {
  let session = createCookingSession('cook-1', recipe);
  session = claimCookingStation(session, 'player-a', 'sink');
  session = claimCookingStation(session, 'player-b', 'counter');
  assert.equal(session.stationClaims.sink, 'player-a');
  assert.equal(session.stationClaims.counter, 'player-b');
  assert.throws(() => claimCookingStation(session, 'player-b', 'sink'), /occupied/);
});

test('parallel prep steps unlock independent cook steps and final synchronization waits for both branches', () => {
  let session = createCookingSession('cook-2', recipe);
  session = claimCookingStation(session, 'a', 'sink');
  session = completeCookingStep(recipe, session, 'a', 'wash', false);
  session = releaseCookingStation(session, 'a', 'sink');
  session = claimCookingStation(session, 'b', 'counter');
  session = completeCookingStep(recipe, session, 'b', 'cut', false);
  session = releaseCookingStation(session, 'b', 'counter');
  assert.deepEqual(new Set(session.availableStepIds), new Set(['boil','fry']));
  session = claimCookingStation(session, 'a', 'hob_a');
  session = completeCookingStep(recipe, session, 'a', 'boil', false);
  assert.equal(session.availableStepIds.includes('stir'), false);
  session = claimCookingStation(session, 'b', 'hob_b');
  session = completeCookingStep(recipe, session, 'b', 'fry', true);
  assert.equal(session.availableStepIds.includes('stir'), true);
  assert.equal(session.mistakes, 1);
});

test('a player must own the step station and cannot complete locked steps', () => {
  let session = createCookingSession('cook-3', recipe);
  assert.throws(() => completeCookingStep(recipe, session, 'a', 'boil', false), /not available/);
  session = claimCookingStation(session, 'a', 'sink');
  assert.throws(() => completeCookingStep(recipe, session, 'b', 'wash', false), /claimed/);
});
