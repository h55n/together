import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceBadmintonClock, badmintonShuttlePosition, commandBadminton, createBadmintonMatch } from './badminton.js';

test('a normal NPC return leaves a usable timed contact window for an unhurried player', () => {
  const served = commandBadminton(createBadmintonMatch('a', 0), 'a', { id: 'serve', expectedRevision: 0, kind: 'serve' }, 0);
  const returned = advanceBadmintonClock(served, served.flight!.duration * .78 + 1);
  const flight = returned.flight!;
  let accepted = 0;
  for (let elapsed = 0; elapsed < flight.duration; elapsed += 25) {
    const time = flight.startedAt + elapsed;
    if (time < returned.updatedAt) continue;
    try { commandBadminton(returned, 'a', { id: 'swing', expectedRevision: returned.revision, kind: 'hit' }, time); accepted += 25; }
    catch { /* Early and late swings remain outside the legal contact window. */ }
  }
  assert.ok(accepted >= 600, `Only ${accepted}ms of legal human contact`);
});

test('serve travels over the net, NPC returns, and local score advances only at rally end', () => {
  const match = createBadmintonMatch('a', 0);
  const served = commandBadminton(match, 'a', { id: 'serve-1', expectedRevision: 0, kind: 'serve' }, 100);
  assert.equal(served.phase, 'rally'); assert.deepEqual(served.score, [0, 0]);
  assert.ok(badmintonShuttlePosition(served.flight!, 900).y > 1.55);
  const returned = advanceBadmintonClock(served, served.flight!.startedAt + served.flight!.duration * .78 + 10);
  assert.equal(returned.flight!.lastHitBy, 1); assert.equal(returned.rallyHits, 2);
  const ended = advanceBadmintonClock(returned, returned.flight!.startedAt + returned.flight!.duration + 10);
  assert.deepEqual(ended.score, [0, 1]); assert.equal(ended.completedRallies, 1);
  assert.equal(ended.flight, null);
  assert.deepEqual(advanceBadmintonClock(ended, 10000), ended);
});

test('low shuttle colliding with the net awards the receiver exactly once', () => {
  const ready = createBadmintonMatch('a', 0, 'b');
  const flight = { from: { x: -6, y: 0.1, z: 0 }, to: { x: 0.1, y: 0, z: 0 }, startedAt: 0, duration: 1800, lastHitBy: 0 as const };
  const ended = advanceBadmintonClock({ ...ready, phase: 'rally', flight, rallyHits: 1 }, 1790);
  assert.deepEqual(ended.score, [0, 1]);
  assert.equal(ended.flight, null);
  assert.deepEqual(advanceBadmintonClock(ended, 10000), ended);
});

test('command schema rejects unknown actions and invalid revisions before mutation', () => {
  const ready = createBadmintonMatch('a', 0);
  assert.throws(() => commandBadminton(ready, 'a', { id: 'bad', expectedRevision: 0, kind: 'teleport' as 'serve' }, 0), /command/);
  assert.throws(() => commandBadminton(ready, 'a', { id: 'bad', expectedRevision: NaN, kind: 'serve' }, 0), /revision/);
  assert.deepEqual(ready.score, [0, 0]);
});

test('clock rejects regression even between samples that do not change the flight', () => {
  const served = commandBadminton(createBadmintonMatch('a', 0, 'b'), 'a', { id: 'serve', expectedRevision: 0, kind: 'serve' }, 0);
  const sampled = advanceBadmintonClock(served, 1000);
  assert.throws(() => advanceBadmintonClock(sampled, 999), /clock/);
  assert.equal(sampled.revision, served.revision);
});

test('long unattended gap settles one rally and waits before NPC serves again', () => {
  const served = commandBadminton(createBadmintonMatch('a', 0), 'a', { id: 'serve', expectedRevision: 0, kind: 'serve' }, 0);
  const ended = advanceBadmintonClock(served, 86400000);
  assert.deepEqual(ended.score, [0, 1]);
  assert.equal(ended.completedRallies, 1);
  assert.equal(ended.flight, null);
  assert.deepEqual(advanceBadmintonClock(ended, 86401000), ended);
  const nextServe = commandBadminton(ended, 'a', { id: 'next', expectedRevision: ended.revision, kind: 'serve' }, 86401000);
  assert.equal(nextServe.flight!.startedAt, 86401000);
  assert.deepEqual(nextServe.score, [0, 1]);
});

test('a legal low serve hits the net and remains ready for deliberate finish', () => {
  const served = commandBadminton(createBadmintonMatch('a', 0), 'a', { id: 'low', expectedRevision: 0, kind: 'serve', loft: 0.1 }, 0);
  const ended = advanceBadmintonClock(served, served.flight!.duration);
  assert.deepEqual(ended.score, [0, 1]);
  assert.equal(ended.rallyHits, 1);
  assert.equal(advanceBadmintonClock(ended, 100000).phase, 'ready');
  assert.equal(commandBadminton(ended, 'a', { id: 'finish', expectedRevision: ended.revision, kind: 'finish' }, 100000).phase, 'finished');
});

