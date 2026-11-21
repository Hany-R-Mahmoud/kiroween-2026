import { hint2Anchor } from '../src/generator/hints.ts';
import { describe, expect, it } from 'vitest';
import { auditLegend, generate, GeneratorError, type Legend, type Run } from '../src/index.ts';
import { makeFixture } from './helpers/fixture.ts';
import { PROPERTIES } from './helpers/properties.ts';

const fx = makeFixture();
const good = (seed = 'seed'): Run => generate(fx, seed);
const violations = (l: Legend, run: Run): string[] => Object.entries(PROPERTIES).flatMap(([name, p]) => p(l, run).map((v) => `${name}: ${v}`));
const caughtBy = (l: Legend, run: Run, ...names: string[]): void => {
  const v = violations(l, run);
  for (const n of names) expect(v.some((x) => x.startsWith(n)), `expected "${n}" to flag it; got ${JSON.stringify(v)}`).toBe(true);
};

describe('errors name legend, slot and seed, and never return a partial run', () => {
  it('a slot with no qualifying fact throws no-qualifying-fact', () => {
    const l = makeFixture();
    l.world.slots.find((s) => s.id === 'fx:s4')!.candidateFactIds = ['fx:f16']; // the only [R] fact
    let err: unknown;
    try {
      generate(l, 'seed-77');
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(GeneratorError);
    const e = err as GeneratorError;
    expect(e.code).toBe('no-qualifying-fact');
    expect(e.legendId).toBe('fx');
    expect(e.seed).toBe('seed-77');
    expect(e.message).toContain('fx:s4');
  });

  it('two slots that need the same single fact throw no-distinct-facts', () => {
    const l = makeFixture();
    const s1 = l.world.slots.find((s) => s.id === 'fx:s1')!;
    s1.candidateFactIds = ['fx:f1'];
    l.world.slots.push({ ...s1, id: 'fx:s1b' });
    expect(() => generate(l, 'a')).toThrowError(expect.objectContaining({ code: 'no-distinct-facts' }));
  });

  it('a lead step with no meaningful hotspot throws lead-uncovered, never a run with a hole', () => {
    const l = makeFixture();
    for (const h of l.world.hotspots) h.links = h.links.filter((k) => !(k.kind === 'leadStep' && k.leadId === 'fx:lead-2' && k.step === 3));
    const codes = new Set<string>();
    for (let i = 0; i < 40; i++) {
      try {
        generate(l, `s${i}`);
      } catch (e) {
        codes.add((e as GeneratorError).code);
      }
    }
    expect([...codes]).toEqual(['lead-uncovered']);
  });

  it('a slot with no hotspot throws slot-uncovered', () => {
    const l = makeFixture();
    for (const h of l.world.hotspots) h.links = h.links.filter((k) => !(k.kind === 'fact' && ['fx:f21', 'fx:f22'].includes(k.factId)));
    expect(() => generate(l, 'a')).toThrowError(expect.objectContaining({ code: 'slot-uncovered' }));
  });

  it('a dead end whose contradiction anchor does not exist throws dead-end-anchor', () => {
    const l = makeFixture();
    l.leads[2]!.contradiction = { factIds: ['fx:f2'], anchors: ['fx--ch-9'] };
    expect(() => generate(l, 'a')).toThrowError(expect.objectContaining({ code: 'dead-end-anchor' }));
  });

  it('fewer than three usable wrong answers throws too-few-wrong-answers', () => {
    const l = makeFixture();
    for (const f of l.facts) f.wrongAnswers = [f.answer, 'only one other', 'only one other'];
    expect(() => generate(l, 'a')).toThrowError(expect.objectContaining({ code: 'too-few-wrong-answers' }));
  });

  it('a hint 2 anchor outside the deep-link set throws hint-anchor', () => {
    // Hint 2 opens the chosen fact's anchor; the generator's other checks reject such a fact first, so test the check itself.
    expect(() => hint2Anchor(makeFixture(), 'fx--ch-9', 'fx:v-a', 'a')).toThrowError(expect.objectContaining({ code: 'hint-anchor' }));
  });

  it('too few decoys throws hotspot-invariant', () => {
    const l = makeFixture();
    for (const h of l.world.hotspots.filter((x) => x.role === 'decoy' && !x.swappable)) h.role = 'meaningful';
    expect(() => generate(l, 'a')).toThrowError(expect.objectContaining({ code: 'hotspot-invariant' }));
  });
});

describe('rules checked on named cases', () => {
  it('[R] facts never fill a true-or-told slot, in 200 seeds', () => {
    const audit = auditLegend(fx);
    for (let i = 0; i < 200; i++) expect(generate(fx, `r${i}`, audit).slots.find((s) => s.type === 'true-or-told')!.factId).not.toBe('fx:f16');
  });

  it('a [R] fact does fill a date-or-number slot', () => {
    const seen = new Set(Array.from({ length: 200 }, (_, i) => generate(fx, `d${i}`).slots.find((s) => s.type === 'date-or-number')!.factId));
    expect(seen.has('fx:f5')).toBe(true);
  });

  it('a "never" lead is never the true lead, but may be a dead end', () => {
    const runs = Array.from({ length: 100 }, (_, i) => generate(fx, `n${i}`));
    expect(runs.every((r) => r.trueLead.id !== 'fx:lead-3')).toBe(true);
    expect(runs.every((r) => r.deadEnds.some((d) => d.id === 'fx:lead-3'))).toBe(true);
  });

  it('a true-chain lead with no contradiction is never shown as a dead end', () => {
    expect(Array.from({ length: 100 }, (_, i) => generate(fx, `l${i}`)).every((r) => r.deadEnds.every((d) => d.id !== 'fx:lead-2'))).toBe(true);
  });

  it('a version-specific fact is used only for its own version', () => {
    for (let i = 0; i < 200; i++) {
      const r = generate(fx, `v${i}`);
      const s1 = r.slots.find((s) => s.slotId === 'fx:s1')!.factId;
      if (s1 === 'fx:f2') expect(r.trueVersionId).toBe('fx:v-a');
      if (s1 === 'fx:f3') expect(r.trueVersionId).toBe('fx:v-b');
    }
  });

  it('the bare versions anchor is refined to the true version', () => {
    const l = makeFixture();
    for (const f of l.facts.filter((x) => l.world.slots.find((sl) => sl.id === 'fx:s4')!.candidateFactIds.includes(x.id))) f.anchor = 'fx--versions'; // Hint 2 opens the chosen fact's anchor
    const r = generate(l, 'refine');
    expect(r.slots.find((s) => s.slotId === 'fx:s4')!.hint2.anchor).toBe(`fx--versions--${r.trueVersionId.slice(3)}`);
  });

  it('the final slot is generated like the others and still appears as a final puzzle text', () => {
    const r = good();
    const s5 = r.slots.find((s) => s.slotId === 'fx:s5')!;
    expect(s5.isFinal).toBe(true);
    expect(s5.options).toHaveLength(4);
    expect(r.finalPuzzle.description).toBe('final puzzle text');
  });

  it('a swap moves the hint 1 highlight to the hotspot that is now meaningful', () => {
    const swapped = Array.from({ length: 100 }, (_, i) => generate(fx, `h${i}`)).find((r) => r.swaps.some((p) => p.includes('fx:h1')))!;
    expect(swapped.slots[0]!.hint1.highlight).toEqual(['fx:h3']);
  });
});

describe('every property fails when its rule is broken (the properties are not vacuous)', () => {
  const break_ = (edit: (r: Run, l: Legend) => void): { l: Legend; run: Run } => {
    const l = structuredClone(fx);
    const run = structuredClone(good('break'));
    edit(run, l);
    return { l, run };
  };

  it('a missing slot', () => {
    const { l, run } = break_((r) => void r.slots.pop());
    caughtBy(l, run, 'every slot is filled');
  });

  it('three options, duplicate options, no correct option', () => {
    let m = break_((r) => void r.slots[0]!.options.pop());
    caughtBy(m.l, m.run, 'exactly four distinct');
    m = break_((r) => void (r.slots[0]!.options[1] = r.slots[0]!.options[0]!));
    caughtBy(m.l, m.run, 'exactly four distinct');
    m = break_((r) => void (r.slots[0]!.options[r.slots[0]!.correctIndex] = 'something else'));
    caughtBy(m.l, m.run, 'exactly four distinct');
  });

  it('a wrong option that is the answer, or invented', () => {
    let m = break_((r) => void (r.slots[0]!.options[(r.slots[0]!.correctIndex + 1) % 4] = fx.facts.find((f) => f.id === r.slots[0]!.factId)!.answer.toUpperCase()));
    caughtBy(m.l, m.run, 'the correct answer is never among the wrong ones');
    m = break_((r) => void (r.slots[0]!.options[(r.slots[0]!.correctIndex + 1) % 4] = 'invented'));
    caughtBy(m.l, m.run, 'the correct answer is never among the wrong ones');
  });

  it('an [R] fact in true-or-told, a fact of the other version, a fact of the wrong type', () => {
    let m = break_((r) => void (r.slots.find((s) => s.type === 'true-or-told')!.factId = 'fx:f16'));
    caughtBy(m.l, m.run, 'a fact fits its slot');
    m = break_((r) => void (r.slots[0]!.factId = r.trueVersionId === 'fx:v-a' ? 'fx:f3' : 'fx:f2'));
    caughtBy(m.l, m.run, 'a fact fits its slot');
    m = break_((r) => void (r.slots[0]!.type = 'weakness'));
    caughtBy(m.l, m.run, 'every slot is filled');
  });

  it('a "never" lead as the true lead, a dead end with a missing anchor', () => {
    let m = break_((r) => void (r.trueLead.id = 'fx:lead-3'));
    caughtBy(m.l, m.run, 'the true version has a lead');
    m = break_((r) => void (r.deadEnds[0]!.contradiction = { factIds: ['fx:f2'], anchors: ['fx--ch-9'] }));
    caughtBy(m.l, m.run, 'every dead end');
  });

  it('a slot or lead step left without a meaningful hotspot', () => {
    let m = break_((r) => void r.hotspots.filter((h) => h.id === 'fx:h8').forEach((h) => (h.role = 'decoy')));
    caughtBy(m.l, m.run, 'every filled slot and every true-lead step');
    m = break_((r) => r.hotspots.filter((h) => h.id === 'fx:h4').forEach((h) => (h.role = 'decoy')));
    caughtBy(m.l, m.run, 'every filled slot and every true-lead step');
  });

  it('too few decoys, an invalid swap, links not handed over, a change without a swap', () => {
    let m = break_((r) => r.hotspots.filter((h) => h.role === 'decoy').slice(0, 3).forEach((h) => (h.role = 'meaningful')));
    caughtBy(m.l, m.run, 'at least 5 decoys');
    m = break_((r) => void r.swaps.push(['fx:h4', 'fx:h9']));
    caughtBy(m.l, m.run, 'at least 5 decoys');
    m = break_((r) => void r.swaps.push(['fx:h1', 'fx:h6']));
    caughtBy(m.l, m.run, 'at least 5 decoys');
    m = break_((r) => void (r.hotspots.find((h) => h.id === 'fx:h4')!.links = []));
    caughtBy(m.l, m.run, 'at least 5 decoys');
  });

  it('a hint 2 anchor outside the deep-link set, a hint 1 on a decoy made by a swap', () => {
    let m = break_((r) => void (r.slots[0]!.hint2.anchor = 'fx--ch-9'));
    caughtBy(m.l, m.run, 'hint 2 deep-links');
    m = break_((r) => {
      r.hotspots.find((h) => h.id === 'fx:h1')!.role = 'decoy';
      r.slots[0]!.hint1.highlight = ['fx:h1'];
    });
    caughtBy(m.l, m.run, 'hint 2 deep-links');
  });

  it('an answer that is not written in the linked chapter', () => {
    const m = break_((_r, l) => void (l.chapters.find((c) => c.anchor === 'fx--ch-3')!.text = 'nothing here'));
    const withWeakness = { ...m, run: { ...m.run, slots: m.run.slots.map((s) => (s.type === 'weakness' ? { ...s } : s)) } };
    caughtBy(withWeakness.l, withWeakness.run, 'the answer is written in the linked text');
  });
});
