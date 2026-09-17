import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

test('sandbox verification resolves TypeScript through pnpm on every platform', async () => {
  const source = await readFile(path.join(process.cwd(), 'tools/verify-sandbox.mjs'), 'utf8');
  assert.match(source, /const pnpm = process\.platform === 'win32' \? 'pnpm\.cmd' : 'pnpm'/);
  assert.match(source, /spawnSync\(pnpm, \['exec', 'tsc'/);
  assert.equal(source.includes("['tsc', ['-p'"), false);
});
