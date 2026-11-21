import { randomUUID } from 'node:crypto';
import {
  createDb,
  createPlayStore,
  createRunStore,
  createTokenCodec,
  loadCatalogue,
  loadLegend,
  loadTutorialDetails,
  NoRunError,
  PlayError,
  type CatalogueLegend,
  type Db,
  type PlayDeps,
  type PlayStore,
  type RunDeps,
  type TokenCodec,
  type TutorialDeps,
} from '@kiroween/skeleton';
import { EnvError, getEnv } from './env';

let db: Db | undefined;
let catalogue: Promise<CatalogueLegend[]> | undefined;
let tokens: TokenCodec | undefined;
let playStore: PlayStore | undefined;

/** Pooled connection (DATABASE_URL), opened on first use. */
export function database(): Db {
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

/** The token codec, keyed from GAME_TOKEN_KEY (parsed and length-checked by parseEnv). Server only. */
export function tokenCodec(): TokenCodec {
  tokens ??= createTokenCodec({ key: getEnv().tokenKey, now: () => Date.now() });
  return tokens;
}

/** The Postgres play store: every statement filters on the verified user id. */
export function getPlayStore(): PlayStore {
  playStore ??= createPlayStore(database());
  return playStore;
}

/** Phase 2 run service dependencies. Only the read paths (`listMyRuns`, `myCompletedWorlds`) are reachable from the browser. */
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

/** Dependencies of the Play_Service for worlds. The Seed comes from a cryptographic source (R7.16). */
export async function playDeps(): Promise<PlayDeps> {
  const d = database();
  return {
    store: getPlayStore(),
    tokens: tokenCodec(),
    catalogue: await getCatalogue(),
    loadLegend: async (id) => {
      const legend = await loadLegend(d, id);
      if (!legend) throw new PlayError('not-found');
      return legend;
    },
    newSeed: () => randomUUID(),
    guestWorld: getEnv().guestWorld,
  };
}

/** Dependencies of the tutorial functions. The drawer rows are read by the game role only. */
export function tutorialDeps(): TutorialDeps {
  return {
    store: getPlayStore(),
    tokens: tokenCodec(),
    newSeed: () => randomUUID(),
    loadTutorialDetails: () => loadTutorialDetails(database()),
  };
}
