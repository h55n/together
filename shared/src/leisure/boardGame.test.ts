import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptBoardGameCommand, createBoardGame, type BoardGameState } from './boardGame.js';

const flip = (state: BoardGameState, user: string, index: number) => acceptBoardGameCommand(state, user,
  { key: 'flip-' + state.revision, expectedRevision: state.revision, kind: 'flip', index });

test('seeded illustrated deck has exactly six pairs and survives serialization', () => {
  const a = createBoardGame(['a', 'b'], 42);
  assert.deepEqual(a, createBoardGame(['a', 'b'], 42));
  assert.notDeepEqual(a.cards, createBoardGame(['a', 'b'], 43).cards);
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  assert.equal(a.cards.length, 12);
  for (let pair = 0; pair < 6; pair++) assert.equal(a.cards.filter(card => card.pair === pair).length, 2);
});
test('mismatch reveals two cards until explicit continue and rotates after the attempt', () => {
  const original = createBoardGame(['a', 'b'], 8), copy = structuredClone(original);
  const first = flip(original, 'a', 0);
  const other = original.cards.findIndex(card => card.pair !== original.cards[0]!.pair);
  const missed = flip(first, 'a', other);
  assert.deepEqual(original, copy); assert.equal(first.attempts, 0);
  assert.equal(missed.phase, 'mismatch'); assert.deepEqual(missed.revealed, [0, other]);
  assert.equal(missed.attempts, 1); assert.equal(missed.turn, 'b');
  assert.throws(() => flip(missed, 'b', 11), /Continue|face-down/);
  const next = acceptBoardGameCommand(missed, 'b', { key: 'continue', expectedRevision: missed.revision, kind: 'continue' });
  assert.deepEqual(next.revealed, []); assert.equal(next.turn, 'b'); assert.equal(next.attempts, 1);
});
test('only finding every pair completes the shared table, with six accepted attempts', () => {
  let state = createBoardGame(['a', 'b'], 8);
  for (let pair = 0; pair < 6; pair++) {
    const indices = state.cards.flatMap((card, index) => card.pair === pair ? [index] : []);
    const player = state.turn!;
    state = flip(state, player, indices[0]!); state = flip(state, player, indices[1]!);
    assert.equal(state.phase, pair === 5 ? 'complete' : 'awaiting_first');
  }
  assert.equal(state.matched.length, 12); assert.equal(state.attempts, 6);
  assert.equal(state.revision, 12); assert.equal(state.turn, null);
  assert.throws(() => flip(state, 'a', 0), /six pairs/);
});
test('turn, stale revision, matched card, invalid inputs and premature continue are rejected', () => {
  const initial = createBoardGame(['a', 'b'], 9);
  assert.throws(() => flip(initial, 'b', 0), /turn/);
  assert.throws(() => flip(initial, 'outsider', 0), /Join/);
  for (const index of [-1, 12, NaN, 0.5]) assert.throws(() => flip(initial, 'a', index));
  assert.throws(() => acceptBoardGameCommand(initial, 'a', { key: 'early', expectedRevision: 0, kind: 'continue' }));
  const first = flip(initial, 'a', 0);
  assert.throws(() => flip(first, 'a', 0), /face-down/);
  assert.throws(() => acceptBoardGameCommand(first, 'a', { key: 'stale', expectedRevision: 0, kind: 'flip', index: 1 }), /changed/);
  const matching = initial.cards.findIndex((card, index) => index !== 0 && card.pair === initial.cards[0]!.pair);
  const paired = flip(first, 'a', matching);
  assert.throws(() => flip(paired, 'b', 0), /face-down/);
  for (const players of [[], ['a', 'a'], ['']]) assert.throws(() => createBoardGame(players, 1));
  assert.throws(() => createBoardGame(['a'], NaN));
});
