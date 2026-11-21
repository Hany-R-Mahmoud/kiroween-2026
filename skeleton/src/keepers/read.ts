// Reader mapping: database rows (snake_case columns of `keepers_note` and `keepers_note_details`) to the shapes the
// apps use. Pure. The atlas maps only the note (the reader role cannot read the details table); the game server maps
// the details. No database import here, so the table definitions can land in the migration task.
import { KEEPERS_NOTE_ANCHOR, KEEPERS_NOTE_ID } from './parse.ts';

export interface KeepersNoteDbRow {
  id: string;
  title: string;
  label: string;
  reading_time_min: number;
  one_line_hook: string;
  chapter_title: string;
  anchor: string;
  body: string;
  hook: string;
}

export interface KeepersDetailDbRow {
  detail_id: string;
  ordinal: number;
  phrase: string;
  question: string;
  answer: string;
  also_accept: string[];
}

/** What the atlas page renders. No answers. `paragraphs` is the body split on blank lines. */
export interface KeepersNoteView {
  id: string;
  title: string;
  label: string;
  readingTimeMin: number;
  oneLineHook: string;
  chapterTitle: string;
  anchor: string;
  paragraphs: string[];
  hook: string;
}

/** What the game server uses for the drawer. Never sent to the browser as is. */
export interface KeepersDetailRecord {
  detailId: string;
  ordinal: number;
  phrase: string;
  question: string;
  answer: string;
  alsoAccept: string[];
}

export const isKeepersNoteId = (id: string): boolean => id === KEEPERS_NOTE_ID;
export const isKeepersNoteAnchor = (anchor: string): boolean => anchor === KEEPERS_NOTE_ANCHOR;

export function keepersNoteViewFromRow(r: KeepersNoteDbRow): KeepersNoteView {
  return {
    id: r.id,
    title: r.title,
    label: r.label,
    readingTimeMin: r.reading_time_min,
    oneLineHook: r.one_line_hook,
    chapterTitle: r.chapter_title,
    anchor: r.anchor,
    paragraphs: r.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
    hook: r.hook,
  };
}

export function keepersDetailsFromRows(rows: KeepersDetailDbRow[]): KeepersDetailRecord[] {
  return [...rows]
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((r) => ({ detailId: r.detail_id, ordinal: r.ordinal, phrase: r.phrase, question: r.question, answer: r.answer, alsoAccept: [...r.also_accept] }));
}
