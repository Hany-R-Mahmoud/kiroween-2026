import { PLAY_ERROR_MESSAGES, type EndInfo, type PlayView } from '@kiroween/skeleton/client';
import type { PlayResponse, TutorialResponse } from '@kiroween/skeleton';
import { describe, expect, it } from 'vitest';
import {
  brokenWorldsOf,
  createPlayClient,
  guestHallState,
  hint2Links,
  initialTutorialState,
  initialWorldState,
  ledgerSeed,
  playTokenKey,
  readToken,
  TUTORIAL_RECEIPT_KEY,
  tutorialReducer,
  worldReducer,
  type PlayApi,
  type Store,
} from '../src/lib/playClient';

const tok = (c: string): string => `v1.${c.repeat(24)}`;
const memory = (initial: Record<string, string> = {}): Store & { data: Record<string, string> } => {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v), removeItem: (k) => void delete data[k] };
};

const view = (over: Partial<PlayView> = {}): PlayView => ({ legendId: 'banshee', status: 'in_progress', fear: 0, slots: [], leads: [], ...over });
const resp = (over: Partial<PlayResponse> = {}): PlayResponse => ({ view: view(), reply: null, ended: null, token: tok('a'), ...over });
const won: EndInfo = { status: 'won', score: 900, slotsSolved: 5, seed: 'seed-1' };
const sessionError = (): Error => new Error(PLAY_ERROR_MESSAGES.session);

function fakeApi(over: Partial<PlayApi> = {}): PlayApi & { calls: unknown[] } {
  const calls: unknown[] = [];
  const rec = <T>(r: () => T) => (a: { data: unknown }) => (calls.push(a.data), Promise.resolve(r()));
  return {
    calls,
    startWorld: rec(() => resp()),
    worldAct: rec(() => resp()),
    startTutorial: rec(() => ({ view: { fear: 0, hint1: { text: 'x', highlight: [] }, solved: false }, reply: null, token: tok('t') }) as TutorialResponse),
    tutorialAct: rec(() => ({ view: { fear: 0, hint1: { text: 'x', highlight: [] }, solved: true }, reply: null, token: tok('u'), receipt: tok('r') }) as TutorialResponse),
    redeemTutorialReceipt: rec(() => ({ done: true as const })),
    ...over,
  };
}

describe('storage parsing', () => {
  it('reads only tokens of the server shape', () => {
    const s = memory({ a: tok('x'), b: 'not a token', c: '' });
    expect(readToken(s, 'a')).toBe(tok('x'));
    expect(readToken(s, 'b')).toBeNull();
    expect(readToken(s, 'c')).toBeNull();
    expect(readToken(s, 'missing')).toBeNull();
  });
  it('treats a throwing storage as empty', () => {
    const s: Store = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(readToken(s, 'a')).toBeNull();
    expect(brokenWorldsOf(s)).toEqual([]);
  });
  it('refuses a bad legend id for the key', () => {
    expect(playTokenKey('banshee')).toBe('kiroween.guest.play.v1.banshee');
    expect(() => playTokenKey('../x')).toThrow();
  });
  it('lists distinct won worlds and ignores edited junk', () => {
    const run = (legendId: string, status: string) => ({ legendId, status, slotsSolved: 1, score: 1, finishedAt: 'd' });
    const s = memory({ 'kiroween.guest.runs.v1': JSON.stringify([run('a', 'won'), run('b', 'restarted'), run('a', 'won'), { legendId: 3 }]) });
    expect(brokenWorldsOf(s)).toEqual(['a']);
  });
  it('guest hall: tutorial done exactly when a receipt is stored', () => {
    expect(guestHallState(memory()).tutorialDone).toBe(false);
    expect(guestHallState(memory({ [TUTORIAL_RECEIPT_KEY]: tok('r') })).tutorialDone).toBe(true);
  });
});

describe('views and reducers', () => {
  it('rebuilds Hint 2 links from the view after a reload', () => {
    const v = view({
      slots: [
        { slotId: 's1', index: 0, type: 'date' as never, final: false, state: 'open', hint2: { anchor: 'banshee--ch-2' } },
        { slotId: 's2', index: 1, type: 'date' as never, final: false, state: 'open' },
        { slotId: 's3', index: 2, type: 'date' as never, final: false, state: 'open', hint2: { anchor: 'bad anchor' } },
      ],
    });
    expect(hint2Links(v, 'http://localhost:3001/')).toEqual([{ slotId: 's1', href: 'http://localhost:3001/legends/banshee#banshee--ch-2' }]);
    expect(hint2Links(v, '')[0]!.href).toBe('/legends/banshee#banshee--ch-2');
  });
  it('shows the Seed only once the run has ended', () => {
    expect(ledgerSeed(view())).toBeNull();
    expect(ledgerSeed(view({ status: 'won', ended: won }))).toBe('seed-1');
  });
  it('flags a restart, keeps the last end, and clears the flag on dismiss or the next action', () => {
    const restarted: EndInfo = { ...won, status: 'restarted' };
    let s = worldReducer(initialWorldState, { kind: 'response', response: resp({ ended: restarted }) });
    expect(s.restartNotice).toBe(true);
    expect(s.ended).toEqual(restarted);
    expect(worldReducer(s, { kind: 'dismiss-restart' }).restartNotice).toBe(false);
    s = worldReducer(s, { kind: 'response', response: resp() });
    expect(s.restartNotice).toBe(false);
    expect(s.ended).toEqual(restarted);
  });
  it('tutorial stays solved once solved', () => {
    const solved = { view: { fear: 0, hint1: { text: '', highlight: [] }, solved: true }, reply: null };
    const unsolved = { view: { ...solved.view, solved: false }, reply: null };
    expect(tutorialReducer(initialTutorialState, solved).solved).toBe(true);
    expect(tutorialReducer(tutorialReducer(initialTutorialState, solved), unsolved).solved).toBe(true);
  });
});

