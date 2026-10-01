#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const ok = (message) => console.log(`  ${GREEN}✓${RESET} ${message}`);
const warn = (message) => console.log(`  ${YELLOW}⚠${RESET}  ${message}`);
const err = (message) => console.log(`  ${RED}✗${RESET} ${message}`);
const info = (message) => console.log(`  ${CYAN}→${RESET} ${message}`);

console.log(`\n${BOLD}[ TOGETHER ] Amaya Bay V1 setup${RESET}\n`);
let hasErrors = false;

const major = Number(process.versions.node.split('.')[0]);
if (major >= 24) ok(`Node.js ${process.versions.node}`);
else { err(`Node.js 24+ required (found ${process.versions.node})`); hasErrors = true; }

try {
  const version = execFileSync('pnpm', ['--version'], { encoding: 'utf8' }).trim();
  ok(`pnpm ${version}`);
} catch {
  err('pnpm is required. Run: corepack enable');
  hasErrors = true;
}

const examplePath = join(ROOT, '.env.example');
if (!existsSync(examplePath)) {
  err('.env.example not found');
  hasErrors = true;
} else {
  const example = readFileSync(examplePath, 'utf8');
  const serverEnv = example
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('VITE_'))
    .join('\n');
  const clientEnv = example
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith('#') || line.trim() === '' || line.trim().startsWith('VITE_'))
    .join('\n');

  mkdirSync(join(ROOT, 'server'), { recursive: true });
  mkdirSync(join(ROOT, 'client'), { recursive: true });
  const serverEnvPath = join(ROOT, 'server', '.env');
  const clientEnvPath = join(ROOT, 'client', '.env.local');
  if (!existsSync(serverEnvPath)) { writeFileSync(serverEnvPath, `${serverEnv.trim()}\n`); warn('Created server/.env from the server-safe example values'); }
  else ok('server/.env exists');
  if (!existsSync(clientEnvPath)) { writeFileSync(clientEnvPath, `${clientEnv.trim()}\n`); warn('Created client/.env.local with client-safe VITE_* values only'); }
  else ok('client/.env.local exists');
}

if (existsSync(join(ROOT, 'pnpm-lock.yaml'))) ok('pnpm-lock.yaml found');
else { err('pnpm-lock.yaml is missing'); hasErrors = true; }

const requiredPaths = [
  'client/src/game', 'client/src/ui', 'client/src/network',
  'server/src/game', 'server/src/socket', 'server/src/db/migrations',
  'shared/src', 'content/src', 'tools', 'docs/PRD.md',
];
for (const path of requiredPaths) {
  if (existsSync(join(ROOT, path))) ok(path);
  else { err(`Missing project path: ${path}`); hasErrors = true; }
}

if (!existsSync(join(ROOT, 'node_modules'))) {
  warn('Dependencies are not installed. Run: pnpm install --frozen-lockfile');
} else {
  ok('root node_modules found');
}

const serverEnvPath = join(ROOT, 'server', '.env');
if (existsSync(serverEnvPath)) {
  const env = readFileSync(serverEnvPath, 'utf8');
  const configuredSupabase = /SUPABASE_URL=\S+/.test(env) && /SUPABASE_SERVICE_ROLE_KEY=\S+/.test(env);
  if (configuredSupabase) ok('Supabase server credentials appear configured');
  else {
    info('Supabase server credentials are blank; the in-memory repository will be used outside production');
    if (!/ALLOW_DEV_AUTH=true/.test(env)) warn('Set ALLOW_DEV_AUTH=true explicitly in server/.env if you want local x-dev-user-id authentication');
  }
}

console.log('\n' + '─'.repeat(58));
if (hasErrors) {
  console.log(`\n${RED}${BOLD}Setup incomplete.${RESET}\n`);
  process.exit(1);
}
console.log(`\n${GREEN}${BOLD}Setup checks complete.${RESET}`);
console.log(`\n  ${CYAN}corepack enable${RESET}`);
console.log(`  ${CYAN}pnpm install --frozen-lockfile${RESET}`);
console.log(`  ${CYAN}pnpm dev${RESET}       # client + server`);
console.log(`  ${CYAN}pnpm test${RESET}      # canonical automated test gate`);
console.log(`  ${CYAN}pnpm verify${RESET}    # full repository verification\n`);
