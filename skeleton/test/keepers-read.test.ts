import { drizzle } from 'drizzle-orm/node-postgres';
import { describe, expect, it } from 'vitest';
import type { Db } from '../src/db/client.ts';
import { findAnchorLegend, listLegends } from '../src/db/atlasRead.ts';
import { getKeepersNote, isKeepersNoteAnchorStored } from '../src/db/keepersRead.ts';

// What the atlas role's SQL touches for the Keeper's Note (R3.8, R13.11). Same recording stand-in as atlas-read.test.ts.
// The live grants are checked by `db:check-reader`.
const ANCHOR = 'keepers-note--ch-1';
const NOTE_ROW = ['keepers-note', "The Keeper's Note", 'Fiction: the story of this archive', 4, 'hook', 'Chapter', ANCHOR, 'One.\n\nTwo.', 'Closing'];
function recordingDb(answer: (text: string) => unknown[][] = () => []) {
  const calls: string[] = [];
  const client = {
    query(q: string | { text: string }) {
      const text = typeof q === 'string' ? q : q.text;
      calls.push(text);
      const rows = answer(text);
      return Promise.resolve({ rows, rowCount: rows.length, fields: [], command: 'SELECT' });
    },
  };
  return { db: drizzle({ client: client as never }) as unknown as Db, calls };
}

describe("atlas reads of the Keeper's Note", () => {
  it('select keepers_note by named columns and never touch keepers_note_details', async () => {
    const { db, calls } = recordingDb((text) => (/from "keepers_note"/.test(text) ? [NOTE_ROW] : []));
    expect((await getKeepersNote(db))?.anchor).toBe(ANCHOR);
    expect(await isKeepersNoteAnchorStored(db, ANCHOR)).toBe(true);
    await findAnchorLegend(db, ANCHOR);
    expect(calls.filter((c) => /from "keepers_note"/.test(c))).toHaveLength(2);
    for (const text of calls) {
      expect(text, text).not.toContain('keepers_note_details');
      expect(text, text).not.toMatch(/select\s+\*|\.\*/i);
      for (const [, table] of text.matchAll(/(?:from|join)\s+"([a-z_]+)"/g)) expect(['keepers_note', 'anchors', 'legends']).toContain(table);
    }
  });

  it('binds the anchor instead of writing it into the SQL', async () => {
    const { db, calls } = recordingDb();
    await isKeepersNoteAnchorStored(db, 'zz-probe--ch-1');
    expect(calls.at(-1)).not.toContain('zz-probe');
  });

  it('listLegends does not read the note', async () => {
    const { db, calls } = recordingDb();
    expect(await listLegends(db)).toEqual([]);
    expect(calls.length).toBeGreaterThan(0);
    for (const text of calls) expect(text, text).not.toMatch(/keepers/i);
  });
});
