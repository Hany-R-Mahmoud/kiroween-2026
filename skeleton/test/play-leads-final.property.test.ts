import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import type { Visitor } from '../src/access/canEnter.ts';
import { generate, type Legend, type Run } from '../src/index.ts';
import { finalSlot, rawId } from '../src/play/engine.ts';
import { FEAR } from '../src/play/fear.ts';
import { actInWorld, startWorld, type PlayResponse } from '../src/play/service.ts';
import type { PlayState } from '../src/play/state.ts';
import type { Action } from '../src/play/types.ts';
import { playableLegends, playSetup } from './helpers/play.ts';

vi.setConfig({ testTimeout: 900_000 });
const alice: Visitor = { kind: 'user', id: 'alice', name: 'Alice' };
const seedArb = fc.stringMatching(/^[a-z0-9]{6,12}$/).map((s) => `lf-${s}`);
const legendArb = fc.constantFrom(...playableLegends);

async function fresh(legend: Legend, seed: string) {
  const { deps, store } = playSetup(legend.id, [seed]);
  const run = generate(legend, seed);
  await startWorld(deps, alice, { legendId: legend.id, token: null });
  const act = (action: Action): Promise<PlayResponse> => actInWorld(deps, alice, { legendId: legend.id, token: null, action });
  const stored = async (): Promise<PlayState> => (await store.current('alice', legend.id))!.state as PlayState;
  return { run, act, stored };
}

/** Lead steps a set of tapped Hotspots collects, worked out from the generated Run alone. */
function expectedSteps(run: Run, tapped: Set<string>): Map<string, Set<number>> {
  const id = run.legendId;
  const leads = [run.trueLead, ...run.deadEnds];
  const out = new Map<string, Set<number>>();
  for (const h of run.hotspots) {
    if (h.role !== 'meaningful' || !tapped.has(h.id)) continue;
    for (const link of h.links) {
      if (link.kind !== 'leadStep') continue;
      const lead = leads.find((l) => l.id === link.leadId);
      if (!lead) continue;
      const set = out.get(rawId(id, lead.id)) ?? new Set<number>();
      if (link.step === null) lead.steps.forEach((_, i) => set.add(i + 1));
      else if (link.step <= lead.steps.length) set.add(link.step);
      out.set(rawId(id, lead.id), set);
    }
  }
  return out;
}

