import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import type { Visitor } from '../src/access/canEnter.ts';
import { generate } from '../src/index.ts';
import { rawId } from '../src/play/engine.ts';
import { PLAY_ERROR_MESSAGES, PlayError } from '../src/play/errors.ts';
import { actInWorld, startWorld } from '../src/play/service.ts';
import type { PlayStore } from '../src/play/store.ts';
import { playableLegends, playSetup } from './helpers/play.ts';

vi.setConfig({ testTimeout: 900_000 });
const guest: Visitor = { kind: 'guest' };
const seedArb = fc.stringMatching(/^[a-z0-9]{6,12}$/).map((s) => `own-${s}`);
const legendArb = fc.constantFrom(...playableLegends);
const userIdArb = fc.stringMatching(/^[a-z]{3,8}$/);
const asUser = (id: string): Visitor => ({ kind: 'user', id, name: id });
const FIXED = new Set(Object.values(PLAY_ERROR_MESSAGES));

async function outcome(p: Promise<unknown>): Promise<PlayError | null> {
  try {
    await p;
    return null;
  } catch (e) {
    if (e instanceof PlayError) return e;
    throw e;
  }
}

/** Counts every call to the store, so a test can show a guest never reaches it. */
function spyOn(store: PlayStore): { store: PlayStore; calls: () => number } {
  let n = 0;
  const wrapped = Object.fromEntries(
    (Object.keys(store) as (keyof PlayStore)[]).map((k) => [
      k,
      (...args: unknown[]) => {
        n += 1;
        return (store[k] as (...a: unknown[]) => unknown)(...args);
      },
    ]),
  ) as unknown as PlayStore;
  return { store: wrapped, calls: () => n };
}

describe('Property 19: Players cannot touch each other\'s Runs, and guests cannot enter other worlds', () => {
  it('another user sees no Run, cannot change it, and starting their own leaves it untouched', async () => {
    await fc.assert(
      fc.asyncProperty(legendArb, seedArb, userIdArb, userIdArb, async (legend, seed, a, b) => {
        fc.pre(a !== b);
        const { deps, store } = playSetup(legend.id, [seed, `${seed}-b`]);
        await startWorld(deps, asUser(a), { legendId: legend.id, token: null });
        const run = generate(legend, seed);
        const tap = { kind: 'tap', hotspotId: rawId(legend.id, run.hotspots[0]!.id) } as const;
        const before = JSON.stringify(store.rows());

        // Every write by B, with no Run of their own, behaves as if A's Run does not exist.
        const err = await outcome(actInWorld(deps, asUser(b), { legendId: legend.id, token: null, action: tap }));
        expect(err?.code).toBe('not-found');
        expect(await store.current(b, legend.id)).toBeNull();
        expect(JSON.stringify(store.rows())).toBe(before);

        // B's own Run is a separate row; A's row is unchanged and B's actions do not move it.
        await startWorld(deps, asUser(b), { legendId: legend.id, token: null });
        const rowA = await store.current(a, legend.id);
        await outcome(actInWorld(deps, asUser(b), { legendId: legend.id, token: null, action: tap }));
        expect(await store.current(a, legend.id)).toEqual(rowA);
        expect(rowA!.id).not.toBe((await store.current(b, legend.id))!.id);

        // The store port itself honours the owner: B cannot save or end A's row.
        expect(await store.save(b, rowA!.id, rowA!.rev, JSON.parse('{}'))).toBe(false);
        expect(await store.end(b, rowA!.id, rowA!.rev, { status: 'won', slotsSolved: 0, hint2Uses: 0, wrongAnswers: 0, highestFear: 0, score: 0 })).toBeNull();
        expect(await store.current(a, legend.id)).toEqual(rowA);
      }),
      { numRuns: 25 },
    );
  });

  it('a guest at any other world is refused with the sign-in message, no World data, and no store call', async () => {
    expect(playableLegends.length).toBeGreaterThan(1);
    await fc.assert(
      fc.asyncProperty(legendArb, legendArb, async (guestWorld, other) => {
        fc.pre(guestWorld.id !== other.id);
        const { deps } = playSetup(guestWorld.id, ['own-seed']);
        const spy = spyOn(deps.store);
        const d = { ...deps, store: spy.store };
        const start = await outcome(startWorld(d, guest, { legendId: other.id, token: null }));
        const act = await outcome(
          actInWorld(d, guest, { legendId: other.id, token: null, action: { kind: 'hint1', slotId: 'a' } }),
        );
        for (const e of [start, act]) {
          expect(e?.code).toBe('sign-in-required');
          expect(e?.message).toBe(PLAY_ERROR_MESSAGES['sign-in-required']);
        }
        // The guest world itself works, still without touching the store.
        const ok = await startWorld(d, guest, { legendId: guestWorld.id, token: null });
        expect(ok.view).toBeDefined();
        expect(spy.calls()).toBe(0);
      }),
      { numRuns: 25 },
    );
  });
});

