import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import type { Visitor } from '../src/access/canEnter.ts';
import { generate, type Legend, type Run } from '../src/index.ts';
import { finalSlot, rawId } from '../src/play/engine.ts';
import { actInWorld, startWorld, type PlayResponse } from '../src/play/service.ts';
import type { PlayState } from '../src/play/state.ts';
import type { Action } from '../src/play/types.ts';
import { playableLegends, playSetup, winningActions } from './helpers/play.ts';

vi.setConfig({ testTimeout: 900_000 });
const HEAVY = 120_000; // whole-suite-heavy properties: every playable legend through the real service
const alice: Visitor = { kind: 'user', id: 'alice', name: 'Alice' };
const guest: Visitor = { kind: 'guest' };
const seedArb = fc.stringMatching(/^[a-z0-9]{6,12}$/).map((s) => `wsf-${s}`);
const legendArb = fc.constantFrom(...playableLegends);

/** The Phase 2 formula written out with its literal numbers, so a change to the weights fails here. */
const phase2 = (slots: number, curse: boolean, hint2: number, wrong: number): number => Math.max(0, 100 * slots + (curse ? 50 : 0) - 15 * hint2 - 10 * wrong);

/** A Run in the real service for a signed-in player or a guest; guests carry their token like a browser would. */
async function session(legend: Legend, seed: string, visitor: Visitor, seeds?: string[]) {
  const { deps, store, tokens } = playSetup(legend.id, seeds ?? [seed]);
  let token: string | null = null;
  const first = await startWorld(deps, visitor, { legendId: legend.id, token });
  if (visitor.kind === 'guest') token = first.token;
  const run = generate(legend, seed);
  const act = async (action: Action | Record<string, unknown>): Promise<PlayResponse> => {
    const r = await actInWorld(deps, visitor, { legendId: legend.id, token, action });
    if (visitor.kind === 'guest') token = r.token;
    return r;
  };
  /** The state the server holds now (store row, or the guest's token). Null once no Run is in progress. */
  const peek = async (): Promise<{ seed: string; state: PlayState } | null> => {
    if (visitor.kind === 'user') {
      const row = await store.current(visitor.id, legend.id);
      return row ? { seed: row.seed, state: row.state as PlayState } : null;
    }
    if (token === null) return null;
    const p = tokens.decode('play', legend.id, token);
    return { seed: p.seed, state: p.state as PlayState };
  };
  return { run, act, peek, store, first };
}

type Op = { t: 'tap' | 'answer' | 'correct' | 'hint1' | 'hint2' | 'follow'; n: number; o: 0 | 1 | 2 | 3 };
const opArb: fc.Arbitrary<Op> = fc.record({
  t: fc.constantFrom('tap', 'answer', 'answer', 'correct', 'correct', 'hint1', 'hint2', 'follow', 'follow') as fc.Arbitrary<Op['t']>,
  n: fc.nat(60),
  o: fc.constantFrom(0, 1, 2, 3),
});

function toAction(run: Run, op: Op): Action {
  const id = run.legendId;
  const slot = run.slots[op.n % run.slots.length]!;
  const sid = rawId(id, slot.slotId);
  const leads = [run.trueLead, ...run.deadEnds];
  switch (op.t) {
    case 'tap':
      return { kind: 'tap', hotspotId: rawId(id, run.hotspots[op.n % run.hotspots.length]!.id) };
    case 'answer':
      return { kind: 'answer', slotId: sid, option: op.o };
    case 'correct':
      return { kind: 'answer', slotId: sid, option: slot.correctIndex as 0 };
    case 'hint1':
      return { kind: 'hint1', slotId: sid };
    case 'hint2':
      return { kind: 'hint2', slotId: sid };
    case 'follow':
      return { kind: 'follow', leadId: rawId(id, leads[op.n % leads.length]!.id) };
  }
}

