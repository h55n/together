#!/usr/bin/env node
// scripts/setup.js
// Run with: node scripts/setup.js

import { existsSync, copyFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

const RESET  = '\x1b[0m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';

const ok   = (msg) => console.log(`  ${GREEN}✓${RESET} ${msg}`);
const warn = (msg) => console.log(`  ${YELLOW}⚠${RESET}  ${msg}`);
const err  = (msg) => console.log(`  ${RED}✗${RESET} ${msg}`);
const info = (msg) => console.log(`  ${CYAN}→${RESET} ${msg}`);

console.log(`\n${BOLD}[ TOGETHER ] Project Setup${RESET}\n`);

let hasErrors = false;

// ── 1. Node version ───────────────────────────────────────────
const nodeVersion = process.versions.node.split('.')[0];
if (parseInt(nodeVersion) >= 20) {
  ok(`Node.js ${process.versions.node}`);
} else {
  err(`Node.js 20+ required (found ${process.versions.node})`);
  hasErrors = true;
}

// ── 2. .env file ──────────────────────────────────────────────
const envPath    = join(ROOT, '.env');
const envExample = join(ROOT, '.env.example');

if (existsSync(envPath)) {
  ok('.env file exists');
} else if (existsSync(envExample)) {
  copyFileSync(envExample, envPath);
  warn('.env created from .env.example — fill in your credentials');
} else {
  err('.env.example not found');
  hasErrors = true;
}

// ── 3. Check required env vars ────────────────────────────────
if (existsSync(envPath)) {
  const env = readFileSync(envPath, 'utf8');
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'SUPABASE_ANON_KEY'];
  const optional = ['CLERK_PUBLISHABLE_KEY', 'REDIS_URL'];

  let missingRequired = false;
  for (const key of required) {
    if (env.includes(`${key}=`) && !env.match(new RegExp(`${key}=\\s*$`, 'm'))) {
      ok(`${key} set`);
    } else {
      warn(`${key} not set — will use mock mode`);
      missingRequired = true;
    }
  }

  for (const key of optional) {
    if (env.includes(`${key}=`) && !env.match(new RegExp(`${key}=\\s*$`, 'm'))) {
      ok(`${key} set (optional)`);
    } else {
      info(`${key} not set — optional feature disabled`);
    }
  }

  if (missingRequired) {
    console.log(`\n  ${YELLOW}Running without Supabase — using in-memory mock DB${RESET}`);
    console.log(`  ${YELLOW}This is fine for local development.${RESET}`);
  }
}

// ── 4. Dependencies ───────────────────────────────────────────
console.log('\n  Checking dependencies…');
try {
  const clientPkg  = JSON.parse(readFileSync(join(ROOT, 'client/package.json'), 'utf8'));
  const serverPkg  = JSON.parse(readFileSync(join(ROOT, 'server/package.json'), 'utf8'));
  const sharedPkg  = JSON.parse(readFileSync(join(ROOT, 'shared/package.json'),  'utf8'));

  const clientModules = join(ROOT, 'client/node_modules');
  const serverModules = join(ROOT, 'server/node_modules');
  const rootModules   = join(ROOT, 'node_modules');

  if (existsSync(rootModules)) {
    ok('node_modules found (root)');
  } else {
    warn('node_modules not found — run: npm install');
    hasErrors = true;
  }
} catch (e) {
  err(`Package.json read error: ${e.message}`);
  hasErrors = true;
}

// ── 5. Key directories ────────────────────────────────────────
console.log('\n  Checking project structure…');
const requiredDirs = [
  'client/src/game',
  'client/src/ui',
  'client/src/store',
  'client/src/socket',
  'server/src/api',
  'server/src/socket',
  'server/src/game',
  'server/src/content/story_events',
  'shared',
];

for (const dir of requiredDirs) {
  if (existsSync(join(ROOT, dir))) {
    ok(dir);
  } else {
    err(`Missing directory: ${dir}`);
    hasErrors = true;
  }
}

// ── 6. Story event files ──────────────────────────────────────
const storyDir = join(ROOT, 'server/src/content/story_events');
if (existsSync(storyDir)) {
  const { readdirSync } = await import('fs');
  const events = readdirSync(storyDir).filter(f => f.endsWith('.json'));
  ok(`${events.length} story event${events.length !== 1 ? 's' : ''} found`);
}

// ── Summary ───────────────────────────────────────────────────
console.log('\n' + '─'.repeat(50));
if (hasErrors) {
  console.log(`\n${RED}${BOLD}Setup incomplete — fix errors above then run npm install${RESET}\n`);
  process.exit(1);
} else {
  console.log(`\n${GREEN}${BOLD}Setup complete!${RESET}`);
  console.log(`\n  Start developing:\n`);
  console.log(`    ${CYAN}npm run dev${RESET}          # Start client + server`);
  console.log(`    ${CYAN}npm test${RESET}             # Run all tests`);
  console.log(`    ${CYAN}npm run build${RESET}        # Build for production\n`);
  console.log(`  Client: ${CYAN}http://localhost:5173${RESET}`);
  console.log(`  Server: ${CYAN}http://localhost:3001${RESET}\n`);
}
