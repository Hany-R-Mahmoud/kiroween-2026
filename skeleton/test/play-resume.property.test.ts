import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import type { Visitor } from '../src/access/canEnter.ts';
import { generate, type Run } from '../src/index.ts';
import { rawId } from '../src/play/engine.ts';
import { PlayError } from '../src/play/errors.ts';
import { actInWorld, startWorld } from '../src/play/service.ts';
import { playStateSchema } from '../src/play/state.ts';
import type { Action } from '../src/play/types.ts';
import { toView } from '../src/play/view.ts';
import { allLegends } from './helpers/legends.ts';
import { playableLegends, playSetup } from './helpers/play.ts';

vi.setConfig({ testTimeout: 900_000 });
const alice: Visitor = { kind: 'user', id: 'alice', name: 'Alice' };
const guest: Visitor = { kind: 'guest' };
const seedArb = fc.stringMatching(/^[a-z0-9]{6,12}$/).map((s) => `res-${s}`);
const legendArb = fc.constantFrom(...playableLegends);

type Op = { t: 'tap' | 'answer' | 'correct' | 'hint1' | 'hint2' | 'follow'; n: number; o: 0 | 1 | 2 | 3 };
const opArb: fc.Arbitrary<Op> = fc.record({
  t: fc.constantFrom('tap', 'answer', 'correct', 'correct', 'hint1', 'hint2', 'follow', 'follow') as fc.Arbitrary<Op['t']>,
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

/** A refused action (a lead not yet collected, the final slot too early) changes nothing; the player just tries something else. */
async function tryAct(deps: Parameters<typeof actInWorld>[0], visitor: Visitor, input: unknown) {
  try {
    return await actInWorld(deps, visitor, input);
  } catch (e) {
    if (e instanceof PlayError && e.code === 'refused') return null;
    throw e;
  }
}

const seedsFor = (seed: string) => [seed, ...Array.from({ length: 8 }, (_, i) => `${seed}-r${i}`)];

describe('Property 15: Saved state resumes to the same view', () => {
  it('store path: after every action the saved row gives the same view, and starting again resumes the same Run', async () => {
    await fc.assert(
      fc.asyncProperty(legendArb, seedArb, fc.array(opArb, { minLength: 1, maxLength: 40 }), async (legend, seed, ops) => {
        const { deps, store } = playSetup(legend.id, seedsFor(seed));
        await startWorld(deps, alice, { legendId: legend.id, token: null });
        const run = generate(legend, seed);
        for (const op of ops) {
          const r = await tryAct(deps, alice, { legendId: legend.id, token: null, action: toAction(run, op) });
          if (!r) continue;
          if (r.ended) break; // won or restarted: the next Run is covered by the start below
          const row = await store.current(alice.id, legend.id);
          const state = playStateSchema.parse(row!.state);
          expect(toView(legend, generate(legend, row!.seed), state)).toEqual(r.view);
          const rowsBefore = store.rows().length;
          const again = await startWorld(deps, alice, { legendId: legend.id, token: null });
          expect(again.view).toEqual(r.view);
          expect(store.rows().length).toBe(rowsBefore);
          expect((await store.current(alice.id, legend.id))!.seed).toBe(row!.seed);
        }
      }),
      { numRuns: 30 },
    );
  });

  it('token path: after every action the token decodes to the same view, and starting with it resumes the same Run', async () => {
    await fc.assert(
      fc.asyncProperty(legendArb, seedArb, fc.array(opArb, { minLength: 1, maxLength: 40 }), async (legend, seed, ops) => {
        const { deps, tokens } = playSetup(legend.id, seedsFor(seed));
        let token = (await startWorld(deps, guest, { legendId: legend.id, token: null })).token;
        const run = generate(legend, seed);
        for (const op of ops) {
          const r = await tryAct(deps, guest, { legendId: legend.id, token, action: toAction(run, op) });
          if (!r) continue;
          if (r.ended) break;
          token = r.token;
          const p = tokens.decode('play', legend.id, token!);
          const state = playStateSchema.parse(p.state);
          expect(p.seed).toBe(seed);
          expect(toView(legend, generate(legend, p.seed), state)).toEqual(r.view);
          const again = await startWorld(deps, guest, { legendId: legend.id, token });
          expect(again.view).toEqual(r.view);
        }
      }),
      { numRuns: 30 },
    );
  });

  it('a known example: tap, then start again, shows the tapped state and keeps one row', async () => {
    const legend = playableLegends[0]!;
    expect(allLegends.length).toBeGreaterThan(0);
    const { deps, store } = playSetup(legend.id, ['res-fixed']);
    const first = await startWorld(deps, alice, { legendId: legend.id, token: null });
    const run = generate(legend, 'res-fixed');
    const acted = await actInWorld(deps, alice, {
      legendId: legend.id,
      token: null,
      action: { kind: 'tap', hotspotId: rawId(legend.id, run.hotspots[0]!.id) },
    });
    const again = await startWorld(deps, alice, { legendId: legend.id, token: null });
    expect(again.view).toEqual(acted.view);
    expect(first.view).toBeDefined();
    expect(store.rows().filter((r) => r.status === 'in_progress')).toHaveLength(1);
    expect(store.rows()).toHaveLength(1);
  });
});
