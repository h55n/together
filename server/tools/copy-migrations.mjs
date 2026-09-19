import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve('src/db/migrations');
const target = resolve('dist/db/migrations');
if (!existsSync(source)) throw new Error(`Migration source not found: ${source}`);
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
for (const name of readdirSync(source).filter((candidate) => candidate.endsWith('.sql')).sort()) {
  cpSync(resolve(source, name), resolve(target, name));
}
