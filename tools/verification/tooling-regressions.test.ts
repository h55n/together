import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

test('sandbox verification uses a local compiler instead of requiring a global tsc executable', async () => {
  const source = await readFile(path.join(process.cwd(), 'tools/verify-sandbox.mjs'), 'utf8');
  assert.equal(source.includes("['tsc', ['-p'"), false);
  assert.ok(source.includes("require.resolve('typescript/bin/tsc')"), 'resolve the workspace compiler');
  assert.ok(source.includes('process.execPath'), 'execute the compiler with the current Node runtime');
  for (const workspace of ['client', 'shared', 'content']) {
    assert.ok(source.includes(`${workspace}/tsconfig.json`), `retain ${workspace} type checking`);
  }
});
