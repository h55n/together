import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];

const requiredPaths = [
  'client/src/main.tsx',
  'client/src/game/GameEngine.ts',
  'server/src/index.ts',
  'shared/src/index.ts',
  'content/src/index.ts',
  'docs/PRD.md',
  'docs/BUILD_PLAN.md',
  'docs/REPO_AUDIT_AGAINST_PRD.md',
  'docs/IMPLEMENTATION_STATUS.md',
  'docs/ARCHITECTURE.md',
  'docs/DEVELOPMENT.md',
  'docs/ASSET_REQUIREMENTS.md',
  'docs/KNOWN_LIMITATIONS.md',
  'docs/VERIFICATION.md',
  'HANDOFF.md',
  'CONTINUATION_PROMPT.md',
  'PROJECT_STATE.json',
  '.env.example',
];

for (const relative of requiredPaths) {
  try { await stat(path.join(root, relative)); }
  catch { errors.push(`missing required path: ${relative}`); }
}

const migrationDir = path.join(root, 'server/src/db/migrations');
const migrations = (await readdir(migrationDir)).filter((name) => /^\d{3}_.+\.sql$/.test(name)).sort();
for (let index = 0; index < migrations.length; index += 1) {
  const expected = String(index + 1).padStart(3, '0');
  if (!migrations[index].startsWith(`${expected}_`)) errors.push(`migration sequence gap: expected ${expected}_..., found ${migrations[index]}`);
  const sql = await readFile(path.join(migrationDir, migrations[index]), 'utf8');
  if (/DROP\s+DATABASE|TRUNCATE\s+.+CASCADE/i.test(sql)) errors.push(`unsafe destructive migration statement in ${migrations[index]}`);
}
if (migrations.length < 1) errors.push('no database migrations found');

const staleRuntimeFiles = [
  'client/src/main.jsx', 'client/src/App.jsx', 'client/src/game/GameEngine.js', 'server/src/index.js',
  'shared/constants.js', 'shared/eventTypes.js', 'shared/index.js', 'shared/utils.js', 'shared/utils.test.js',
];
for (const relative of staleRuntimeFiles) {
  try { await stat(path.join(root, relative)); errors.push(`obsolete legacy runtime still present: ${relative}`); }
  catch { /* expected */ }
}

const ignoredDirs = new Set(['.git', 'node_modules', '.verify-dist', 'dist', 'coverage']);
const textExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.sql', '.html', '.css', '.yml', '.yaml']);
const secretPatterns = [
  [/sk-[A-Za-z0-9_-]{20,}/g, 'OpenAI-style secret'],
  [/github_pat_[A-Za-z0-9_]{20,}/g, 'GitHub fine-grained token'],
  [/ghp_[A-Za-z0-9]{30,}/g, 'GitHub personal access token'],
  [/xox[baprs]-[A-Za-z0-9-]{20,}/g, 'Slack token'],
  [/AKIA[0-9A-Z]{16}/g, 'AWS access key id'],
  [/service_role\s*[=:]\s*['"][A-Za-z0-9._-]{20,}/gi, 'Supabase service-role value'],
  [/(?:SUPABASE_SERVICE_ROLE_KEY|VITE_TURN_CREDENTIAL)\s*=\s*[^\s#][^\r\n]{15,}/g, 'sensitive environment value'],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, 'private key'],
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) { await walk(full); continue; }
    const extension = path.extname(entry.name).toLowerCase();
    if (!textExtensions.has(extension) && entry.name !== '.env.example') continue;
    const relative = path.relative(root, full);
    const source = await readFile(full, 'utf8');
    for (const [pattern, label] of secretPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(source)) errors.push(`${label} appears in ${relative}`);
    }
    if (!relative.includes('test') && /(?:^|["'`])(https?:\/\/public\.example\/|mock\/path\.)/m.test(source)) warnings.push(`placeholder external path appears in runtime source: ${relative}`);
  }
}
await walk(root);

const envExample = await readFile(path.join(root, '.env.example'), 'utf8');
for (const variable of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'VITE_SERVER_URL', 'VITE_STUN_URL', 'VITE_TURN_URL']) {
  if (!envExample.includes(`${variable}=`)) errors.push(`.env.example missing ${variable}=`);
}

if (warnings.length) for (const warning of warnings) console.warn(`WARN: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exit(1);
}
console.log(`Repository integrity OK: ${migrations.length} ordered migrations, required roots present, legacy runtime files absent, heuristic committed-secret scan passed.`);
console.log('Note: the heuristic secret scan is a repository guardrail, not a substitute for provider secret scanning or credential rotation.');
