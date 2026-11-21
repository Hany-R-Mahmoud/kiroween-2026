// The PlayStore port: persistence of a signed-in player's Play state. Every method takes the owner's `userId` and an
// implementation puts it in the WHERE clause of every query, so another user's row behaves as if it does not exist.
// Guests never reach the store: their state lives in an encrypted token.
import type { FinishedRun } from '../runs/store.ts';
import type { PlayState } from './state.ts';

export interface NewPlayRun {
  legendId: string;
  seed: string;
  trueVersionId: string;
  state: PlayState;
}

export interface StoredPlayRun {
  id: string;
  seed: string;
  /** Unvalidated: the service checks it with `playStateSchema` and treats a failure as unusable. */
  state: unknown;
  rev: number;
}

export interface PlayStore {
  /** The in-progress row for this user and world, or null. Filters on user_id in the query. */
  current(userId: string, legendId: string): Promise<StoredPlayRun | null>;
  /** One transaction: close any in-progress row of this user and world as abandoned, insert a new row. */
  begin(userId: string, run: NewPlayRun): Promise<{ id: string; rev: number }>;
  /** UPDATE ... WHERE id AND user_id AND status='in_progress' AND rev. Increments rev. False when no row matched. */
  save(userId: string, id: string, rev: number, state: PlayState): Promise<boolean>;
  /**
   * One transaction: close the row with the result (same WHERE as `save`) and optionally insert the follow-up row.
   * Null when no row matched.
   */
  end(userId: string, id: string, rev: number, result: FinishedRun, next?: NewPlayRun): Promise<{ next?: { id: string; rev: number } } | null>;
  tutorialDone(userId: string): Promise<boolean>;
  /** INSERT ... ON CONFLICT DO NOTHING. */
  markTutorialDone(userId: string): Promise<void>;
}

export interface MemoryRow {
  id: string;
  userId: string;
  legendId: string;
  seed: string;
  trueVersionId: string;
  state: unknown;
  rev: number;
  status: 'in_progress' | 'won' | 'restarted' | 'abandoned';
  result: FinishedRun | null;
}

export interface MemoryPlayStore extends PlayStore {
  /** Test access to every row. */
  rows(): readonly MemoryRow[];
}

/** In-memory implementation for tests. It enforces the same ownership, status and rev rules as the SQL one must. */
export function createMemoryPlayStore(): MemoryPlayStore {
  const table: MemoryRow[] = [];
  const done = new Set<string>();
  let counter = 0;
  const insert = (userId: string, run: NewPlayRun): MemoryRow => {
    counter += 1;
    const row: MemoryRow = {
      id: `run-${counter}`,
      userId,
      legendId: run.legendId,
      seed: run.seed,
      trueVersionId: run.trueVersionId,
      state: run.state,
      rev: 0,
      status: 'in_progress',
      result: null,
    };
    table.push(row);
    return row;
  };
  const open = (userId: string, id: string, rev: number): MemoryRow | undefined =>
    table.find((r) => r.id === id && r.userId === userId && r.status === 'in_progress' && r.rev === rev);
  return {
    rows: () => table,
    async current(userId, legendId) {
      const r = table.find((x) => x.userId === userId && x.legendId === legendId && x.status === 'in_progress');
      return r ? { id: r.id, seed: r.seed, state: r.state, rev: r.rev } : null;
    },
    async begin(userId, run) {
      for (const r of table) if (r.userId === userId && r.legendId === run.legendId && r.status === 'in_progress') r.status = 'abandoned';
      const row = insert(userId, run);
      return { id: row.id, rev: row.rev };
    },
    async save(userId, id, rev, state) {
      const r = open(userId, id, rev);
      if (!r) return false;
      r.state = state;
      r.rev += 1;
      return true;
    },
    async end(userId, id, rev, result, next) {
      const r = open(userId, id, rev);
      if (!r) return null;
      r.status = result.status;
      r.result = result;
      r.rev += 1;
      if (!next) return {};
      const row = insert(userId, next);
      return { next: { id: row.id, rev: row.rev } };
    },
    async tutorialDone(userId) {
      return done.has(userId);
    },
    async markTutorialDone(userId) {
      done.add(userId);
    },
  };
}
