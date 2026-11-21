import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Visitor } from '../src/access/canEnter.ts';
import { generate, type Run } from '../src/index.ts';
import { finalSlot, rawId } from '../src/play/engine.ts';
import { PlayError } from '../src/play/errors.ts';
import { actInWorld, startWorld, type PlayResponse } from '../src/play/service.ts';
import type { Action, LeadView } from '../src/play/types.ts';
import { playableLegends, playSetup, winningActions } from './helpers/play.ts';

const alice: Visitor = { kind: 'user', id: 'alice', name: 'Alice' };
const guest: Visitor = { kind: 'guest' };
const FORBIDDEN_KEYS = ['correctIndex', 'role', 'swaps', 'trueVersionId', 'trueLead', 'seed'];

/** Every object key in a JSON value, at any depth. Pass `skip` to leave out a key that is allowed to carry data. */
function keysOf(value: unknown, skip: string[] = []): string[] {
  if (Array.isArray(value)) return value.flatMap((v) => keysOf(v, skip));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => (skip.includes(k) ? [] : [k, ...keysOf(v, skip)]));
  }
  return [];
}

/**
 * Property 3 checks on one real response while the Run is in progress.
 * `used` holds the slots whose Hint 2 this player has used; every other slot's anchor must stay out of the payload,
 * unless the same anchor was legitimately handed out by a dead-end lead the player followed.
 */
function assertNoSecrets(res: PlayResponse, run: Run, used: Set<string>): void {
  const live = !res.ended; // after a restart the old Run's summary (with its Seed) rides along by design
  expect(res.view.status).toBe('in_progress');
  expect(live || res.view.ended === undefined).toBe(true);
  const text = JSON.stringify(res);
  expect(keysOf(res, ['ended']).filter((k) => FORBIDDEN_KEYS.includes(k))).toEqual([]);
  if (live) expect(text).not.toContain(run.seed);
  const granted = new Set(res.view.leads.flatMap((l) => (l.followed?.kind === 'dead' ? l.followed.anchors : [])));
  if (res.reply?.kind === 'follow') for (const a of res.reply.anchors) granted.add(a);
  for (const slot of run.slots) {
    const sid = rawId(run.legendId, slot.slotId);
    const sv = res.view.slots.find((s) => s.slotId === sid)!;
    if (used.has(sid)) expect(sv.hint2).toEqual({ anchor: slot.hint2.anchor });
    else {
      expect(sv.hint2).toBeUndefined();
      if (!granted.has(slot.hint2.anchor) && !run.slots.some((o) => used.has(rawId(run.legendId, o.slotId)) && o.hint2.anchor === slot.hint2.anchor)) {
        expect(text).not.toContain(JSON.stringify(slot.hint2.anchor));
      }
    }
    if (sv.options) {
      expect(sv.options).toEqual(slot.options); // exactly the four texts, generator order
      expect(sv.options).toHaveLength(4);
      expect(sv.options.every((o) => typeof o === 'string')).toBe(true);
    }
    expect(Object.keys(sv).every((k) => ['slotId', 'index', 'type', 'final', 'state', 'question', 'options', 'tried', 'hint1', 'hint2'].includes(k))).toBe(true);
  }
  // Lead views carry the same field names for the true lead and for a dead end (before they are followed).
  const shape = (l: LeadView) => Object.keys(l).filter((k) => k !== 'followed').sort().join();
  expect(new Set(res.view.leads.map(shape)).size).toBeLessThanOrEqual(1);
  const trueRaw = rawId(run.legendId, run.trueLead.id);
  for (const l of res.view.leads) {
    expect(Object.keys(l).every((k) => ['leadId', 'start', 'total', 'steps', 'canFollow', 'followed'].includes(k))).toBe(true);
    if (l.leadId === trueRaw && !l.followed) expect(Object.keys(l).sort()).toEqual(['canFollow', 'leadId', 'start', 'steps', 'total']);
  }
}

/** A random player move, chosen by index from what exists in the Run. */
function toAction(run: Run, pick: { kind: number; a: number; b: number }): Action {
  const id = run.legendId;
  const leads = [run.trueLead, ...run.deadEnds];
  switch (pick.kind % 5) {
    case 0:
      return { kind: 'tap', hotspotId: rawId(id, run.hotspots[pick.a % run.hotspots.length]!.id) };
    case 1:
      return { kind: 'hint1', slotId: rawId(id, run.slots[pick.a % run.slots.length]!.slotId) };
    case 2:
      return { kind: 'hint2', slotId: rawId(id, run.slots[pick.a % run.slots.length]!.slotId) };
    case 3:
      return { kind: 'answer', slotId: rawId(id, run.slots[pick.a % run.slots.length]!.slotId), option: (pick.b % 4) as 0 };
    default:
      return { kind: 'follow', leadId: rawId(id, leads[pick.a % leads.length]!.id) };
  }
}

