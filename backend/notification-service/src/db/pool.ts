import { Pool } from 'pg';
import { config } from '../config';

export type Db = Pick<Pool, 'query'> & { end?: () => Promise<void> };

let _pool: Db = new Pool({ connectionString: config.databaseUrl });

export function setPool(db: Db): void {
  _pool = db;
}

export const pool: Db = {
  query: ((text: unknown, params?: unknown) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_pool as any).query(text, params)) as Pool['query'],
  end: async () => {
    if (typeof _pool.end === 'function') {
      await _pool.end();
    }
  },
};
