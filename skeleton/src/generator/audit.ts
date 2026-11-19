import type { Hotspot, Legend, PuzzleType } from '../model/schema.ts';
import { answerInText, toParagraphs } from './normalise.ts';

/** Types whose answer need not be spelled out in the chapter text (a category, or an order). */
export const TEXT_EXEMPT: readonly PuzzleType[] = ['true-or-told', 'ritual-order'];

export interface Gap {
  legendId: string;
  factId: string;
  puzzleType: PuzzleType;
  answer: string;
  anchor: string;
  reason: string;
}

export interface LegendAudit {
  legendId: string;
  /** fact id -> puzzle types the fact may fill (answer found in the linked text by the R5.10 matcher, or the type is exempt) */
  usable: Record<string, PuzzleType[]>;
  gaps: Gap[];
  /** slots with no meaningful hotspot linked to any of their candidate facts (R5.7) */
  uncoveredSlots: string[];
  /** lead steps (of leads that can be true) with no meaningful hotspot (R5.7) */
  uncoveredLeadSteps: { leadId: string; step: number }[];
}

/** Paragraphs a fact's anchor points at: a chapter, one version's account, or the whole versions section. */
function paragraphsByAnchor(l: Legend): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const c of l.chapters) m.set(c.anchor, toParagraphs(c.text));
  for (const v of l.versions) m.set(v.anchor, toParagraphs(v.claim, v.conflicts, v.paragraph));
  m.set(`${l.id}--versions`, l.versions.flatMap((v) => m.get(v.anchor)!));
  return m;
}

/** Hotspots in `hotspots` (use the base list or a swapped one) that are meaningful and link to a fact in `factIds`. */
export const slotHotspots = (hotspots: readonly Hotspot[], factIds: readonly string[]): Hotspot[] =>
  hotspots.filter((h) => h.role === 'meaningful' && h.links.some((k) => k.kind === 'fact' && factIds.includes(k.factId)));

/** Meaningful hotspots that link to `step` (1-based) of `lead`; a link with no step covers every step. */
export const stepHotspots = (hotspots: readonly Hotspot[], leadId: string, step: number): Hotspot[] =>
  hotspots.filter((h) => h.role === 'meaningful' && h.links.some((k) => k.kind === 'leadStep' && k.leadId === leadId && (k.step === null || k.step === step)));

const uncoveredSteps = (l: Legend, leadId: string): number[] => {
  const lead = l.leads.find((x) => x.id === leadId)!;
  return lead.steps.flatMap((_, i) => (stepHotspots(l.world.hotspots, leadId, i + 1).length ? [] : [i + 1]));
};

function uncovered(l: Legend): LegendAudit['uncoveredLeadSteps'] {
  return l.leads.filter((x) => x.canBeTrueFor !== 'never').flatMap((x) => uncoveredSteps(l, x.id).map((step) => ({ leadId: x.id, step })));
}

export function auditLegend(l: Legend): LegendAudit {
  const texts = paragraphsByAnchor(l);
  const usable: Record<string, PuzzleType[]> = {};
  const gaps: Gap[] = [];
  for (const f of l.facts) {
    usable[f.id] = [];
    for (const t of f.puzzleTypes) {
      if (TEXT_EXEMPT.includes(t) || answerInText(texts.get(f.anchor) ?? [], f.answer, t)) usable[f.id]!.push(t);
      else gaps.push({ legendId: l.id, factId: f.id, puzzleType: t, answer: f.answer, anchor: f.anchor, reason: `answer "${f.answer}" not found in ${f.anchor}` });
    }
  }
  return {
    legendId: l.id,
    usable,
    gaps,
    uncoveredSlots: l.world.slots.filter((sl) => !slotHotspots(l.world.hotspots, sl.candidateFactIds).length).map((sl) => sl.id),
    uncoveredLeadSteps: uncovered(l),
  };
}
