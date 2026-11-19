import { describe, expect, it } from 'vitest';
import { auditLegend } from '../src/generator/audit.ts';
import { allVersionProblems, versionProblems } from '../src/generator/coverage.ts';
import { makeFixture } from './helpers/fixture.ts';

describe('auditLegend on the fixture', () => {
  it('finds no gaps when every answer is in its chapter', () => {
    const a = auditLegend(makeFixture());
    expect(a.gaps).toEqual([]);
    expect(a.uncoveredSlots).toEqual([]);
    expect(a.uncoveredLeadSteps).toEqual([]);
  });

  it('reports one gap for one answer that is not in its chapter, and only that one', () => {
    const l = makeFixture();
    l.facts.find((f) => f.id === 'fx:f9')!.answer = 'a thing the chapter never says';
    const a = auditLegend(l);
    expect(a.gaps.map((g) => `${g.factId}/${g.puzzleType}`)).toEqual(['fx:f9/weakness']);
    expect(a.usable['fx:f9']).toEqual([]);
    expect(a.usable['fx:f10']).toEqual(['weakness']);
  });

  it('never reports a gap for true-or-told and ritual-order, even when the text lacks the answer', () => {
    const l = makeFixture();
    for (const c of l.chapters) c.text = 'nothing relevant';
    const types = new Set(auditLegend(l).gaps.map((g) => g.puzzleType));
    expect(types.has('true-or-told')).toBe(false);
    expect(types.has('ritual-order')).toBe(false);
  });

  it('checks a bare versions anchor against the whole versions section and does not call it a gap', () => {
    const l = makeFixture();
    const f = l.facts.find((x) => x.id === 'fx:f20')!;
    f.anchor = 'fx--versions';
    f.answer = 'paragraph v-b';
    expect(auditLegend(l).gaps.map((g) => g.factId)).not.toContain('fx:f20');
  });

  it('lists a slot with no meaningful hotspot and a lead step with none', () => {
    const l = makeFixture();
    for (const h of l.world.hotspots) h.links = h.links.filter((k) => !(k.kind === 'fact' && ['fx:f21', 'fx:f22'].includes(k.factId)) && !(k.kind === 'leadStep' && k.leadId === 'fx:lead-2' && k.step === 3));
    const a = auditLegend(l);
    expect(a.uncoveredSlots).toEqual(['fx:s6']);
    expect(a.uncoveredLeadSteps).toEqual([{ leadId: 'fx:lead-2', step: 3 }]);
  });
});

describe('versionProblems', () => {
  it('has none for a fully satisfiable fixture', () => {
    const l = makeFixture();
    expect(allVersionProblems(l, auditLegend(l))).toEqual([]);
  });

  it('flags only the version that loses its facts', () => {
    const l = makeFixture();
    // s3 (weakness) keeps f9 and f12 for any version; remove the answers of the "all" facts from the chapter and the v-specific one
    for (const id of ['fx:f9', 'fx:f12', 'fx:f10']) l.facts.find((f) => f.id === id)!.answer = 'nowhere in the text';
    const a = auditLegend(l);
    expect(versionProblems(l, a, 'fx:v-a').map((p) => p.problem)).toEqual(['slot fx:s3: no qualifying fact']);
    expect(versionProblems(l, a, 'fx:v-b')).toEqual([]); // f11 is v-b only and still in the text
  });

  it('flags a version whose true lead has an uncovered step', () => {
    const l = makeFixture();
    for (const h of l.world.hotspots) h.links = h.links.filter((k) => !(k.kind === 'leadStep' && k.leadId === 'fx:lead-1' && k.step === 2));
    const a = auditLegend(l);
    expect(versionProblems(l, a, 'fx:v-a').map((p) => p.problem)).toEqual(['no lead true for this version has a meaningful hotspot on every step']);
    expect(versionProblems(l, a, 'fx:v-b')).toEqual([]);
  });

  it('flags two slots that can only use the same single fact', () => {
    const l = makeFixture();
    // make slot s1 and a clone slot compete for one fact
    const s1 = l.world.slots.find((s) => s.id === 'fx:s1')!;
    s1.candidateFactIds = ['fx:f1'];
    const clone = { ...s1, id: 'fx:s1b' };
    l.world.slots.push(clone);
    const a = auditLegend(l);
    expect(versionProblems(l, a, 'fx:v-a').map((p) => p.problem)).toEqual(['no distinct fact for every slot']);
  });
});