describe('client', () => {
  it('guest: sends the stored token and keeps the new one', async () => {
    const s = memory({ [playTokenKey('banshee')]: tok('o') });
    const api = fakeApi();
    await createPlayClient(api, s).start('banshee');
    expect(api.calls[0]).toEqual({ legendId: 'banshee', token: tok('o') });
    expect(s.data[playTokenKey('banshee')]).toBe(tok('a'));
  });
  it('guest: a won run removes the token and records the win from the server result', async () => {
    const s = memory({ [playTokenKey('banshee')]: tok('o') });
    const api = fakeApi({ worldAct: (a) => (void 0, Promise.resolve(resp({ token: null, ended: won, view: view({ status: 'won', ended: won }) }))) });
    await createPlayClient(api, s).act('banshee', { kind: 'tap', hotspotId: 'h' });
    expect(s.data[playTokenKey('banshee')]).toBeUndefined();
    expect(brokenWorldsOf(s)).toEqual(['banshee']);
    expect(JSON.parse(s.data['kiroween.guest.runs.v1']!)[0].score).toBe(900);
  });
  it('guest: a restart is not recorded as a broken world', async () => {
    const s = memory();
    const api = fakeApi({ worldAct: () => Promise.resolve(resp({ ended: { ...won, status: 'restarted' } })) });
    await createPlayClient(api, s).act('banshee', { kind: 'tap', hotspotId: 'h' });
    expect(brokenWorldsOf(s)).toEqual([]);
  });
  it('clears a refused token and starts again without it', async () => {
    const s = memory({ [playTokenKey('banshee')]: tok('o') });
    let n = 0;
    const api = fakeApi({ startWorld: (a) => (n++ === 0 ? Promise.reject(sessionError()) : Promise.resolve(resp())) });
    await createPlayClient(api, s).start('banshee');
    expect(n).toBe(2);
    expect(s.data[playTokenKey('banshee')]).toBe(tok('a'));
  });
  it('does not retry other errors, and keeps the token', async () => {
    const s = memory({ [playTokenKey('banshee')]: tok('o') });
    const api = fakeApi({ startWorld: () => Promise.reject(new Error(PLAY_ERROR_MESSAGES.unavailable)) });
    await expect(createPlayClient(api, s).start('banshee')).rejects.toThrow();
    expect(s.data[playTokenKey('banshee')]).toBe(tok('o'));
  });
  it('signed in: sends a null token and stores nothing', async () => {
    const api = fakeApi();
    await createPlayClient(api, null).start('banshee');
    expect(api.calls[0]).toEqual({ legendId: 'banshee', token: null });
  });
  it('signed in: the tutorial sends the token the start returned, and each action the token the last reply returned', async () => {
    const api = fakeApi({ tutorialAct: (a: { data: unknown }) => (api.calls.push(a.data), Promise.resolve({ view: { fear: 0, hint1: { text: 'x', highlight: [] }, solved: false }, reply: null, token: tok('v') } as TutorialResponse)) });
    const c = createPlayClient(api, null);
    await c.startTutorial();
    await c.actTutorial({ kind: 'drawer' });
    await c.actTutorial({ kind: 'answer', value: '1' });
    expect(api.calls).toEqual([{ token: null }, { token: tok('t'), action: { kind: 'drawer' } }, { token: tok('v'), action: { kind: 'answer', value: '1' } }]);
  });
  it('signed in: a page that starts the tutorial twice (dev double effect) still acts with a valid token', async () => {
    const api = fakeApi();
    const c = createPlayClient(api, null);
    await Promise.all([c.startTutorial(), c.startTutorial()]);
    await c.actTutorial({ kind: 'answer', value: '1' });
    expect(api.calls).toEqual([{ token: null }, { token: tok('t') }, { token: tok('t'), action: { kind: 'answer', value: '1' } }]);
  });
  it('tutorial: stores the receipt, then redeems it once and drops it', async () => {
    const s = memory();
    const api = fakeApi();
    const guest = createPlayClient(api, s);
    await guest.startTutorial();
    await guest.actTutorial({ kind: 'answer', value: '1' });
    expect(s.data[TUTORIAL_RECEIPT_KEY]).toBe(tok('r'));
    expect(await guest.redeemStoredReceipt()).toBe(true);
    expect(s.data[TUTORIAL_RECEIPT_KEY]).toBeUndefined();
    const before = api.calls.length;
    expect(await guest.redeemStoredReceipt()).toBe(false);
    expect(api.calls.length).toBe(before);
  });
  it('receipt: kept on a network failure, dropped when the server refuses it', async () => {
    const s = memory({ [TUTORIAL_RECEIPT_KEY]: tok('r') });
    await createPlayClient(fakeApi({ redeemTutorialReceipt: () => Promise.reject(new Error('network')) }), s).redeemStoredReceipt();
    expect(s.data[TUTORIAL_RECEIPT_KEY]).toBe(tok('r'));
    await createPlayClient(fakeApi({ redeemTutorialReceipt: () => Promise.reject(sessionError()) }), s).redeemStoredReceipt();
    expect(s.data[TUTORIAL_RECEIPT_KEY]).toBeUndefined();
  });
});

