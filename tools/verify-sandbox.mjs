import { spawnSync } from 'node:child_process';

const commands = [
  [process.execPath, ['tools/verify-pure.mjs'], 'pure domain/integration tests'],
  ['tsc', ['-p', 'client/tsconfig.json', '--noEmit'], 'client TypeScript'],
  ['tsc', ['-p', 'shared/tsconfig.json', '--noEmit'], 'shared TypeScript'],
  ['tsc', ['-p', 'content/tsconfig.json', '--noEmit'], 'content TypeScript'],
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
