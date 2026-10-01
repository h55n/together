import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationsDir = join(process.cwd(), 'src/db/migrations');

describe('production migration contract', () => {
  it('keeps canonical runtime tables and atomic mutation RPC represented in the migration chain', () => {
    const sql = readdirSync(migrationsDir)
      .filter((name) => name.endsWith('.sql'))
      .sort()
      .map((name) => readFileSync(join(migrationsDir, name), 'utf8'))
      .join('\n');

    for (const table of [
      'users',
      'households',
      'household_members',
      'household_home_state',
      'inventories',
      'transactions',
      'story_instances',
      'npc_relationships',
      'memories',
      'household_notes',
      'votes',
      'cooking_sessions',
      'job_sessions',
      'activity_sessions',
      'server_runtime_state',
    ]) {
      expect(sql.toLowerCase()).toContain(table);
    }
    expect(sql).toContain('commit_authoritative_mutation_v1');
    expect(sql).toContain("'together-memories'");
    expect(sql).toContain('public = false');
  });
});
