import { createDb, type Db } from '@kiroween/skeleton';
import { getEnv } from './env';
let db: Db | undefined;
/** The reader role's pooled connection (ATLAS_DATABASE_URL), opened on first use. It can only SELECT. */
export function database(): Db {
  db ??= createDb(getEnv().databaseUrl, 2).db;
  return db;
}
