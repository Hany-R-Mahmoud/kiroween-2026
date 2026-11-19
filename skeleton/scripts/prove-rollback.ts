// Proves R3.5 on the dev branch: fail after the delete step inside the real per-legend transaction, then check
// that the legend's rows are unchanged. Test-only: the normal import entry point never passes `testHooks`.
import { sql } from 'drizzle-orm';
import { createDb } from '../src/db/client.ts';
import { ImportError, importLegend } from '../src/db/import.ts';
import { loadLegends } from '../src/parser/loadLegends.ts';
import { REPO_ROOT, unpooledUrl } from './env.ts';
import { TABLES_WITH_LEGEND } from './tables.ts';

const id = process.argv[2] ?? 'banshee';
const { legends, hashes } = loadLegends(`${REPO_ROOT}content/legends`);
const legend = legends.find((l) => l.id === id);
if (!legend) {
  console.error(`no legend named ${id}`);
  process.exit(2);
}

const { db, close } = createDb(unpooledUrl());

async function counts(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const t of TABLES_WITH_LEGEND) {
    const key = t === 'legends' ? 'id' : 'legend_id';
    const res = await db.execute(sql`select count(*)::int as n from ${sql.identifier(t)} where ${sql.identifier(key)} = ${id}`);
    out[t] = Number(res.rows[0]!['n']);
  }
  return out;
}

try {
  const before = await counts();
  let failedInsideTransaction = false;
  try {
    await importLegend(db, legend, hashes.get(id)!, {
      afterDelete: () => {
        throw new Error('injected failure after delete');
      },
    });
  } catch (e) {
    failedInsideTransaction = e instanceof ImportError && e.table === 'transaction';
  }
  const after = await counts();
  const unchanged = JSON.stringify(before) === JSON.stringify(after);
  console.log('before', JSON.stringify(before));
  console.log('after ', JSON.stringify(after));
  console.log(failedInsideTransaction && unchanged ? 'PASS: the injected failure rolled back; row counts unchanged' : 'FAIL');
  process.exitCode = failedInsideTransaction && unchanged ? 0 : 1;
} finally {
  await close();
}
