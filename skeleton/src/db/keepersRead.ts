// The atlas's reads of the Keeper's Note (Phase 4, requirement 3). The reader role has SELECT on `keepers_note` only,
// never on `keepers_note_details` (the drawer answers), so this file never names that table. Every column is named.
import { eq } from 'drizzle-orm';
import { keepersNoteViewFromRow, type KeepersNoteView } from '../keepers/read.ts';
import type { Db } from './client.ts';
import { keepersNote } from './schema.ts';

/** The Keeper's Note page, or null when it has not been imported. */
export async function getKeepersNote(db: Db): Promise<KeepersNoteView | null> {
  const [row] = await db
    .select({
      id: keepersNote.id,
      title: keepersNote.title,
      label: keepersNote.label,
      readingTimeMin: keepersNote.readingTimeMin,
      oneLineHook: keepersNote.oneLineHook,
      chapterTitle: keepersNote.chapterTitle,
      anchor: keepersNote.anchor,
      body: keepersNote.body,
      hook: keepersNote.hook,
    })
    .from(keepersNote)
    .where(eq(keepersNote.id, 'keepers-note'))
    .limit(1);
  if (!row) return null;
  const { readingTimeMin, oneLineHook, chapterTitle, ...rest } = row;
  return keepersNoteViewFromRow({ ...rest, reading_time_min: readingTimeMin, one_line_hook: oneLineHook, chapter_title: chapterTitle });
}

/** True when the anchor is the stored anchor of the Keeper's Note (a bound-parameter lookup). */
export async function isKeepersNoteAnchorStored(db: Db, anchor: string): Promise<boolean> {
  const rows = await db.select({ anchor: keepersNote.anchor }).from(keepersNote).where(eq(keepersNote.anchor, anchor)).limit(1);
  return rows.length > 0;
}
