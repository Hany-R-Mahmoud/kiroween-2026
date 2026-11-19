import { describe, expect, it } from 'vitest';
import { allVersionProblems, auditLegend, generate } from '../src/index.ts';
import { allLegends } from './helpers/legends.ts';

// One test per legend. A legend fails here when a version that can be true cannot be generated: an answer missing from
// its chapter, a slot whose candidate facts all belong to other versions, a slot or lead step with no meaningful hotspot.
// These failures are content gaps, listed in docs/content-gaps.md. They are not skipped and no rule is loosened.
describe.each(allLegends.map((l) => [l.id, l] as const))('content feasibility: %s', (_id, l) => {
  const audit = auditLegend(l);

  it('every version that can be true can be generated', () => {
    const problems = allVersionProblems(l, audit).map((p) => `${p.versionId}: ${p.problem}`);
    expect(problems).toEqual([]);
  });

  it('a fixed set of 40 seeds all generate', () => {
    const failures: string[] = [];
    for (let i = 0; i < 40; i++) {
      try {
        generate(l, `feasibility-${i}`, audit);
      } catch (e) {
        failures.push((e as Error).message);
      }
    }
    expect(failures).toEqual([]);
  });
});
