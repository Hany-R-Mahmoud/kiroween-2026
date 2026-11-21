import { describe, expect, it, vi } from 'vitest';
import { generate } from '../src/index.ts';
import { FEAR } from '../src/play/fear.ts';
import { playableLegends } from './helpers/play.ts';
import { atlasText, playAsGuesser, playFromAtlas } from './helpers/playFromAtlas.ts';

// Mutations that must fail this file (requirement 13.13): in play/engine.ts `endStatus`, a meter that never restarts
// (`state.fear >= FEAR.max + 1000`); in play/view.ts `leadView`, `anchors: []` for a followed dead end.
vi.setConfig({ testTimeout: 900_000 });
const GUESS_SEEDS = ['guess-a', 'guess-b', 'guess-c'];

describe('Guessing player (requirement 13.3)', () => {
  for (const legend of playableLegends) {
    it(`${legend.id}: a guessing player fills the meter, the Run restarts with a new Seed, and the old row keeps its counts`, async () => {
      // A guesser can get lucky and win a Run (the true lead is one click among a few). The claim is that the meter CAN be
      // filled, so the first Seed whose guessing Run ends in a restart is the one checked; at least one of the Seeds must.
      let checked = 0;
      for (const seed of GUESS_SEEDS) {
        const { end, first, setup } = await playAsGuesser(legend, seed);
        expect(end, `${legend.id} ${seed}: the Run neither restarted nor won`).not.toBeNull();
        if (end!.ended!.status !== 'restarted') continue;
        checked += 1;
        expect(end!.ended!.status).toBe('restarted');
        expect(end!.ended!.seed).toBe(seed);
        expect(first!.seed).toBe(seed);

        // The new Run: in progress, clean, and a different Seed (read from the store, never from a view).
        expect(end!.view.status).toBe('in_progress');
        expect(end!.view.fear).toBe(0);
        expect(end!.view.slots.filter((s) => s.state === 'solved')).toEqual([]);
        const now = (await setup.store.current('alice', legend.id))!;
        expect(now.seed).not.toBe(seed);
        expect(now.state).toMatchObject({ fear: 0, highestFear: 0, hint2Uses: 0, wrongAnswers: 0, solved: [], tapped: [], followed: [] });

        // The old row is closed with the counts the Run reached.
        const old = setup.store.rows().find((r) => r.seed === seed)!;
        expect(old.status).toBe('restarted');
        expect(old.result!.highestFear).toBe(FEAR.max);
        expect(old.result!.wrongAnswers).toBeGreaterThan(0);
        expect(old.result!.score).toBe(end!.ended!.score);
        expect(setup.store.rows().filter((r) => r.status === 'in_progress')).toHaveLength(1);
        break;
      }
      expect(checked, `${legend.id}: no guessing Run filled the meter on ${GUESS_SEEDS.join(', ')}`).toBe(1);
    });
  }
});

describe('Dead-end contradiction anchors (requirement 13.4)', () => {
  it('for every legend and 40 seeds, every dead end names anchors the legend has, with atlas text at each', () => {
    let checked = 0;
    for (const legend of playableLegends) {
      for (let i = 0; i < 40; i++) {
        const run = generate(legend, `anchor-${i}`);
        for (const d of run.deadEnds) {
          expect(d.contradiction, `${legend.id} ${d.id} is a dead end without a contradiction`).not.toBeNull();
          expect(d.contradiction!.anchors.length).toBeGreaterThan(0);
          for (const a of d.contradiction!.anchors) {
            expect(legend.anchors, `${legend.id} ${d.id}: ${a}`).toContain(a);
            expect(atlasText(legend, a)?.trim(), `${legend.id} ${d.id}: no atlas text at ${a}`).toBeTruthy();
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('the anchors the views give for followed dead ends exist in the atlas (the scripted player reads them)', async () => {
    let seen = 0;
    for (const legend of playableLegends) {
      for (let i = 0; i < 10; i++) {
        const r = await playFromAtlas(legend, `fair-${i}`);
        for (const a of r.deadEndAnchors) {
          expect(a.found, `${legend.id} fair-${i}: view gave ${a.anchor}`).toBe(true);
          seen += 1;
        }
      }
    }
    expect(seen, 'no dead end was followed, so nothing was checked').toBeGreaterThan(0);
  });
});
