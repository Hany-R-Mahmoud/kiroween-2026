// Property 12: The tutorial lock decides starts for signed-in players (Requirements 23.1, 23.2).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PlayError } from '../src/play/errors.ts';
import { startWorld } from '../src/play/service.ts';
import type { Visitor } from '../src/index.ts';
import { playableLegends, playSetup } from './helpers/play.ts';

const user = (id: string): Visitor => ({ kind: 'user', id, name: id });
const ids = playableLegends.map((l) => l.id);

describe('Property 12: tutorial lock', () => {
  it('refuses a signed-in start with tutorial-required and stores nothing until the flag is set; then starts and resumes as before', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...ids), fc.stringMatching(/^[a-z]{3,8}$/), fc.boolean(), async (legendId, uid, done) => {
        const { deps, store } = playSetup(ids[0]!, ['s-1', 's-2'], { tutorialDone: false });
        if (done) await store.markTutorialDone(uid);
        const res = startWorld(deps, user(uid), { legendId, token: null });
        if (!done) {
          const err = await res.then(() => null, (e: unknown) => e);
          expect(err).toBeInstanceOf(PlayError);
          expect((err as PlayError).code).toBe('tutorial-required');
          expect((err as PlayError).status).toBe(403);
          expect((err as PlayError).message).toBe('Do the tutorial first.');
          expect(await store.current(uid, legendId)).toBeNull();
          return;
        }
        const first = await res;
        expect(first.view.status).toBe('in_progress');
        const row = await store.current(uid, legendId);
        expect(row).not.toBeNull();
        const again = await startWorld(deps, user(uid), { legendId, token: null });
        expect(again.view).toEqual(first.view); // resumed, not restarted
        expect((await store.current(uid, legendId))?.id).toBe(row!.id);
      }),
      { numRuns: 60 },
    );
  });

  it('marking the tutorial done after a refusal opens the World', async () => {
    const { deps, store } = playSetup(ids[0]!, ['s-1'], { tutorialDone: false });
    await expect(startWorld(deps, user('ann'), { legendId: ids[1]!, token: null })).rejects.toMatchObject({ code: 'tutorial-required' });
    await store.markTutorialDone('ann');
    expect((await startWorld(deps, user('ann'), { legendId: ids[1]!, token: null })).view.status).toBe('in_progress');
  });

  it('guests are not checked on the server: the guest World opens without a tutorial flag (Hall check only)', async () => {
    const { deps } = playSetup(ids[0]!, ['s-1'], { tutorialDone: false });
    expect((await startWorld(deps, { kind: 'guest' }, { legendId: ids[0]!, token: null })).view.status).toBe('in_progress');
  });

  it('the access rule still comes first: a guest at another World gets sign-in-required, not tutorial-required', async () => {
    const { deps } = playSetup(ids[0]!, ['s-1'], { tutorialDone: false });
    await expect(startWorld(deps, { kind: 'guest' }, { legendId: ids[1]!, token: null })).rejects.toMatchObject({ code: 'sign-in-required' });
  });
});