describe('Property 10: Leads are followable only when collected, and dead ends are provable', () => {
  it('canFollow is true exactly when every step is collected; following behaves by lead kind', async () => {
    await fc.assert(
      fc.asyncProperty(legendArb, seedArb, fc.array(fc.nat(80), { minLength: 1, maxLength: 40 }), fc.boolean(), async (legend, seed, picks, followTwice) => {
        const { run, act, stored } = await fresh(legend, seed);
        const leads = [run.trueLead, ...run.deadEnds];
        const tapped = new Set<string>();
        let view: PlayResponse['view'] | null = null;
        for (const p of picks) {
          const h = run.hotspots[p % run.hotspots.length]!;
          tapped.add(h.id);
          view = (await act({ kind: 'tap', hotspotId: rawId(legend.id, h.id) })).view;
          const want = expectedSteps(run, tapped);
          for (const lead of leads) {
            const lid = rawId(legend.id, lead.id);
            const have = want.get(lid) ?? new Set<number>();
            const lv = view.leads.find((l) => l.leadId === lid);
            expect(lv !== undefined, `${legend.id} ${seed} ${lid} listed`).toBe(have.size > 0);
            if (lv) {
              expect(lv.steps.map((s) => s.n)).toEqual([...have].sort((a, b) => a - b));
              expect(lv.canFollow, `${legend.id} ${seed} ${lid} canFollow`).toBe(lead.steps.every((_, i) => have.has(i + 1)));
            }
          }
        }
        const want = expectedSteps(run, tapped);
        for (const lead of leads) {
          const lid = rawId(legend.id, lead.id);
          const have = want.get(lid) ?? new Set<number>();
          const complete = lead.steps.every((_, i) => have.has(i + 1));
          const before = await stored();
          if (!complete) {
            await expect(act({ kind: 'follow', leadId: lid })).rejects.toBeDefined();
            expect(await stored()).toEqual(before);
            continue;
          }
          const r = await act({ kind: 'follow', leadId: lid });
          if (r.reply?.kind !== 'follow') throw new Error('expected follow');
          const after = await stored();
          if (lead.id === run.trueLead.id) {
            expect(r.reply.result).toBe('true');
            expect(r.reply.anchors).toEqual([]);
            expect(r.view.leads.find((l) => l.leadId === lid)!.followed).toEqual({ kind: 'true' });
            expect(after.fear).toBe(before.fear);
          } else {
            expect(r.reply.result).toBe('dead');
            expect(r.reply.anchors.length).toBeGreaterThan(0);
            for (const a of r.reply.anchors) expect(legend.anchors, `${lid} anchor ${a}`).toContain(a);
            expect(r.reply.anchors).toEqual(lead.contradiction!.anchors);
            expect(r.reply.text).toBe(lead.deadEnd ?? undefined);
            expect(after.fear).toBe(before.fear + FEAR.deadEnd);
            expect(after.wrongAnswers).toBe(before.wrongAnswers);
            expect(r.view.leads.find((l) => l.leadId === lid)!.followed).toMatchObject({ kind: 'dead' });
            if (followTwice) {
              const again = await act({ kind: 'follow', leadId: lid });
              expect((await stored()).fear).toBe(after.fear);
              expect(again.view.fear).toBe(after.fear);
            }
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('a lead id that is not in the Run is refused', async () => {
    const legend = playableLegends[0]!;
    const { act } = await fresh(legend, 'lf-unknown');
    await expect(act({ kind: 'follow', leadId: 'no-such-lead' })).rejects.toBeDefined();
  });
});

describe('Property 11: The final slot opens last', () => {
  const actionArb = fc.oneof(
    fc.record({ t: fc.constant('answer' as const), slot: fc.nat(30), option: fc.constantFrom(0, 1, 2, 3) }),
    fc.record({ t: fc.constant('correct' as const), slot: fc.nat(30) }),
    fc.record({ t: fc.constant('hint1' as const), slot: fc.nat(30) }),
    fc.record({ t: fc.constant('hint2' as const), slot: fc.nat(30) }),
  );

  it('the final slot is locked and refuses answers until every other slot is solved', async () => {
    await fc.assert(
      fc.asyncProperty(legendArb, seedArb, fc.array(actionArb, { minLength: 1, maxLength: 40 }), async (legend, seed, actions) => {
        const { run, act, stored } = await fresh(legend, seed);
        const fin = finalSlot(run);
        const finId = rawId(legend.id, fin.slotId);
        fc.pre(run.slots.length > 1);
        for (const h of run.hotspots) await act({ kind: 'tap', hotspotId: rawId(legend.id, h.id) });
        const solved = new Set<string>();
        let fear = (await stored()).fear;
        for (const a of actions) {
          const s = run.slots[a.slot % run.slots.length]!;
          const sid = rawId(legend.id, s.slotId);
          const othersDone = run.slots.every((x) => x === fin || solved.has(rawId(legend.id, x.slotId)));
          const action: Action =
            a.t === 'answer' ? { kind: 'answer', slotId: sid, option: a.option } : a.t === 'correct' ? { kind: 'answer', slotId: sid, option: s.correctIndex as 0 } : { kind: a.t, slotId: sid };
          if (s === fin && !othersDone) {
            const before = await stored();
            await expect(act(action), `${legend.id} ${seed} ${a.t} on final`).rejects.toBeDefined();
            expect(await stored()).toEqual(before);
            continue;
          }
          let r: PlayResponse;
          try {
            r = await act(action);
          } catch {
            continue; // a tried option or other refusal: covered by Property 5
          }
          if (r.view.fear < fear || r.view.status !== 'in_progress') break; // restarted or ended: the Run is no longer the one modelled
          fear = r.view.fear;
          if (r.reply?.kind === 'answer' && r.reply.correct) solved.add(sid);
          const finView = r.view.slots.find((x) => x.slotId === finId)!;
          const nowDone = run.slots.every((x) => x === fin || solved.has(rawId(legend.id, x.slotId)));
          if (!nowDone) expect(finView.state).toBe('locked');
          else expect(finView.state).not.toBe('locked');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('solving every other slot opens the final slot, and it can then be answered', async () => {
    await fc.assert(
      fc.asyncProperty(legendArb, seedArb, async (legend, seed) => {
        const { run, act } = await fresh(legend, seed);
        const fin = finalSlot(run);
        const finId = rawId(legend.id, fin.slotId);
        for (const h of run.hotspots) await act({ kind: 'tap', hotspotId: rawId(legend.id, h.id) });
        let r: PlayResponse | null = null;
        for (const s of run.slots.filter((x) => x !== fin)) {
          expect((r ?? (await act({ kind: 'hint1', slotId: rawId(legend.id, s.slotId) }))).view.slots.find((x) => x.slotId === finId)!.state).toBe('locked');
          r = await act({ kind: 'answer', slotId: rawId(legend.id, s.slotId), option: s.correctIndex as 0 });
        }
        const view = r ? r.view : (await act({ kind: 'hint1', slotId: finId })).view;
        expect(view.slots.find((x) => x.slotId === finId)!.state).toBe('open');
        const done = await act({ kind: 'answer', slotId: finId, option: fin.correctIndex as 0 });
        expect(done.view.slots.find((x) => x.slotId === finId)!.state).toBe('solved');
      }),
      { numRuns: 100 },
    );
  });
});