describe('Property 12: A Run is won exactly when every slot is solved and the true lead is followed, and the score is the server\'s', () => {
  it('whatever the player does, won appears only with all slots solved and the true lead followed, and the score comes from the server counts', async () => {
    await fc.assert(
      fc.asyncProperty(legendArb, seedArb, fc.array(opArb, { minLength: 1, maxLength: 60 }), async (legend, seed, ops) => {
        const { run, act, peek, store } = await session(legend, seed, alice, [seed, `${seed}-b`]);
        for (const h of run.hotspots) await act({ kind: 'tap', hotspotId: rawId(legend.id, h.id) });
        const solved = new Set<string>();
        const hint2 = new Set<string>();
        let wrong = 0;
        let trueFollowed = false;
        for (const op of ops) {
          let r: PlayResponse;
          const action = toAction(run, op);
          try {
            r = await act(action);
          } catch {
            continue; // refusals are covered by Properties 5, 10 and 11
          }
          const rep = r.reply;
          if (rep?.kind === 'answer') {
            if (rep.correct) solved.add(rep.slotId);
            else wrong++;
          }
          if (rep?.kind === 'hint2' && rep.charged && action.kind === 'hint2') hint2.add(action.slotId);
          if (rep?.kind === 'follow' && rep.result === 'true') trueFollowed = true;
          const allSolved = run.slots.every((s) => solved.has(rawId(legend.id, s.slotId)));

          if (r.ended) {
            const row = store.rows().find((x) => x.seed === seed)!;
            expect(row.result, `${legend.id} ${seed} result stored`).not.toBeNull();
            const won = r.ended.status === 'won';
            expect(row.status).toBe(r.ended.status);
            // The stored and returned score both come from the state's own counts.
            expect(row.result!.slotsSolved).toBe(solved.size);
            expect(row.result!.hint2Uses).toBe(hint2.size);
            expect(row.result!.wrongAnswers).toBe(wrong);
            const want = phase2(solved.size, won, hint2.size, wrong);
            expect(row.result!.score, `${legend.id} ${seed} stored score`).toBe(want);
            expect(r.ended.score, `${legend.id} ${seed} returned score`).toBe(want);
            if (won) {
              expect(allSolved && trueFollowed, `${legend.id} ${seed} won needs every slot and the true lead`).toBe(true);
              expect(r.view.status).toBe('won');
              await expect(act({ kind: 'hint1', slotId: rawId(legend.id, run.slots[0]!.slotId) })).rejects.toBeDefined();
            }
            break; // won, or restarted into a Run this model does not follow (Property 13)
          }
          expect(allSolved && trueFollowed, `${legend.id} ${seed} not won although every condition holds`).toBe(false);
          const now = (await peek())!.state;
          expect(now.solved.length).toBe(solved.size);
          expect(now.wrongAnswers).toBe(wrong);
          expect(now.hint2Uses).toBe(hint2.size);
        }
      }),
      { numRuns: 60 },
    );
  }, HEAVY);

  it('the full script wins with the formula score; dropping the last slot or the true lead never wins', async () => {
    await fc.assert(
      fc.asyncProperty(legendArb, seedArb, fc.constantFrom('full', 'noLead', 'noFinal'), fc.constantFrom(guest, alice), async (legend, seed, variant, visitor) => {
        const { run, act } = await session(legend, seed, visitor);
        const script = winningActions(run);
        const finId = rawId(legend.id, finalSlot(run).slotId);
        const used = variant === 'noLead' ? script.filter((a) => a.kind !== 'follow') : variant === 'noFinal' ? script.filter((a) => !(a.kind === 'answer' && a.slotId === finId)) : script;
        let last: PlayResponse | null = null;
        for (const a of used) {
          try {
            last = await act(a);
          } catch {
            if (variant === 'noFinal' && a.kind === 'follow') continue; // following the true lead needs no solved slots
            throw new Error(`${legend.id} ${seed} ${variant}: ${JSON.stringify(a)} refused`);
          }
          if (variant !== 'full') expect(last.ended, `${legend.id} ${seed} ${variant} must not end`).toBeNull();
        }
        if (variant !== 'full') return;
        expect(last!.ended?.status).toBe('won');
        expect(last!.ended!.slotsSolved).toBe(run.slots.length);
        expect(last!.ended!.score).toBe(phase2(run.slots.length, true, 0, 0));
        expect(last!.view.status).toBe('won');
        expect(last!.token).toBeNull(); // nothing to resume after a win
      }),
      { numRuns: 60 },
    );
  }, HEAVY);

  it('known counts: score = 100 per slot + 50 curse - 15 per Hint 2 - 10 per wrong answer', async () => {
    await fc.assert(
      fc.asyncProperty(legendArb, seedArb, fc.integer({ min: 0, max: 2 }), fc.integer({ min: 0, max: 2 }), async (legend, seed, w, h) => {
        const { run, act } = await session(legend, seed, alice);
        const fin = finalSlot(run);
        const others = run.slots.filter((s) => s !== fin);
        fc.pre(others.length >= 2);
        for (const hs of run.hotspots) await act({ kind: 'tap', hotspotId: rawId(legend.id, hs.id) });
        const target = others[0]!;
        const wrongOptions = ([0, 1, 2, 3] as const).filter((o) => o !== target.correctIndex).slice(0, w);
        for (const o of wrongOptions) await act({ kind: 'answer', slotId: rawId(legend.id, target.slotId), option: o });
        for (const s of others.slice(0, h)) await act({ kind: 'hint2', slotId: rawId(legend.id, s.slotId) });
        if (h > 0) await act({ kind: 'hint2', slotId: rawId(legend.id, others[0]!.slotId) }); // a repeat on the same slot is not counted again
        let last: PlayResponse | null = null;
        for (const a of winningActions(run)) {
          if (a.kind === 'tap') continue;
          // The slot that took wrong answers is solved by the script's own correct answer.
          last = await act(a);
        }
        expect(last!.ended!.score).toBe(phase2(run.slots.length, true, h, w));
      }),
      { numRuns: 40 },
    );
  }, HEAVY);

  it('example: a perfect run of n slots scores 100n + 50; one wrong answer and one Hint 2 cost 25', async () => {
    const legend = playableLegends[0]!;
    const { run, act } = await session(legend, 'wsf-example', alice);
    const n = run.slots.length;
    let last: PlayResponse | null = null;
    for (const a of winningActions(run)) last = await act(a);
    expect(last!.ended!.score).toBe(100 * n + 50);

    const two = await session(legend, 'wsf-example', alice);
    for (const hs of two.run.hotspots) await two.act({ kind: 'tap', hotspotId: rawId(legend.id, hs.id) });
    const first = two.run.slots.find((s) => s !== finalSlot(two.run))!;
    const wrongOpt = ([0, 1, 2, 3] as const).find((o) => o !== first.correctIndex)!;
    await two.act({ kind: 'answer', slotId: rawId(legend.id, first.slotId), option: wrongOpt });
    await two.act({ kind: 'hint2', slotId: rawId(legend.id, first.slotId) });
    for (const a of winningActions(two.run)) {
      if (a.kind !== 'tap') last = await two.act(a);
    }
    expect(last!.ended!.score).toBe(100 * n + 50 - 25);
  });

  it('input that carries a score, status, count or seed is refused and changes nothing', async () => {
    const legend = playableLegends[0]!;
    const { run, act, peek } = await session(legend, 'wsf-forged', alice);
    const script = winningActions(run);
    for (const a of script.slice(0, -1)) await act(a);
    const before = await peek();
    const lastAction = script[script.length - 1]!;
    for (const extra of [{ score: 99999 }, { status: 'won' }, { fear: 0 }, { slotsSolved: 99 }, { seed: 'x' }]) {
      await expect(act({ ...lastAction, ...extra })).rejects.toBeDefined();
    }
    expect(await peek()).toEqual(before);
    const done = await act(lastAction);
    expect(done.ended!.score).toBe(phase2(run.slots.length, true, 0, 0));
  });
});

