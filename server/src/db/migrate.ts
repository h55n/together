import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;

export async function runMigrations(): Promise<void> {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error('DATABASE_URL is required to run database migrations');

  const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), 'migrations');
  const names = (await readdir(migrationsDir))
    .filter((name) => /^\d{3}_.+\.sql$/.test(name))
    .sort();
  if (names.length === 0) throw new Error(`No SQL migrations found in ${migrationsDir}`);

  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(`SELECT pg_advisory_lock(hashtext('together_schema_migrations'))`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS together_schema_migrations (
        name TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const name of names) {
      const sql = await readFile(join(migrationsDir, name), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const existing = await client.query<{ checksum: string }>(
        'SELECT checksum FROM together_schema_migrations WHERE name = $1',
        [name],
      );

      if (existing.rowCount) {
        if (existing.rows[0]!.checksum !== checksum) {
          throw new Error(`Applied migration ${name} has changed; refusing schema drift`);
        }
        continue;
      }

      process.stdout.write(`Applying ${name}... `);
      await client.query(sql);
      await client.query(
        'INSERT INTO together_schema_migrations (name, checksum) VALUES ($1, $2)',
        [name, checksum],
      );
      process.stdout.write('done\n');
    }
  } finally {
    try { await client.query(`SELECT pg_advisory_unlock(hashtext('together_schema_migrations'))`); } catch {}
    await client.end();
  }
}

await runMigrations();
