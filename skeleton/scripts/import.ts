import { createDb } from '../src/db/client.ts';
import { ImportError, importAll } from '../src/db/import.ts';
import { loadLegends } from '../src/parser/loadLegends.ts';
import { REPO_ROOT, unpooledUrl } from './env.ts';

const { legends, errors, hashes } = loadLegends(`${REPO_ROOT}content/legends`);
if (errors.length) {
  for (const e of errors) console.error(`${e.file}:${e.line} [${e.section}] ${e.message}`);
  console.error('Nothing was imported.');
  process.exit(1);
}

const { db, close } = createDb(unpooledUrl());
try {
  const results = await importAll(
    db,
    legends.map((legend) => ({ legend, hash: hashes.get(legend.id)! })),
  );
  const total: Record<string, number> = {};
  for (const [id, counts] of results) {
    console.log(id.padEnd(20), JSON.stringify(counts));
    for (const [table, n] of Object.entries(counts)) total[table] = (total[table] ?? 0) + n;
  }
  console.log('TOTAL'.padEnd(20), JSON.stringify(total));
} catch (e) {
  // ImportError carries only the legend, the table and the SQLSTATE code. Anything else is reported without its message,
  // because driver errors can contain the host or the connection string.
  console.error(e instanceof ImportError ? e.message : 'import failed with an unexpected error (details withheld)');
  process.exitCode = 1;
} finally {
  await close();
}
