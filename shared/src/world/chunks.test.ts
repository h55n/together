import assert from 'node:assert/strict';
import test from 'node:test';
import { CHUNK_SIZE_METRES, worldToChunk, chunkDistance, residencyRing } from './chunks.js';

test('world chunks are canonical 128 metre squares', () => {
  assert.equal(CHUNK_SIZE_METRES, 128);
  assert.deepEqual(worldToChunk({ x: 0, z: 0 }), { x: 0, z: 0 });
  assert.deepEqual(worldToChunk({ x: 127.9, z: -0.1 }), { x: 0, z: -1 });
  assert.deepEqual(worldToChunk({ x: 128, z: 256 }), { x: 1, z: 2 });
});

test('chunk distance and residency rings are stable', () => {
  assert.equal(chunkDistance({ x: 0, z: 0 }, { x: 2, z: 1 }), 2);
  assert.equal(residencyRing(0), 'active');
  assert.equal(residencyRing(2), 'active');
  assert.equal(residencyRing(3), 'visual');
  assert.equal(residencyRing(5), 'horizon');
  assert.equal(residencyRing(8), 'unloaded');
});
