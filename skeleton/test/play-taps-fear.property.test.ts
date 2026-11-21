import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import type { Visitor } from '../src/access/canEnter.ts';
import { generate, type Legend } from '../src/index.ts';
import { rawId } from '../src/play/engine.ts';
import { HOTSPOT_FEAR, HOTSPOT_FEAR_NONE } from '../src/play/fearTable.ts';
import { actInWorld, startWorld, type PlayResponse } from '../src/play/service.ts';
import { allLegends } from './helpers/legends.ts';
import { playableLegends, playSetup } from './helpers/play.ts';

vi.setConfig({ testTimeout: 900_000 });
const alice: Visitor = { kind: 'user', id: 'alice', name: 'Alice' };
const seedArb = fc.stringMatching(/^[a-z0-9]{6,12}$/).map((s) => `tf-${s}`);
const legendArb = fc.constantFrom(...playableLegends);

/** A fresh Run through the real service; `tap` sends one Hotspot tap and returns the response. */
async function fresh(legend: Legend, seed: string) {
  const { deps } = playSetup(legend.id, [seed]);
  const run = generate(legend, seed);
  await startWorld(deps, alice, { legendId: legend.id, token: null });
  const tap = (hotspotId: string): Promise<PlayResponse> => actInWorld(deps, alice, { legendId: legend.id, token: null, action: { kind: 'tap', hotspotId: rawId(legend.id, hotspotId) } });
  return { run, tap };
}
const authoredOf = (legend: Legend, id: string) => legend.world.hotspots.find((h) => h.id === id)!;

