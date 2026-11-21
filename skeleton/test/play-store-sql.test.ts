import { drizzle } from 'drizzle-orm/node-postgres';
import { describe, expect, it } from 'vitest';
import type { Db } from '../src/db/client.ts';
import { createPlayStore } from '../src/db/playStore.ts';
import type { PlayState } from '../src/play/state.ts';

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

const USER = 'zz-probe-user';
const RUN = '00000000-0000-4000-8000-000000000001';
const LEGEND = 'zz-probe-legend';
const STATE: PlayState = {
  v: 1, fear: 0, highestFear: 0, hint2Uses: 0, wrongAnswers: 0,
  opened: [], solved: [], tried: {}, hint2Used: [], tapped: [], collected: {}, followed: [],
};
const RESULT = { status: 'won', slotsSolved: 3, hint2Uses: 1, wrongAnswers: 2, highestFear: 4, score: 900 } as const;
const writes = (calls: Call[]) => calls.filter((c) => /^(insert|update|delete)/i.test(c.text));
const sqlOnly = (calls: Call[]) => calls.filter((c) => !/^(begin|commit|rollback)/i.test(c.text));

function checkCommon(calls: Call[]) {
  for (const { text, values } of sqlOnly(calls)) {
    expect(text, text).not.toMatch(/select\s+\*|\.\*/i);
    expect(text, 'a value was put into the SQL text').not.toContain('zz-probe');
    if (/^(select|update)/i.test(text)) {
      expect(text, text).toMatch(/"user_id"\s*=\s*\$\d+/);
      expect(values).toContain(USER);
    }
  }
}

