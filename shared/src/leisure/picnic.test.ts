import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptPicnicCommand, createPicnicState } from './picnic.js';

const command = (state: ReturnType<typeof createPicnicState>, key: string, kind: 'place_mat' | 'place_item' | 'bring_food' | 'serve_food' | 'eat_food' | 'finish', values: Record<string, unknown> = {}) =>
  acceptPicnicCommand(state, 'a', ['a', 'b'], { key, expectedRevision: state.revision, kind, ...values } as never);

test('picnic lets household members place a mat, bring food, serve it and eat persistently', () => {
  let state = createPicnicState(['a', 'b']);
  state = command(state, 'mat', 'place_mat', { x: 1.2, z: -0.6 });
  state = command(state, 'flowers', 'place_item', { item: 'flowers', x: 0.4, z: 0.2 });
  state = command(state, 'mangoes', 'bring_food', { food: 'mangoes' });
  const portion = state.portions[0]!;
  state = command(state, 'serve', 'serve_food', { portionId: portion.id, recipientId: 'b' });
  assert.equal(state.portions[0]!.servedTo, 'b');
  state = acceptPicnicCommand(state, 'b', ['a', 'b'], { key: 'eat', expectedRevision: state.revision, kind: 'eat_food', portionId: portion.id });
  assert.equal(state.portions[0]!.eatenBy, 'b');
  assert.equal(state.phase, 'active');
  assert.equal(state.revision, 5);
});

test('picnic retries are idempotent and placement is bounded to the lawn', () => {
  const initial = createPicnicState(['a']);
  const placed = command(initial, 'mat', 'place_mat', { x: 3, z: -3 });
  assert.equal(acceptPicnicCommand(placed, 'a', ['a'], { key: 'mat', expectedRevision: 0, kind: 'place_mat', x: 3, z: -3 }), placed);
  assert.throws(() => command(initial, 'outside', 'place_mat', { x: 3.01, z: 0 }), /lawn/i);
  assert.throws(() => acceptPicnicCommand(placed, 'a', ['a'], { key: 'mat', expectedRevision: 0, kind: 'place_mat', x: 2, z: 0 }), /reused/i);
});

test('picnic can be finished at any time without a quota or forced sequence', () => {
  const state = command(createPicnicState(['a']), 'done', 'finish');
  assert.equal(state.phase, 'finished');
  assert.throws(() => command(state, 'late', 'bring_food', { food: 'chai' }), /finished/i);
});
