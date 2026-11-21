import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import type { Visitor } from '../src/access/canEnter.ts';
import { answerInText, toParagraphs } from '../src/generator/normalise.ts';
import { generate, type Legend, type Run } from '../src/index.ts';
import { finalSlot, rawId } from '../src/play/engine.ts';
import { FEAR } from '../src/play/fear.ts';
import { actInWorld, startWorld, type PlayResponse } from '../src/play/service.ts';
import type { Action } from '../src/play/types.ts';
import { playableLegends, playSetup } from './helpers/play.ts';

vi.setConfig({ testTimeout: 900_000 }); // 100 full Runs per property through the real service
const alice: Visitor = { kind: 'user', id: 'alice', name: 'Alice' };
const seedArb = fc.stringMatching(/^[a-z0-9]{6,12}$/).map((s) => `ah-${s}`);
const legendArb = fc.constantFrom(...playableLegends);

/** Start a Run through the real service and tap every Hotspot, so every slot but the locked final one is open. */
async function openRun(legend: Legend, seed: string) {
  const { deps } = playSetup(legend.id, [seed]);
  const run = generate(legend, seed);
  await startWorld(deps, alice, { legendId: legend.id, token: null });
  const act = (action: Action): Promise<PlayResponse> => actInWorld(deps, alice, { legendId: legend.id, token: null, action });
  for (const h of run.hotspots) await act({ kind: 'tap', hotspotId: rawId(legend.id, h.id) });
  return { run, act, deps };
}
const fearOf = (r: PlayResponse) => r.view.fear;
const slotView = (r: PlayResponse, id: string) => r.view.slots.find((s) => s.slotId === id)!;
/** A slot that can take an answer now: every slot except the final one, which stays locked until the others are solved. */
const openSlots = (run: Run) => run.slots.filter((s) => s !== finalSlot(run));

describe('Property 5: Answers are checked on the server and counted', () => {
  it('the correct option solves with no fear; each other option costs wrongAnswer once; a tried option is refused unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(legendArb, seedArb, fc.nat(20), fc.shuffledSubarray([0, 1, 2, 3], { minLength: 1, maxLength: 3 }), async (legend, seed, pickSlot, wrongOrder) => {
        const { run, act } = await openRun(legend, seed);
        const slots = openSlots(run);
        fc.pre(slots.length > 0);
        const slot = slots[pickSlot % slots.length]!;
        const sid = rawId(legend.id, slot.slotId);
        const wrong = wrongOrder.filter((o) => o !== slot.correctIndex);
        // Keep the meter below the restart line whatever the legend's hotspot fear did.
        let fear = fearOf(await act({ kind: 'hint1', slotId: sid }));
        fc.pre(fear + wrong.length * FEAR.wrongAnswer < FEAR.max);
        let count = 0;
        for (const o of wrong) {
          const r = await act({ kind: 'answer', slotId: sid, option: o as 0 });
          expect(r.reply).toEqual({ kind: 'answer', correct: false, slotId: sid });
          fear += FEAR.wrongAnswer;
          count += 1;
          expect(fearOf(r)).toBe(fear);
          expect(slotView(r, sid).tried).toEqual(wrong.slice(0, count));
          expect(slotView(r, sid).state).toBe('open');
        }
        // A tried option again: refused, and nothing changes.
        if (wrong.length) {
          await expect(act({ kind: 'answer', slotId: sid, option: wrong[0] as 0 })).rejects.toBeDefined();
          const after = await act({ kind: 'hint1', slotId: sid });
          expect(fearOf(after)).toBe(fear);
          expect(slotView(after, sid).tried).toEqual(wrong);
        }
        const ok = await act({ kind: 'answer', slotId: sid, option: slot.correctIndex as 0 });
        expect(ok.reply).toEqual({ kind: 'answer', correct: true, slotId: sid });
        expect(fearOf(ok)).toBe(fear);
        expect(slotView(ok, sid).state).toBe('solved');
      }),
      { numRuns: 100 },
    );
  });

  it('the wrong-answer count reaches the score the server returns at the end', async () => {
    const legend = playableLegends[0]!;
    const { run, act } = await openRun(legend, 'ah-count');
    const slot = openSlots(run)[0] ?? run.slots[0]!;
    const sid = rawId(legend.id, slot.slotId);
    const wrong = [0, 1, 2, 3].find((o) => o !== slot.correctIndex)!;
    const before = fearOf(await act({ kind: 'hint1', slotId: sid }));
    const r = await act({ kind: 'answer', slotId: sid, option: wrong as 0 });
    expect(fearOf(r) - before).toBe(FEAR.wrongAnswer);
  });
});

