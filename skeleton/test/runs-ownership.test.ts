import { describe, expect, it } from 'vitest';
import type { Visitor } from '../src/access/canEnter.ts';
import { RunNotFoundError } from '../src/runs/errors.ts';
import { finishRun, listMyRuns, myCompletedWorlds, startRun, type RunDeps } from '../src/runs/service.ts';
import { makeFixture } from './helpers/fixture.ts';
import { FakeRunStore } from './helpers/fakeRunStore.ts';

const alice: Visitor = { kind: 'user', id: 'user-alice', name: 'Alice' };
const bob: Visitor = { kind: 'user', id: 'user-bob', name: 'Bob' };

function deps(store: FakeRunStore): RunDeps {
  let n = 0;
  return { store, catalogue: [{ id: 'fx', slotCount: 6 }], loadLegend: async () => makeFixture(), newSeed: () => `seed-${n++}` };
}
const win = (runId: string) => ({ runId, status: 'won', slotsSolved: 6, hint2Uses: 0, wrongAnswers: 0, highestFear: 0 });

describe('one user cannot read or write another user’s run', () => {
  it('Bob cannot finish Alice’s run: it behaves as not found, and Alice’s row is untouched', async () => {
    const store = new FakeRunStore();
    const d = deps(store);
    const aliceRun = await startRun(d, alice, { legendId: 'fx' });
    await expect(finishRun(d, bob, win(aliceRun.id))).rejects.toBeInstanceOf(RunNotFoundError);
    expect(store.rows.find((r) => r.id === aliceRun.id)?.status).toBe('in_progress');
  });

  it('the error for someone else’s run is the same as for a run that does not exist', async () => {
    const store = new FakeRunStore();
    const d = deps(store);
    const aliceRun = await startRun(d, alice, { legendId: 'fx' });
    const foreign = await finishRun(d, bob, win(aliceRun.id)).catch((e: Error) => e.message);
    const missing = await finishRun(d, bob, win('00000000-0000-4000-8000-999999999999')).catch((e: Error) => e.message);
    expect(foreign).toBe(missing);
  });

  it('listing and completed worlds show only the caller’s own runs', async () => {
    const store = new FakeRunStore();
    const d = deps(store);
    const a = await startRun(d, alice, { legendId: 'fx' });
    await finishRun(d, alice, win(a.id));
    await startRun(d, bob, { legendId: 'fx' });
    expect((await listMyRuns(d, alice)).map((r) => r.userId)).toEqual(['user-alice']);
    expect((await listMyRuns(d, bob)).map((r) => r.userId)).toEqual(['user-bob']);
    expect(await myCompletedWorlds(d, bob)).toEqual([]);
    expect((await myCompletedWorlds(d, alice)).map((w) => w.legendId)).toEqual(['fx']);
  });

  it('a run is finished once: the second finish fails and the first result stays', async () => {
    const store = new FakeRunStore();
    const d = deps(store);
    const run = await startRun(d, alice, { legendId: 'fx' });
    const first = await finishRun(d, alice, win(run.id));
    await expect(finishRun(d, alice, { ...win(run.id), status: 'abandoned', slotsSolved: 0 })).rejects.toBeInstanceOf(RunNotFoundError);
    expect(store.rows.find((r) => r.id === run.id)?.status).toBe(first.status);
  });

  it('Alice starting again abandons only her own in-progress run, never Bob’s', async () => {
    const store = new FakeRunStore();
    const d = deps(store);
    const bobRun = await startRun(d, bob, { legendId: 'fx' });
    const first = await startRun(d, alice, { legendId: 'fx' });
    await startRun(d, alice, { legendId: 'fx' });
    expect(store.rows.find((r) => r.id === first.id)?.status).toBe('abandoned');
    expect(store.rows.find((r) => r.id === bobRun.id)?.status).toBe('in_progress');
    expect(store.inProgress('user-alice', 'fx')).toHaveLength(1);
  });
});
