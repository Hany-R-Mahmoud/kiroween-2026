import type { Legend } from '../model/schema.ts';
import { createRng } from '../rng/rng.ts';
import { slotHotspots, stepHotspots, type LegendAudit } from './audit.ts';
import { assignSlots, candidateVersions, qualifyingFacts } from './slots.ts';

export interface VersionProblem {
  versionId: string;
  /** no-fact: a slot has no qualifying fact; no-distinct: slots cannot all get different facts; slot-hotspot / lead-hotspot: R5.7 */
  kind: 'no-fact' | 'no-distinct' | 'slot-hotspot' | 'lead-hotspot';
  problem: string;
}

/** Leads true for `versionId` whose every step has a meaningful hotspot (R5.7). */
export const coveredLeadsFor = (l: Legend, versionId: string) =>
  l.leads.filter(
    (x) => x.canBeTrueFor !== 'never' && x.canBeTrueFor.includes(versionId) && x.steps.every((_, i) => stepHotspots(l.world.hotspots, x.id, i + 1).length),
  );

/** Why a version cannot be generated, if it cannot. Empty list means the version is playable. */
export function versionProblems(l: Legend, audit: LegendAudit, versionId: string): VersionProblem[] {
  const out: VersionProblem[] = [];
  const options = new Map(l.world.slots.map((s) => [s.id, qualifyingFacts(l, audit, s, versionId)]));
  for (const s of l.world.slots) {
    if (!options.get(s.id)!.length) out.push({ versionId, kind: 'no-fact', problem: `slot ${s.id}: no qualifying fact` });
    else if (!slotHotspots(l.world.hotspots, s.candidateFactIds).length) out.push({ versionId, kind: 'slot-hotspot', problem: `slot ${s.id}: no meaningful hotspot links to any of its facts` });
  }
  if (!out.length && !assignSlots(createRng(`audit/${l.id}/${versionId}`), l.world.slots, options)) out.push({ versionId, kind: 'no-distinct', problem: 'no distinct fact for every slot' });
  if (!coveredLeadsFor(l, versionId).length) out.push({ versionId, kind: 'lead-hotspot', problem: 'no lead true for this version has a meaningful hotspot on every step' });
  return out;
}

export const allVersionProblems = (l: Legend, audit: LegendAudit): VersionProblem[] => candidateVersions(l).flatMap((v) => versionProblems(l, audit, v));
