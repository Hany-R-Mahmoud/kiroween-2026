import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';

export type Db = NodePgDatabase;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** One connection is enough for the import (the default). The app server passes a larger pool. The caller closes it. */
export function createDb(connectionString: string, max = 1): { db: Db; close: () => Promise<void> } {
  const pool = new pg.Pool({ connectionString, max });
  return { db: drizzle({ client: pool }), close: () => pool.end() };
}
