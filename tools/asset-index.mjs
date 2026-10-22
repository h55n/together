#!/usr/bin/env node
// Scans client/public/assets/models for GLB files and writes client/public/assets/index.json.
// Run after adding art:  node tools/asset-index.mjs
// Asset id = file name without extension; the folder is the family (characters, vegetation, ...).
import { readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, sep, basename, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'client', 'public');
const modelsDir = join(publicDir, 'assets', 'models');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const problems = [];
const assets = {};
if (existsSync(modelsDir)) {
  for (const file of walk(modelsDir).filter((path) => extname(path).toLowerCase() === '.glb').sort()) {
    const id = basename(file, '.glb');
    const url = '/' + relative(publicDir, file).split(sep).join('/');
    const family = relative(modelsDir, file).split(sep)[0];
    const bytes = statSync(file).size;
    if (!/^[a-z0-9_]+$/.test(id)) problems.push(`${url}: id "${id}" must be lowercase letters, digits and underscores`);
    if (assets[id]) problems.push(`${url}: duplicate id "${id}" (also ${assets[id].url})`);
    if (bytes > 12 * 1024 * 1024) problems.push(`${url}: ${(bytes / 1048576).toFixed(1)} MB exceeds the 12 MB runtime budget`);
    if (!existsSync(file.replace(/\.glb$/i, '.source.md'))) problems.push(`${url}: missing ${id}.source.md (author, tools, licence)`);
    assets[id] = { url, family, bytes };
  }
}

writeFileSync(join(publicDir, 'assets', 'index.json'), JSON.stringify({ version: 1, assets }, null, 2) + '\n');
console.log(`Indexed ${Object.keys(assets).length} art asset(s).`);
if (problems.length) {
  for (const problem of problems) console.error('  - ' + problem);
  process.exit(1);
}
