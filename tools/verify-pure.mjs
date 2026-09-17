import { rm, readdir, cp, mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.verify-dist');
const require = createRequire(import.meta.url);
const tscBin = require.resolve('typescript/bin/tsc');
await rm(outDir, { recursive: true, force: true });

const tsc = spawnSync(process.execPath, [tscBin, '-p', path.join(root, 'tools/tsconfig.verify.json')], {
  cwd: root,
  stdio: 'inherit',
});
if (tsc.status !== 0) process.exit(tsc.status ?? 1);

// Recreate the pnpm workspace link inside the isolated emitted tree so pure
// server-domain tests can import @together/shared without requiring pnpm here.
const sharedPackage = path.join(outDir, 'node_modules/@together/shared');
await mkdir(sharedPackage, { recursive: true });
await cp(path.join(outDir, 'shared/src'), sharedPackage, { recursive: true });
await writeFile(path.join(sharedPackage, 'package.json'), JSON.stringify({ type: 'module', exports: './index.js' }));

async function collectTests(directory) {
  const results = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...await collectTests(full));
    else if (entry.name.endsWith('.test.js')) results.push(full);
  }
  return results;
}

const tests = [
  ...await collectTests(path.join(outDir, 'shared/src')),
  ...await collectTests(path.join(outDir, 'content/src')),
  ...await collectTests(path.join(outDir, 'tools/verification')),
];
if (tests.length === 0) {
  console.error('No pure verification tests were emitted.');
  process.exit(1);
}
const nodeTest = spawnSync(process.execPath, ['--test', ...tests], { cwd: root, stdio: 'inherit' });
process.exit(nodeTest.status ?? 1);