describe('play store SQL (bound values, user_id, in_progress and rev conditions)', () => {
  it('current selects named columns filtered by user, legend and status', async () => {
    const { db, calls } = recordingDb();
    expect(await createPlayStore(db).current(USER, LEGEND)).toBeNull();
    checkCommon(calls);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.text).toMatch(/"status"\s*=\s*\$\d+/);
    expect(calls[0]!.values).toEqual(expect.arrayContaining([USER, LEGEND, 'in_progress']));
  });

  it('current returns a usable row and writes nothing', async () => {
    const { db, calls } = recordingDb(() => [[RUN, 'seed-1', STATE, 3]]);
    expect(await createPlayStore(db).current(USER, LEGEND)).toEqual({ id: RUN, seed: 'seed-1', state: STATE, rev: 3 });
    expect(writes(calls)).toHaveLength(0);
  });

  it.each([{}, { v: 2 }, null])('current abandons an in-progress row whose state is %j, guarded by user, status and rev', async (bad) => {
    const { db, calls } = recordingDb((t) => (/^select/i.test(t) ? [[RUN, 'seed-1', bad, 5]] : []));
    expect(await createPlayStore(db).current(USER, LEGEND)).toBeNull();
    checkCommon(calls);
    const [upd] = writes(calls);
    expect(upd!.text).toMatch(/^update "runs"/i);
    expect(upd!.text).toMatch(/"id"\s*=\s*\$\d+/);
    expect(upd!.text).toMatch(/"status"\s*=\s*\$\d+/);
    expect(upd!.text).toMatch(/"rev"\s*=\s*\$\d+/);
    expect(upd!.values).toEqual(expect.arrayContaining(['abandoned', RUN, USER, 'in_progress', 5]));
  });

  it('begin abandons the old row and inserts the new one in one transaction', async () => {
    const { db, calls } = recordingDb((t) => (/^insert/i.test(t) ? [[RUN, 0]] : []));
    const out = await createPlayStore(db).begin(USER, { legendId: LEGEND, seed: 's', trueVersionId: 'v1', state: STATE });
    expect(out).toEqual({ id: RUN, rev: 0 });
    checkCommon(calls);
    expect(calls[0]!.text).toMatch(/^begin/i);
    expect(calls.at(-1)!.text).toMatch(/^commit/i);
    const [upd, ins] = writes(calls);
    expect(upd!.text).toMatch(/^update/i);
    expect(upd!.values).toEqual(expect.arrayContaining(['abandoned', USER, LEGEND, 'in_progress']));
    expect(ins!.text).toMatch(/^insert into "runs"/i);
    expect(ins!.values).toEqual(expect.arrayContaining([USER, LEGEND, 's', 'v1']));
  });

  it('save is one UPDATE keyed by id, user, in_progress and rev, and increments rev', async () => {
    const hit = recordingDb(() => [[RUN]]);
    expect(await createPlayStore(hit.db).save(USER, RUN, 4, STATE)).toBe(true);
    checkCommon(hit.calls);
    const [upd] = hit.calls;
    expect(upd!.text).toMatch(/^update "runs"/i);
    expect(upd!.text).toMatch(/"rev"\s*=\s*"runs"\."rev"\s*\+\s*1/);
    expect(upd!.text).toMatch(/"runs"\."rev"\s*=\s*\$\d+/);
    expect(upd!.values).toEqual(expect.arrayContaining([RUN, USER, 'in_progress', 4]));
    const miss = recordingDb();
    expect(await createPlayStore(miss.db).save(USER, RUN, 4, STATE)).toBe(false);
  });

  it('end closes the row with the result and inserts the follow-up in the same transaction', async () => {
    const { db, calls } = recordingDb((t) => (/^update/i.test(t) ? [[RUN]] : /^insert/i.test(t) ? [['next-id', 0]] : []));
    const out = await createPlayStore(db).end(USER, RUN, 2, RESULT, { legendId: LEGEND, seed: 's2', trueVersionId: 'v2', state: STATE });
    expect(out).toEqual({ next: { id: 'next-id', rev: 0 } });
    checkCommon(calls);
    expect(calls[0]!.text).toMatch(/^begin/i);
    expect(calls.at(-1)!.text).toMatch(/^commit/i);
    const [upd, ins] = writes(calls);
    expect(upd!.text).toMatch(/"finished_at"\s*=\s*now\(\)/i);
    expect(upd!.values).toEqual(expect.arrayContaining(['won', 3, 1, 2, 4, 900, RUN, USER, 'in_progress', 2]));
    expect(ins!.values).toEqual(expect.arrayContaining([USER, LEGEND, 's2', 'v2']));
  });

  it('end without a match returns null and inserts nothing', async () => {
    const { db, calls } = recordingDb();
    expect(await createPlayStore(db).end(USER, RUN, 2, RESULT, { legendId: LEGEND, seed: 's2', trueVersionId: 'v2', state: STATE })).toBeNull();
    expect(writes(calls).filter((c) => /^insert/i.test(c.text))).toHaveLength(0);
  });

  it('end without a follow-up writes one statement', async () => {
    const { db, calls } = recordingDb((t) => (/^update/i.test(t) ? [[RUN]] : []));
    expect(await createPlayStore(db).end(USER, RUN, 2, RESULT)).toEqual({});
    expect(writes(calls)).toHaveLength(1);
  });

  it('tutorialDone reads by user; markTutorialDone is INSERT ... ON CONFLICT DO NOTHING', async () => {
    const r = recordingDb();
    expect(await createPlayStore(r.db).tutorialDone(USER)).toBe(false);
    checkCommon(r.calls);
    expect(r.calls[0]!.values).toContain(USER);
    const done = recordingDb(() => [[new Date()]]);
    expect(await createPlayStore(done.db).tutorialDone(USER)).toBe(true);
    const w = recordingDb();
    await createPlayStore(w.db).markTutorialDone(USER);
    expect(w.calls[0]!.text).toMatch(/^insert into "player_flags".*on conflict do nothing/i);
    expect(w.calls[0]!.values).toContain(USER);
    expect(w.calls[0]!.text).not.toContain('zz-probe');
  });
});
