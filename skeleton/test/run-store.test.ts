import { describe, expect, it } from 'vitest';
import { toStoreError } from '../src/db/runStore.ts';
import { ONE_IN_PROGRESS_INDEX } from '../src/db/schema.ts';
import { RunConflictError, StoreUnavailableError } from '../src/runs/errors.ts';

// Driver errors are built here the way pg and Drizzle 0.45 shape them: a pg error with `code` and `constraint`,
// wrapped by Drizzle in an error that also holds the SQL and its parameters.
const pgErr = (code: string, constraint?: string) => Object.assign(new Error('duplicate key value violates unique constraint'), { code, constraint });
const wrapped = (cause: Error) => Object.assign(new Error('Failed query: insert into "runs" ... params: user-alice,fx,seed'), { query: 'insert ...', params: ['user-alice'], cause });

describe('toStoreError', () => {
  it('a race on the one-in-progress index becomes the friendly 409, wrapped by Drizzle or not', () => {
    expect(toStoreError(wrapped(pgErr('23505', ONE_IN_PROGRESS_INDEX)))).toBeInstanceOf(RunConflictError);
    expect(toStoreError(pgErr('23505', ONE_IN_PROGRESS_INDEX))).toBeInstanceOf(RunConflictError);
  });

  it('a unique violation on any other constraint is not mistaken for the race', () => {
    expect(toStoreError(wrapped(pgErr('23505', 'runs_pkey')))).toBeInstanceOf(StoreUnavailableError);
  });

  it('every other failure becomes the fixed 503, with no SQL, parameter or driver text in it', () => {
    for (const e of [wrapped(pgErr('57P01')), new Error('connect ECONNREFUSED 10.0.0.1:5432'), 'weird', null]) {
      const out = toStoreError(e);
      expect(out).toBeInstanceOf(StoreUnavailableError);
      expect(out.message).toBe('Progress cannot be saved right now. Please try again.');
      expect(JSON.stringify({ m: out.message, c: (out as { cause?: unknown }).cause })).not.toMatch(/user-alice|insert|10\.0\.0\.1/);
    }
  });
});
