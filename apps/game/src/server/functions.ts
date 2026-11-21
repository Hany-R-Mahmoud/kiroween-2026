import {
  actInTutorial,
  actInWorld,
  canEnter,
  cursesRemaining,
  listMyRuns,
  loadLegend,
  myCompletedWorlds,
  PlayError,
  redeemTutorialReceipt as redeemReceipt,
  relicOf,
  RunError,
  startTutorial as startTutorialRun,
  startWorld as startWorldRun,
  type Legend,
  type Target,
  type Visitor,
} from '@kiroween/skeleton';
import { redirect, isNotFound, isRedirect, notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest, setResponseStatus } from '@tanstack/react-start/server';
import { legendUrl, resolveLocale, resolveTheme } from '@kiroween/skeleton/client';
import { database, getCatalogue, getPlayStore, playDeps, runDeps, tutorialDeps } from './db';
import { getEnv } from './env';
import { authMiddleware, requireUser } from './middleware';

/**
 * Only our fixed messages ever reach the client (Start serializes just `message`). Play and run errors carry fixed
 * messages and statuses. Anything else, a database or driver error for example, becomes the one fixed `unavailable`
 * error so no host, SQL or value can leak (guard finding 2.20). A guest refused at a world gets the Phase 2 redirect.
 */
async function safely<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (e) {
    if (isRedirect(e) || isNotFound(e)) throw e;
    if (e instanceof PlayError) {
      if (e.code === 'sign-in-required') throw redirect({ to: '/sign-in' }); // no world data, same as `enterWorld`
      setResponseStatus(e.status);
      throw new Error(e.message);
    }
    if (e instanceof RunError) {
      setResponseStatus(e.status);
      throw new Error(e.message);
    }
    const fixed = new PlayError('unavailable');
    setResponseStatus(fixed.status);
    throw new Error(fixed.message);
  }
}

/** For the document and the header: language and direction (decision 26; flag off means en and ltr), and who is in. */
export const getShell = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(({ context }) =>
    // Through safely(): a missing or bad variable throws an EnvError whose message names the variable, and that must not reach the browser.
    safely(async () => {
      const headers = getRequest().headers;
      const cookie = /(?:^|;\s*)lang=(\w+)/.exec(headers.get('cookie') ?? '')?.[1] ?? null;
      const { lang, dir } = resolveLocale(getEnv().arabicEnabled, cookie, headers.get('accept-language'));
      // The browser never reads the variable name: images come from `mediaBase + assetUrl(id)`.
      return { lang, dir, name: context.visitor.kind === 'user' ? context.visitor.name : null, mediaBase: getEnv().atlasOrigin };
    }),
  );

const stripPrefix = (legendId: string, id: string): string => (id.startsWith(`${legendId}:`) ? id.slice(legendId.length + 1) : id);

/** A legend's relic for the hall: asset id and display name (null name: the client uses the catalog fallback). */
async function relicFor(id: string): Promise<{ legendId: string; assetId: string; name: string | null } | null> {
  const legend = await loadLegend(database(), id);
  const relic = legend ? relicOf(legend) : null;
  return relic ? { legendId: id, ...relic } : null;
}

