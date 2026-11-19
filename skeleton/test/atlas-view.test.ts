import { describe, expect, it } from 'vitest';
import { atlasLegendFromModel, atlasLegendFromRows, type AtlasRows } from '../src/atlas/view.ts';
import { planLegend } from '../src/db/plan.ts';
import type { Legend } from '../src/model/schema.ts';
import { allLegends, legendById } from './helpers/legends.ts';

// A database returns rows in any order unless asked; reverse and rotate them so only the builder's own sorting
// can restore the file's order.
const shuffle = <T>(rows: readonly T[]): T[] => {
  const r = [...rows].reverse();
  return [...r.slice(1), ...r.slice(0, 1)];
};
/** The rows the importer writes for this legend (Phase 1's pure planner), shuffled, as the atlas queries see them. */
function rowsOf(l: Legend): AtlasRows {
  const p = planLegend(l, 'test-hash');
  return {
    legend: { ...p.legends, theme: p.legends.theme },
    chapters: shuffle(p.chapters),
    versions: shuffle(p.versions),
    documentedTold: shuffle(p.documentedTold),
    sources: shuffle(p.sources),
    assets: shuffle(p.assets),
    anchors: shuffle(p.anchors),
  };
}
const withoutVersions = ({ versions: _, ...rest }: ReturnType<typeof atlasLegendFromModel>) => rest;

describe('the legend page data is the same from the database rows and from the content file', () => {
  it('for every legend, apart from the order of versions', () => {
    for (const l of allLegends) expect(withoutVersions(atlasLegendFromRows(rowsOf(l))), l.id).toEqual(withoutVersions(atlasLegendFromModel(l)));
  });

  it('for every legend, including the order of versions', () => {
    for (const l of allLegends) expect(atlasLegendFromRows(rowsOf(l)), l.id).toEqual(atlasLegendFromModel(l));
  });

  it('finds the hero, a plate for every chapter, and the marker on either surface', () => {
    for (const l of allLegends) {
      const v = atlasLegendFromModel(l);
      expect(v.hero, l.id).not.toBeNull();
      expect(v.marker, l.id).not.toBeNull();
      for (const c of v.chapters) expect(c.plate, `${l.id} ch-${c.ordinal}`).not.toBeNull();
    }
    expect(atlasLegendFromModel(legendById('banshee')).marker).toEqual({ id: 'banshee-shared-marker-01', width: 512, height: 512 });
    expect(atlasLegendFromModel(legendById('naddaha')).chapters).toHaveLength(6);
  });
});
