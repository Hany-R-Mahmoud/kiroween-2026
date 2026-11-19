import { describe, expect, it } from 'vitest';
import type { Visitor } from '../src/access/canEnter.ts';
import { generate } from '../src/generator/generate.ts';
import { GeneratorError } from '../src/generator/errors.ts';
import { NoRunError, RunConflictError, ValidationError } from '../src/runs/errors.ts';
import { finishRun, MAX_SEED_TRIES, startRun, type RunDeps } from '../src/runs/service.ts';
import { score } from '../src/score/score.ts';
import { makeFixture } from './helpers/fixture.ts';
import { FakeRunStore } from './helpers/fakeRunStore.ts';

const alice: Visitor = { kind: 'user', id: 'user-alice', name: 'Alice' };

function deps(store = new FakeRunStore(), over: Partial<RunDeps> = {}): RunDeps & { seeds: string[] } {
  const seeds: string[] = [];
  return {
    store,
    catalogue: [{ id: 'fx', slotCount: 6 }],
    loadLegend: async () => makeFixture(),
    newSeed: () => {
      const s = `seed-${seeds.length}`;
      seeds.push(s);
      return s;
    },
    seeds,
    ...over,
  };
}

describe('startRun', () => {
  it('stores the seed it issued and the true version the generator gives for that seed', async () => {
    const d = deps();
    const run = await startRun(d, alice, { legendId: 'fx' });
    expect(run.seed).toBe('seed-0');
    expect(run.trueVersionId).toBe(generate(makeFixture(), 'seed-0').trueVersionId);
    expect(run.status).toBe('in_progress');
    expect(run.userId).toBe('user-alice');
  });

  it('refuses a seed or a true version from the client', async () => {
    const d = deps();
    await expect(startRun(d, alice, { legendId: 'fx', seed: 'mine' })).rejects.toBeInstanceOf(ValidationError);
    await expect(startRun(d, alice, { legendId: 'fx', trueVersionId: 'fx:v-a' })).rejects.toBeInstanceOf(ValidationError);
    expect(d.store instanceof FakeRunStore && d.store.calls).toEqual([]);
  });

  it('tries new seeds when the generator cannot make a run, and stores the first that works', async () => {
    // In this legend every seed that picks version v-b fails for real (its only lead has no hotspot on step 3),
    // and every seed that picks v-a works.
    const legend = halfBrokenFixture();
    const pool = Array.from({ length: 200 }, (_, i) => `s${i}`);
    const fails = (seed: string) => {
      try {
        generate(legend, seed);
        return false;
      } catch (e) {
        if (e instanceof GeneratorError) return true;
        throw e;
      }
    };
    const bad = pool.filter(fails).slice(0, 3);
    const good = pool.find((x) => !fails(x))!;
    expect(bad, 'the fixture must have seeds that fail').toHaveLength(3);
    const seeds = [...bad, good];
    const firstGood = 3;

    let n = 0;
    const d = deps(undefined, { loadLegend: async () => legend, newSeed: () => seeds[n++]! });
    const run = await startRun(d, alice, { legendId: 'fx' });
    expect(run.seed).toBe(seeds[firstGood]);
    expect(n).toBe(firstGood + 1);
    expect(run.trueVersionId).toBe('fx:v-a');
  });

  it(`gives up after ${MAX_SEED_TRIES} seeds with an error that names the legend`, async () => {
    const broken = makeFixture();
    broken.world.slots[0]!.candidateFactIds = []; // no fact can fill it: every seed throws a GeneratorError
    const d = deps(undefined, { loadLegend: async () => broken });
    const err = await startRun(d, alice, { legendId: 'fx' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NoRunError);
    expect((err as NoRunError).message).toContain('"fx"');
    expect(d.seeds).toHaveLength(MAX_SEED_TRIES);
    expect((d.store as FakeRunStore).rows).toHaveLength(0);
  });

  it('a non-generator error is not retried or hidden', async () => {
    const d = deps(undefined, { loadLegend: async () => Promise.reject(new TypeError('boom')) });
    await expect(startRun(d, alice, { legendId: 'fx' })).rejects.toBeInstanceOf(TypeError);
  });

  it('closes the user’s older in-progress run for that world as abandoned', async () => {
    const store = new FakeRunStore();
    const d = deps(store);
    const first = await startRun(d, alice, { legendId: 'fx' });
    const second = await startRun(d, alice, { legendId: 'fx' });
    expect(store.rows.find((r) => r.id === first.id)?.status).toBe('abandoned');
    expect(store.inProgress('user-alice', 'fx').map((r) => r.id)).toEqual([second.id]);
  });

  it('a race on the one-in-progress rule gives the fixed friendly 409 and leaves no extra row', async () => {
    const store = new FakeRunStore();
    const d = deps(store);
    await startRun(d, alice, { legendId: 'fx' });
    store.raceOnNextStart = true;
    const err = await startRun(d, alice, { legendId: 'fx' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RunConflictError);
    expect((err as RunConflictError).status).toBe(409);
    expect((err as RunConflictError).message).toBe('A run for this world is already starting. Try again.');
    expect(store.inProgress('user-alice', 'fx')).toHaveLength(1);
    expect(store.rows).toHaveLength(1);
  });
});

describe('finishRun', () => {
  it('stores the score computed from the counts, not from the client', async () => {
    const store = new FakeRunStore();
    const d = deps(store);
    const run = await startRun(d, alice, { legendId: 'fx' });
    const done = await finishRun(d, alice, { runId: run.id, status: 'won', slotsSolved: 6, hint2Uses: 2, wrongAnswers: 3, highestFear: 70 });
    expect(done.score).toBe(score({ slotsSolved: 6, curseBroken: true, hint2Uses: 2, wrongAnswers: 3 }));
    expect(done.score).toBe(590); // 6 x 100 + 50 - 2 x 15 - 3 x 10
  });

  it('only won breaks the curse', async () => {
    const d = deps();
    const run = await startRun(d, alice, { legendId: 'fx' });
    const done = await finishRun(d, alice, { runId: run.id, status: 'restarted', slotsSolved: 6, hint2Uses: 0, wrongAnswers: 0, highestFear: 0 });
    expect(done.score).toBe(600);
  });

  it('rejects a score sent by the client', async () => {
    const d = deps();
    const run = await startRun(d, alice, { legendId: 'fx' });
    await expect(finishRun(d, alice, { runId: run.id, status: 'won', slotsSolved: 6, hint2Uses: 0, wrongAnswers: 0, highestFear: 0, score: 99999 })).rejects.toBeInstanceOf(ValidationError);
  });

  it('checks slots solved against the run’s own legend', async () => {
    const d = deps();
    const run = await startRun(d, alice, { legendId: 'fx' });
    await expect(finishRun(d, alice, { runId: run.id, status: 'restarted', slotsSolved: 7, hint2Uses: 0, wrongAnswers: 0, highestFear: 0 })).rejects.toBeInstanceOf(ValidationError);
  });
});

/** The fixture with lead-2 (the only lead for v-b) missing a meaningful hotspot on step 3. */
function halfBrokenFixture() {
  const l = makeFixture();
  for (const h of l.world.hotspots) h.links = h.links.filter((k) => !(k.kind === 'leadStep' && k.leadId === 'fx:lead-2' && k.step === 3));
  return l;
}
