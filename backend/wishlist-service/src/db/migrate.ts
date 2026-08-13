import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { pool } from './pool';

async function ensureMigrationsTable(db: Pool): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function runMigrations(db: Pool = pool): Promise<void> {
  await ensureMigrationsTable(db);
  const dir = path.join(__dirname, '../../migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const forTests = process.env.NODE_ENV === 'test';

  for (const file of files) {
    const { rows } = await db.query(
      'SELECT 1 FROM schema_migrations WHERE name = $1',
      [file],
    );
    if (rows.length > 0) {
      console.log(`Skipped (already applied): ${file}`);
      continue;
    }
    let sql = fs.readFileSync(path.join(dir, file), 'utf-8');
    // pg-mem / some environments may not support CREATE EXTENSION
    sql = sql.replace(/CREATE EXTENSION IF NOT EXISTS pgcrypto;\s*/gi, '');
    if (forTests) {
      // pg-mem mishandles IS NULL when partial indexes on nullable cols exist
      sql = sql
        .split('\n')
        .filter(
          (line) =>
            !/CREATE (UNIQUE )?INDEX[\s\S]*WHERE/i.test(line),
        )
        .join('\n');
    }
    await db.query(sql);
    await db.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    console.log(`Applied: ${file}`);
  }
}

async function migrate(): Promise<void> {
  await runMigrations(pool);
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
