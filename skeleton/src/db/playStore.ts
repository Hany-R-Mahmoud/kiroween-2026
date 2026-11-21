import { and, eq, isNotNull, sql } from 'drizzle-orm';
import type { PlayStore, NewPlayRun, StoredPlayRun } from '../play/store.ts';
import { playStateSchema } from '../play/state.ts';
import type { Db, Tx } from './client.ts';
import { guard } from './runStore.ts';
import { playerFlags, runs } from './schema.ts';

const isEmptyState = (s: unknown): boolean =>
  s === null || s === undefined || (typeof s === 'object' && !Array.isArray(s) && Object.keys(s).length === 0);

/** The row's own key: id, owner, still open, and the revision the caller read. */
const openRow = (userId: string, id: string, rev: number) =>
  and(eq(runs.id, id), eq(runs.userId, userId), eq(runs.status, 'in_progress'), eq(runs.rev, rev));

const insertRun = async (tx: Tx, userId: string, run: NewPlayRun): Promise<{ id: string; rev: number }> => {
  const [row] = await tx
    .insert(runs)
    .values({ userId, legendId: run.legendId, seed: run.seed, trueVersionId: run.trueVersionId, playState: run.state })
    .returning({ id: runs.id, rev: runs.rev });
  return row!;
};

/** Every statement filters on `user_id`, so another user's row behaves exactly like one that does not exist. */
export function createPlayStore(db: Db): PlayStore {
  return {
    current: (userId, legendId) =>
      guard(async (): Promise<StoredPlayRun | null> => {
        const [row] = await db
          .select({ id: runs.id, seed: runs.seed, state: runs.playState, rev: runs.rev })
          .from(runs)
          .where(and(eq(runs.userId, userId), eq(runs.legendId, legendId), eq(runs.status, 'in_progress')))
          .limit(1);
        if (!row) return null;
        if (isEmptyState(row.state) || !playStateSchema.safeParse(row.state).success) {
          // Unusable state: close the row as abandoned so the player can start fresh (R7.14).
          await db
            .update(runs)
            .set({ status: 'abandoned', finishedAt: sql`now()`, rev: sql`${runs.rev} + 1` })
            .where(openRow(userId, row.id, row.rev));
          return null;
        }
        return row;
      }),

    begin: (userId, run) =>
      guard(() =>
        db.transaction(async (tx) => {
          await tx
            .update(runs)
            .set({ status: 'abandoned', finishedAt: sql`now()`, rev: sql`${runs.rev} + 1` })
            .where(and(eq(runs.userId, userId), eq(runs.legendId, run.legendId), eq(runs.status, 'in_progress')));
          return insertRun(tx, userId, run);
        }),
      ),

    save: (userId, id, rev, state) =>
      guard(async () => {
        const rows = await db
          .update(runs)
          .set({ playState: state, rev: sql`${runs.rev} + 1` })
          .where(openRow(userId, id, rev))
          .returning({ id: runs.id });
        return rows.length > 0;
      }),

    end: (userId, id, rev, result, next) =>
      guard(() =>
        db.transaction(async (tx) => {
          const closed = await tx
            .update(runs)
            .set({
              status: result.status,
              slotsSolved: result.slotsSolved,
              hint2Uses: result.hint2Uses,
              wrongAnswers: result.wrongAnswers,
              highestFear: result.highestFear,
              score: result.score,
              finishedAt: sql`now()`,
              rev: sql`${runs.rev} + 1`,
            })
            .where(openRow(userId, id, rev))
            .returning({ id: runs.id });
          if (closed.length === 0) return null;
          if (!next) return {};
          return { next: await insertRun(tx, userId, next) };
        }),
      ),

    tutorialDone: (userId) =>
      guard(async () => {
        const rows = await db
          .select({ done: playerFlags.tutorialDoneAt })
          .from(playerFlags)
          .where(and(eq(playerFlags.userId, userId), isNotNull(playerFlags.tutorialDoneAt)))
          .limit(1);
        return rows.length > 0;
      }),

    markTutorialDone: (userId) =>
      guard(async () => {
        await db.insert(playerFlags).values({ userId, tutorialDoneAt: sql`now()` }).onConflictDoNothing();
      }),
  };
}
