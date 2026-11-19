import type { Fact, Hotspot, Legend, PuzzleType, Slot } from '../model/schema.ts';
import { createRng, type Rng } from '../rng/rng.ts';
import { auditLegend, slotHotspots, type LegendAudit } from './audit.ts';
import { GeneratorError } from './errors.ts';
import { hint2Anchor, makeHints, remapHighlights, type HintRun } from './hints.ts';
import { makeOptions, makeQuestion } from './options.ts';
import { assignSlots, qualifyingFacts } from './slots.ts';
import { applySwaps, needsMet, type Needs } from './swaps.ts';
import { chooseLeads, type LeadRun } from './versions.ts';

export interface RunSlot extends HintRun {
  slotId: string;
  type: PuzzleType;
  isFinal: boolean;
  factId: string;
  /** the fact's anchor: where the answer is written */
  anchor: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  /** meaningful hotspots (after swaps) that link one of the slot's facts; those linking the chosen fact come first */
  hotspotIds: string[];
}

export interface Run {
  legendId: string;
  seed: string;
  trueVersionId: string;
  trueLead: LeadRun;
  deadEnds: LeadRun[];
  slots: RunSlot[];
  hotspots: { id: string; sceneId: string; role: Hotspot['role']; links: Hotspot['links'] }[];
  swaps: [string, string][];
  /** carried as text; the game spec generates its options */
  finalPuzzle: { description: string; hint1: { text: string; highlight: string[] } | null; hint2Anchor: string | null };
}

const MIN_DECOYS = 5;

/** One distinct qualifying fact per slot. */
function chooseFacts(l: Legend, audit: LegendAudit, rng: Rng, seed: string, trueVersionId: string): Map<string, Fact> {
  const options = new Map(l.world.slots.map((s) => [s.id, qualifyingFacts(l, audit, s, trueVersionId)]));
  for (const s of l.world.slots) {
    if (!options.get(s.id)!.length) throw new GeneratorError('no-qualifying-fact', l.id, seed, `slot ${s.id} has no qualifying fact for ${trueVersionId}`);
  }
  const chosen = assignSlots(rng, l.world.slots, options);
  if (!chosen) throw new GeneratorError('no-distinct-facts', l.id, seed, `slots cannot all get different facts for ${trueVersionId}`);
  return chosen;
}

/** R5.7: every slot and every true-lead step needs a meaningful hotspot before any swap. */
function checkBaseCoverage(l: Legend, needs: Needs, seed: string): void {
  if (needsMet(l.world.hotspots, needs)) return;
  const bad = l.world.slots.find((s) => !slotHotspots(l.world.hotspots, s.candidateFactIds).length);
  throw new GeneratorError('slot-uncovered', l.id, seed, bad ? `slot ${bad.id} has no meaningful hotspot linked to any of its facts` : 'a lead step has no meaningful hotspot');
}

function buildSlot(l: Legend, s: Slot, fact: Fact, rng: Rng, seed: string, trueVersionId: string, swaps: [string, string][], hotspots: Hotspot[]): RunSlot {
  const linkingFact = (h: Hotspot): boolean => h.links.some((k) => k.kind === 'fact' && k.factId === fact.id);
  const serving = slotHotspots(hotspots, s.candidateFactIds);
  return {
    slotId: s.id,
    type: s.type,
    isFinal: s.isFinal,
    factId: fact.id,
    anchor: fact.anchor,
    question: makeQuestion(fact, s),
    ...makeOptions(fact, rng.fork(`options:${s.id}`), l.id, seed),
    ...makeHints(l, s.id, trueVersionId, seed, swaps, hotspots),
    hotspotIds: [...serving.filter(linkingFact), ...serving.filter((h) => !linkingFact(h))].map((h) => h.id),
  };
}

/** Pure: the same legend and seed always give the same run. Throws GeneratorError when no valid run exists. */
export function generate(l: Legend, seed: string, audit: LegendAudit = auditLegend(l)): Run {
  const rng = createRng(`${l.id}/${seed}`);
  const { trueVersionId, trueLead, deadEnds } = chooseLeads(l, rng, seed);
  const chosen = chooseFacts(l, audit, rng, seed, trueVersionId);

  const needs: Needs = {
    slotFacts: l.world.slots.map((s) => s.candidateFactIds),
    leadSteps: trueLead.steps.map((_, i) => ({ leadId: trueLead.id, step: i + 1 })),
  };
  checkBaseCoverage(l, needs, seed);
  const { hotspots, swaps } = applySwaps(l, rng, needs);
  if (hotspots.filter((h) => h.role === 'decoy').length < MIN_DECOYS) throw new GeneratorError('hotspot-invariant', l.id, seed, `fewer than ${MIN_DECOYS} decoys`);

  const fp = l.world.finalPuzzle;
  return {
    legendId: l.id,
    seed,
    trueVersionId,
    trueLead,
    deadEnds,
    slots: l.world.slots.map((s) => buildSlot(l, s, chosen.get(s.id)!, rng, seed, trueVersionId, swaps, hotspots)),
    hotspots: hotspots.map((h) => ({ id: h.id, sceneId: h.sceneId, role: h.role, links: h.links })),
    swaps,
    finalPuzzle: {
      description: fp.description,
      hint1: fp.hint1 ? { text: fp.hint1.text, highlight: remapHighlights(fp.hint1.highlight, swaps, hotspots) } : null,
      hint2Anchor: fp.hint2Anchor ? hint2Anchor(l, fp.hint2Anchor, trueVersionId, seed) : null,
    },
  };
}
