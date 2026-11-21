import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import type { Visitor } from '../src/access/canEnter.ts';
import { parseKeepersNote } from '../src/keepers/parse.ts';
import { PlayError, PLAY_ERROR_MESSAGES } from '../src/play/errors.ts';
import { FEAR } from '../src/play/fear.ts';
import { actInTutorial, redeemTutorialReceipt, startTutorial, type TutorialDeps } from '../src/play/service.ts';
import { createMemoryPlayStore } from '../src/play/store.ts';
import { createTokenCodec, RECEIPT_TOKEN_TTL_SECONDS, TUTORIAL_LEGEND_ID } from '../src/play/token.ts';
import {
  createTutorialReceipt,
  initTutorialState,
  isTutorialAnswer,
  pickTutorialDetail,
  TUTORIAL_ANCHOR,
  TUTORIAL_DETAIL_IDS,
  TUTORIAL_HINT1,
  tutorialStep,
  tutorialView,
  type TutorialDetail,
  type TutorialDetailId,
} from '../src/play/tutorial.ts';

vi.setConfig({ testTimeout: 900_000 });

// The details come from the real content file (read-only), exactly as the importer would store them.
const noteText = readFileSync(new URL('../../content/keepers-note.md', import.meta.url), 'utf8');
const parsed = parseKeepersNote(noteText);
if (!parsed.ok) throw new Error('content/keepers-note.md does not parse');
const details: TutorialDetail[] = parsed.details.map((d) => ({
  detailId: d.detailId,
  question: d.question,
  answer: d.answer,
  alsoAccept: d.alsoAccept,
}));
const byId = (id: string): TutorialDetail => details.find((d) => d.detailId === id)!;

const seedArb = fc.stringMatching(/^[a-z0-9]{6,16}$/).map((s) => `tut-${s}`);
const detailIdArb = fc.constantFrom(...TUTORIAL_DETAIL_IDS);
const user: Visitor = { kind: 'user', id: 'alice', name: 'Alice' };
const guest: Visitor = { kind: 'guest' };

/** Random letter case for every character. */
const recase = (text: string, flips: boolean[]): string =>
  [...text].map((c, i) => (flips[i % Math.max(1, flips.length)] ? c.toUpperCase() : c.toLowerCase())).join('');
const spaceArb = fc.stringMatching(/^[ \t\n]{0,4}$/);

function setup(seed: string) {
  let now = 1_700_000_000_000;
  const tokens = createTokenCodec({ key: randomBytes(32), now: () => now });
  const inner = createMemoryPlayStore();
  const markTutorialDone = vi.fn((id: string) => inner.markTutorialDone(id));
  const deps: TutorialDeps = {
    store: { markTutorialDone },
    tokens,
    newSeed: () => seed,
    loadTutorialDetails: async () => details,
  };
  return { deps, tokens, inner, markTutorialDone, advance: (seconds: number) => (now += seconds * 1000) };
}

describe('the real content rows', () => {
  it('has the three details with the answers in the content file', () => {
    expect(details.map((d) => [d.detailId, d.answer, d.alsoAccept])).toEqual([
      ['d-year', '1887', []],
      ['d-keys', '11', ['eleven']],
      ['d-rooms', '14', ['fourteen']],
    ]);
  });
});

describe('Property 16: Tutorial detail pick is deterministic and covers all three', () => {
  it('picks the same detail on every call, and the drawer shows its question and no answer', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const first = pickTutorialDetail(seed);
        expect(pickTutorialDetail(seed)).toBe(first);
        expect(TUTORIAL_DETAIL_IDS).toContain(first);
        const state = initTutorialState(seed);
        expect(state.detailId).toBe(first);
        const { reply, state: after } = tutorialStep(state, details, { kind: 'drawer' });
        const d = byId(first);
        expect(reply).toEqual({ kind: 'drawer', question: d.question });
        expect(after).toEqual(state);
        const shown = (JSON.stringify(reply) + JSON.stringify(tutorialView(state))).toLowerCase();
        for (const secret of [d.answer, ...d.alsoAccept]) expect(shown).not.toContain(secret.toLowerCase());
        expect(shown).not.toContain(first);
      }),
      { numRuns: 100 },
    );
  });

  it('shows all three details over 60 seeds', () => {
    const seen = new Set<TutorialDetailId>();
    for (let i = 0; i < 60; i += 1) seen.add(pickTutorialDetail(`cover-${i}`));
    expect([...seen].sort()).toEqual([...TUTORIAL_DETAIL_IDS].sort());
  });
});