export const getHall = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(({ context }) =>
    safely(async () => {
      const { visitor } = context;
      const guestWorld = getEnv().guestWorld;
      const atlasOrigin = getEnv().atlasOrigin;
      const catalogue = await getCatalogue();
      const titles = new Map(catalogue.map((c) => [c.id, c.title]));
      const doors = catalogue.map((l) => ({
        id: l.id,
        title: l.title,
        region: l.region,
        open: canEnter({ kind: 'legend', id: l.id }, visitor, guestWorld),
        atlasHref: `${atlasOrigin}${legendUrl(l.id)}`, // the atlas is open to everyone, so every door links to it
      }));
      const base = { name: visitor.kind === 'user' ? visitor.name : null, tutorialOpen: canEnter({ kind: 'tutorial' }, visitor, guestWorld), doors };

      if (visitor.kind !== 'user') {
        // A guest's broken worlds and tutorial receipt live in the browser (R1.12, R2.12). Only public relic data goes out.
        const relic = await relicFor(guestWorld);
        return { ...base, tutorialDone: null, brokenWorlds: [] as string[], relics: relic ? [relic] : [], cursesRemaining: null, ledger: [] as LedgerRow[], current: null as CurrentRun | null };
      }

      const deps = await runDeps();
      const [completed, runs, tutorialDone] = await Promise.all([
        myCompletedWorlds(deps, visitor),
        listMyRuns(deps, visitor),
        getPlayStore().tutorialDone(visitor.id),
      ]);
      const brokenWorlds = completed.filter((c) => c.wins > 0).map((c) => c.legendId);
      const relics = (await Promise.all(brokenWorlds.map(relicFor))).filter((r) => r !== null);
      // The Seed is shown only for ended Runs (won or restarted), never for one in progress or abandoned.
      const ledger: LedgerRow[] = runs
        .filter((r) => r.status === 'won' || r.status === 'restarted')
        .slice(0, 100)
        .map((r) => ({ id: r.id, legendId: r.legendId, title: titles.get(r.legendId) ?? r.legendId, status: r.status, score: r.score, seed: r.seed, startedAt: r.startedAt.toISOString() }));
      // The world in progress (newest in-progress run) and its live fear, read from the play state with a shape check.
      const open = runs.filter((r) => r.status === 'in_progress').sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];
      let current: CurrentRun | null = null;
      if (open) {
        const stored = await getPlayStore().current(visitor.id, open.legendId);
        const raw = (stored?.state as { fear?: unknown } | null | undefined)?.fear;
        const fear = typeof raw === 'number' && Number.isFinite(raw) ? Math.min(100, Math.max(0, Math.round(raw))) : 0;
        current = { legendId: open.legendId, title: titles.get(open.legendId) ?? open.legendId, fear };
      }
      return { ...base, tutorialDone, brokenWorlds, relics, cursesRemaining: cursesRemaining(brokenWorlds), ledger, current };
    }),
  );

interface CurrentRun {
  legendId: string;
  title: string;
  fear: number;
}

interface LedgerRow {
  id: string;
  legendId: string;
  title: string;
  status: string;
  score: number;
  seed: string;
  startedAt: string;
}

/**
 * Validators never throw: a validator failure would skip `safely()` and its fixed status mapping, and could surface a
 * framework message. The shape check runs inside the handler instead, and a bad id is the fixed not-found.
 */
const targetOf = (raw: unknown): unknown => raw;
const legendIdOf = (raw: unknown): string => {
  if (typeof raw !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(raw)) throw notFound();
  return raw;
};

/** The access rule on the server (R3.4). Not a legend: not found. Denied: a redirect and no world data. */
async function requireAccess(id: string, visitor: Visitor): Promise<{ id: string; title: string }> {
  const legend = (await getCatalogue()).find((l) => l.id === id);
  if (!legend) throw notFound();
  const target: Target = { kind: 'legend', id };
  if (!canEnter(target, visitor, getEnv().guestWorld)) throw redirect({ to: visitor.kind === 'user' ? '/' : '/sign-in' });
  return { id: legend.id, title: legend.title };
}

/** Denied: a redirect and no world data. Allowed: the title only. */
export const enterWorld = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(targetOf)
  .handler(({ data, context }) => safely(() => requireAccess(legendIdOf(data), context.visitor)));

