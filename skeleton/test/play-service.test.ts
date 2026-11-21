import { describe, expect, it, vi } from 'vitest';
import type { Visitor } from '../src/access/canEnter.ts';
import { generate, type Legend } from '../src/index.ts';
import { finalSlot, initState, rawId } from '../src/play/engine.ts';
import { PLAY_ERROR_MESSAGES } from '../src/play/errors.ts';
import { FEAR } from '../src/play/fear.ts';
import { actInTutorial, actInWorld, redeemTutorialReceipt, startTutorial, startWorld, type TutorialDeps } from '../src/play/service.ts';
import { TUTORIAL_DETAIL_IDS, type TutorialDetail } from '../src/play/tutorial.ts';
import type { Action } from '../src/play/types.ts';
import { score } from '../src/score/score.ts';
import { allLegends } from './helpers/legends.ts';
import { playableLegends, playSetup, winningActions } from './helpers/play.ts';

const legend: Legend = playableLegends[0]!;
const other = allLegends.find((l) => l.id !== legend.id)!;
const alice: Visitor = { kind: 'user', id: 'alice', name: 'Alice' };
const bob: Visitor = { kind: 'user', id: 'bob', name: 'Bob' };
const guest: Visitor = { kind: 'guest' };

const setup = (seeds?: string[]) => playSetup(legend.id, seeds);

describe('play service: signed-in worlds', () => {
  it('starts a Run, resumes it, and never lets another user see it', async () => {
    const { deps, store } = setup();
    const a = await startWorld(deps, alice, { legendId: legend.id, token: null });
    expect(a.token).toBeNull();
    expect(a.view.status).toBe('in_progress');
    await startWorld(deps, alice, { legendId: legend.id, token: null });
    expect(store.rows().filter((r) => r.userId === 'alice')).toHaveLength(1); // resumed, no second row
    await expect(actInWorld(deps, bob, { legendId: legend.id, token: null, action: { kind: 'tap', hotspotId: 'x' } })).rejects.toMatchObject({ code: 'not-found' });
  });

  it('plays to a win and scores from the server counts with the unchanged formula', async () => {
    const { deps, store } = setup(['win-seed']);
    await startWorld(deps, alice, { legendId: legend.id, token: null });
    const run = generate(legend, 'win-seed');
    let last = null as Awaited<ReturnType<typeof actInWorld>> | null;
    for (const action of winningActions(run)) last = await actInWorld(deps, alice, { legendId: legend.id, token: null, action });
    expect(last!.ended?.status).toBe('won');
    expect(last!.ended?.score).toBe(score({ slotsSolved: run.slots.length, curseBroken: true, hint2Uses: 0, wrongAnswers: 0 }));
    const row = store.rows()[0]!;
    expect(row.status).toBe('won');
    expect(row.result?.score).toBe(last!.ended!.score);
    await expect(actInWorld(deps, alice, { legendId: legend.id, token: null, action: { kind: 'tap', hotspotId: 'x' } })).rejects.toMatchObject({ code: 'not-found' });
  });

  it('counts a Hint 2 itself and charges it once per slot', async () => {
    const { deps, store } = setup(['s-one']);
    await startWorld(deps, alice, { legendId: legend.id, token: null });
    const run = generate(legend, 's-one');
    const sid = rawId(legend.id, run.slots.find((s) => s !== finalSlot(run))!.slotId);
    const send = (action: Action) => actInWorld(deps, alice, { legendId: legend.id, token: null, action });
    expect((await send({ kind: 'hint2', slotId: sid })).view.fear).toBe(FEAR.hint2);
    await send({ kind: 'hint2', slotId: sid });
    expect(store.rows()[0]!.state).toMatchObject({ hint2Uses: 1, fear: FEAR.hint2 });
  });

  it('restarts at full fear with a new Seed, closing the old row with the server score', async () => {
    const { deps, store } = setup(['s-two']);
    const run = generate(legend, 's-one');
    const slot = run.slots.find((s) => s !== finalSlot(run))!;
    const sid = rawId(legend.id, slot.slotId);
    const state = { ...initState(run), fear: 90, highestFear: 90, wrongAnswers: 5, opened: [sid] };
    await store.begin('alice', { legendId: legend.id, seed: 's-one', trueVersionId: run.trueVersionId, state });
    const wrong = [0, 1, 2, 3].find((o) => o !== slot.correctIndex)! as 0;
    const r = await actInWorld(deps, alice, { legendId: legend.id, token: null, action: { kind: 'answer', slotId: sid, option: wrong } });
    expect(r.ended).toMatchObject({ status: 'restarted', seed: 's-one' });
    expect(r.view).toMatchObject({ fear: 0, status: 'in_progress' });
    expect(store.rows().map((x) => x.status)).toEqual(['restarted', 'in_progress']);
    expect(store.rows()[1]!.seed).toBe('s-two');
    expect(store.rows()[0]!.result).toMatchObject({ wrongAnswers: 6, highestFear: 100, score: score({ slotsSolved: 0, curseBroken: false, hint2Uses: 0, wrongAnswers: 6 }) });
  });

  it('abandons an empty Phase 2 state and starts fresh', async () => {
    const { deps, store } = setup();
    await store.begin('alice', { legendId: legend.id, seed: 'old', trueVersionId: 'v', state: {} as never });
    const r = await startWorld(deps, alice, { legendId: legend.id, token: null });
    expect(r.view.fear).toBe(0);
    expect(store.rows().map((x) => x.status)).toEqual(['abandoned', 'in_progress']);
  });

  it('retries a rev mismatch once, then answers 409', async () => {
    const { deps, store } = setup();
    await startWorld(deps, alice, { legendId: legend.id, token: null });
    const realSave = store.save.bind(store);
    let calls = 0;
    store.save = async (...a) => (++calls === 1 ? false : realSave(...a));
    const run = generate(legend, 'seed-0');
    const hs = rawId(legend.id, run.hotspots[0]!.id);
    await expect(actInWorld(deps, alice, { legendId: legend.id, token: null, action: { kind: 'tap', hotspotId: hs } })).resolves.toBeTruthy();
    store.save = async () => false;
    await expect(actInWorld(deps, alice, { legendId: legend.id, token: null, action: { kind: 'tap', hotspotId: hs } })).rejects.toMatchObject({ code: 'conflict' });
  });

  it('refuses unknown input keys with the fixed message', async () => {
    const { deps } = setup();
    const err = await startWorld(deps, alice, { legendId: legend.id, token: null, userId: 'bob' }).catch((e) => e);
    expect(err.message).toBe(PLAY_ERROR_MESSAGES.invalid);
  });
});

