import { canEnter, finishRun, listMyRuns, myCompletedWorlds, RunError, startRun, type Target } from '@kiroween/skeleton';
import { redirect, isNotFound, isRedirect, notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest, setResponseStatus } from '@tanstack/react-start/server';
import { resolveLocale } from '@kiroween/skeleton/client';
import { getCatalogue, runDeps } from './db';
import { getEnv } from './env';
import { authMiddleware, requireUser } from './middleware';

/**
 * Only our fixed messages ever reach the client (Start serializes just `message`). Anything else, a database or
 * driver error for example, becomes a generic message so no host, SQL or value can leak.
 */
async function safely<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (e) {
    if (isRedirect(e) || isNotFound(e)) throw e;
    if (e instanceof RunError) {
      setResponseStatus(e.status);
      throw new Error(e.message);
    }
    setResponseStatus(500);
    throw new Error('Something went wrong. Please try again.');
  }
}

/** For the document and the header: language and direction (decision 26; flag off means en and ltr), and who is in. */
export const getShell = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(({ context }) => {
    const headers = getRequest().headers;
    const cookie = /(?:^|;\s*)lang=(\w+)/.exec(headers.get('cookie') ?? '')?.[1] ?? null;
    const { lang, dir } = resolveLocale(getEnv().arabicEnabled, cookie, headers.get('accept-language'));
    return { lang, dir, name: context.visitor.kind === 'user' ? context.visitor.name : null };
  });

export const getHall = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(({ context }) =>
    safely(async () => {
      const { visitor } = context;
      const guestWorld = getEnv().guestWorld;
      const doors = (await getCatalogue()).map((l) => ({ id: l.id, title: l.title, region: l.region, open: canEnter({ kind: 'legend', id: l.id }, visitor, guestWorld) }));
      return { name: visitor.kind === 'user' ? visitor.name : null, tutorialOpen: canEnter({ kind: 'tutorial' }, visitor, guestWorld), doors };
    }),
  );

const targetOf = (raw: unknown): string => {
  if (typeof raw !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(raw)) throw notFound();
  return raw;
};

/** The access rule on the server (R3.4). Denied: a redirect and no world data. Allowed: the title only. */
export const enterWorld = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(targetOf)
  .handler(({ data: id, context }) =>
    safely(async () => {
      const legend = (await getCatalogue()).find((l) => l.id === id);
      if (!legend) throw notFound();
      const target: Target = { kind: 'legend', id };
      if (!canEnter(target, context.visitor, getEnv().guestWorld)) throw redirect({ to: context.visitor.kind === 'user' ? '/' : '/sign-in' });
      return { id: legend.id, title: legend.title };
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
        runs: runs.map((r) => ({ id: r.id, legendId: r.legendId, title: titles.get(r.legendId) ?? r.legendId, status: r.status, score: r.score, startedAt: r.startedAt.toISOString() })),
        completed: completed.map((c) => ({ ...c, title: titles.get(c.legendId) ?? c.legendId })),
      };
    }),
  );

// The four run functions (R4.3). Inputs go through the skeleton's strict validators; there is no user id, score, seed
// or version in any input. requireUser refuses guests and the service checks again (R4.11).
const passThrough = (d: unknown) => d;
const publicRun = (r: { id: string; legendId: string; status: string; slotsSolved: number; score: number }) => ({ id: r.id, legendId: r.legendId, status: r.status, slotsSolved: r.slotsSolved, score: r.score });

export const startRunFn = createServerFn({ method: 'POST' })
  .middleware([requireUser])
  .validator(passThrough)
  // signed-in users may enter every world (decision 29), so the only gate is the session
  .handler(({ data, context }) => safely(async () => publicRun(await startRun(await runDeps(), context.user, data))));

export const finishRunFn = createServerFn({ method: 'POST' })
  .middleware([requireUser])
  .validator(passThrough)
  .handler(({ data, context }) => safely(async () => publicRun(await finishRun(await runDeps(), context.user, data))));

export const listMyRunsFn = createServerFn({ method: 'GET' })
  .middleware([requireUser])
  .handler(({ context }) => safely(async () => (await listMyRuns(await runDeps(), context.user)).map(publicRun)));

export const myCompletedWorldsFn = createServerFn({ method: 'GET' })
  .middleware([requireUser])
  .handler(({ context }) => safely(async () => myCompletedWorlds(await runDeps(), context.user)));
