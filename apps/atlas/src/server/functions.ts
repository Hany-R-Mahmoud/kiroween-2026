import { findAnchorLegend, getAtlasLegend, getKeepersNote, isKeepersNoteAnchorStored, listLegends } from '@kiroween/skeleton';
import { isKeepersNoteId, isLegendId, resolveLocale, resolveTheme } from '@kiroween/skeleton/client';
import { isNotFound, isRedirect, notFound, redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest, setResponseStatus } from '@tanstack/react-start/server';
import { continentOf } from '../geo/continent';
import { placeMarkers } from '../geo/placeMarkers';
import { resolveAnchor } from './anchor';
import { database } from './db';
import { getEnv, imageBase } from './env';

/**
 * Only fixed messages reach the client (Start serializes just `message`). Any other error, a database or driver error
 * for example, becomes one generic message, so no host, SQL or value can leak (R2.7).
 */
async function safely<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (e) {
    if (isRedirect(e) || isNotFound(e)) throw e;
    setResponseStatus(500);
    throw new Error('The atlas could not be read. Please try again.');
  }
}
/** Route params arrive as strings from the URL; anything that is not one gets the 404 page before any query. */
const stringParam = (raw: unknown): string => {
  if (typeof raw !== 'string') throw notFound();
  return raw;
};

/** Language and direction for the document (decision 26: flag off means en and ltr), and the public origin for og: URLs. */
export const getShell = createServerFn({ method: 'GET' }).handler(() => {
  const headers = getRequest().headers;
  const cookie = /(?:^|;\s*)lang=(\w+)/.exec(headers.get('cookie') ?? '')?.[1] ?? null;
  const env = getEnv();
  const { lang, dir } = resolveLocale(env.arabicEnabled, cookie, headers.get('accept-language'));
  return { lang, dir, publicOrigin: env.publicOrigin, imageBase: imageBase() };
});

/** Every legend with its continent and its marker position, worked out on the server (the polygons stay there). */
export const getHome = createServerFn({ method: 'GET' }).handler(() =>
  safely(async () => {
    const legends = await listLegends(database());
    const placed = new Map(placeMarkers(legends.map((l) => ({ id: l.id, ...l.mapPoint }))).map((p) => [p.id, p]));
    return { legends: legends.map((l) => ({ ...l, continent: continentOf(l.mapPoint.lat, l.mapPoint.lng), place: placed.get(l.id)! })) };
  }),
);

export const getLegend = createServerFn({ method: 'GET' })
  .validator(stringParam)
  .handler(({ data: id }) =>
    safely(async () => {
      if (!isLegendId(id)) throw notFound();
      // The Keeper's Note is not a legend row: it is read from its own table, before the legend lookup (R3.4).
      if (isKeepersNoteId(id)) {
        const note = await getKeepersNote(database());
        if (!note) throw notFound();
        return { kind: 'note' as const, note };
      }
      const legend = await getAtlasLegend(database(), id);
      if (!legend) throw notFound();
      return { kind: 'legend' as const, legend, theme: resolveTheme(legend.theme) };
    }),
  );

export const resolveAnchorFn = createServerFn({ method: 'GET' })
  .validator(stringParam)
  .handler(({ data: anchor }) =>
    safely(async () => {
      const result = await resolveAnchor(anchor, async (a) => (await findAnchorLegend(database(), a)) ?? ((await isKeepersNoteAnchorStored(database(), a)) ? 'keepers-note' : null));
      if (result.kind === 'notFound') throw notFound();
      throw redirect({ href: result.href });
    }),
  );
