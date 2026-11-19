import type { Legend } from '../model/schema.ts';
import type { anchors, assets, chapters, documentedTold, facts, factPuzzleTypes, fearEvents, hotspots, leads, legends, puzzleSlots, scenes, sources, versions } from './schema.ts';

type Row<T extends { $inferInsert: unknown }> = T['$inferInsert'];

/** Every row one legend writes, by table. Pure: no database, same input gives the same plan. */
export interface Plan {
  legends: Row<typeof legends>;
  anchors: Row<typeof anchors>[];
  chapters: Row<typeof chapters>[];
  versions: Row<typeof versions>[];
  documentedTold: Row<typeof documentedTold>[];
  facts: Row<typeof facts>[];
  factPuzzleTypes: Row<typeof factPuzzleTypes>[];
  leads: Row<typeof leads>[];
  scenes: Row<typeof scenes>[];
  hotspots: Row<typeof hotspots>[];
  puzzleSlots: Row<typeof puzzleSlots>[];
  fearEvents: Row<typeof fearEvents>[];
  assets: Row<typeof assets>[];
  sources: Row<typeof sources>[];
}

function planAnchors(l: Legend): Plan['anchors'] {
  const chapter = new Map(l.chapters.map((c) => [c.anchor, c.id]));
  const version = new Map(l.versions.map((v) => [v.anchor, v.id]));
  return l.anchors.map((anchor) => {
    if (chapter.has(anchor)) return { anchor, legendId: l.id, kind: 'chapter', refId: chapter.get(anchor)! };
    if (version.has(anchor)) return { anchor, legendId: l.id, kind: 'version', refId: version.get(anchor)! };
    return { anchor, legendId: l.id, kind: 'versions', refId: null };
  });
}

export function planLegend(l: Legend, contentHash: string): Plan {
  const legendId = l.id;
  const m = l.meta;
  return {
    legends: {
      id: l.id, title: m.title, region: m.region, countryTheme: m.countryTheme, mapLat: m.mapPoint.lat, mapLng: m.mapPoint.lng, era: m.era,
      scareLevel: m.scareLevel, readingTimeMin: m.readingTimeMin, oneLineHook: m.oneLineHook, coldOpen: l.coldOpen,
      documentedClosing: l.documentedTold.closing, setting: l.world.setting, spirit: l.world.spirit, theme: l.theme, finalPuzzle: l.world.finalPuzzle, contentHash,
      model: l, // the whole parsed legend, written in the same transaction as the rows (R4.8)
    },
    anchors: planAnchors(l),
    chapters: l.chapters.map((c) => ({ id: c.id, legendId, ordinal: c.ordinal, anchor: c.anchor, title: c.title, sourceIds: c.sources, body: c.text, hook: c.hook })),
    versions: l.versions.map((v) => ({ id: v.id, legendId, sourceType: v.sourceType, era: v.era, claim: v.claim, conflicts: v.conflicts, sourceId: v.sourceId, anchor: v.anchor, paragraph: v.paragraph })),
    documentedTold: l.documentedTold.rows.map((r, i) => ({ legendId, ordinal: i + 1, documented: r.documented, told: r.told })),
    facts: l.facts.map((f) => ({ id: f.id, legendId, statement: f.statement, confidence: f.confidence, anchor: f.anchor, versionId: f.versionId, answer: f.answer, wrongAnswers: f.wrongAnswers, difficulty: f.difficulty })),
    factPuzzleTypes: l.facts.flatMap((f) => f.puzzleTypes.map((puzzleType) => ({ factId: f.id, puzzleType }))),
    leads: l.leads.map((x) => ({
      id: x.id, legendId, startsFrom: x.startsFrom, steps: x.steps, deadEnd: x.deadEnd,
      contradictionFactIds: x.contradiction?.factIds ?? null, contradictionAnchors: x.contradiction?.anchors ?? null,
      trueFor: x.canBeTrueFor === 'never' ? [] : x.canBeTrueFor, neverTrue: x.canBeTrueFor === 'never',
    })),
    scenes: l.world.scenes.map((s, i) => ({ id: s.id, legendId, ordinal: i + 1, name: s.name, description: s.description })),
    hotspots: l.world.hotspots.map((h, i) => ({ id: h.id, legendId, sceneId: h.sceneId, ordinal: i + 1, object: h.object, role: h.role, swappable: h.swappable, links: h.links, onTap: h.onTap })),
    puzzleSlots: l.world.slots.map((s, i) => ({
      id: s.id, legendId, ordinal: i + 1, label: s.label, puzzleType: s.type, isFinal: s.isFinal, candidateFactIds: s.candidateFactIds,
      hint1Text: s.hint1.text, hint1Highlights: s.hint1.highlight, hint2Anchor: s.hint2Anchor,
    })),
    fearEvents: l.world.fearEvents.map((e, i) => ({ id: e.id, legendId, ordinal: i + 1, description: e.description, reducedMotion: e.reducedMotion })),
    assets: l.assets.map((a) => ({ id: a.id, legendId, usage: a.usage, size: a.size, background: a.background, prompt: a.prompt, mustAvoid: a.mustAvoid })),
    sources: l.sources.map((s) => ({ id: s.id, legendId, title: s.title, author: s.author, year: s.year, url: s.url, publicDomain: s.publicDomain, supports: s.supports })),
  };
}

/** Rows per table, in the order the importer writes them. */
export const planCounts = (p: Plan): Record<keyof Plan, number> =>
  Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Array.isArray(v) ? v.length : 1])) as Record<keyof Plan, number>;
