import type { Hotspot, Legend } from '../model/schema.ts';
import { GeneratorError } from './errors.ts';

export interface HintRun {
  hint1: { text: string; highlight: string[] };
  hint2: { anchor: string };
}

/** Hint 1 never points at a hotspot a swap turned into a decoy: the highlight moves to its swap partner. */
export function remapHighlights(highlight: string[], swaps: [string, string][], finalHotspots: readonly Hotspot[]): string[] {
  const partner = new Map(swaps.flatMap(([a, b]) => [[a, b], [b, a]] as [string, string][]));
  const role = new Map(finalHotspots.map((h) => [h.id, h.role]));
  return [...new Set(highlight.map((h) => (role.get(h) === 'decoy' && partner.has(h) ? partner.get(h)! : h)))];
}

/**
 * Hint 2 deep-links to a chapter, the versions anchor or a per-version anchor. The bare versions anchor is refined to the
 * true version's anchor so the player lands on the right account; that is a refinement, not a correction.
 */
export function hint2Anchor(l: Legend, anchor: string, trueVersionId: string, seed: string): string {
  const refined = anchor === `${l.id}--versions` ? `${l.id}--versions--${trueVersionId.slice(l.id.length + 1)}` : anchor;
  if (!l.anchors.includes(refined)) throw new GeneratorError('hint-anchor', l.id, seed, `hint 2 anchor "${refined}" is not a deep-link target`);
  return refined;
}

/** Hint 2 opens the anchor of the fact the Run chose for the slot (requirement 5.7), so the answer is always in the linked text. */
export function makeHints(l: Legend, slotId: string, factAnchor: string, trueVersionId: string, seed: string, swaps: [string, string][], finalHotspots: readonly Hotspot[]): HintRun {
  const s = l.world.slots.find((x) => x.id === slotId)!;
  return {
    hint1: { text: s.hint1.text, highlight: remapHighlights(s.hint1.highlight, swaps, finalHotspots) },
    hint2: { anchor: hint2Anchor(l, factAnchor, trueVersionId, seed) },
  };
}