describe('Property 20: Input is validated or refused with a fixed message', () => {
  const marker = fc.stringMatching(/^[A-Za-z0-9]{9,30}$/).map((s) => `ZQ${s}`);
  const junk = fc.oneof(
    fc.constant(undefined),
    fc.constant(null),
    fc.integer(),
    fc.boolean(),
    fc.array(marker, { maxLength: 3 }),
    marker,
    marker.map((m) => ({ legendId: m, token: null })),
    marker.map((m) => ({ legendId: 'x', token: m, action: { kind: 'tap', hotspotId: m } })),
    marker.map((m) => ({ legendId: m, token: null, action: { kind: m } })),
  );

  it('any input either succeeds or throws a fixed PlayError that never echoes the input', async () => {
    await fc.assert(
      fc.asyncProperty(legendArb, junk, marker, async (legend, input, m) => {
        const { deps } = playSetup(legend.id, ['own-seed']);
        for (const visitor of [guest, asUser('alice')]) {
          for (const fn of [startWorld, actInWorld]) {
            const e = await outcome(fn(deps, visitor, input));
            if (e) {
              expect(FIXED.has(e.message)).toBe(true);
              expect(e.message).not.toContain(m);
            }
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('unknown keys, wrong types, oversize strings and ids not in the Run are refused with a fixed message', async () => {
    const legend = playableLegends[0]!;
    const { deps } = playSetup(legend.id, ['own-seed']);
    const alice = asUser('alice');
    await startWorld(deps, alice, { legendId: legend.id, token: null });
    const big = 'a'.repeat(5000);
    const bad: Array<[unknown, string]> = [
      [{ legendId: legend.id, token: null, userId: 'bob' }, 'invalid'],
      [{ legendId: legend.id, token: null, action: { kind: 'tap', hotspotId: 'h', score: 99 } }, 'invalid'],
      // An extra key on any action kind is refused, never stripped (a count or score must not ride along).
      [{ legendId: legend.id, token: null, action: { kind: 'answer', slotId: 's', option: 1, wrongAnswers: 0 } }, 'invalid'],
      [{ legendId: legend.id, token: null, action: { kind: 'hint1', slotId: 's', hint2Uses: 0 } }, 'invalid'],
      [{ legendId: legend.id, token: null, action: { kind: 'hint2', slotId: 's', fear: 0 } }, 'invalid'],
      [{ legendId: legend.id, token: null, action: { kind: 'follow', leadId: 'l', score: 99 } }, 'invalid'],
      [{ legendId: legend.id, token: null, action: { kind: 'answer', slotId: 's', option: 4 } }, 'invalid'],
      [{ legendId: legend.id, token: null, action: { kind: 'answer', slotId: 's', option: '1' } }, 'invalid'],
      [{ legendId: big, token: null, action: { kind: 'tap', hotspotId: 'h' } }, 'invalid'],
      [{ legendId: legend.id, token: big, action: { kind: 'tap', hotspotId: 'h' } }, 'invalid'],
      [{ legendId: legend.id, token: null, action: { kind: 'tap', hotspotId: big } }, 'invalid'],
      [{ legendId: legend.id, token: null, action: { kind: 'tap', hotspotId: 'not-in-this-run' } }, 'refused'],
      [{ legendId: legend.id, token: null, action: { kind: 'hint2', slotId: 'not-in-this-run' } }, 'refused'],
      [{ legendId: legend.id, token: null, action: { kind: 'follow', leadId: 'not-in-this-run' } }, 'refused'],
      [{ legendId: 'no-such-legend', token: null, action: { kind: 'tap', hotspotId: 'h' } }, 'not-found'],
    ];
    for (const [input, code] of bad) {
      const e = await outcome(actInWorld(deps, alice, input));
      expect(e?.code).toBe(code);
      expect(e?.message).toBe(PLAY_ERROR_MESSAGES[code as keyof typeof PLAY_ERROR_MESSAGES]);
      expect(e?.message).not.toContain('not-in-this-run');
      expect(e?.message).not.toContain('no-such-legend');
    }
  });

  it('a valid input is accepted', async () => {
    const legend = playableLegends[0]!;
    const { deps } = playSetup(legend.id, ['own-seed']);
    const r = await startWorld(deps, guest, { legendId: legend.id, token: null });
    expect(r.token).toMatch(/^v1\./);
  });
});

describe('Source tests', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });

  it('no Math.random anywhere under skeleton/src/play', () => {
    const files = walk(join(import.meta.dirname, '../src/play')).filter((f) => /\.tsx?$/.test(f));
    expect(files.length).toBeGreaterThan(5);
    const hits = files.filter((f) => /Math\s*\.\s*random/.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
});
