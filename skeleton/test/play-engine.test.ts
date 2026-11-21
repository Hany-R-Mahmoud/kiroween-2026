import { describe, expect, it } from 'vitest';
import { generate, type Legend, type Run } from '../src/index.ts';
import { finalSlot, initState, rawId, step } from '../src/play/engine.ts';
import { FEAR } from '../src/play/fear.ts';
import { relicOf } from '../src/play/relic.ts';
import { playStateSchema, type PlayState } from '../src/play/state.ts';
import { allLegends } from './helpers/legends.ts';

function tryRun(l: Legend, seed: string): Run | null {
  try {
    return generate(l, seed);
  } catch {
    return null;
  }
}

/** Taps every Hotspot, answers every slot (final last) and follows the true lead. */
function play(l: Legend, run: Run) {
  let state: PlayState = initState(run);
  let ended = null as ReturnType<typeof step>['ended'];
  const go = (a: Parameters<typeof step>[3]) => {
    const r = step(l, run, state, a);
    state = r.state;
    ended = r.ended;
  };
  for (const h of run.hotspots) go({ kind: 'tap', hotspotId: rawId(l.id, h.id) });
  const fin = finalSlot(run);
  for (const s of [...run.slots.filter((x) => x !== fin), fin]) go({ kind: 'answer', slotId: rawId(l.id, s.slotId), option: s.correctIndex as 0 });
  go({ kind: 'follow', leadId: rawId(l.id, run.trueLead.id) });
  return { state, ended };
}

describe('play engine smoke', () => {
  it('a scripted player wins every legend that generates, and the state stays valid', () => {
    for (const l of allLegends) {
      const run = tryRun(l, 'smoke-1');
      if (!run) continue;
      const { state, ended } = play(l, run);
      expect(ended?.status, l.id).toBe('won');
      expect(ended?.curseText).toBe(run.finalPuzzle.description);
      expect(playStateSchema.safeParse(state).success, l.id).toBe(true);
    }
  });

  it('charges Hint 2 once per slot, refuses a repeated wrong option, and restarts at full fear', () => {
    const l = allLegends[0]!;
    const run = tryRun(l, 'smoke-2')!;
    const first = run.slots.find((s) => s !== finalSlot(run))!;
    const sid = rawId(l.id, first.slotId);
    let state = initState(run);
    const a = step(l, run, state, { kind: 'hint2', slotId: sid });
    const b = step(l, run, a.state, { kind: 'hint2', slotId: sid });
    expect(a.state.fear).toBe(FEAR.hint2);
    expect(b.state.fear).toBe(FEAR.hint2);
    expect(b.reply).toMatchObject({ kind: 'hint2', charged: false });

    state = { ...b.state, opened: [sid] };
    const wrong = ([0, 1, 2, 3] as const).find((o) => o !== first.correctIndex)!;
    const w = step(l, run, state, { kind: 'answer', slotId: sid, option: wrong });
    expect(w.state.fear).toBe(FEAR.hint2 + FEAR.wrongAnswer);
    expect(() => step(l, run, w.state, { kind: 'answer', slotId: sid, option: wrong })).toThrow();

    const nearFull: PlayState = { ...w.state, fear: FEAR.max - 1 };
    const r = step(l, run, nearFull, { kind: 'answer', slotId: sid, option: (([0, 1, 2, 3] as const).find((o) => o !== first.correctIndex && o !== wrong))! });
    expect(r.ended?.status).toBe('restarted');
    expect(() => step(l, run, r.state, { kind: 'hint1', slotId: sid })).toThrow();
  });

  it('names every relic, with a null name for the jersey-devil fallback', () => {
    for (const l of allLegends) {
      const r = relicOf(l);
      expect(r?.assetId, l.id).toMatch(/-game-relic-\d+$/);
      if (l.id === 'jersey-devil') expect(r?.name).toBeNull();
      else expect(r?.name, l.id).toBeTruthy();
    }
  });
});
