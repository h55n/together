import { spawnSync } from 'node:child_process';

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const commands = [
  [process.execPath, ['tools/verify-pure.mjs'], 'pure domain/integration tests'],
  [pnpm, ['exec', 'tsc', '-p', 'client/tsconfig.json', '--noEmit'], 'client TypeScript'],
  [pnpm, ['exec', 'tsc', '-p', 'shared/tsconfig.json', '--noEmit'], 'shared TypeScript'],
  [pnpm, ['exec', 'tsc', '-p', 'content/tsconfig.json', '--noEmit'], 'content TypeScript'],
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
