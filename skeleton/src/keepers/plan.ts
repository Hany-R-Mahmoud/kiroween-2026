// Pure plan for the Keeper's Note import: the rows to write, no database. Same input gives the same plan.
// Row shapes follow the approved SQL (design, "Schema change proposal").
import { createHash } from 'node:crypto';
import type { KeepersDetail, KeepersNote } from './parse.ts';

export interface KeepersNoteRow {
  id: string;
  title: string;
  label: string;
  readingTimeMin: number;
  oneLineHook: string;
  chapterTitle: string;
  anchor: string;
  body: string;
  hook: string;
  contentHash: string;
}

export interface KeepersDetailRow {
  detailId: string;
  ordinal: number;
  phrase: string;
  question: string;
  answer: string;
  alsoAccept: string[];
}

export interface KeepersPlan {
  note: KeepersNoteRow;
  details: KeepersDetailRow[];
}

/** sha256 of the file text, hex. Used to skip an import when nothing changed. */
export const keepersContentHash = (text: string): string => createHash('sha256').update(text).digest('hex');

export function planKeepersNote(note: KeepersNote, details: KeepersDetail[], contentHash: string): KeepersPlan {
  return {
    note: { ...note, contentHash },
    details: details.map((d) => ({ ...d, alsoAccept: [...d.alsoAccept] })),
  };
}

/** Rows per table, for the importer's report. */
export const keepersPlanCounts = (p: KeepersPlan): { keepers_note: number; keepers_note_details: number } => ({
  keepers_note: 1,
  keepers_note_details: p.details.length,
});