describe('Property 6: Hint 1 is free and Hint 2 is charged once', () => {
  it('Hint 1 changes nothing and names meaningful Hotspots; the first Hint 2 charges, later ones return the same anchor free', async () => {
    await fc.assert(
      fc.asyncProperty(legendArb, seedArb, fc.nat(20), fc.integer({ min: 1, max: 4 }), fc.integer({ min: 1, max: 4 }), async (legend, seed, pickSlot, n1, n2) => {
        const { run, act } = await openRun(legend, seed);
        const slots = openSlots(run);
        fc.pre(slots.length > 0);
        const slot = slots[pickSlot % slots.length]!;
        const sid = rawId(legend.id, slot.slotId);
        const base = await act({ kind: 'hint1', slotId: sid });
        const meaningful = new Set(run.hotspots.filter((h) => h.role === 'meaningful').map((h) => rawId(legend.id, h.id)));
        for (let i = 0; i < n1; i++) {
          const r = await act({ kind: 'hint1', slotId: sid });
          expect(fearOf(r)).toBe(fearOf(base));
          expect(r.view).toEqual(base.view);
          if (r.reply?.kind !== 'hint1') throw new Error('expected hint1');
          for (const h of r.reply.highlight) expect(meaningful.has(h)).toBe(true);
        }
        const fear0 = fearOf(base);
        fc.pre(fear0 + FEAR.hint2 < FEAR.max);
        const first = await act({ kind: 'hint2', slotId: sid });
        expect(first.reply).toEqual({ kind: 'hint2', anchor: slot.hint2.anchor, charged: true });
        expect(fearOf(first)).toBe(fear0 + FEAR.hint2);
        for (let i = 0; i < n2; i++) {
          const r = await act({ kind: 'hint2', slotId: sid });
          expect(r.reply).toEqual({ kind: 'hint2', anchor: slot.hint2.anchor, charged: false });
          expect(fearOf(r)).toBe(fear0 + FEAR.hint2);
          expect(slotView(r, sid).hint2).toEqual({ anchor: slot.hint2.anchor });
        }
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 7: The Hint 2 chapter contains the answer', () => {
  /** The text an anchor links to, read from the legend itself. */
  function anchorText(l: Legend, anchor: string): string[] {
    const ch = l.chapters.find((c) => c.anchor === anchor);
    if (ch) return toParagraphs(ch.text);
    const v = l.versions.find((x) => x.anchor === anchor);
    if (v) return toParagraphs(v.claim, v.conflicts, v.paragraph);
    return [];
  }
  it('the served anchor is a deep-link target and its text holds the correct option', async () => {
    await fc.assert(
      fc.asyncProperty(legendArb, seedArb, async (legend, seed) => {
        const { run, act } = await openRun(legend, seed);
        // Hint 2 on the locked final slot is refused; solve the others first with the right options.
        for (const s of openSlots(run)) await act({ kind: 'answer', slotId: rawId(legend.id, s.slotId), option: s.correctIndex as 0 });
        for (const s of run.slots) {
          const sid = rawId(legend.id, s.slotId);
          const r = await act({ kind: 'hint2', slotId: sid });
          if (r.reply?.kind !== 'hint2') throw new Error('expected hint2');
          expect(legend.anchors).toContain(r.reply.anchor);
          if (s.type === 'true-or-told' || s.type === 'ritual-order') continue; // the answer is a judgement or an order, not a phrase
          const text = anchorText(legend, r.reply.anchor);
          expect(text.length).toBeGreaterThan(0);
          expect(answerInText(text, s.options[s.correctIndex]!, s.type), `${legend.id} ${seed} ${sid} ${s.type} ${r.reply.anchor} ${s.options[s.correctIndex]}`).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});