/** Public content of a world: names, theme, spirit text, relic. No role, no answer, no swap (R7.2). */
export const getWorldInfo = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(targetOf)
  .handler(({ data, context }) =>
    safely(async () => {
      const id = legendIdOf(data);
      const { title } = await requireAccess(id, context.visitor);
      const legend: Legend | null = await loadLegend(database(), id);
      if (!legend) throw notFound();
      const theme = resolveTheme(legend.theme);
      const relic = relicOf(legend);
      return {
        id,
        title,
        scenes: legend.world.scenes.map((s) => ({ id: stripPrefix(id, s.id), name: s.name, alt: s.description })),
        // Only the optional reduced-motion line of each Fear_Event; the event text stays on the server (the caption is catalog text).
        fearEvents: legend.world.fearEvents.map((e) => ({ id: stripPrefix(id, e.id), reducedMotion: e.reducedMotion })),
        hotspots: legend.world.hotspots.map((h) => ({ id: stripPrefix(id, h.id), sceneId: stripPrefix(id, h.sceneId), name: h.object })),
        theme: { vars: theme.vars, themeColor: theme.themeColor, families: theme.families },
        relic,
      };
    }),
  );

export const getAccount = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(({ context }) =>
    safely(async () => {
      const { visitor } = context;
      if (visitor.kind !== 'user') return { signedIn: false as const };
      const deps = await runDeps();
      const titles = new Map((await getCatalogue()).map((c) => [c.id, c.title]));
      const [runs, completed] = await Promise.all([listMyRuns(deps, visitor), myCompletedWorlds(deps, visitor)]);
      return {
        signedIn: true as const,
        name: visitor.name,
        runs: runs.map((r) => ({
          id: r.id,
          legendId: r.legendId,
          title: titles.get(r.legendId) ?? r.legendId,
          status: r.status,
          score: r.score,
          // The Seed only for ended Runs: a Run in progress keeps it secret (R7.2).
          seed: r.status === 'won' || r.status === 'restarted' ? r.seed : null,
          startedAt: r.startedAt.toISOString(),
        })),
        completed: completed.map((c) => ({ ...c, title: titles.get(c.legendId) ?? c.legendId })),
      };
    }),
  );

// The play functions. The browser sends intentions only; the Play_Service validates them with its strict schemas
// (unknown keys refused, so a user id, score, count, status or seed is a 400) and takes the user from the verified
// visitor. `startRunFn` and `finishRunFn` no longer exist: no browser can report a result (R7.6).
const passThrough = (d: unknown) => d;

export const startWorld = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(passThrough)
  .handler(({ data, context }) => safely(async () => startWorldRun(await playDeps(), context.visitor, data)));

export const worldAct = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(passThrough)
  .handler(({ data, context }) => safely(async () => actInWorld(await playDeps(), context.visitor, data)));

export const startTutorial = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(passThrough)
  .handler(({ data, context }) => safely(async () => startTutorialRun(tutorialDeps(), context.visitor, data)));

// No rate limit on tutorial answers: the design gives none, and a wrong answer costs nothing by spec. Recorded as a
// residual risk in docs/phase-4-notes/decisions.md.
export const tutorialAct = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(passThrough)
  .handler(({ data, context }) => safely(async () => actInTutorial(tutorialDeps(), context.visitor, data)));

export const redeemTutorialReceipt = createServerFn({ method: 'POST' })
  .middleware([requireUser])
  .validator(passThrough)
  .handler(({ data, context }) => safely(async () => redeemReceipt(tutorialDeps(), context.user, data)));

const publicRun = (r: { id: string; legendId: string; status: string; slotsSolved: number; score: number }) => ({ id: r.id, legendId: r.legendId, status: r.status, slotsSolved: r.slotsSolved, score: r.score });

export const listMyRunsFn = createServerFn({ method: 'GET' })
  .middleware([requireUser])
  .handler(({ context }) => safely(async () => (await listMyRuns(await runDeps(), context.user)).map(publicRun)));

export const myCompletedWorldsFn = createServerFn({ method: 'GET' })
  .middleware([requireUser])
  .handler(({ context }) => safely(async () => myCompletedWorlds(await runDeps(), context.user)));
