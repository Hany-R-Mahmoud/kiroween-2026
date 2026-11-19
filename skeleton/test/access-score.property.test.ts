import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { canEnter, type Visitor } from '../src/access/canEnter.ts';
import { score } from '../src/score/score.ts';

const RUNS = { numRuns: 100 };
const id = fc.stringMatching(/^[a-z][a-z-]{0,20}$/);
const guest: Visitor = { kind: 'guest' };
const user = fc.record({ kind: fc.constant('user' as const), id: fc.uuid(), name: fc.string() });
const counts = fc.record({
  slotsSolved: fc.integer({ min: 0, max: 20 }),
  curseBroken: fc.boolean(),
  hint2Uses: fc.integer({ min: 0, max: 50 }),
  wrongAnswers: fc.integer({ min: 0, max: 500 }),
});

describe('canEnter (decision 29)', () => {
  it('the tutorial is open to every guest, whatever the guest world', () => {
    fc.assert(fc.property(id, (guestWorld) => canEnter({ kind: 'tutorial' }, guest, guestWorld)), RUNS);
  });

  it('the guest world is open to every guest', () => {
    fc.assert(fc.property(id, (guestWorld) => canEnter({ kind: 'legend', id: guestWorld }, guest, guestWorld)), RUNS);
  });

  it('every other world is closed to a guest', () => {
    fc.assert(
      fc.property(id, id, (world, guestWorld) => {
        fc.pre(world !== guestWorld);
        return !canEnter({ kind: 'legend', id: world }, guest, guestWorld);
      }),
      RUNS,
    );
  });

  it('every world and the tutorial are open to every signed-in user', () => {
    fc.assert(
      fc.property(user, id, id, (u, world, guestWorld) => canEnter({ kind: 'legend', id: world }, u, guestWorld) && canEnter({ kind: 'tutorial' }, u, guestWorld)),
      RUNS,
    );
  });
});

describe('score', () => {
  it('is never negative', () => {
    fc.assert(fc.property(counts, (c) => score(c) >= 0), RUNS);
  });

  it('more Hint 2 uses never raise it', () => {
    fc.assert(fc.property(counts, fc.integer({ min: 1, max: 50 }), (c, more) => score({ ...c, hint2Uses: c.hint2Uses + more }) <= score(c)), RUNS);
  });

  it('more wrong answers never raise it', () => {
    fc.assert(fc.property(counts, fc.integer({ min: 1, max: 500 }), (c, more) => score({ ...c, wrongAnswers: c.wrongAnswers + more }) <= score(c)), RUNS);
  });

  it('more solved slots never lower it, and breaking the curse never lowers it', () => {
    fc.assert(
      fc.property(counts, (c) => score({ ...c, slotsSolved: c.slotsSolved + 1 }) >= score(c) && score({ ...c, curseBroken: true }) >= score({ ...c, curseBroken: false })),
      RUNS,
    );
  });

  it('a penalty costs exactly its amount while the score stays above zero', () => {
    fc.assert(
      fc.property(counts, (c) => {
        fc.pre(score(c) >= 25);
        return score({ ...c, hint2Uses: c.hint2Uses + 1 }) === score(c) - 15 && score({ ...c, wrongAnswers: c.wrongAnswers + 1 }) === score(c) - 10;
      }),
      RUNS,
    );
  });

  it('matches hand-worked values', () => {
    expect(score({ slotsSolved: 5, curseBroken: true, hint2Uses: 0, wrongAnswers: 0 })).toBe(550);
    expect(score({ slotsSolved: 5, curseBroken: true, hint2Uses: 2, wrongAnswers: 3 })).toBe(490);
    expect(score({ slotsSolved: 3, curseBroken: false, hint2Uses: 0, wrongAnswers: 0 })).toBe(300);
    expect(score({ slotsSolved: 1, curseBroken: false, hint2Uses: 10, wrongAnswers: 10 })).toBe(0);
    expect(score({ slotsSolved: 0, curseBroken: false, hint2Uses: 0, wrongAnswers: 0 })).toBe(0);
  });
});
