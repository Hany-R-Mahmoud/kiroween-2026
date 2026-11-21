import { randomBytes } from 'node:crypto';
import { generate, type Legend, type Run } from '../../src/index.ts';
import { finalSlot, rawId } from '../../src/play/engine.ts';
import type { PlayDeps } from '../../src/play/service.ts';
import { createMemoryPlayStore } from '../../src/play/store.ts';
import { createTokenCodec } from '../../src/play/token.ts';
import type { Action } from '../../src/play/types.ts';
import { allLegends } from './legends.ts';

/** Legends that generate a Run at all (a content file that does not parse is skipped by the loader). */
export const playableLegends: Legend[] = allLegends.filter((l) => {
  try {
    generate(l, 'probe');
    return true;
  } catch {
    return false;
  }
});

/** Real service dependencies over the in-memory store. `seeds` are handed out in order, then the last one repeats. */
export function playSetup(guestWorld: string, seeds?: string[]) {
  let n = 0;
  const store = createMemoryPlayStore();
  const tokens = createTokenCodec({ key: randomBytes(32), now: () => 1_700_000_000_000 });
  const deps: PlayDeps = {
    store,
    tokens,
    loadLegend: async (id) => allLegends.find((l) => l.id === id)!,
    catalogue: allLegends.map((l) => ({ id: l.id, slotCount: l.world.slots.length })),
    newSeed: () => (seeds ? seeds[Math.min(n++, seeds.length - 1)]! : `seed-${n++}`),
    guestWorld,
  };
  return { store, tokens, deps };
}

/** The script a winning player follows, built from the generator (the test may know the Run; the browser may not). */
export function winningActions(run: Run): Action[] {
  const id = run.legendId;
  const fin = finalSlot(run);
  return [
    ...run.hotspots.map((h): Action => ({ kind: 'tap', hotspotId: rawId(id, h.id) })),
    ...[...run.slots.filter((s) => s !== fin), fin].map((s): Action => ({ kind: 'answer', slotId: rawId(id, s.slotId), option: s.correctIndex as 0 })),
    { kind: 'follow', leadId: rawId(id, run.trueLead.id) },
  ];
}
