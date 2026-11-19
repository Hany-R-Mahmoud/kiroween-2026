import { describe, expect, it } from 'vitest';
import { ValidationError } from '../src/runs/errors.ts';
import { checkFinishForLegend, LIMITS, parseFinish, validateStart } from '../src/runs/validate.ts';

const catalogue = [
  { id: 'banshee', slotCount: 5 },
  { id: 'draugr', slotCount: 5 },
];
const runId = '0b9c6a3e-3f4d-4a7b-9c2e-1d2f3a4b5c6d';
const finish = (over: Record<string, unknown> = {}) => ({ runId, status: 'won', slotsSolved: 5, hint2Uses: 1, wrongAnswers: 2, highestFear: 40, ...over });

const issues = (fn: () => unknown): string[] => {
  try {
    fn();
  } catch (e) {
    if (e instanceof ValidationError) return e.issues;
    throw e;
  }
  throw new Error('expected a ValidationError');
};

describe('validateStart', () => {
  it('accepts a legend that is in the catalogue', () => {
    expect(validateStart({ legendId: 'banshee' }, catalogue).legend).toEqual({ id: 'banshee', slotCount: 5 });
  });

  it('rejects a legend that is not in the catalogue', () => {
    expect(issues(() => validateStart({ legendId: 'not-a-legend' }, catalogue))).toEqual(['legendId: unknown_legend']);
  });

  it('rejects a missing, empty or non-string legend id', () => {
    for (const bad of [{}, { legendId: '' }, { legendId: 7 }, null, 'banshee'])
      expect(issues(() => validateStart(bad, catalogue)).length, JSON.stringify(bad)).toBeGreaterThan(0);
  });

  it('rejects any extra field: the client cannot send a seed, a true version, a score or a user id', () => {
    for (const extra of ['seed', 'trueVersionId', 'score', 'userId'])
      expect(issues(() => validateStart({ legendId: 'banshee', [extra]: 'x' }, catalogue)).join(), extra).toContain('unrecognized_keys');
  });
});

describe('parseFinish and checkFinishForLegend', () => {
  const check = (input: unknown, slotCount = 5) => checkFinishForLegend(parseFinish(input), slotCount);

  it('accepts a valid finish', () => {
    expect(check(finish())).toMatchObject({ status: 'won', slotsSolved: 5 });
  });

  it('accepts each of the three final statuses', () => {
    expect(check(finish({ status: 'restarted', slotsSolved: 2 })).status).toBe('restarted');
    expect(check(finish({ status: 'abandoned', slotsSolved: 0 })).status).toBe('abandoned');
  });

  it('rejects an unknown status, and in_progress (a run cannot be finished as in progress)', () => {
    expect(issues(() => check(finish({ status: 'cheated' }))).join()).toContain('status');
    expect(issues(() => check(finish({ status: 'in_progress' }))).join()).toContain('status');
  });

  it('rejects a run id that is not a UUID', () => {
    expect(issues(() => check(finish({ runId: '1 or 1=1' }))).join()).toContain('runId');
  });

  it('rejects slots solved above the legend’s slot count, negative, or fractional', () => {
    expect(issues(() => check(finish({ status: 'restarted', slotsSolved: 6 })))).toEqual(['slotsSolved: too_big']);
    expect(issues(() => check(finish({ slotsSolved: -1 }))).join()).toContain('slotsSolved');
    expect(issues(() => check(finish({ slotsSolved: 2.5 }))).join()).toContain('slotsSolved');
  });

  it('uses the slot count of the run’s own legend', () => {
    expect(check(finish({ slotsSolved: 7 }), 7).slotsSolved).toBe(7);
    expect(issues(() => check(finish({ slotsSolved: 7 }), 5))).toEqual(['slotsSolved: too_big']);
  });

  it('won needs every slot solved', () => {
    expect(issues(() => check(finish({ status: 'won', slotsSolved: 4 })))).toEqual(['status: won_needs_every_slot']);
  });

  it('enforces the stated maximum for Hint 2 uses, wrong answers and highest fear, and rejects negatives', () => {
    for (const [field, max] of Object.entries(LIMITS)) {
      expect(check(finish({ [field]: max }))[field as keyof typeof LIMITS]).toBe(max);
      expect(issues(() => check(finish({ [field]: max + 1 }))).join(), field).toContain(field);
      expect(issues(() => check(finish({ [field]: -1 }))).join(), field).toContain(field);
    }
  });

  it('rejects any extra field, including a score sent by the client', () => {
    expect(issues(() => check(finish({ score: 9999 }))).join()).toContain('unrecognized_keys');
    expect(issues(() => check(finish({ userId: 'someone-else' }))).join()).toContain('unrecognized_keys');
  });

  it('never copies a submitted value into the error', () => {
    const secretish = 'DROP TABLE runs; -- <script>';
    const e = (() => {
      try {
        check(finish({ status: secretish, runId: secretish }));
      } catch (err) {
        return err as ValidationError;
      }
      throw new Error('expected an error');
    })();
    expect(JSON.stringify({ message: e.message, issues: e.issues })).not.toContain('DROP');
  });
});
