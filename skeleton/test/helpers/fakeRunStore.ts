import { RunConflictError } from '../../src/runs/errors.ts';
import type { CompletedWorld, FinishedRun, NewRun, RunRow, RunStore } from '../../src/runs/store.ts';

/**
 * An in-memory RunStore with the same rules as the database one: every query filters on the owner, finishing only
 * touches an in-progress row of that owner, and at most one in-progress run per user and world (the partial unique
 * index). `raceOnNextStart` makes the next start behave as if a parallel start won the race.
 */
export class FakeRunStore implements RunStore {
  rows: RunRow[] = [];
  calls: string[] = [];
  raceOnNextStart = false;
  private nextId = 1;

  private id(): string {
    return `00000000-0000-4000-8000-${String(this.nextId++).padStart(12, '0')}`;
  }

  async startRun(userId: string, run: NewRun): Promise<RunRow> {
    this.calls.push('startRun');
    if (this.raceOnNextStart) {
      this.raceOnNextStart = false;
      throw new RunConflictError(); // nothing written: the transaction rolled back
    }
    for (const r of this.rows) {
      if (r.userId === userId && r.legendId === run.legendId && r.status === 'in_progress') {
        r.status = 'abandoned';
        r.finishedAt = new Date(0);
      }
    }
    const row: RunRow = { id: this.id(), userId, ...run, status: 'in_progress', slotsSolved: 0, hint2Uses: 0, wrongAnswers: 0, highestFear: 0, score: 0, startedAt: new Date(0), finishedAt: null };
    this.rows.push(row);
    return { ...row };
  }

  async getRun(userId: string, runId: string): Promise<RunRow | null> {
    this.calls.push('getRun');
    const r = this.rows.find((x) => x.id === runId && x.userId === userId);
    return r ? { ...r } : null;
  }

  async finishRun(userId: string, runId: string, result: FinishedRun): Promise<RunRow | null> {
    this.calls.push('finishRun');
    const r = this.rows.find((x) => x.id === runId && x.userId === userId && x.status === 'in_progress');
    if (!r) return null;
    Object.assign(r, result, { finishedAt: new Date(0) });
    return { ...r };
  }

  async listRuns(userId: string): Promise<RunRow[]> {
    this.calls.push('listRuns');
    return this.rows.filter((x) => x.userId === userId).map((x) => ({ ...x }));
  }

  async completedWorlds(userId: string): Promise<CompletedWorld[]> {
    this.calls.push('completedWorlds');
    const won = this.rows.filter((x) => x.userId === userId && x.status === 'won');
    const ids = [...new Set(won.map((x) => x.legendId))].sort();
    return ids.map((legendId) => {
      const mine = won.filter((x) => x.legendId === legendId);
      return { legendId, wins: mine.length, bestScore: Math.max(...mine.map((x) => x.score)) };
    });
  }

  inProgress(userId: string, legendId: string): RunRow[] {
    return this.rows.filter((x) => x.userId === userId && x.legendId === legendId && x.status === 'in_progress');
  }
}
