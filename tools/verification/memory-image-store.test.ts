import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { LocalMemoryImageStore } from '../../server/src/storage/MemoryImageStore.js';

test('local memory images persist private bytes by household and image id', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'together-memory-'));
  try {
    const store = new LocalMemoryImageStore(directory);
    const bytes = new Uint8Array([1, 2, 3, 4]);
    await store.save('house-a', 'image-1', bytes, 'image/jpeg');
    const loaded = await store.get('house-a', 'image-1');
    assert.deepEqual([...loaded.bytes], [1, 2, 3, 4]);
    assert.equal(loaded.mimeType, 'image/jpeg');
    await assert.rejects(() => store.get('house-b', 'image-1'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('local memory image store rejects unsafe identifiers and non-image payloads', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'together-memory-'));
  try {
    const store = new LocalMemoryImageStore(directory);
    await assert.rejects(() => store.save('../escape', 'img', new Uint8Array([1]), 'image/jpeg'));
    await assert.rejects(() => store.save('house', '../escape', new Uint8Array([1]), 'image/jpeg'));
    await assert.rejects(() => store.save('house', 'img', new Uint8Array([1]), 'text/plain' as never));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
