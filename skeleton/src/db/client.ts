import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';

export type Db = NodePgDatabase;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** One connection is enough for the import. The caller closes the pool. */
export function createDb(connectionString: string): { db: Db; close: () => Promise<void> } {
  const pool = new pg.Pool({ connectionString, max: 1 });
  return { db: drizzle({ client: pool }), close: () => pool.end() };
}