describe('play service: guests', () => {
  it('carries the Run in an encrypted token and keeps the store untouched', async () => {
    const { deps, store } = setup(['g-1']);
    const s = await startWorld(deps, guest, { legendId: legend.id, token: null });
    expect(s.token).toMatch(/^v1\./);
    const run = generate(legend, 'g-1');
    const hs = rawId(legend.id, run.hotspots[0]!.id);
    const a = await actInWorld(deps, guest, { legendId: legend.id, token: s.token, action: { kind: 'tap', hotspotId: hs } });
    expect(a.token).not.toBe(s.token);
    expect(JSON.stringify(a)).not.toContain('g-1');
    expect(store.rows()).toHaveLength(0);
  });

  it('refuses another world with the sign-in error and no data, and a missing token with the session error', async () => {
    const { deps } = setup();
    await expect(startWorld(deps, guest, { legendId: other.id, token: null })).rejects.toMatchObject({ code: 'sign-in-required' });
    await expect(actInWorld(deps, guest, { legendId: legend.id, token: null, action: { kind: 'tap', hotspotId: 'x' } })).rejects.toMatchObject({ code: 'session' });
  });

  it('wins with no token left, and a restart gives a different Seed', async () => {
    const { deps } = setup(['g-win']);
    let t = (await startWorld(deps, guest, { legendId: legend.id, token: null })).token;
    let last = null as Awaited<ReturnType<typeof actInWorld>> | null;
    for (const action of winningActions(generate(legend, 'g-win'))) {
      last = await actInWorld(deps, guest, { legendId: legend.id, token: t, action });
      t = last.token;
    }
    expect(last!.ended?.status).toBe('won');
    expect(last!.token).toBeNull();
  });
});

