// Contrast of every text pairing the Hall and the Tutorial_Room use (design: "Hub theme"). Fixed pairs, no pack.
import { AA_LARGE, AA_TEXT, BASE_PALETTE, contrastRatio } from './contrast.ts';

/** Hub colours that are not in BASE_PALETTE; a test keeps them equal to design/tokens.css. */
export const HUB_EXTRA = { dangerInk: '#e06b6b', danger: '#b23a3a', cold: '#7fa7b5' } as const;

export interface HubPairing {
  name: string;
  foreground: string;
  background: string;
  ratio: number;
  minimum: number;
  ok: boolean;
}

const P = BASE_PALETTE;
const E = HUB_EXTRA;
const SPEC: [string, string, string, number][] = [
  ['ink on background', P.ink, P.bg, AA_TEXT],
  ['ink on surface', P.ink, P.surface, AA_TEXT],
  ['muted on background', P.muted, P.bg, AA_TEXT],
  ['muted on surface', P.muted, P.surface, AA_TEXT],
  ['accent on background', P.accent, P.bg, AA_TEXT],
  ['accent on surface', P.accent, P.surface, AA_TEXT],
  ['glow on background (large text)', P.glow, P.bg, AA_LARGE],
  ['cold on background', E.cold, P.bg, AA_TEXT],
  ['cold on surface', E.cold, P.surface, AA_TEXT],
  ['danger-ink on background', E.dangerInk, P.bg, AA_TEXT],
  ['danger-ink on surface', E.dangerInk, P.surface, AA_TEXT],
  // Non-text (fear meter fill, WCAG 1.4.11). It sits on the background; on the surface it is 3.00, the edge.
  ['danger fill on background (non-text)', E.danger, P.bg, AA_LARGE],
];

export function hubContrastReport(): HubPairing[] {
  return SPEC.map(([name, foreground, background, minimum]) => {
    const ratio = contrastRatio(foreground, background);
    return { name, foreground, background, ratio, minimum, ok: ratio >= minimum };
  });
}
