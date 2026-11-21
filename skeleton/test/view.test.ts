import { describe, expect, it } from 'vitest';
import { generate } from '../src/generator/generate.ts';
import { initState, rawId, step } from '../src/play/engine.ts';
import { toView } from '../src/play/view.ts';
import { allLegends } from './helpers/legends.ts';

const legend = allLegends.find((l) => l.id === 'banshee')!;
const run = generate(legend, 'view-seed-1');

describe('toView (requirements 4.12, 5.6, 7.2, 7.3)', () => {
  it('a fresh Run shows no question, options, Seed or secret', () => {
    const v = toView(legend, run, initState(run));
    const json = JSON.stringify(v);
    expect(v.status).toBe('in_progress');
    expect(v.ended).toBeUndefined();
    expect(v.leads).toEqual([]);
    expect(v.slots.every((s) => !s.question && !s.options && !s.hint2)).toBe(true);
    expect(json).not.toContain(run.seed);
    for (const s of run.slots) expect(json).not.toContain(s.hint2.anchor);
    expect(json).not.toMatch(/correctIndex|role|swaps|trueVersion/);
  });

  it('opens a slot with its question and options in generator order, and shows Hint 2 only after use', () => {
    const slot = run.slots[0]!;
    const hs = run.hotspots.find((h) => slot.hotspotIds.includes(h.id))!;
    let st = step(legend, run, initState(run), { kind: 'tap', hotspotId: rawId(run.legendId, hs.id) }).state;
    const sid = rawId(run.legendId, slot.slotId);
    let sv = toView(legend, run, st).slots.find((s) => s.slotId === sid)!;
    if (sv.state === 'open') {
      expect(sv.options).toEqual(slot.options);
      expect(sv.question).toBe(slot.question);
      expect(sv.hint2).toBeUndefined();
      st = step(legend, run, st, { kind: 'hint2', slotId: sid }).state;
      sv = toView(legend, run, st).slots.find((s) => s.slotId === sid)!;
      expect(sv.hint2).toEqual({ anchor: slot.hint2.anchor });
    }
  });

  it('shows the Seed and curse text only once the Run has ended', () => {
    const st = { ...initState(run), fear: 100, highestFear: 100 };
    const v = toView(legend, run, st);
    expect(v.status).toBe('restarted');
    expect(v.ended?.seed).toBe(run.seed);
    expect(v.ended?.curseText).toBeUndefined();
  });
});
