import { randomUUID } from 'node:crypto';
import { createDb, createRunStore, loadCatalogue, loadLegend, NoRunError, type CatalogueLegend, type Db, type RunDeps } from '@kiroween/skeleton';
import { EnvError, getEnv } from './env';

let db: Db | undefined;
let catalogue: Promise<CatalogueLegend[]> | undefined;

/** Pooled connection (DATABASE_URL), opened on first use. */
function database(): Db {
  db ??= createDb(getEnv().databaseUrl, 5).db;
  return db;
}

/**
 * The legends in Neon, loaded once per server process. Also checks GUEST_WORLD against it (R3.3): a guest world that
 * is not a legend stops every request with an error that names the variable.
 */
export function getCatalogue(): Promise<CatalogueLegend[]> {
  catalogue ??= loadCatalogue(database()).then((list) => {
    if (!list.some((l) => l.id === getEnv().guestWorld)) throw new EnvError('GUEST_WORLD', 'is not one of the legends in the database');
    return list;
  });
  catalogue.catch(() => (catalogue = undefined)); // retry on the next request after a failure
  return catalogue;
}

export async function runDeps(): Promise<RunDeps> {
  const d = database();
  return {
    store: createRunStore(d),
    catalogue: await getCatalogue(),
    loadLegend: async (id) => {
      const legend = await loadLegend(d, id);
      if (!legend) throw new NoRunError(id); // the id was in the catalogue a moment ago
      return legend;
    },
    newSeed: () => randomUUID(), // cryptographic, issued by the server (R4.7)
  };
}
