// The atlas's reads (design 3.4). Drizzle builders only, so every value is a bound parameter. Every select names its
// columns: the reader role may read only some columns of `legends` and `assets`, and `select *` would be refused.
import { asc, eq, like, or } from 'drizzle-orm';
import { atlasLegendFromRows, markerOf, type AtlasLegend, type AtlasSummary } from '../atlas/view.ts';
import type { Db } from './client.ts';
import { anchors, assets, chapters, documentedTold, legends, sources, versions } from './schema.ts';

const summaryColumns = {
  id: legends.id,
  title: legends.title,
  region: legends.region,
  mapLat: legends.mapLat,
  mapLng: legends.mapLng,
  era: legends.era,
  scareLevel: legends.scareLevel,
  readingTimeMin: legends.readingTimeMin,
  oneLineHook: legends.oneLineHook,
};

/** Every legend for the home page, in title order, with its map marker. */
export async function listLegends(db: Db): Promise<AtlasSummary[]> {
  const rows = await db.select(summaryColumns).from(legends).orderBy(asc(legends.title));
  const markers = await db
    .select({ legendId: assets.legendId, id: assets.id, size: assets.size })
    .from(assets)
    .where(or(like(assets.id, '%-atlas-marker-%'), like(assets.id, '%-shared-marker-%')));
  return rows.map(({ mapLat, mapLng, ...r }) => ({
    ...r,
    mapPoint: { lat: mapLat, lng: mapLng },
    marker: markerOf(r.id, markers.filter((m) => m.legendId === r.id)),
  }));
}

/** One legend's page, read in one transaction so an import running at the same time is never half seen. Null if unknown. */
export async function getAtlasLegend(db: Db, id: string): Promise<AtlasLegend | null> {
  return db.transaction(async (tx) => {
    const [legend] = await tx
      .select({ ...summaryColumns, coldOpen: legends.coldOpen, documentedClosing: legends.documentedClosing, theme: legends.theme })
      .from(legends)
      .where(eq(legends.id, id))
      .limit(1);
    if (!legend) return null;
    return atlasLegendFromRows({
      legend,
      chapters: await tx.select({ ordinal: chapters.ordinal, anchor: chapters.anchor, title: chapters.title, sourceIds: chapters.sourceIds, body: chapters.body, hook: chapters.hook }).from(chapters).where(eq(chapters.legendId, id)),
      versions: await tx
        .select({ ordinal: versions.ordinal, anchor: versions.anchor, sourceType: versions.sourceType, era: versions.era, claim: versions.claim, conflicts: versions.conflicts, sourceId: versions.sourceId, paragraph: versions.paragraph })
        .from(versions)
        .where(eq(versions.legendId, id)),
      documentedTold: await tx.select({ ordinal: documentedTold.ordinal, documented: documentedTold.documented, told: documentedTold.told }).from(documentedTold).where(eq(documentedTold.legendId, id)),
      sources: await tx.select({ id: sources.id, title: sources.title, author: sources.author, year: sources.year, url: sources.url }).from(sources).where(eq(sources.legendId, id)),
      assets: await tx.select({ id: assets.id, size: assets.size }).from(assets).where(eq(assets.legendId, id)),
      anchors: await tx.select({ anchor: anchors.anchor, kind: anchors.kind }).from(anchors).where(eq(anchors.legendId, id)),
    });
  });
}

/** The legend an anchor belongs to, or null when the anchor is not stored. */
export async function findAnchorLegend(db: Db, anchor: string): Promise<string | null> {
  const [row] = await db.select({ legendId: anchors.legendId }).from(anchors).where(eq(anchors.anchor, anchor)).limit(1);
  return row?.legendId ?? null;
}