/** Push fear up with wrong answers, Hint 2 and dead ends until the meter fills. Returns the response that ended the Run. */
async function driveToRestart(run: Run, act: (a: Action) => Promise<PlayResponse>): Promise<PlayResponse | null> {
  const id = run.legendId;
  const tryAct = async (a: Action): Promise<PlayResponse | null> => {
    try {
      const r = await act(a);
      return r.ended ? r : null;
    } catch {
      return null;
    }
  };
  for (const h of run.hotspots) {
    const r = await tryAct({ kind: 'tap', hotspotId: rawId(id, h.id) });
    if (r) return r;
  }
  const fin = finalSlot(run);
  const others = run.slots.filter((s) => s !== fin);
  for (const s of [...others, fin]) {
    if (s === fin) for (const o of others) await act({ kind: 'answer', slotId: rawId(id, o.slotId), option: o.correctIndex as 0 });
    for (const o of [0, 1, 2, 3] as const) {
      if (o === s.correctIndex) continue;
      const r = await tryAct({ kind: 'answer', slotId: rawId(id, s.slotId), option: o });
      if (r) return r;
    }
    const r = await tryAct({ kind: 'hint2', slotId: rawId(id, s.slotId) });
    if (r) return r;
  }
  for (const l of run.deadEnds) {
    const r = await tryAct({ kind: 'follow', leadId: rawId(id, l.id) });
    if (r) return r;
  }
  return null;
}

