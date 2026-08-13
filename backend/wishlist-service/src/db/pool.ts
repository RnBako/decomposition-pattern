import { Pool } from 'pg';
import { config } from '../config';

function createDefaultPool(): Pool {
  return new Pool({
    connectionString: config.databaseUrl,
    connectionTimeoutMillis: config.nodeEnv === 'test' ? 500 : 5000,
    idleTimeoutMillis: 1000,
    max: 10,
  });
}

export let pool: Pool = createDefaultPool();

export function setPoolForTests(testPool: Pool): void {
  pool = testPool;
}

export function resetPoolForTests(): void {
  pool = createDefaultPool();
}
