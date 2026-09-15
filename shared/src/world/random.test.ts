import assert from 'node:assert/strict';
import test from 'node:test';
import { createSeededRandom } from './random.js';

test('seeded random produces deterministic independent world dressing', () => {
  const a = createSeededRandom(42);
  const b = createSeededRandom(42);
  const c = createSeededRandom(43);
  const seqA = [a(), a(), a()];
  assert.deepEqual(seqA, [b(), b(), b()]);
  assert.notDeepEqual(seqA, [c(), c(), c()]);
  assert.ok(seqA.every((value) => value >= 0 && value < 1));
});
