import { drizzle } from 'drizzle-orm/node-postgres';
import { describe, expect, it } from 'vitest';
import type { Db } from '../src/db/client.ts';
import { findAnchorLegend, getAtlasLegend, listLegends } from '../src/db/atlasRead.ts';

// A stand-in for the pg client: it records the SQL text and bound values Drizzle sends and answers with canned rows
// (Drizzle asks for array rows, in select order). No database, no network.
type Call = { text: string; values: unknown[] };
function recordingDb(answer: (text: string) => unknown[][] = () => []) {
  const calls: Call[] = [];
  const client = {
    query(q: string | { text: string; values?: unknown[] }, values?: unknown[]) {
      const text = typeof q === 'string' ? q : q.text;
      calls.push({ text, values: values ?? (typeof q === 'string' ? [] : (q.values ?? [])) });
      const rows = answer(text);
      return Promise.resolve({ rows, rowCount: rows.length, fields: [], command: 'SELECT' });
    },
  };
  return { db: drizzle({ client: client as never }) as unknown as Db, calls };
}
// the id is a marker string, so it can be found if it ever leaked into the SQL text instead of a bound value
const ID = 'zz-probe-legend';
const ANCHOR = 'zz-probe-legend--ch-1';
const LEGEND_ROW = [ID, 'T', 'R', 1, 2, 'E', 3, 20, 'H', 'cold', 'closing', { palette: '', displayFont: '', bodyFont: '', textures: '', motifs: '', ambientSound: '', uiAccents: '' }];
const answer = (text: string): unknown[][] => {
  if (/from "legends"/.test(text) && /"cold_open"/.test(text)) return [LEGEND_ROW];
  if (/from "anchors"/.test(text) && /"kind"/.test(text)) return [[`${ID}--versions`, 'versions']];
  return [];
};
const FORBIDDEN_COLUMNS = ['"model"', '"final_puzzle"', '"setting"', '"spirit"', '"content_hash"', '"prompt"', '"must_avoid"', '"country_theme"'];
const ALLOWED_TABLES = new Set(['legends', 'chapters', 'versions', 'documented_told', 'sources', 'assets', 'anchors']);

function checkAll(calls: Call[]) {
  const selects = calls.filter((c) => /^select/i.test(c.text));
  expect(selects.length).toBeGreaterThan(0);
  for (const { text } of selects) {
    expect(text, text).not.toMatch(/select\s+\*|\.\*/i);
    for (const col of FORBIDDEN_COLUMNS) expect(text, text).not.toContain(col);
    for (const [, table] of text.matchAll(/(?:from|join)\s+"([a-z_]+)"/g)) expect(ALLOWED_TABLES.has(table!), table).toBe(true);
    expect(text, 'a value was put into the SQL text').not.toContain('zz-probe');
  }
}

describe('atlas reads (reader role: named columns, bound values, granted tables only)', () => {
  it('getAtlasLegend reads the seven tables in one transaction, by bound id', async () => {
    const { db, calls } = recordingDb(answer);
    const legend = await getAtlasLegend(db, ID);
    expect(legend?.id).toBe(ID);
    expect(calls[0]!.text).toMatch(/^begin/i);
    expect(calls.at(-1)!.text).toMatch(/^commit/i);
    const tables = new Set(calls.flatMap((c) => [...c.text.matchAll(/from "([a-z_]+)"/g)].map((m) => m[1])));
    expect([...tables].sort()).toEqual([...ALLOWED_TABLES].sort());
    for (const c of calls.filter((x) => /^select/i.test(x.text))) expect(c.values, c.text).toContain(ID);
    checkAll(calls);
  });

  it('getAtlasLegend gives null for an unknown id after one query', async () => {
    const { db, calls } = recordingDb();
    expect(await getAtlasLegend(db, ID)).toBeNull();
    expect(calls.filter((c) => /^select/i.test(c.text))).toHaveLength(1);
  });

  it('listLegends and findAnchorLegend name their columns and bind the anchor', async () => {
    const { db, calls } = recordingDb();
    expect(await listLegends(db)).toEqual([]);
    expect(await findAnchorLegend(db, ANCHOR)).toBeNull();
    expect(calls.at(-1)!.values).toEqual([ANCHOR, 1]);
    checkAll(calls);
  });

  it('listLegends fills hero and marker from the one assets select', async () => {
    const { db, calls } = recordingDb((text) => {
      if (/from "assets"/.test(text)) return [[ID, `${ID}-atlas-hero-01`, '2400x1350'], [ID, `${ID}-atlas-marker-01`, '512x512']];
      if (/from "legends"/.test(text)) return [LEGEND_ROW.slice(0, 9)];
      return [];
    });
    const [s] = await listLegends(db);
    expect(s?.hero).toEqual({ id: `${ID}-atlas-hero-01`, width: 2400, height: 1350 });
    expect(s?.marker?.id).toBe(`${ID}-atlas-marker-01`);
    expect(calls.filter((c) => /from "assets"/.test(c.text))).toHaveLength(1);
    checkAll(calls);
  });
});