describe('Property 8: Taps open slots by role and use the right text', () => {
  it('tapping every Hotspot opens every slot; the tap text is the authored text exactly when the served role equals the authored role', async () => {
    await fc.assert(
      fc.asyncProperty(legendArb, seedArb, async (legend, seed) => {
        const { run, tap } = await fresh(legend, seed);
        const opened = new Set<string>();
        for (const h of run.hotspots) {
          const r = await tap(h.id);
          if (r.reply?.kind !== 'tap') throw new Error('expected tap');
          for (const s of r.reply.opened) opened.add(s);
          expect(JSON.stringify(r)).not.toMatch(/"role"/);
          const authored = authoredOf(legend, h.id);
          if (authored.role === h.role) {
            expect(r.reply.text, `${legend.id} ${seed} ${h.id}`).toBe(authored.onTap);
            expect(r.reply.key).toBeUndefined();
          } else {
            expect(r.reply.text).toBeUndefined();
            expect(['tap.nothing', 'tap.something']).toContain(r.reply.key);
          }
        }
        expect([...opened].sort()).toEqual(run.slots.map((s) => rawId(legend.id, s.slotId)).sort());
      }),
      { numRuns: 100 },
    );
  });

  it('tapping only decoys opens no slot and collects no lead step', async () => {
    await fc.assert(
      fc.asyncProperty(legendArb, seedArb, async (legend, seed) => {
        const { run, tap } = await fresh(legend, seed);
        let last: PlayResponse | null = null;
        for (const h of run.hotspots.filter((x) => x.role === 'decoy')) {
          last = await tap(h.id);
          if (last.reply?.kind !== 'tap') throw new Error('expected tap');
          expect(last.reply.opened).toEqual([]);
          expect(last.reply.collected).toBe(0);
        }
        if (last) {
          expect(last.view.slots.filter((s) => s.state === 'open' || s.state === 'solved')).toEqual([]);
          expect(last.view.leads.flatMap((l) => l.steps)).toEqual([]);
        }
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 9: Hotspot fear changes apply once, from the table', () => {
  /** Expected fear after a tap sequence, from the table alone. */
  function expectedFear(legend: Legend, run: ReturnType<typeof generate>, ids: string[]): number[] {
    const seen = new Set<string>();
    let fear = 0;
    return ids.map((id) => {
      const h = run.hotspots.find((x) => x.id === id)!;
      const delta = HOTSPOT_FEAR[`${legend.id}:${rawId(legend.id, id)}`] ?? 0;
      if (delta !== 0 && authoredOf(legend, id).role === h.role && !seen.has(id)) fear = Math.max(0, fear + delta);
      seen.add(id);
      return fear;
    });
  }
  const check = async (legend: Legend, seed: string, picks: number[]) => {
    const { run, tap } = await fresh(legend, seed);
    const ids = picks.map((p) => run.hotspots[p % run.hotspots.length]!.id);
    const want = expectedFear(legend, run, ids);
    for (let i = 0; i < ids.length; i++) {
      const r = await tap(ids[i]!);
      expect(r.view.fear, `${legend.id} ${seed} ${ids.slice(0, i + 1).join(',')}`).toBe(want[i]);
      expect(r.view.fear).toBeGreaterThanOrEqual(0);
    }
  };
  const picksArb = fc.array(fc.nat(60), { minLength: 1, maxLength: 40 });

  it('any legend, seed and tap sequence with repeats follows the table', async () => {
    await fc.assert(fc.asyncProperty(legendArb, seedArb, picksArb, check), { numRuns: 100 });
  });

  it('table Hotspots change fear once when their role is served as authored, and never otherwise', async () => {
    const tableLegends = [...new Set(Object.keys(HOTSPOT_FEAR).map((k) => k.split(':')[0]!))].map((id) => playableLegends.find((l) => l.id === id)).filter((l): l is Legend => !!l);
    expect(tableLegends.length).toBeGreaterThan(0);
    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...tableLegends), seedArb, fc.array(fc.nat(60), { minLength: 20, maxLength: 60 }), check),
      { numRuns: 100 },
    );
    // At least one table entry must really move the meter, so the property above cannot pass vacuously.
    const legend = tableLegends.find((l) => l.id === 'banshee') ?? tableLegends[0]!;
    const key = Object.keys(HOTSPOT_FEAR).find((k) => k.startsWith(`${legend.id}:`) && HOTSPOT_FEAR[k]! > 0)!;
    const hsId = key.split(':')[1]!;
    for (let n = 0; n < 200; n++) {
      const seed = `tf-moves-${n}`;
      const run = generate(legend, seed);
      const h = run.hotspots.find((x) => rawId(legend.id, x.id) === hsId)!;
      if (authoredOf(legend, h.id).role !== h.role) continue;
      const { tap } = await fresh(legend, seed);
      const first = await tap(h.id);
      expect(first.view.fear).toBe(HOTSPOT_FEAR[key]);
      expect((await tap(h.id)).view.fear).toBe(HOTSPOT_FEAR[key]);
      return;
    }
    throw new Error('no seed served the authored role');
  });
});

describe('Guard: authored tap text that mentions fear is in the table', () => {
  it('every onTap matching fear/meter/tick is in HOTSPOT_FEAR or HOTSPOT_FEAR_NONE', () => {
    expect(allLegends.length).toBe(12);
    const known = new Set([...Object.keys(HOTSPOT_FEAR), ...HOTSPOT_FEAR_NONE]);
    const missing: string[] = [];
    for (const l of allLegends) {
      for (const h of l.world.hotspots) {
        if (/\b(fear|meter|tick)\b/i.test(h.onTap) && !known.has(`${l.id}:${rawId(l.id, h.id)}`)) missing.push(`${l.id}:${rawId(l.id, h.id)}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every table key names a real Hotspot', () => {
    expect(Object.keys(HOTSPOT_FEAR).length).toBeGreaterThan(0);
    for (const key of [...Object.keys(HOTSPOT_FEAR), ...HOTSPOT_FEAR_NONE]) {
      const [lid, hid] = key.split(':') as [string, string];
      const l = allLegends.find((x) => x.id === lid);
      expect(l, key).toBeDefined();
      expect(l!.world.hotspots.some((h) => rawId(lid, h.id) === hid), key).toBe(true);
    }
  });
});
