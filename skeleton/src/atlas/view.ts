// The legend page's data, built from the database rows (the atlas server) or from a parsed legend (the tests).
// Two independent builders; a test proves they agree for every legend, so the page the server builds from Neon is
// the page the tests render from the content files.
import { parseAssetSize } from '../assets/assetUrl.ts';
import type { Legend } from '../model/schema.ts';

export interface AtlasImage {
  id: string;
  width: number;
  height: number;
}
export interface AtlasChapter {
  ordinal: number;
  anchor: string;
  title: string;
  text: string;
  hook: string;
  sources: string[];
  plate: AtlasImage | null;
}
export interface AtlasVersion {
  anchor: string;
  sourceType: string;
  era: string;
  claim: string;
  conflicts: string;
  sourceId: string;
  paragraph: string;
}
export interface AtlasSource {
  id: string;
  title: string;
  author: string;
  year: string;
  url: string;
}
export interface AtlasLegend {
  id: string;
  title: string;
  region: string;
  era: string;
  scareLevel: number;
  readingTimeMin: number;
  oneLineHook: string;
  mapPoint: { lat: number; lng: number };
  coldOpen: string;
  chapters: AtlasChapter[];
  versionsAnchor: string;
  versions: AtlasVersion[];
  documentedTold: { rows: { documented: string; told: string }[]; closing: string };
  sources: AtlasSource[];
  hero: AtlasImage | null;
  marker: AtlasImage | null;
  theme: Legend['theme'];
}

