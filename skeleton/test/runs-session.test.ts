import { describe, expect, it } from 'vitest';
import type { Visitor } from '../src/access/canEnter.ts';
import { NotSignedInError } from '../src/runs/errors.ts';
import { finishRun, listMyRuns, myCompletedWorlds, startRun, type RunDeps } from '../src/runs/service.ts';
import { FakeRunStore } from './helpers/fakeRunStore.ts';

const guest: Visitor = { kind: 'guest' };

// The legend loader and the seed would also be reached on a real start; a guest must not reach any of them.
function spyDeps() {
  const store = new FakeRunStore();
  const touched: string[] = [];
  const deps: RunDeps = {
    store,
    catalogue: [{ id: 'fx', slotCount: 6 }],
    loadLegend: async () => {
      touched.push('loadLegend');
      throw new Error('must not load');
    },
    newSeed: () => {
      touched.push('newSeed');
      return 'x';
    },
  };
  return { deps, store, touched };
}

const finish = { runId: '00000000-0000-4000-8000-000000000001', status: 'won', slotsSolved: 6, hint2Uses: 0, wrongAnswers: 0, highestFear: 0 };

describe('the four run functions reject a request with no verified session (R4.11)', () => {
  const cases: [string, (d: RunDeps) => Promise<unknown>][] = [
    ['startRun', (d) => startRun(d, guest, { legendId: 'fx' })],
    ['finishRun', (d) => finishRun(d, guest, finish)],
    ['listMyRuns', (d) => listMyRuns(d, guest)],
    ['myCompletedWorlds', (d) => myCompletedWorlds(d, guest)],
  ];

  it.each(cases)('%s throws NotSignedInError and touches nothing', async (_name, call) => {
    const { deps, store, touched } = spyDeps();
    await expect(call(deps)).rejects.toBeInstanceOf(NotSignedInError);
    expect(store.calls).toEqual([]);
    expect(touched).toEqual([]);
  });

  it('a guest is rejected even with input that would be invalid (the session check comes first)', async () => {
    const { deps } = spyDeps();
    await expect(startRun(deps, guest, { nonsense: true })).rejects.toBeInstanceOf(NotSignedInError);
    await expect(finishRun(deps, guest, 42)).rejects.toBeInstanceOf(NotSignedInError);
  });

  it('the not-signed-in error answers 401 with a fixed message', () => {
    const e = new NotSignedInError();
    expect(e.status).toBe(401);
    expect(e.message).toBe('Sign in to save your progress.');
  });
});
