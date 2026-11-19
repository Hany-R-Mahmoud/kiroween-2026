import { and, desc, eq, max, sql } from 'drizzle-orm';
import { RunConflictError, StoreUnavailableError } from '../runs/errors.ts';
import type { CompletedWorld, FinishedRun, NewRun, RunRow, RunStore } from '../runs/store.ts';
import type { Db } from './client.ts';
import { pgError } from './pgError.ts';
import { ONE_IN_PROGRESS_INDEX, runs } from './schema.ts';

/** Maps a store failure to a fixed error. The racing-start case is recognised by its code and index name only. */
export function toStoreError(e: unknown): Error {
  const { code, constraint } = pgError(e);
  if (code === '23505' && constraint === ONE_IN_PROGRESS_INDEX) return new RunConflictError();
  return new StoreUnavailableError();
}

const guard = async <T>(work: () => Promise<T>): Promise<T> => {
  try {
    return await work();
  } catch (e) {
    throw toStoreError(e);
  }
};

const toRow = (r: typeof runs.$inferSelect): RunRow => r;

/** Every statement filters on `user_id`, so another user's run behaves exactly like one that does not exist. */
export function createRunStore(db: Db): RunStore {
  return {
    startRun: (userId, run: NewRun) =>
      guard(() =>
        db.transaction(async (tx) => {
          await tx
            .update(runs)
            .set({ status: 'abandoned', finishedAt: sql`now()` })
            .where(and(eq(runs.userId, userId), eq(runs.legendId, run.legendId), eq(runs.status, 'in_progress')));
          const [row] = await tx.insert(runs).values({ userId, legendId: run.legendId, seed: run.seed, trueVersionId: run.trueVersionId }).returning();
          return toRow(row!);
        }),
      ),

    getRun: (userId, runId) =>
      guard(async () => {
        const [row] = await db.select().from(runs).where(and(eq(runs.id, runId), eq(runs.userId, userId))).limit(1);
        return row ? toRow(row) : null;
      }),

    finishRun: (userId, runId, result: FinishedRun) =>
      guard(async () => {
        const [row] = await db
          .update(runs)
          .set({ ...result, finishedAt: sql`now()` })
          .where(and(eq(runs.id, runId), eq(runs.userId, userId), eq(runs.status, 'in_progress')))
          .returning();
        return row ? toRow(row) : null;
      }),

    listRuns: (userId) => guard(async () => (await db.select().from(runs).where(eq(runs.userId, userId)).orderBy(desc(runs.startedAt))).map(toRow)),

    completedWorlds: (userId) =>
      guard(async (): Promise<CompletedWorld[]> => {
        const rows = await db
          .select({ legendId: runs.legendId, bestScore: max(runs.score), wins: sql<number>`count(*)::int` })
          .from(runs)
          .where(and(eq(runs.userId, userId), eq(runs.status, 'won')))
          .groupBy(runs.legendId)
          .orderBy(runs.legendId);
        return rows.map((r) => ({ legendId: r.legendId, bestScore: r.bestScore ?? 0, wins: r.wins }));
      }),
  };
}
