import type { Fact, Legend, Slot } from '../model/schema.ts';
import type { Rng } from '../rng/rng.ts';
import type { LegendAudit } from './audit.ts';

/** Versions that at least one lead can be true for. */
export const candidateVersions = (l: Legend): string[] => [...new Set(l.leads.flatMap((x) => (x.canBeTrueFor === 'never' ? [] : x.canBeTrueFor)))];

/** Facts that may fill `slot` when `trueVersion` is the true one (R5.2 to R5.4, R5.10). */
export function qualifyingFacts(l: Legend, audit: LegendAudit, slot: Slot, trueVersion: string): Fact[] {
  const byId = new Map(l.facts.map((f) => [f.id, f]));
  return slot.candidateFactIds
    .map((id) => byId.get(id))
    .filter((f): f is Fact => f !== undefined)
    .filter(
      (f) =>
        f.puzzleTypes.includes(slot.type) &&
        (f.versionId === null || f.versionId === trueVersion) &&
        !(slot.type === 'true-or-told' && f.confidence === 'R') &&
        (audit.usable[f.id] ?? []).includes(slot.type),
    );
}

/**
 * One distinct fact per slot (rule g). Slots with fewer candidates go first and each candidate is tried in
 * seeded order, with backtracking, so a solution is found whenever one exists. Returns null if none does.
 */
export function assignSlots(rng: Rng, slots: readonly Slot[], options: ReadonlyMap<string, Fact[]>): Map<string, Fact> | null {
  const order = [...slots].sort((a, b) => (options.get(a.id)?.length ?? 0) - (options.get(b.id)?.length ?? 0));
  const shuffled = new Map(order.map((s) => [s.id, rng.fork(`slot:${s.id}`).shuffle(options.get(s.id) ?? [])]));
  const chosen = new Map<string, Fact>();
  const used = new Set<string>();
  const place = (i: number): boolean => {
    if (i === order.length) return true;
    const slot = order[i]!;
    for (const f of shuffled.get(slot.id)!) {
      if (used.has(f.id)) continue;
      used.add(f.id);
      chosen.set(slot.id, f);
      if (place(i + 1)) return true;
      used.delete(f.id);
      chosen.delete(slot.id);
    }
    return false;
  };
  return place(0) ? chosen : null;
}