describe('play service: tutorial', () => {
  const details: TutorialDetail[] = TUTORIAL_DETAIL_IDS.map((d) => ({ detailId: d, question: `q ${d}`, answer: '11', alsoAccept: ['eleven'] }));
  function tdeps() {
    const { store, tokens } = setup();
    let n = 0;
    const deps: TutorialDeps = { store, tokens, newSeed: () => `t-${n++}`, loadTutorialDetails: async () => details };
    return { deps, store };
  }

  it('charges Hint 2 once, refuses a wrong answer without fear, and gives a guest a receipt', async () => {
    const { deps } = tdeps();
    let { token } = await startTutorial(deps, guest, { token: null });
    const act = async (action: object) => {
      const r = await actInTutorial(deps, guest, { token, action });
      token = r.token;
      return r;
    };
    expect((await act({ kind: 'hint2' })).view.fear).toBe(FEAR.tutorialHint2);
    expect((await act({ kind: 'hint2' })).view.fear).toBe(FEAR.tutorialHint2);
    const wrong = await act({ kind: 'answer', value: '12' });
    expect(wrong.reply).toEqual({ kind: 'answer', correct: false });
    expect(wrong.receipt).toBeUndefined();
    const right = await act({ kind: 'answer', value: ' Eleven ' });
    expect(right.view.solved).toBe(true);
    expect(right.receipt).toMatch(/^v1\./);
  });

  it('marks a signed-in player done, and redeems a receipt once for a user only', async () => {
    const { deps, store } = tdeps();
    const g = await startTutorial(deps, guest, { token: null });
    const solved = await actInTutorial(deps, guest, { token: g.token, action: { kind: 'answer', value: '11' } });
    await expect(redeemTutorialReceipt(deps, guest, { receipt: solved.receipt })).rejects.toMatchObject({ code: 'sign-in-required' });
    await expect(redeemTutorialReceipt(deps, alice, { receipt: g.token })).rejects.toMatchObject({ code: 'session' }); // wrong kind
    await redeemTutorialReceipt(deps, alice, { receipt: solved.receipt });
    await redeemTutorialReceipt(deps, alice, { receipt: solved.receipt });
    expect(await store.tutorialDone('alice')).toBe(true);
    expect(await store.tutorialDone('bob')).toBe(false);
    const u = await startTutorial(deps, bob, { token: null });
    const r = await actInTutorial(deps, bob, { token: u.token, action: { kind: 'answer', value: '11' } });
    expect(r.receipt).toBeUndefined();
    expect(await store.tutorialDone('bob')).toBe(true);
  });
});
describe('offline: a Run needs no database and no network', () => {
  it('a guest plays a whole world to a win with fetch, sockets and the pg driver forbidden', async () => {
    const net = await import('node:net');
    const forbidden = () => {
      throw new Error('network or database access attempted');
    };
    const spies = [vi.spyOn(globalThis, 'fetch').mockImplementation(forbidden), vi.spyOn(net.Socket.prototype, 'connect').mockImplementation(forbidden)];
    const saved = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const { deps } = setup(['offline-1']);
      const run = generate(legend, 'offline-1');
      let res = await startWorld(deps, guest, { legendId: legend.id, token: null });
      let token = res.token;
      expect(token).not.toBeNull();
      for (const action of winningActions(run)) {
        res = await actInWorld(deps, guest, { legendId: legend.id, token, action });
        token = res.token;
      }
      expect(res.ended?.status).toBe('won');
      for (const s of spies) expect(s).not.toHaveBeenCalled();
    } finally {
      for (const s of spies) s.mockRestore();
      if (saved !== undefined) process.env.DATABASE_URL = saved;
    }
  });
});
