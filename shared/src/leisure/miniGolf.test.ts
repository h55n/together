import test from 'node:test';
import assert from 'node:assert/strict';
import { MINI_GOLF_HOLES, simulateGolfShot, createGolfRound, acceptGolfShot } from './miniGolf.js';

test('six canonical greens have separate centers and safe tees/cups', () => {
  assert.equal(MINI_GOLF_HOLES.length, 6);
  assert.equal(new Set(MINI_GOLF_HOLES.map(hole => JSON.stringify(hole.center))).size, 6);
  for (const hole of MINI_GOLF_HOLES) {
    assert.ok(Math.abs(hole.tee.x) < hole.halfWidth);
    assert.ok(Math.abs(hole.cup.x) < hole.halfWidth);
  }
});

test('an underpowered putt misses and settles without completing a hole', () => {
  const hole = MINI_GOLF_HOLES[0]!;
  const result = simulateGolfShot(hole, hole.tee, { angle: 0, power: 0.001 });
  assert.equal(result.captured, false);
  assert.ok(result.ball.x < hole.cup.x - 0.2);
  assert.ok(result.trace.every(point => Number.isFinite(point.x) && Number.isFinite(point.z)));
});

test('a gentle cup crossing captures, while a hard shot first rolls over the cup', () => {
  const hole = MINI_GOLF_HOLES[0]!;
  const origin = { x: hole.cup.x - 0.05, z: hole.cup.z };
  assert.equal(simulateGolfShot(hole, origin, { angle: 0, power: 0.01 }).captured, true);
  const hard = simulateGolfShot(hole, origin, { angle: 0, power: 1 });
  assert.ok(hard.trace[1]!.x > hole.cup.x);
});

test('identical inputs produce identical bounded rail/corner rolling traces', () => {
  const hole = MINI_GOLF_HOLES[2]!;
  const input = { angle: Math.PI / 4, power: 1 };
  const a = simulateGolfShot(hole, hole.tee, input);
  assert.deepEqual(a, simulateGolfShot(hole, hole.tee, input));
  assert.ok(a.trace.some(point => Math.abs(point.z) > 1));
  assert.ok(a.trace.every(point => Math.abs(point.x) <= hole.halfWidth - 0.11 && Math.abs(point.z) <= hole.halfDepth - 0.11));
});

test('invalid aim/power and out-of-bounds position never become accepted shots', () => {
  const hole = MINI_GOLF_HOLES[0]!;
  for (const power of [NaN, Infinity, 0, -1, 1.1])
    assert.throws(() => simulateGolfShot(hole, hole.tee, { angle: 0, power }));
  assert.throws(() => simulateGolfShot(hole, hole.tee, { angle: NaN, power: 0.5 }));
  assert.throws(() => simulateGolfShot(hole, { x: 99, z: 0 }, { angle: 0, power: 0.5 }));
});

test('turns and identical lost-reply retry do not duplicate a stroke', () => {
  let round = createGolfRound(['u1', 'u2']);
  const intent = { key: 'first-shot-key', expectedRevision: 0, angle: 0, power: 0.001 };
  assert.throws(() => acceptGolfShot(round, 'u2', intent), /turn/);
  round = acceptGolfShot(round, 'u1', intent);
  assert.equal(round.turn, 'u2'); assert.equal(round.strokes.u1![0], 1);
  assert.strictEqual(acceptGolfShot(round, 'u1', intent), round);
  assert.throws(() => acceptGolfShot(round, 'u1', { ...intent, power: 0.2 }), /different inputs/);
  assert.throws(() => acceptGolfShot(round, 'u2', { ...intent, key: 'second-shot-key' }), /changed/);
});

test('a hole waits for both players and the course only completes on six captured holes', () => {
  let round = createGolfRound(['u1', 'u2']);
  for (let hole = 0; hole < 6; hole++) {
    for (const [playerIndex, userId] of ['u1', 'u2'].entries()) {
      const cup = MINI_GOLF_HOLES[hole]!.cup;
      // A valid settled near-cup fixture isolates round progression from aiming.
      round = { ...round, balls: { ...round.balls, [userId]: { x: cup.x - 0.05, z: cup.z } } };
      round = acceptGolfShot(round, userId, { key: 'shot-' + hole + '-' + userId, expectedRevision: round.revision, angle: 0, power: 0.01 });
      if (playerIndex === 0) assert.equal(round.hole, hole);
      assert.equal(round.status, hole === 5 && playerIndex === 1 ? 'complete' : 'active');
    }
  }
  assert.deepEqual(round.strokes.u1, [1, 1, 1, 1, 1, 1]);
  assert.deepEqual(round.strokes.u2, [1, 1, 1, 1, 1, 1]);
  assert.equal(round.revision, 12);
});

test('terrain slope changes roll and slow segment crossing captures between samples', () => {
  const hole = MINI_GOLF_HOLES[0]!;
  const flat = { ...hole, center: { x: 1000, z: 1000 } };
  const downhill = simulateGolfShot(hole, hole.tee, { angle: 0, power: 0.3 });
  const level = simulateGolfShot(flat, flat.tee, { angle: 0, power: 0.3 });
  assert.notDeepEqual(downhill.ball, level.ball);
  const crossing = simulateGolfShot(flat, { x: flat.cup.x - 0.125, z: flat.cup.z }, { angle: 0, power: 0.05 });
  assert.equal(crossing.captured, true);
  assert.deepEqual(crossing.ball, flat.cup);
});

test('accepted miss preserves previous state and next shot starts at its settled ball', () => {
  const original = createGolfRound(['solo']);
  const copy = structuredClone(original);
  const next = acceptGolfShot(original, 'solo', { key: 'miss', expectedRevision: 0, angle: 1, power: 0.1 });
  assert.deepEqual(original, copy);
  assert.equal(next.turn, 'solo');
  const second = acceptGolfShot(next, 'solo', { key: 'next', expectedRevision: 1, angle: 0, power: 0.1 });
  assert.deepEqual(second.lastShot!.result.trace[0], { ...next.balls.solo!, seconds: 0 });
  assert.equal(second.strokes.solo![0], 2);
  assert.throws(() => acceptGolfShot(next, 'outsider', { key: 'bad', expectedRevision: 1, angle: 0, power: 0.1 }), /not in/);
});

test('roster and command limits reject malformed authority inputs', () => {
  for (const players of [[], ['same', 'same'], [''], Array.from({ length: 7 }, (_, i) => String(i))])
    assert.throws(() => createGolfRound(players));
  const round = createGolfRound(['solo']);
  for (const expectedRevision of [-1, 0.5, NaN])
    assert.throws(() => acceptGolfShot(round, 'solo', { key: 'shot', expectedRevision, angle: 0, power: 0.1 }));
  assert.throws(() => simulateGolfShot(MINI_GOLF_HOLES[0]!, MINI_GOLF_HOLES[0]!.tee, { angle: 4, power: 0.1 }));
});