describe('one play action in flight at a time', () => {
  const tap = (n: number) => ({ kind: 'tap', hotspotId: `h${n}` }) as const;
  /** A fake server that answers after a delay and issues the next token in the chain a, b, c, ... */
  function slowApi() {
    const seen: { token: string | null; at: 'start' | 'end' }[] = [];
    let inFlight = 0;
    let maxInFlight = 0;
    let issued = 0;
    const api = fakeApi({
      worldAct: async (a) => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        seen.push({ token: (a.data as { token: string | null }).token, at: 'start' });
        await new Promise((r) => setTimeout(r, 15));
        inFlight--;
        issued++;
        return resp({ token: tok(String.fromCharCode(96 + issued)), view: view({ fear: issued }) });
      },
    });
    return { api, seen, max: () => maxInFlight };
  }

  it('chains overlapping calls: the second uses the token returned by the first, so no progress is lost', async () => {
    const s = memory({ [playTokenKey('banshee')]: tok('o') });
    const { api, seen, max } = slowApi();
    const c = createPlayClient(api, s);
    const [r1, r2, r3] = await Promise.all([c.act('banshee', tap(1)), c.act('banshee', tap(2)), c.act('banshee', tap(3))]);
    expect(max()).toBe(1);
    expect(seen.map((x) => x.token)).toEqual([tok('o'), tok('a'), tok('b')]);
    expect([r1.view.fear, r2.view.fear, r3.view.fear]).toEqual([1, 2, 3]);
    expect(s.data[playTokenKey('banshee')]).toBe(tok('c'));
  });

  it('a failed call does not block or drop the ones queued behind it', async () => {
    const s = memory({ [playTokenKey('banshee')]: tok('o') });
    let n = 0;
    const api = fakeApi({ worldAct: () => (n++ === 0 ? Promise.reject(new Error(PLAY_ERROR_MESSAGES.unavailable)) : Promise.resolve(resp({ token: tok('z') }))) });
    const c = createPlayClient(api, s);
    const first = c.act('banshee', tap(1));
    const second = c.act('banshee', tap(2));
    await expect(first).rejects.toThrow();
    await expect(second).resolves.toBeTruthy();
    expect(n).toBe(2);
    expect(s.data[playTokenKey('banshee')]).toBe(tok('z'));
  });

  it('signed in: a 409 reloads the stored run, then applies the action once on top of it', async () => {
    const order: string[] = [];
    let acts = 0;
    const api = fakeApi({
      worldAct: () => {
        order.push('act');
        return acts++ === 0 ? Promise.reject(new Error(PLAY_ERROR_MESSAGES.conflict)) : Promise.resolve(resp({ view: view({ fear: 7 }) }));
      },
      startWorld: () => (order.push('reload'), Promise.resolve(resp())),
    });
    const r = await createPlayClient(api, null).act('banshee', tap(1));
    expect(order).toEqual(['act', 'reload', 'act']);
    expect(r.view.fear).toBe(7);
  });

  it('signed in: a second 409 is reported, not retried again, and the queue keeps going', async () => {
    let acts = 0;
    const api = fakeApi({ worldAct: () => (acts++ < 2 ? Promise.reject(new Error(PLAY_ERROR_MESSAGES.conflict)) : Promise.resolve(resp())) });
    const c = createPlayClient(api, null);
    const a = c.act('banshee', tap(1));
    const b = c.act('banshee', tap(2));
    await expect(a).rejects.toThrow(PLAY_ERROR_MESSAGES.conflict);
    await expect(b).resolves.toBeTruthy();
    expect(acts).toBe(3);
  });

  it('does not treat the 409 "run has ended" as a conflict', async () => {
    let acts = 0;
    const api = fakeApi({ worldAct: () => (acts++, Promise.reject(new Error(PLAY_ERROR_MESSAGES.ended))) });
    await expect(createPlayClient(api, null).act('banshee', tap(1))).rejects.toThrow(PLAY_ERROR_MESSAGES.ended);
    expect(acts).toBe(1);
  });
});
