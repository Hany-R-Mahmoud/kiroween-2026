// Keeper's Note importer: one transaction, idempotent by content_hash. Separate from the legend importer.
import { eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { pgError } from '../db/pgError.ts';
import { keepersNote, keepersNoteDetails } from '../db/schema.ts';
import { keepersPlanCounts, type KeepersPlan } from './plan.ts';

/** Names the table and SQLSTATE only; never the driver message, which can hold the host or connection string. */
export class KeepersImportError extends Error {
  constructor(
    readonly table: string,
    readonly sqlState: string | undefined,
  ) {
    super(`keepers-note import failed at ${table}${sqlState ? ` (SQLSTATE ${sqlState})` : ''}`);
    this.name = 'KeepersImportError';
  }
}

export interface KeepersImportResult {
  status: 'imported' | 'unchanged';
  written: { keepers_note: number; keepers_note_details: number };
  rows: { keepers_note: number; keepers_note_details: number };
}

export async function importKeepersNote(db: Db, plan: KeepersPlan): Promise<KeepersImportResult> {
  let table = 'transaction';
  try {
    return await db.transaction(async (tx) => {
      table = 'keepers_note';
      const existing = await tx
        .select({ hash: keepersNote.contentHash })
        .from(keepersNote)
        .where(eq(keepersNote.id, plan.note.id))
        .for('update');
      table = 'keepers_note_details';
      const [{ n } = { n: 0 }] = await tx.select({ n: sql<number>`count(*)::int` }).from(keepersNoteDetails);
      if (existing[0]?.hash === plan.note.contentHash && n === plan.details.length) {
        return { status: 'unchanged' as const, written: { keepers_note: 0, keepers_note_details: 0 }, rows: { keepers_note: 1, keepers_note_details: n } };
      }
      await tx.delete(keepersNoteDetails);
      table = 'keepers_note';
      await tx.delete(keepersNote).where(eq(keepersNote.id, plan.note.id));
      await tx.insert(keepersNote).values(plan.note);
      table = 'keepers_note_details';
      await tx.insert(keepersNoteDetails).values(plan.details);
      const counts = keepersPlanCounts(plan);
      return { status: 'imported' as const, written: counts, rows: counts };
    });
  } catch (e) {
    throw new KeepersImportError(table, pgError(e).code);
  }
}
