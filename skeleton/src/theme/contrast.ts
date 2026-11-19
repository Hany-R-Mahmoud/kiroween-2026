// WCAG 2.x contrast and the per-legend theme the atlas applies (R6.3): a role that fails falls back to the base token.
import { parsePalette, ThemeError, themeFonts, type FontFamily } from './palette.ts';

/** The hub palette, as in design/tokens.css (a test keeps the two equal). */
export const BASE_PALETTE = { bg: '#0e0b10', surface: '#1c1620', ink: '#e9e1d3', muted: '#9c9285', accent: '#e0a84b', glow: '#f4d58d' } as const;
export const AA_TEXT = 4.5;
/** Large text (24 px and up, or 18.66 px bold): headings in the glow colour. */
export const AA_LARGE = 3;

const channel = (hex: string, i: number) => {
  const v = parseInt(hex.slice(i, i + 2), 16) / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
/** Contrast ratio of two `#rrggbb` colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

export interface ResolvedTheme {
  /** CSS custom properties that override the base tokens on the legend page. */
  vars: Record<string, string>;
  themeColor: string;
  /** Every family the page uses, each once: the stylesheets it must link. */
  families: FontFamily[];
  /** One line per role that did not use the pack's own value, with the failing ratio. */
  fallbacks: string[];
}
const GENERIC_TAIL = "'Iowan Old Style', Georgia, serif";
const fontVar = (stack: FontFamily[]) => `${stack.map((f) => `'${f}'`).join(', ')}, ${GENERIC_TAIL}`;
const fmt = (n: number) => n.toFixed(2);

/** The first candidate that reaches `min` against every background, with a note when it is not the first. */
function pick(role: string, candidates: [string, string][], backgrounds: [string, string][], min: number, notes: string[]): string {
  for (const [i, [label, colour]] of candidates.entries()) {
    const failing = backgrounds.filter(([, bg]) => contrastRatio(colour, bg) < min);
    if (!failing.length) return colour;
    const next = candidates[i + 1];
    if (next) notes.push(`${role}: ${label} ${failing.map(([name, bg]) => `${fmt(contrastRatio(colour, bg))}:1 on ${name}`).join(', ')}; using ${next[0]}`);
  }
  throw new ThemeError(`no readable colour for ${role}`); // never ship text below AA (R6.3)
}

export function resolveTheme(theme: { palette: string; displayFont: string; bodyFont: string }): ResolvedTheme {
  const p = parsePalette(theme.palette);
  const fonts = themeFonts(theme);
  const notes: string[] = [];
  const both: [string, string][] = [['background', p.background], ['surface', p.surface]];
  const ink = pick('ink', [['the pack ink', p.ink], ['the base ink', BASE_PALETTE.ink]], both, AA_TEXT, notes);
  const accent = pick('accent (links)', [['the pack accent', p.accent], ['the base accent', BASE_PALETTE.accent], ['the ink', ink]], both, AA_TEXT, notes);
  const glow = pick('glow (large headings)', [['the pack glow', p.glow], ['the base glow', BASE_PALETTE.glow], ['the ink', ink]], [['background', p.background]], AA_LARGE, notes);
  const muted = pick('muted (secondary text)', [['the base muted', BASE_PALETTE.muted], ['the ink', ink]], both, AA_TEXT, notes);
  return {
    vars: {
      '--color-bg': p.background,
      '--color-surface': p.surface,
      '--color-ink': ink,
      '--color-accent': accent,
      '--color-glow': glow,
      '--color-muted': muted,
      '--font-display': fontVar(fonts.display),
      '--font-body': fontVar(fonts.body),
    },
    themeColor: p.background,
    families: [...new Set([...fonts.display, ...fonts.body])],
    fallbacks: notes,
  };
}
