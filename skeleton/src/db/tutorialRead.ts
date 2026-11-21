// The game server's read of the tutorial drawer rows. Only the game role may read `keepers_note_details`; the atlas
// role has no grant on it, and this file is not exported through the client entry.
import { asc } from 'drizzle-orm';
import type { TutorialDetail } from '../play/tutorial.ts';
import type { Db } from './client.ts';
import { guard } from './runStore.ts';
import { keepersNoteDetails } from './schema.ts';

/** The drawer rows in content order. A database failure becomes the fixed `StoreUnavailableError`. */
export function loadTutorialDetails(db: Db): Promise<TutorialDetail[]> {
  return guard(async () => {
    const rows = await db
      .select({
        detailId: keepersNoteDetails.detailId,
        question: keepersNoteDetails.question,
        answer: keepersNoteDetails.answer,
        alsoAccept: keepersNoteDetails.alsoAccept,
      })
      .from(keepersNoteDetails)
      .orderBy(asc(keepersNoteDetails.ordinal));
    return rows.map((r) => ({ ...r, alsoAccept: [...r.alsoAccept] }));
  });
}
