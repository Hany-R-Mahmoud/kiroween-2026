import type { Lead, Legend } from '../model/schema.ts';
import type { Rng } from '../rng/rng.ts';
import { coveredLeadsFor } from './coverage.ts';
import { GeneratorError } from './errors.ts';
import { candidateVersions } from './slots.ts';

export interface LeadRun {
  id: string;
  steps: string[];
  deadEnd: string | null;
  contradiction: Lead['contradiction'];
}

const toRun = (x: Lead): LeadRun => ({ id: x.id, steps: x.steps, deadEnd: x.deadEnd, contradiction: x.contradiction });

/** True version, true lead and the dead-end chains (R5.5, R5.6, R5.7). */
export function chooseLeads(l: Legend, rng: Rng, seed: string): { trueVersionId: string; trueLead: LeadRun; deadEnds: LeadRun[] } {
  const versions = candidateVersions(l);
  if (!versions.length) throw new GeneratorError('no-true-version', l.id, seed, 'no lead can be true for any version');
  const trueVersionId = rng.fork('version').pick(versions);
  const covered = coveredLeadsFor(l, trueVersionId);
  if (!covered.length) throw new GeneratorError('lead-uncovered', l.id, seed, `no lead true for ${trueVersionId} has a meaningful hotspot on every step`);
  const trueLead = rng.fork('lead').pick(covered);

  const deadEnds = l.leads.filter((x) => x.id !== trueLead.id && x.contradiction !== null && (x.canBeTrueFor === 'never' || !x.canBeTrueFor.includes(trueVersionId)));
  const anchors = new Set(l.anchors);
  const facts = new Set(l.facts.map((f) => f.id));
  for (const d of deadEnds) {
    const c = d.contradiction!;
    if (!c.anchors.every((a) => anchors.has(a)) || !c.factIds.every((f) => facts.has(f))) throw new GeneratorError('dead-end-anchor', l.id, seed, `${d.id} names a contradiction fact or anchor that does not exist`);
  }
  return { trueVersionId, trueLead: toRun(trueLead), deadEnds: deadEnds.map(toRun) };
}
