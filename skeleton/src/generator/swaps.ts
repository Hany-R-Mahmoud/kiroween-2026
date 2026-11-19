import type { Hotspot, Legend } from '../model/schema.ts';
import type { Rng } from '../rng/rng.ts';
import { slotHotspots, stepHotspots } from './audit.ts';

export interface Needs {
  /** per filled slot: its candidate fact ids (a meaningful hotspot must link one of them) */
  slotFacts: string[][];
  /** per step of the true lead */
  leadSteps: { leadId: string; step: number }[];
}

export const needsMet = (hotspots: readonly Hotspot[], n: Needs): boolean =>
  n.slotFacts.every((facts) => slotHotspots(hotspots, facts).length > 0) && n.leadSteps.every((s) => stepHotspots(hotspots, s.leadId, s.step).length > 0);

/** The swapped-in meaningful hotspot takes the links of the one that became a decoy. */
function swapped(hotspots: readonly Hotspot[], meaningfulId: string, decoyId: string): Hotspot[] {
  const m = hotspots.find((h) => h.id === meaningfulId)!;
  return hotspots.map((h) => {
    if (h.id === meaningfulId) return { ...h, role: 'decoy', links: [] };
    if (h.id === decoyId) return { ...h, role: 'meaningful', links: m.links };
    return h;
  });
}

/**
 * Pairwise role swaps (R5.8): both hotspots swappable, same scene, one meaningful and one decoy. The seed picks how many
 * pairs, from none to the number of disjoint valid pairs. A swap that would leave a need uncovered is skipped.
 */
export function applySwaps(l: Legend, rng: Rng, needs: Needs): { hotspots: Hotspot[]; swaps: [string, string][] } {
  const r = rng.fork('swaps');
  const base = l.world.hotspots;
  const candidates = r.shuffle(
    base.flatMap((m) => base.filter((d) => m.swappable && d.swappable && m.sceneId === d.sceneId && m.role === 'meaningful' && d.role === 'decoy').map((d) => [m.id, d.id] as [string, string])),
  );
  const used = new Set<string>();
  const pairs = candidates.filter(([a, b]) => {
    if (used.has(a) || used.has(b)) return false;
    used.add(a).add(b);
    return true;
  });
  const wanted = r.int(0, pairs.length);
  let hotspots = [...base];
  const done: [string, string][] = [];
  for (const [m, d] of pairs) {
    if (done.length === wanted) break;
    const next = swapped(hotspots, m, d);
    if (needsMet(next, needs)) {
      hotspots = next;
      done.push([m, d]);
    }
  }
  return { hotspots, swaps: done };
}