/** Exactly the columns the reader role may select (design 3.3), in the shapes the atlas queries return. */
export interface AtlasRows {
  legend: {
    id: string;
    title: string;
    region: string;
    mapLat: number;
    mapLng: number;
    era: string;
    scareLevel: number;
    readingTimeMin: number;
    oneLineHook: string;
    coldOpen: string;
    documentedClosing: string;
    theme: Legend['theme'];
  };
  chapters: { ordinal: number; anchor: string; title: string; sourceIds: string[]; body: string; hook: string }[];
  versions: { ordinal: number; anchor: string; sourceType: string; era: string; claim: string; conflicts: string; sourceId: string; paragraph: string }[];
  documentedTold: { ordinal: number; documented: string; told: string }[];
  sources: AtlasSource[];
  assets: { id: string; size: string }[];
  anchors: { anchor: string; kind: string }[];
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const heroId = (legendId: string) => `${legendId}-atlas-hero-01`;
const plateId = (legendId: string, ordinal: number) => `${legendId}-atlas-chapter-${pad2(ordinal)}`;
/** The marker may sit on the atlas or the shared surface (banshee and jersey-devil use shared). */
const isMarker = (legendId: string, assetId: string) => new RegExp(`^${legendId}-(atlas|shared)-marker-\\d+$`).test(assetId);
const byOrdinal = (a: { ordinal: number }, b: { ordinal: number }) => a.ordinal - b.ordinal;
/** S1, S2, ... S10 in number order, which is the file order in every legend (checked in the design). */
const sourceNumber = (id: string) => Number(/\d+/.exec(id)?.[0] ?? Number.MAX_SAFE_INTEGER);

/** Every legend stores a bare versions anchor (Phase 1 parser); without it the versions section has no deep link. */
function required(anchor: string | undefined, legendId: string): string {
  if (anchor === undefined) throw new Error(`legend ${legendId} has no versions anchor`);
  return anchor;
}
function image(assets: readonly { id: string; size: string }[], id: string | undefined): AtlasImage | null {
  const a = id === undefined ? undefined : assets.find((x) => x.id === id);
  const size = a ? parseAssetSize(a.size) : null;
  return a && size ? { id: a.id, ...size } : null;
}
/** The legend's map marker image, on the atlas or the shared surface, or null. */
export function markerOf(legendId: string, assets: readonly { id: string; size: string }[]): AtlasImage | null {
  return image(assets, assets.map((a) => a.id).filter((id) => isMarker(legendId, id)).sort()[0]);
}
/** The legend's atlas hero image, or null. */
export function heroOf(legendId: string, assets: readonly { id: string; size: string }[]): AtlasImage | null {
  return image(assets, heroId(legendId));
}
function images(legendId: string, assets: readonly { id: string; size: string }[]) {
  return { hero: image(assets, heroId(legendId)), marker: markerOf(legendId, assets), plate: (n: number) => image(assets, plateId(legendId, n)) };
}
/**
 * The hub images the atlas home uses. content/hub-and-tutorial.md is not imported, so their ids and sizes are
 * listed here as that file gives them; a test checks both against the files.
 */
export const SHARED_ATLAS_IMAGES = {
  hero: { id: 'shared-atlas-hero-01', width: 2400, height: 1350 },
  map: { id: 'shared-atlas-map-01', width: 4096, height: 2048 },
} as const satisfies Record<string, AtlasImage>;
/** A legend on the home page: the map card and the list item. */
export interface AtlasSummary {
  id: string;
  title: string;
  region: string;
  era: string;
  scareLevel: number;
  readingTimeMin: number;
  oneLineHook: string;
  mapPoint: { lat: number; lng: number };
  marker: AtlasImage | null;
  /** The legend's atlas hero, for the home card image; absent or null falls back to the marker. */
  hero?: AtlasImage | null;
}

export function atlasLegendFromRows(r: AtlasRows): AtlasLegend {
  const l = r.legend;
  const img = images(l.id, r.assets);
  return {
    id: l.id,
    title: l.title,
    region: l.region,
    era: l.era,
    scareLevel: l.scareLevel,
    readingTimeMin: l.readingTimeMin,
    oneLineHook: l.oneLineHook,
    mapPoint: { lat: l.mapLat, lng: l.mapLng },
    coldOpen: l.coldOpen,
    chapters: [...r.chapters].sort(byOrdinal).map((c) => ({ ordinal: c.ordinal, anchor: c.anchor, title: c.title, text: c.body, hook: c.hook, sources: c.sourceIds, plate: img.plate(c.ordinal) })),
    versionsAnchor: required(r.anchors.find((a) => a.kind === 'versions')?.anchor, l.id),
    versions: [...r.versions].sort(byOrdinal).map((v) => ({ anchor: v.anchor, sourceType: v.sourceType, era: v.era, claim: v.claim, conflicts: v.conflicts, sourceId: v.sourceId, paragraph: v.paragraph })),
    documentedTold: { rows: [...r.documentedTold].sort(byOrdinal).map((d) => ({ documented: d.documented, told: d.told })), closing: l.documentedClosing },
    sources: [...r.sources].sort((a, b) => sourceNumber(a.id) - sourceNumber(b.id) || a.id.localeCompare(b.id)).map((s) => ({ id: s.id, title: s.title, author: s.author, year: s.year, url: s.url })),
    hero: img.hero,
    marker: img.marker,
    theme: l.theme,
  };
}

export function atlasLegendFromModel(l: Legend): AtlasLegend {
  const img = images(l.id, l.assets);
  return {
    id: l.id,
    title: l.meta.title,
    region: l.meta.region,
    era: l.meta.era,
    scareLevel: l.meta.scareLevel,
    readingTimeMin: l.meta.readingTimeMin,
    oneLineHook: l.meta.oneLineHook,
    mapPoint: { lat: l.meta.mapPoint.lat, lng: l.meta.mapPoint.lng },
    coldOpen: l.coldOpen,
    chapters: l.chapters.map((c) => ({ ordinal: c.ordinal, anchor: c.anchor, title: c.title, text: c.text, hook: c.hook, sources: c.sources, plate: img.plate(c.ordinal) })),
    versionsAnchor: required(l.anchors.find((a) => a === `${l.id}--versions`), l.id),
    versions: l.versions.map((v) => ({ anchor: v.anchor, sourceType: v.sourceType, era: v.era, claim: v.claim, conflicts: v.conflicts, sourceId: v.sourceId, paragraph: v.paragraph })),
    documentedTold: { rows: l.documentedTold.rows.map((d) => ({ documented: d.documented, told: d.told })), closing: l.documentedTold.closing },
    sources: l.sources.map((s) => ({ id: s.id, title: s.title, author: s.author, year: s.year, url: s.url })),
    hero: img.hero,
    marker: img.marker,
    theme: l.theme,
  };
}
