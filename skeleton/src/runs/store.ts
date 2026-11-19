import type { FinalStatus } from './validate.ts';

export type RunStatus = 'in_progress' | FinalStatus;

export interface RunRow {
  id: string;
  userId: string;
  legendId: string;
  seed: string;
  trueVersionId: string;
  status: RunStatus;
  slotsSolved: number;
  hint2Uses: number;
  wrongAnswers: number;
  highestFear: number;
  score: number;
  startedAt: Date;
  finishedAt: Date | null;
}

export interface NewRun {
  legendId: string;
  seed: string;
  trueVersionId: string;
}

export interface FinishedRun {
  status: FinalStatus;
  slotsSolved: number;
  hint2Uses: number;
  wrongAnswers: number;
  highestFear: number;
  score: number;
}

export interface CompletedWorld {
  legendId: string;
  bestScore: number;
  wins: number;
}

/**
 * Persistence for runs. Every method takes the owner's `userId` and filters on it in the query itself, so a run that
 * belongs to someone else behaves exactly like one that does not exist. Implementations throw `RunConflictError` when
 * the one-in-progress-run rule refuses an insert, and `StoreUnavailableError` for any other failure.
 */
export interface RunStore {
  /** In one transaction: close the user's in-progress run for this world as abandoned, then insert the new run. */
  startRun(userId: string, run: NewRun): Promise<RunRow>;
  /** The user's run, any status, or null. */
  getRun(userId: string, runId: string): Promise<RunRow | null>;
  /** Updates only a run with this id, this user and status in_progress. Returns null if no such row. */
  finishRun(userId: string, runId: string, result: FinishedRun): Promise<RunRow | null>;
  listRuns(userId: string): Promise<RunRow[]>;
  completedWorlds(userId: string): Promise<CompletedWorld[]>;
}
