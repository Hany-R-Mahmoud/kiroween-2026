import { describe, expect, it } from 'vitest';
import { planLegend } from '../src/db/plan.ts';
import { generate } from '../src/generator/generate.ts';
import { legendSchema } from '../src/model/schema.ts';
import { allLegends } from './helpers/legends.ts';

// What the server reads back is `legendSchema.parse` of the stored jsonb. JSON is the storage round trip.
const stored = (l: (typeof allLegends)[number]) => legendSchema.parse(JSON.parse(JSON.stringify(planLegend(l, 'h').legends.model)));

describe.each(allLegends.map((l) => [l.id, l] as const))('stored legend model: %s', (_id, l) => {
  it('equals the parsed legend after the jsonb round trip and validation', () => {
    expect(stored(l)).toEqual(l);
  });

  it('gives the same run as the parsed legend for 20 seeds (the order of leads, facts and versions survives)', () => {
    const back = stored(l);
    for (let i = 0; i < 20; i++) expect(generate(back, `snap-${i}`)).toEqual(generate(l, `snap-${i}`));
  });
});
