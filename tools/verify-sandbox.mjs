import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tscBin = require.resolve('typescript/bin/tsc');
const tscCommand = [process.execPath, [tscBin]];

const commands = [
  [process.execPath, ['tools/verify-pure.mjs'], 'pure domain/integration tests'],
  [tscCommand[0], [...tscCommand[1], '-p', 'client/tsconfig.json', '--noEmit'], 'client TypeScript'],
  [tscCommand[0], [...tscCommand[1], '-p', 'shared/tsconfig.json', '--noEmit'], 'shared TypeScript'],
  [tscCommand[0], [...tscCommand[1], '-p', 'content/tsconfig.json', '--noEmit'], 'content TypeScript'],
  [process.execPath, ['tools/validate-repository.mjs'], 'repository integrity'],
];

for (const [command, args, label] of commands) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(command, args, { stdio: 'inherit', cwd: process.cwd() });
  if (result.status !== 0) {
    console.error(`FAILED: ${label}`);
    process.exit(result.status ?? 1);
  }
}
console.log('\nSandbox-safe verification passed.');
