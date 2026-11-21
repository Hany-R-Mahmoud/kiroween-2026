import { readFileSync } from 'node:fs';
import { createDb } from '../src/db/client.ts';
import { KeepersImportError, importKeepersNote } from '../src/keepers/import.ts';
import { parseKeepersNote } from '../src/keepers/parse.ts';
import { keepersContentHash, planKeepersNote } from '../src/keepers/plan.ts';
import { REPO_ROOT, unpooledUrl } from './env.ts';

const text = readFileSync(`${REPO_ROOT}content/keepers-note.md`, 'utf8');
const parsed = parseKeepersNote(text);
if (!parsed.ok) {
  for (const e of parsed.errors) console.error(`keepers-note.md:${e.line}: ${e.message}`);
  console.error('Nothing was imported.');
  process.exit(1);
}

const plan = planKeepersNote(parsed.note, parsed.details, keepersContentHash(text));
const { db, close } = createDb(unpooledUrl());
try {
  const r = await importKeepersNote(db, plan);
  console.log(`status: ${r.status}`);
  console.log('written:', JSON.stringify(r.written));
  console.log('rows:   ', JSON.stringify(r.rows));
} catch (e) {
  console.error(e instanceof KeepersImportError ? e.message : 'import failed with an unexpected error (details withheld)');
  process.exitCode = 1;
} finally {
  await close();
}
