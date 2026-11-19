import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { auditLegend, generate, GeneratorError, type Legend, type Run } from '../src/index.ts';
import { makeFixture } from './helpers/fixture.ts';
import { allLegends } from './helpers/legends.ts';
import { PROPERTIES } from './helpers/properties.ts';

const NUM_RUNS = 100;
const seeds = fc.oneof(fc.string(), fc.uuid());
const subjects: { name: string; legend: Legend; mustGenerate: boolean }[] = [
  { name: 'fixture', legend: makeFixture(), mustGenerate: true },
  ...allLegends.map((legend) => ({ name: legend.id, legend, mustGenerate: false })),
];
const exercised = new Map<string, number>();

/** The run, or the error message: determinism must hold for failures too. */
function outcome(l: Legend, seed: string, audit: ReturnType<typeof auditLegend>): Run | string {
  try {
    return generate(l, seed, audit);
  } catch (e) {
    return (e as Error).message;
  }
}

/** The run, or null when the legend has a content gap for this seed (a typed GeneratorError). Anything else is a bug. */
function tryGenerate(s: (typeof subjects)[number], seed: string, audit: ReturnType<typeof auditLegend>): Run | null {
  try {
    const run = generate(s.legend, seed, audit);
    exercised.set(s.name, (exercised.get(s.name) ?? 0) + 1);
    return run;
  } catch (e) {
    if (e instanceof GeneratorError && !s.mustGenerate) return null;
    throw e;
  }
}

describe.each(subjects)('properties on $name', (s) => {
  const audit = auditLegend(s.legend);

  it('determinism: the same seed gives the same run, or the same error', () => {
    fc.assert(
      fc.property(seeds, (seed) => {
        expect(outcome(s.legend, seed, audit)).toEqual(outcome(s.legend, seed, audit));
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('never throws anything but a typed GeneratorError (the fixture never throws at all)', () => {
    fc.assert(
      fc.property(seeds, (seed) => {
        tryGenerate(s, seed, audit);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it.each(Object.entries(PROPERTIES))('%s', (_name, property) => {
    fc.assert(
      fc.property(seeds, (seed) => {
        const run = tryGenerate(s, seed, audit);
        if (run) expect(property(s.legend, run), `seed ${JSON.stringify(seed)}`).toEqual([]);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

describe('the fixture really exercises the properties', () => {
  it('reaches both versions, zero swaps and two swaps, and every true-or-told fact choice', () => {
    const fx = makeFixture();
    const audit = auditLegend(fx);
    const runs = Array.from({ length: 300 }, (_, i) => generate(fx, `x${i}`, audit));
    expect(new Set(runs.map((r) => r.trueVersionId))).toEqual(new Set(['fx:v-a', 'fx:v-b']));
    expect(new Set(runs.map((r) => r.swaps.length))).toEqual(new Set([0, 1, 2]));
    expect(new Set(runs.map((r) => r.slots.find((x) => x.type === 'true-or-told')!.factId)).size).toBeGreaterThan(1);
    expect(runs.some((r) => r.slots.some((x) => x.isFinal))).toBe(true);
  });
});

describe('how much real content the properties reached', () => {
  it('reports the number of generated runs checked per legend (zero means the legend never generates: see content feasibility)', () => {
    const line = subjects.map((s) => `${s.name}:${exercised.get(s.name) ?? 0}`).join(' ');
    console.log(`generated runs checked, all properties together: ${line}`);
    expect(exercised.get('fixture')).toBeGreaterThanOrEqual(NUM_RUNS * 11);
  });
});