describe('Property 17: Tutorial answers', () => {
  const acceptedArb = detailIdArb.chain((id) => {
    const d = byId(id);
    return fc.record({
      id: fc.constant(id),
      value: fc.constantFrom(d.answer, ...d.alsoAccept),
      flips: fc.array(fc.boolean(), { minLength: 1, maxLength: 12 }),
      before: spaceArb,
      after: spaceArb,
    });
  });

  it('accepts the answer or an "Also accept" form with any whitespace and any case', () => {
    fc.assert(
      fc.property(acceptedArb, seedArb, ({ id, value, flips, before, after }, seed) => {
        const typed = before + recase(value, flips) + after;
        expect(isTutorialAnswer(byId(id), typed)).toBe(true);
        const state = { ...initTutorialState(seed), detailId: id };
        const r = tutorialStep(state, details, { kind: 'answer', value: typed });
        expect(r.reply).toEqual({ kind: 'answer', correct: true });
        expect(r.state).toEqual({ ...state, solved: true });
      }),
      { numRuns: 200 },
    );
  });

  it('accepts the digit form and the "Also accept" form for each detail (examples)', () => {
    expect(isTutorialAnswer(byId('d-year'), '1887')).toBe(true);
    expect(isTutorialAnswer(byId('d-keys'), '11')).toBe(true);
    expect(isTutorialAnswer(byId('d-keys'), 'Eleven')).toBe(true);
    expect(isTutorialAnswer(byId('d-rooms'), '14')).toBe(true);
    expect(isTutorialAnswer(byId('d-rooms'), ' FOURTEEN ')).toBe(true);
  });

  it('every detail can be the code: some seed picks it and its answer solves it', () => {
    for (const id of TUTORIAL_DETAIL_IDS) {
      const seed = Array.from({ length: 200 }, (_, i) => `any-${i}`).find((s) => pickTutorialDetail(s) === id);
      expect(seed).toBeDefined();
      const state = initTutorialState(seed!);
      const r = tutorialStep(state, details, { kind: 'answer', value: byId(id).answer });
      expect(r.state.solved).toBe(true);
    }
  });

  const accepted = (d: TutorialDetail, s: string) => [d.answer, ...d.alsoAccept].some((a) => a.toLowerCase() === s.trim().toLowerCase());
  const otherArb = fc.oneof(
    fc.string({ maxLength: 20 }),
    fc.constantFrom('1888', '1877', '12', '10', '13', '15', 'twelve', 'ten', 'thirteen', '', '  ', '11 11', '1,887', '0'),
    fc.constantFrom(...details.flatMap((d) => [d.answer, ...d.alsoAccept])).map((s) => s + 'x'),
  );

  it('refuses any other string with no state change, no fear and no solve', () => {
    fc.assert(
      fc.property(detailIdArb, otherArb, seedArb, (id, value, seed) => {
        fc.pre(!accepted(byId(id), value));
        const base = { ...initTutorialState(seed), detailId: id };
        for (const state of [base, { ...base, fear: FEAR.tutorialHint2, hint2Used: true }]) {
          const r = tutorialStep(state, details, { kind: 'answer', value });
          expect(r.reply).toEqual({ kind: 'answer', correct: false });
          expect(r.state).toEqual(state);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('through the service a wrong answer leaves the view unchanged and a right one solves it', async () => {
    await fc.assert(
      fc.asyncProperty(seedArb, otherArb, async (seed, value) => {
        const { deps } = setup(seed);
        const id = pickTutorialDetail(seed);
        // Blank or over-long values are refused earlier by the input schema (covered by Property 20).
        fc.pre(!accepted(byId(id), value) && value.trim().length >= 1 && value.trim().length <= 40);
        const start = await startTutorial(deps, guest, { token: null });
        const wrong = await actInTutorial(deps, guest, { token: start.token, action: { kind: 'answer', value } });
        expect(wrong.view).toEqual(start.view);
        expect(wrong.view.fear).toBe(0);
        expect(wrong.receipt).toBeUndefined();
        const right = await actInTutorial(deps, guest, { token: wrong.token, action: { kind: 'answer', value: byId(id).answer } });
        expect(right.view.solved).toBe(true);
      }),
      { numRuns: 40 },
    );
  });
});

describe('Property 18: Tutorial Hint 2 costs fear once', () => {
  it('fear equals the tutorial Hint 2 cost after any number of uses, and the anchor is the note chapter', () => {
    fc.assert(
      fc.property(seedArb, fc.integer({ min: 1, max: 12 }), (seed, uses) => {
        let state = initTutorialState(seed);
        // Before Hint 2 is used the view carries no anchor at all.
        expect('hint2' in tutorialView(state)).toBe(false);
        expect(JSON.stringify(tutorialView(state))).not.toContain(TUTORIAL_ANCHOR);
        for (let i = 0; i < uses; i += 1) {
          const r = tutorialStep(state, details, { kind: 'hint2' });
          expect(r.reply).toEqual({ kind: 'hint2', anchor: 'keepers-note--ch-1', charged: i === 0 });
          state = r.state;
          expect(state.fear).toBe(FEAR.tutorialHint2);
        }
        expect(TUTORIAL_ANCHOR).toBe('keepers-note--ch-1');
        expect(tutorialView(state).hint2).toEqual({ anchor: 'keepers-note--ch-1' });
      }),
      { numRuns: 100 },
    );
  });
});

describe('Hint 1 text', () => {
  it('equals the text in content/hub-and-tutorial.md', () => {
    const hub = readFileSync(new URL('../../content/hub-and-tutorial.md', import.meta.url), 'utf8');
    expect(hub).toContain(`"${TUTORIAL_HINT1.text}"`);
    for (const h of TUTORIAL_HINT1.highlight) expect(hub).toContain(h);
  });
});

describe('Property 21: The tutorial receipt is redeemed once and cannot be forged', () => {
  async function solvedReceipt(seed: string) {
    const s = setup(seed);
    const start = await startTutorial(s.deps, guest, { token: null });
    const r = await actInTutorial(s.deps, guest, {
      token: start.token,
      action: { kind: 'answer', value: byId(pickTutorialDetail(seed)).answer },
    });
    expect(r.receipt).toBeDefined();
    return { ...s, receipt: r.receipt! };
  }

  const refusedSession = async (p: Promise<unknown>) => {
    const e = await p.then(
      () => null,
      (err: unknown) => err,
    );
    expect(e).toBeInstanceOf(PlayError);
    expect((e as PlayError).code).toBe('session');
    expect((e as PlayError).message).toBe(PLAY_ERROR_MESSAGES.session);
  };

  it('redeeming any number of times stores done once for that user and nobody else', async () => {
    await fc.assert(
      fc.asyncProperty(seedArb, fc.stringMatching(/^[a-z]{3,8}$/), fc.integer({ min: 1, max: 5 }), async (seed, name, times) => {
        const { deps, receipt, inner } = await solvedReceipt(seed);
        const v: Visitor = { kind: 'user', id: `u-${name}`, name };
        expect(await inner.tutorialDone(v.id)).toBe(false);
        for (let i = 0; i < times; i += 1) expect(await redeemTutorialReceipt(deps, v, { receipt })).toEqual({ done: true });
        expect(await inner.tutorialDone(v.id)).toBe(true);
        expect(await inner.tutorialDone('someone-else')).toBe(false);
      }),
      { numRuns: 30 },
    );
  });

  it('a guest cannot redeem', async () => {
    const { deps, receipt, markTutorialDone } = await solvedReceipt('guest-redeem');
    await expect(redeemTutorialReceipt(deps, guest, { receipt })).rejects.toMatchObject({ code: 'sign-in-required' });
    expect(markTutorialDone).not.toHaveBeenCalled();
  });

  it('a signed-in player who solves it is stored done and gets no receipt', async () => {
    const s = setup('user-solve');
    const start = await startTutorial(s.deps, user, { token: null });
    const r = await actInTutorial(s.deps, user, {
      token: start.token,
      action: { kind: 'answer', value: byId(pickTutorialDetail('user-solve')).answer },
    });
    expect(r.receipt).toBeUndefined();
    expect(await s.inner.tutorialDone(user.id)).toBe(true);
  });

  it('only a solved tutorial can produce a receipt', () => {
    const { tokens } = setup('x');
    expect(() => createTutorialReceipt(tokens, initTutorialState('unsolved'))).toThrow(PlayError);
  });

  it('refuses a receipt altered by one character, with the fixed message and no write', async () => {
    await fc.assert(
      fc.asyncProperty(seedArb, fc.nat(), fc.integer({ min: 1, max: 60 }), async (seed, at, shift) => {
        const { deps, receipt, markTutorialDone } = await solvedReceipt(seed);
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
        const body = receipt.slice(3);
        // Stay inside the first half so the change cannot fall on unused trailing bits of the last base64 character.
        const i = at % Math.floor(body.length / 2);
        const other = alphabet[(alphabet.indexOf(body[i]!) + shift) % alphabet.length]!;
        expect(other).not.toBe(body[i]);
        const forged = 'v1.' + body.slice(0, i) + other + body.slice(i + 1);
        await refusedSession(redeemTutorialReceipt(deps, user, { receipt: forged }));
        expect(markTutorialDone).not.toHaveBeenCalled();
      }),
      { numRuns: 40 },
    );
  });

  it('refuses an expired receipt and accepts it just before it expires', async () => {
    const { deps, receipt, markTutorialDone, advance } = await solvedReceipt('expiry-seed');
    advance(RECEIPT_TOKEN_TTL_SECONDS - 5);
    await expect(redeemTutorialReceipt(deps, user, { receipt })).resolves.toEqual({ done: true });
    markTutorialDone.mockClear();
    advance(10);
    await refusedSession(redeemTutorialReceipt(deps, user, { receipt }));
    expect(markTutorialDone).not.toHaveBeenCalled();
  });

  it('refuses a token of another kind, or a receipt with a different payload, and writes nothing', async () => {
    const { deps, tokens, markTutorialDone } = await solvedReceipt('kinds');
    const payload = { legendId: TUTORIAL_LEGEND_ID, seed: 'tutorial-done', state: { done: true } };
    for (const kind of ['play', 'tutorial'] as const) {
      await refusedSession(redeemTutorialReceipt(deps, user, { receipt: tokens.encode(kind, payload) }));
    }
    const wrongSeed = tokens.encode('receipt', { ...payload, seed: 'something-else' });
    await refusedSession(redeemTutorialReceipt(deps, user, { receipt: wrongSeed }));
    const wrongState = tokens.encode('receipt', { ...payload, state: { done: false } });
    await refusedSession(redeemTutorialReceipt(deps, user, { receipt: wrongState }));
    const wrongLegend = tokens.encode('receipt', { ...payload, legendId: 'some-legend' });
    await refusedSession(redeemTutorialReceipt(deps, user, { receipt: wrongLegend }));
    expect(markTutorialDone).not.toHaveBeenCalled();
  });

  it('refuses a receipt made with another key', async () => {
    const { deps, markTutorialDone } = await solvedReceipt('other-key');
    const other = createTokenCodec({ key: randomBytes(32), now: () => 1_700_000_000_000 });
    const solved = { ...initTutorialState('other-key'), solved: true };
    await refusedSession(redeemTutorialReceipt(deps, user, { receipt: createTutorialReceipt(other, solved) }));
    expect(markTutorialDone).not.toHaveBeenCalled();
  });
});
