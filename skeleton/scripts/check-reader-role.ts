// Checks the atlas reader role with the atlas's own connection (ATLAS_DATABASE_URL, loaded from the repo-root .env).
// Prints one yes/no line per check and never a value, row or connection detail. The write attempts run inside a
// transaction that is always rolled back, so nothing can be written even if a grant were wrong.
import { isDeepStrictEqual } from 'node:util';
import { config } from 'dotenv';
import pg from 'pg';
import { atlasLegendFromModel } from '../src/atlas/view.ts';
import { findAnchorLegend, getAtlasLegend, listLegends } from '../src/db/atlasRead.ts';
import { createDb } from '../src/db/client.ts';
import { pgError } from '../src/db/pgError.ts';
import { loadLegends } from '../src/parser/loadLegends.ts';
import { REPO_ROOT } from './env.ts';

config({ path: `${REPO_ROOT}.env`, quiet: true });
const url = process.env['ATLAS_DATABASE_URL'];
if (!url) {
  console.error('ATLAS_DATABASE_URL is not set (see .env.example).');
  process.exit(2);
}
const READ_OK = 'select id, title, theme, cold_open from legends limit 1';
const REFUSED: [string, string][] = [
  ['legends.model is refused', 'select model from legends limit 1'],
  ['legends.final_puzzle is refused', 'select final_puzzle from legends limit 1'],
  ['assets.prompt is refused', 'select prompt from assets limit 1'],
  ['runs is refused', 'select count(*) from runs'],
  ['facts is refused', 'select count(*) from facts'],
  ['neon_auth."user" is refused', 'select count(*) from neon_auth."user"'],
  ['an INSERT into legends is refused', "insert into legends (id) values ('reader-role-check')"],
  ['an UPDATE of chapters is refused', "update chapters set title = title where id = 'none'"],
  ['a DELETE from versions is refused', "delete from versions where id = 'none'"],
  ['CREATE TABLE in public is refused', 'create table reader_role_check (x int)'],
];
/** A fixed label for a connection failure, from known phrases only; the error's own text is never printed. */
function kindOf(e: unknown): string {
  const m = e instanceof Error ? e.message.toLowerCase() : '';
  const known: [string, string][] = [
    ['password authentication failed', 'password authentication failed'],
    ['does not exist', 'role or database does not exist'],
    ['no pg_hba', 'not allowed to connect'],
    ['timeout', 'timed out'],
    ['enotfound', 'host not found'],
    ['econnrefused', 'connection refused'],
    ['password must be a string', 'no password in the connection string'],
    ['sasl', 'SASL handshake problem (often a missing or mistyped password)'],
  ];
  return known.find(([phrase]) => m.includes(phrase))?.[1] ?? `${e instanceof Error ? e.name : typeof e} (not a known phrase)`;
}
const client = new pg.Client({ connectionString: url });
let bad = 0;
const line = (ok: boolean, text: string) => {
  if (!ok) bad++;
  console.log(`${ok ? 'yes' : 'NO '}  ${text}`);
};
try {
  await client.connect();
  line(true, 'connects as the reader role');
  const who = await client.query<{ u: string; superuser: string }>("select current_user as u, current_setting('is_superuser') as superuser");
  line(who.rows[0]?.u === 'atlas_web' && who.rows[0]?.superuser === 'off', 'is atlas_web and not a superuser');
  line((await client.query(READ_OK)).rowCount === 1, 'the display columns of legends are readable');
  for (const table of ['chapters', 'versions', 'documented_told', 'sources', 'anchors'])
    line(((await client.query(`select count(*)::int as n from ${table}`)).rows[0] as { n: number }).n > 0, `${table} is readable`);
  for (const [label, sql] of REFUSED) {
    await client.query('begin');
    let code: string | undefined;
    try {
      await client.query(sql);
    } catch (e) {
      code = pgError(e).code;
    }
    await client.query('rollback');
    line(code === '42501', `${label} (SQLSTATE ${code ?? 'none: it ran'})`);
  }
  await client.end();
  // The atlas's own reads, as the reader role: the page data from Neon equals the page data from the content file.
  const { db, close } = createDb(url);
  try {
    const { legends } = loadLegends(`${REPO_ROOT}content/legends`);
    const summaries = await listLegends(db);
    line(summaries.length === legends.length && summaries.every((s) => s.marker !== null), `listLegends gives all ${legends.length} legends, each with a marker`);
    for (const parsed of legends) line(isDeepStrictEqual(await getAtlasLegend(db, parsed.id), atlasLegendFromModel(parsed)), `${parsed.id}: page data from Neon equals the content file`);
    line((await findAnchorLegend(db, 'banshee--ch-3')) === 'banshee' && (await findAnchorLegend(db, 'banshee--ch-99')) === null, 'findAnchorLegend finds a stored anchor and not an unknown one');
  } finally {
    await close();
  }
} catch (e) {
  line(false, `check stopped (SQLSTATE ${pgError(e).code ?? 'unknown'}; ${kindOf(e)}; details withheld)`);
}
console.log(bad ? `${bad} check(s) failed` : 'all reader-role checks passed');
process.exit(bad ? 1 : 0);
