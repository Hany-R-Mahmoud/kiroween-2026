// For each legend: does the model stored in Neon (read back through loadLegend) equal the legend parsed from
// content/legends, and does it give the same run? Prints yes or no per legend, never a row or a value.
import { isDeepStrictEqual } from 'node:util';
import { createDb } from '../src/db/client.ts';
import { loadCatalogue, loadLegend } from '../src/db/loadLegend.ts';
import { generate } from '../src/generator/generate.ts';
import { loadLegends } from '../src/parser/loadLegends.ts';
import { REPO_ROOT, unpooledUrl } from './env.ts';

const { legends, errors } = loadLegends(`${REPO_ROOT}content/legends`);
if (errors.length) {
  console.error(`${errors.length} parse error(s); fix content first`);
  process.exit(1);
}

const { db, close } = createDb(unpooledUrl());
let bad = 0;
try {
  const catalogue = await loadCatalogue(db);
  console.log(`catalogue: ${catalogue.length} legends, slot counts ${[...new Set(catalogue.map((c) => c.slotCount))].join('/')}`);
  for (const parsed of legends) {
    const stored = await loadLegend(db, parsed.id);
    const same = stored !== null && isDeepStrictEqual(stored, parsed);
    const sameRuns = stored !== null && ['a', 'b', 'c', 'd', 'e'].every((s) => isDeepStrictEqual(generate(stored, s), generate(parsed, s)));
    if (!same || !sameRuns) bad++;
    console.log(`${parsed.id.padEnd(20)} stored model equals parsed: ${same ? 'yes' : 'NO'}   same runs: ${sameRuns ? 'yes' : 'NO'}`);
  }
} catch {
  console.error('check failed (details withheld)');
  bad++;
} finally {
  await close();
}
process.exitCode = bad ? 1 : 0;
