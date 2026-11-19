import { describe, expect, it } from 'vitest';
import { parseLegend } from '../src/index.ts';
import { allLegends, dirHash, legendById, legendFiles, LEGENDS_DIR, loadErrors, readLegend } from './helpers/legends.ts';
import { loadLegends } from '../src/index.ts';

const mustFail = (id: string, edit: (t: string) => string) => {
  const before = readLegend(id);
  const after = edit(before);
  expect(after, 'the edit must change the text').not.toBe(before);
  const r = parseLegend(after, `${id}.md`);
  if (r.ok) throw new Error('expected a parse error');
  return r.errors;
};

describe('parser on all files', () => {
  it('loads all twelve legends with no errors', () => {
    expect(legendFiles()).toHaveLength(12);
    expect(loadErrors).toEqual([]);
    expect(allLegends).toHaveLength(12);
  });

  it('never changes content files', () => {
    const before = dirHash();
    loadLegends(LEGENDS_DIR);
    expect(dirHash()).toBe(before);
  });

  it('namespaces every id with the legend id', () => {
    for (const l of allLegends) {
      const ids = [
        ...l.facts.map((f) => f.id),
        ...l.leads.map((x) => x.id),
        ...l.versions.map((v) => v.id),
        ...l.world.hotspots.map((h) => h.id),
        ...l.world.scenes.map((s) => s.id),
        ...l.world.slots.map((s) => s.id),
      ];
      for (const i of ids) expect(i.startsWith(`${l.id}:`), i).toBe(true);
    }
  });
});

describe('banshee (### headings, final slot pz-5)', () => {
  const l = legendById('banshee');

  it('reads the counts that the source file has', () => {
    expect(l.chapters).toHaveLength(7);
    expect(l.versions.map((v) => v.id)).toEqual(['banshee:v-keener', 'banshee:v-clan', 'banshee:v-window', 'banshee:v-washer']);
    expect(l.facts).toHaveLength(30);
    expect(l.leads).toHaveLength(4);
    expect(l.world.hotspots).toHaveLength(16);
    expect(l.world.hotspots.filter((h) => h.role === 'decoy')).toHaveLength(7);
    expect(l.world.scenes.map((s) => s.id)).toEqual(['banshee:sc-kitchen', 'banshee:sc-ford', 'banshee:sc-loft']);
  });

  it('parses a fact row field by field (f05)', () => {
    const f = l.facts.find((x) => x.id === 'banshee:f05')!;
    expect(f.anchor).toBe('banshee--ch-2');
    expect(f.versionId).toBe('banshee:v-keener');
    expect(f.puzzleTypes).toEqual(['true-or-told']);
    expect(f.answer).toBe('documented: they kept it for funerals only');
    expect(f.wrongAnswers).toHaveLength(3);
    expect(f.difficulty).toBe(2);
  });

  it('parses hotspot links to facts and lead steps (hs-hearth: f06; lead-3 step 2)', () => {
    const h = l.world.hotspots.find((x) => x.id === 'banshee:hs-hearth')!;
    expect(h.swappable).toBe(true);
    expect(h.links).toEqual([
      { kind: 'fact', factId: 'banshee:f06' },
      { kind: 'leadStep', leadId: 'banshee:lead-3', step: 2 },
    ]);
  });

  it('flags pz-5 as the final slot and reads its hint 2 anchor', () => {
    const s = l.world.slots.find((x) => x.id === 'banshee:pz-5')!;
    expect(s.isFinal).toBe(true);
    expect(s.type).toBe('object-match');
    expect(s.hint2Anchor).toBe('banshee--ch-7');
    expect(l.world.slots.filter((x) => x.isFinal)).toHaveLength(1);
  });

  it('reads lead-1: three steps, contradiction facts f15 and f16, true for v-window', () => {
    const lead = l.leads[0]!;
    expect(lead.steps).toHaveLength(3);
    expect(lead.contradiction).toEqual({ factIds: ['banshee:f15', 'banshee:f16'], anchors: ['banshee--ch-4', 'banshee--ch-3'] });
    expect(lead.canBeTrueFor).toEqual(['banshee:v-window']);
  });
});