test('NPC cannot reach short shots or rescue shots landing out of court', () => {
  for (const [shot, score] of [[{ depth: 2 }, [1, 0]], [{ aimZ: 4 }, [0, 1]], [{ depth: 7.5 }, [0, 1]]] as const) {
    const served = commandBadminton(createBadmintonMatch('a', 0), 'a', { id: 's', expectedRevision: 0, kind: 'serve', ...shot }, 0);
    const ended = advanceBadmintonClock(served, served.flight!.duration + 10);
    assert.equal(ended.rallyHits, 1);
    assert.deepEqual(ended.score, score);
  }
});

test('loft bounds reject nonfinite or unbounded inputs', () => {
  for (const loft of [NaN, Infinity, 0, 4.1]) {
    assert.throws(() => commandBadminton(createBadmintonMatch('a', 0), 'a', { id: 's', expectedRevision: 0, kind: 'serve', loft }, 0), /aim/);
  }
});

test('boundary lines are in and overlong shots are out', () => {
  const initial = createBadmintonMatch('a', 0, 'b');
  const onLine = commandBadminton(initial, 'a', { id: 'line', expectedRevision: 0, kind: 'serve', aimZ: 3.05, depth: 6.5 }, 0);
  assert.deepEqual(advanceBadmintonClock(onLine, onLine.flight!.duration).score, [1, 0]);
  const long = commandBadminton(initial, 'a', { id: 'long', expectedRevision: 0, kind: 'serve', depth: 7 }, 0);
  assert.deepEqual(advanceBadmintonClock(long, long.flight!.duration).score, [0, 1]);
});
test('two human players must wait for the shuttle and hit inside their contact window', () => {
  const served = commandBadminton(createBadmintonMatch('a', 0, 'b'), 'a', { id: 'serve-1', expectedRevision: 0, kind: 'serve' }, 0);
  assert.throws(() => commandBadminton(served, 'b', { id: 'hit-early', expectedRevision: served.revision, kind: 'hit' }, 100), /reach/);
  const hit = commandBadminton(served, 'b', { id: 'hit-1', expectedRevision: served.revision, kind: 'hit', aimZ: 2 }, served.flight!.duration * .78);
  assert.equal(hit.flight!.lastHitBy, 1); assert.equal(hit.rallyHits, 2);
  assert.deepEqual(commandBadminton(hit, 'b', { id: 'hit-1', expectedRevision: served.revision, kind: 'hit', aimZ: 2 }, hit.updatedAt + 100), hit);
  assert.throws(() => commandBadminton(hit, 'a', { id: 'hit-stale', expectedRevision: 0, kind: 'hit' }, hit.updatedAt + 100), /changed/);
});
test('delayed polling preserves the same NPC return and point as frequent polling', () => {
  const served = commandBadminton(createBadmintonMatch('a', 0), 'a', { id: 'serve', expectedRevision: 0, kind: 'serve' }, 100);
  const frequent = advanceBadmintonClock(advanceBadmintonClock(served, served.flight!.startedAt + served.flight!.duration * .78 + 10), 10000);
  const delayed = advanceBadmintonClock(served, 10000);
  assert.deepEqual(delayed.score, frequent.score); assert.equal(delayed.rallyHits, frequent.rallyHits);
  assert.equal(delayed.revision, frequent.revision); assert.equal(delayed.completedRallies, 1);
});
test('out of bounds awards opponent and finish requires a completed rally', () => {
  const initial = createBadmintonMatch('a', 0, 'b');
  assert.throws(() => commandBadminton(initial, 'a', { id: 'finish-1', expectedRevision: 0, kind: 'finish' }, 0), /rally/);
  const served = commandBadminton(initial, 'a', { id: 'serve-out', expectedRevision: 0, kind: 'serve', aimZ: 3.5 }, 0);
  const ended = advanceBadmintonClock(served, served.flight!.duration + 10);
  assert.deepEqual(ended.score, [0, 1]);
  const finished = commandBadminton(ended, 'a', { id: 'finish-2', expectedRevision: ended.revision, kind: 'finish' }, ended.updatedAt + 100);
  assert.equal(finished.phase, 'finished'); assert.equal(finished.flight, null);
});
test('cancel releases flight and unauthorized, nonfinite, repeated-turn inputs are rejected', () => {
  const initial = createBadmintonMatch('a', 0);
  assert.throws(() => commandBadminton(initial, 'stranger', { id: 'serve', expectedRevision: 0, kind: 'serve' }, 1), /Join/);
  assert.throws(() => commandBadminton(initial, 'a', { id: 'serve', expectedRevision: 0, kind: 'serve', aimZ: NaN }, 1), /aim/);
  const served = commandBadminton(initial, 'a', { id: 'serve', expectedRevision: 0, kind: 'serve' }, 1);
  assert.throws(() => commandBadminton(served, 'a', { id: 'hit', expectedRevision: served.revision, kind: 'hit' }, 2), /Wait/);
  const cancelled = commandBadminton(served, 'a', { id: 'cancel', expectedRevision: served.revision, kind: 'cancel' }, 2);
  assert.equal(cancelled.phase, 'cancelled'); assert.equal(cancelled.flight, null);
});