describe('Property 13: Fear stays in range and a full meter restarts with a new Seed', () => {
  it('fear is within 0..100 and highestFear is never below fear, for any action sequence', async () => {
    await fc.assert(
      fc.asyncProperty(legendArb, seedArb, fc.array(opArb, { minLength: 1, maxLength: 60 }), fc.constantFrom(guest, alice), async (legend, seed, ops, visitor) => {
        const { run, act, peek } = await session(legend, seed, visitor, [seed, `${seed}-b`]);
        for (const op of [...run.hotspots.map((h): Op => ({ t: 'tap', n: run.hotspots.indexOf(h), o: 0 })), ...ops]) {
          let r: PlayResponse;
          try {
            r = await act(toAction(run, op));
          } catch {
            continue;
          }
          expect(r.view.fear).toBeGreaterThanOrEqual(0);
          expect(r.view.fear).toBeLessThanOrEqual(100);
          if (r.ended) break;
          expect(r.view.fear, 'a Run in progress is below 100').toBeLessThan(100);
          const s = (await peek())!.state;
          expect(s.fear).toBe(r.view.fear);
          expect(s.highestFear).toBeGreaterThanOrEqual(s.fear);
        }
      }),
      { numRuns: 60 },
    );
  }, HEAVY);

  it('a full meter ends the Run as restarted, keeps its counts, and opens a new Run with a different Seed and a clean state', async () => {
    await fc.assert(
      fc.asyncProperty(legendArb, seedArb, fc.constantFrom(guest, alice), async (legend, seed, visitor) => {
        // The first Seed offered again must be skipped: a restart never reuses the old one.
        const { run, act, peek, store } = await session(legend, seed, visitor, [seed, seed, `${seed}-next`]);
        const r = await driveToRestart(run, act);
        expect(r, `${legend.id} ${seed} fear never filled`).not.toBeNull();
        expect(r!.ended!.status).toBe('restarted');
        expect(r!.ended!.seed).toBe(seed);

        // The new Run: different Seed, zero fear, zero counts, nothing solved.
        expect(r!.view.status).toBe('in_progress');
        expect(r!.view.fear).toBe(0);
        expect(r!.view.slots.filter((s) => s.state === 'solved')).toEqual([]);
        const now = (await peek())!;
        expect(now.seed).not.toBe(seed);
        expect(now.state).toMatchObject({ fear: 0, highestFear: 0, hint2Uses: 0, wrongAnswers: 0, solved: [], tapped: [], followed: [] });

        if (visitor.kind === 'user') {
          const old = store.rows().find((x) => x.seed === seed)!;
          expect(old.status).toBe('restarted');
          expect(old.result!.highestFear).toBe(100); // counts and peak fear are kept
          expect(old.result!.score).toBe(r!.ended!.score);
          expect(r!.ended!.score).toBe(phase2(old.result!.slotsSolved, false, old.result!.hint2Uses, old.result!.wrongAnswers));
          expect(store.rows().filter((x) => x.status === 'in_progress')).toHaveLength(1);
        }
      }),
      { numRuns: 40 },
    );
  }, HEAVY);

  it('a restarted Run scores its solved slots without the curse bonus', async () => {
    // Saved state with slots solved and the meter at 90; one wrong answer fills it. The score must not be clamped to 0.
    await fc.assert(
      fc.asyncProperty(legendArb, seedArb, fc.integer({ min: 85, max: 94 }), async (legend, seed, startFear) => {
        const { run, act, store } = await session(legend, seed, alice, [seed, `${seed}-2`]);
        const id = legend.id;
        const fin = finalSlot(run);
        const others = run.slots.filter((x) => x !== fin);
        fc.pre(others.length >= 2);
        const target = others[others.length - 1]!;
        const solvedIds = others.slice(0, -1).map((s) => rawId(id, s.slotId));
        const row = (await store.current('alice', id))!;
        const state: PlayState = {
          ...(row.state as PlayState),
          fear: startFear,
          highestFear: startFear,
          opened: run.slots.map((s) => rawId(id, s.slotId)),
          solved: solvedIds,
        };
        expect(await store.save('alice', row.id, row.rev, state)).toBe(true);
        const wrongOpt = ([0, 1, 2, 3] as const).find((o) => o !== target.correctIndex)!;
        const r = await act({ kind: 'answer', slotId: rawId(id, target.slotId), option: wrongOpt });
        expect(r.ended!.status).toBe('restarted');
        const old = store.rows().find((x) => x.seed === seed)!;
        const want = phase2(solvedIds.length, false, 0, 1);
        expect(want).toBeGreaterThan(0);
        expect(r.ended!.score).toBe(want);
        expect(old.result!.score).toBe(want);
        expect(old.result!.slotsSolved).toBe(solvedIds.length);
        expect(old.result!.wrongAnswers).toBe(1);
        expect(r.view.fear).toBe(0);
      }),
      { numRuns: 40 },
    );
  }, HEAVY);
});