describe('draugr (**bold** headings, "p-1 label" slots)', () => {
  const l = legendById('draugr');

  it('reads the counts that the source file has', () => {
    expect(l.facts).toHaveLength(40);
    expect(l.world.hotspots).toHaveLength(18);
    expect(l.world.hotspots.filter((h) => h.role === 'decoy')).toHaveLength(7);
    expect(l.world.slots.map((s) => s.id)).toEqual(['draugr:p-1', 'draugr:p-2', 'draugr:p-3', 'draugr:p-4', 'draugr:p-5']);
  });

  it('splits the slot id from its label and expands nothing it should not', () => {
    const s = l.world.slots[0]!;
    expect(s.label).toBe('The farm and the shepherd');
    expect(s.candidateFactIds).toHaveLength(7);
  });

  it('takes swappable from the table cell and from the "Swappable hotspots:" sentence', () => {
    const swappable = l.world.hotspots.filter((h) => h.swappable).map((h) => h.id.split(':')[1]);
    // the sentence names h-01, h-03, h-09, h-13 and the decoys h-10, h-15
    expect(swappable.sort()).toEqual(['h-01', 'h-03', 'h-09', 'h-10', 'h-13', 'h-15']);
  });
});

describe('flying-dutchman (bare --versions anchor, pz-final hint row)', () => {
  const l = legendById('flying-dutchman');

  it('accepts the bare versions anchor and attaches pz-final hints to the final puzzle', () => {
    expect(l.anchors).toContain('flying-dutchman--versions');
    expect(l.world.finalPuzzle.hint2Anchor).toBe('flying-dutchman--versions');
    expect(l.world.finalPuzzle.hint1?.text).toMatch(/beats/);
    expect(l.world.slots).toHaveLength(5);
    expect(l.world.slots.some((s) => s.isFinal)).toBe(false);
  });

  it('reads hint 1 highlights as hotspot ids', () => {
    expect(l.world.slots[0]!.hint1.highlight).toEqual(['flying-dutchman:h-07', 'flying-dutchman:h-03']);
  });
});

describe('"can be true when"', () => {
  it('treats a "never" line as never, even when the line names a version', () => {
    const raw = readLegend('chupacabra');
    const line = raw.split('\n').find((x) => /^can be true when:.*never/i.test(x))!;
    expect(line).toMatch(/\bv-[a-z]+/); // the source line does name a version
    const lead5 = legendById('chupacabra').leads.find((x) => x.id === 'chupacabra:lead-5')!;
    expect(lead5.canBeTrueFor).toBe('never');
  });

  it('reads the version id from the sentence otherwise', () => {
    expect(legendById('jersey-devil').leads[0]!.canBeTrueFor).toEqual(['jersey-devil:v-mother-leeds']);
  });
});

describe('errors are reported with a location, never thrown', () => {
  it('missing chapter anchor', () => {
    const e = mustFail('banshee', (t) => t.replace('anchor: banshee--ch-1\n', ''));
    expect(e.some((x) => x.section === '2' && /ch-1/.test(x.message) && x.line > 0)).toBe(true);
  });

  it('unknown puzzle type', () => {
    const e = mustFail('banshee', (t) => t.replace(/(\| f01 \|[^\n]*?\| all \| )original-name/, '$1bogus-type'));
    expect(e.some((x) => x.section === '5' && /bogus-type/.test(x.message) && x.line > 0)).toBe(true);
  });

  it('unknown version in "can be true when"', () => {
    const e = mustFail('banshee', (t) => t.replace('seed picks v-window', 'seed picks v-nope'));
    expect(e.some((x) => x.section === '6' && /v-nope/.test(x.message) && x.line > 0)).toBe(true);
  });

  it('"can be true when" with neither a version nor "never"', () => {
    const e = mustFail('banshee', (t) => t.replace('seed picks v-window', 'any seed'));
    expect(e.some((x) => x.section === '6' && /no version id/.test(x.message))).toBe(true);
  });

  it('hint highlight to a hotspot that does not exist', () => {
    const e = mustFail('flying-dutchman', (t) => t.replace('Highlight h-07 and h-03', 'Highlight h-99 and h-03'));
    expect(e.some((x) => x.section === '7' && /h-99/.test(x.message) && x.line > 0)).toBe(true);
  });

  it('a fact anchor outside the deep-link set', () => {
    const e = mustFail('banshee', (t) => t.replace('| banshee--ch-1 | all | original-name |', '| banshee--ch-9 | all | original-name |'));
    expect(e.some((x) => x.section === '5' && /banshee--ch-9/.test(x.message) && x.line > 0)).toBe(true);
  });

  it('a hint 2 anchor outside the deep-link set', () => {
    const e = mustFail('banshee', (t) => t.replace('Opens banshee--ch-7', 'Opens banshee--ch-8'));
    expect(e.some((x) => x.section === '7' && /banshee--ch-8/.test(x.message))).toBe(true);
  });
});