const seedArb = fc.stringMatching(/^[a-z0-9]{6,12}$/).map((s) => `secrecy-${s}`);
const pickArb = fc.record({ kind: fc.nat(4), a: fc.nat(50), b: fc.nat(3) });
// Taps come first so slots and leads open; the rest is random.
const sequenceArb = fc.tuple(fc.array(fc.nat(50), { maxLength: 30 }), fc.array(pickArb, { maxLength: 25 }));

describe('Property 3: Responses never carry secrets before they are earned', () => {
  it('holds for a fresh Run and after every action, for signed-in players and guests', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...playableLegends), seedArb, fc.boolean(), sequenceArb, async (legend, seed, isGuest, [taps, picks]) => {
        const { deps } = playSetup(legend.id, [seed]);
        const visitor = isGuest ? guest : alice;
        const run = generate(legend, seed);
        const used = new Set<string>();
        const first = await startWorld(deps, visitor, { legendId: legend.id, token: null });
        assertNoSecrets(first, run, used);
        let token = first.token;
        const moves: Action[] = [...taps.map((a) => toAction(run, { kind: 0, a, b: 0 })), ...picks.map((p) => toAction(run, p))];
        for (const action of moves) {
          let res: PlayResponse;
          try {
            res = await actInWorld(deps, visitor, { legendId: legend.id, token, action });
          } catch (e) {
            if (e instanceof PlayError) continue; // a refused move returns no payload
            throw e;
          }
          if (res.ended || res.view.status !== 'in_progress') break; // a new Run (new Seed) or a win starts here; both are checked below
          token = res.token;
          if (action.kind === 'hint2' && res.reply?.kind === 'hint2') used.add(action.slotId);
          assertNoSecrets(res, run, used);
        }
      }),
      { numRuns: 60 },
    );
  }, 120_000);

  it('a won Run may show its Seed; the script that wins every slot never leaks before the end', async () => {
    const legend = playableLegends[0]!;
    const { deps } = playSetup(legend.id, ['secrecy-win']);
    const run = generate(legend, 'secrecy-win');
    await startWorld(deps, alice, { legendId: legend.id, token: null });
    const used = new Set<string>();
    const script = winningActions(run);
    for (const [i, action] of script.entries()) {
      const res = await actInWorld(deps, alice, { legendId: legend.id, token: null, action });
      if (i < script.length - 1) assertNoSecrets(res, run, used);
      else expect(res.view.status).toBe('won');
    }
  });
});

describe('Property 4: The correct option position is not fixed', () => {
  const SEEDS = Array.from({ length: 30 }, (_, i) => `pos-${i}`);

  for (const legend of playableLegends) {
    it(`${legend.id}: every slot's correct option lands in at least two positions over ${SEEDS.length} seeds`, async () => {
      const positions = new Map<string, Set<number>>();
      for (const seed of SEEDS) {
        const { deps } = playSetup(legend.id, [seed]);
        const run = generate(legend, seed);
        await startWorld(deps, alice, { legendId: legend.id, token: null });
        const act = (action: Action) => actInWorld(deps, alice, { legendId: legend.id, token: null, action });
        let res: PlayResponse | null = null;
        for (const h of run.hotspots) res = await act({ kind: 'tap', hotspotId: rawId(run.legendId, h.id) });
        const fin = finalSlot(run);
        for (const slot of [...run.slots.filter((s) => s !== fin), fin]) {
          const sid = rawId(run.legendId, slot.slotId);
          const served = res!.view.slots.find((s) => s.slotId === sid)!.options;
          expect(served, `${slot.slotId} should be open in ${seed}`).toBeDefined();
          const at = served!.indexOf(slot.options[slot.correctIndex]!);
          expect(at).toBeGreaterThanOrEqual(0);
          (positions.get(slot.slotId) ?? positions.set(slot.slotId, new Set()).get(slot.slotId)!).add(at);
          res = await act({ kind: 'answer', slotId: sid, option: at as 0 });
        }
      }
      for (const [slotId, set] of positions) expect(set.size, `${legend.id} ${slotId}`).toBeGreaterThanOrEqual(2);
    }, 60_000);
  }
});
