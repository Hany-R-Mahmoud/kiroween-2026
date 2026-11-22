// Colour pair matrix of Phase 6 (design section 3.6). Colours are read from tokens.css, book.css and styles.css and
// followed through var(); this file holds no colour literal. A pair names the CSS variables it uses, so a variable that
// is no longer re-pointed inside .book-paper changes the measured colour and fails the pair.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PAPER_FLOOR } from '../../src/book/bookColors.ts';
import { AA_LARGE, AA_TEXT, contrastRatio } from '../../src/theme/contrast.ts';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
export const readSource = (rel: string): string => readFileSync(`${ROOT}${rel}`, 'utf8');
export const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');

export type Vars = Record<string, string>;
const declsOf = (block: string): Vars => {
  const out: Vars = {};
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)) out[m[1]!] = m[2]!.trim();
  return out;
};
/** every `--x: value` in a file (tokens.css keeps them inside @theme) */
export const allDecls = (css: string): Vars => declsOf(stripComments(css));
/** variables of the plain top-level blocks whose selector is exactly `selector` (no nested braces, as book.css keeps them) */
export const blockDecls = (css: string, selector: string): Vars => {
  const re = new RegExp(`(?:^|\\n)${selector.replace(/[.\\[\]]/g, '\\$&')}\\s*\\{([^}]*)\\}`, 'g');
  return Object.assign({}, ...[...stripComments(css).matchAll(re)].map((m) => declsOf(m[1]!)));
};

const HEX = /^#[0-9a-fA-F]{6}$/;
export class Unresolved extends Error {}
/** Follow `var(--x)` and `var(--x, fallback)` to a `#rrggbb` colour. */
export function resolve(value: string, vars: Vars, depth = 0): string {
  const v = value.trim();
  if (HEX.test(v)) return v.toLowerCase();
  const m = /^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]+))?\)$/.exec(v);
  if (!m || depth > 12) throw new Unresolved(`cannot resolve "${v}"`);
  const own = vars[m[1]!];
  if (own !== undefined) return resolve(own, vars, depth + 1);
  if (m[2] !== undefined) return resolve(m[2], vars, depth + 1);
  throw new Unresolved(`${m[1]} is not declared`);
}

export interface Sources {
  tokens: string;
  book: string;
}
export const loadSources = (): Sources => ({ tokens: readSource('skeleton/src/design/tokens.css'), book: readSource('skeleton/src/book/book.css') });

export interface Scopes {
  dark: Vars;
  paper: Vars;
}
export const scopesOf = (s: Sources): Scopes => {
  const dark = allDecls(s.tokens);
  const paper = { ...dark, ...blockDecls(s.book, ':root'), ...blockDecls(s.book, '.book-paper') };
  return { dark, paper };
};

// --- colour mixing -------------------------------------------------------------------------------------------------
const toRgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const toHex = (c: number[]): string => `#${c.map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0')).join('')}`;
/** `fg` at `alpha` painted over `bg` (what a translucent fill looks like). */
export const over = (fg: string, alpha: number, bg: string): string => {
  const f = toRgb(fg);
  const b = toRgb(bg);
  return toHex(f.map((x, i) => x * alpha + b[i]! * (1 - alpha)));
};
const lin = (x: number) => (x / 255 <= 0.04045 ? x / 255 / 12.92 : ((x / 255 + 0.055) / 1.055) ** 2.4);
const delin = (x: number) => 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
const toOklab = (hex: string): [number, number, number] => {
  const [r, g, b] = toRgb(hex).map(lin) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
const fromOklab = ([L, a, b]: [number, number, number]): string => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return toHex([4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(delin));
};
/** `color-mix(in oklab, a pct%, b)` for two opaque colours. */
export const mixOklab = (a: string, pct: number, b: string): string => {
  const x = toOklab(a);
  const y = toOklab(b);
  return fromOklab(x.map((v, i) => (v * pct) / 100 + y[i]! * (1 - pct / 100)) as [number, number, number]);
};

export interface LandMix {
  a: string;
  pct: number;
  b: string;
}
/** Design 3.6 D17: land is `color-mix(in oklab, muted 66%, bg)`. The test measures this; landRule() reads what styles.css has. */
export const DESIGN_LAND: LandMix = { a: '--color-muted', pct: 66, b: '--color-bg' };
/** The `.land` rule in atlas styles.css: `background-color: color-mix(in oklab, var(--color-X) N%, var(--color-Y))`. */
export function landRule(stylesCss: string): LandMix | null {
  const body = /\.land\s*\{([^}]*)\}/.exec(stripComments(stylesCss))?.[1] ?? '';
  const m = /background-color:\s*color-mix\(\s*in oklab\s*,\s*var\((--[\w-]+)\)\s+(\d+)%\s*,\s*var\((--[\w-]+)\)\s*\)/.exec(body);
  return m ? { a: m[1]!, pct: Number(m[2]), b: m[3]! } : null;
}
const landFill = (l: LandMix, get: (name: string) => string): string => mixOklab(get(l.a), l.pct, get(l.b));

// --- the matrix ----------------------------------------------------------------------------------------------------
type Get = (name: string) => string;
export interface Row {
  id: string;
  what: string;
  min: number;
  fg: (v: Get) => string;
  bg: (v: Get) => string;
}
const row = (id: string, what: string, min: number, fg: Row['fg'], bg: Row['bg']): Row => ({ id, what, min, fg, bg });
const c = (name: string): Row['fg'] => (v) => v(name);
const floor = (): string => PAPER_FLOOR;

/** Dark context: page, game, Scroll_View. Rows follow design table D1 to D20. */
export const darkRows = (land: LandMix): Row[] => {
  const hover = (v: Get, pct: number) => over(v('--color-accent'), pct / 100, v('--color-bg'));
  return [
    row('D1', 'body text on page', AA_TEXT, c('--color-ink'), c('--color-bg')),
    row('D2', 'card text', AA_TEXT, c('--color-ink'), c('--color-surface')),
    row('D3', 'hover card text', AA_TEXT, c('--color-ink'), c('--color-surface-raised')),
    row('D4', 'meta text on page', AA_TEXT, c('--color-muted'), c('--color-bg')),
    row('D5', 'meta text on card', AA_TEXT, c('--color-muted'), c('--color-surface')),
    row('D6', 'meta text on raised card', AA_TEXT, c('--color-muted'), c('--color-surface-raised')),
    row('D7', 'link in text (--color-link falls back to glow)', AA_TEXT, c('--color-link'), c('--color-bg')),
    row('D8', 'link in card text', AA_TEXT, c('--color-link'), c('--color-surface')),
    row('D9', 'primary button label', AA_TEXT, c('--color-bg'), c('--color-accent')),
    row('D10', 'primary button label on hover', AA_TEXT, c('--color-bg'), c('--color-glow')),
    row('D11', 'secondary button label', AA_TEXT, c('--color-glow'), c('--color-bg')),
    row('D12', 'secondary button border (non-text)', AA_LARGE, c('--color-accent'), c('--color-bg')),
    row('D13', 'card border and selected fill (non-text)', AA_LARGE, c('--color-accent'), c('--color-surface')),
    row('D14', 'panel border (non-text)', AA_LARGE, c('--color-muted'), c('--color-surface')),
    row('D15a', 'focus ring on page (non-text)', AA_LARGE, c('--color-ring'), c('--color-bg')),
    row('D15b', 'focus ring on card (non-text)', AA_LARGE, c('--color-ring'), c('--color-surface')),
    row('D15c', 'focus ring on raised card (non-text)', AA_LARGE, c('--color-ring'), c('--color-surface-raised')),
    row('D16', 'error text on card', AA_TEXT, c('--color-danger-ink'), c('--color-surface')),
    row('D18', 'map land against the map card (non-text)', AA_LARGE, (v) => landFill(land, v), c('--color-bg')),
    row('D19', 'pin dot on land (non-text)', AA_LARGE, c('--color-glow'), (v) => landFill(land, v)),
    row('D20a', 'secondary label on hover fill', AA_TEXT, c('--color-glow'), (v) => hover(v, 14)),
    row('D20b', 'secondary label on pressed fill', AA_TEXT, c('--color-glow'), (v) => hover(v, 24)),
    row('D20c', 'selected button label on selected fill', AA_TEXT, c('--color-glow'), (v) => hover(v, 22)),
    row('D21a', 'motion switch off: border and thumb on the page (non-text)', AA_LARGE, c('--color-muted'), c('--color-bg')),
    row('D21b', 'motion switch on: track against the page (non-text)', AA_LARGE, c('--color-accent'), c('--color-bg')),
    row('D21c', 'motion switch on: thumb on the track (non-text)', AA_LARGE, c('--color-bg'), c('--color-accent')),
  ];
};

/** Paper context (.book-paper). Text over texture is judged on PAPER_FLOOR; text on a flat card on the card fill. */
export const paperRows = (): Row[] => [
  row('P1', 'body text on the paper floor', AA_TEXT, c('--color-ink'), floor),
  row('P2', 'body text on the paper tint', AA_TEXT, c('--color-ink'), c('--color-bg')),
  row('P3', 'card text on the card fill', AA_TEXT, c('--color-ink'), c('--color-surface')),
  row('P3b', 'card text on the raised card fill', AA_TEXT, c('--color-ink'), c('--color-surface-raised')),
  row('P4', 'link on the paper floor', AA_TEXT, c('--color-link'), floor),
  row('P5', 'link in a card', AA_TEXT, c('--color-link'), c('--color-surface')),
  row('P6', 'label text (muted) on a card', AA_TEXT, c('--color-muted'), c('--color-surface')),
  row('P6b', 'label text (muted) on the paper floor', AA_TEXT, c('--color-muted'), floor),
  row('P7', 'primary button label', AA_TEXT, c('--color-bg'), c('--color-accent')),
  row('P7b', 'primary button label on hover', AA_TEXT, c('--color-bg'), c('--color-glow')),
  row('P8', 'selected option label', AA_TEXT, c('--color-bg'), c('--color-ink')),
  row('P8b', 'secondary button label on the paper tint', AA_TEXT, c('--color-glow'), c('--color-bg')),
  row('P8c', 'secondary button label on a card', AA_TEXT, c('--color-glow'), c('--color-surface')),
  row('P9a', 'rule on a card (non-text)', AA_LARGE, c('--color-rule'), c('--color-surface')),
  row('P9b', 'rule on the paper tint (non-text)', AA_LARGE, c('--color-rule'), c('--color-bg')),
  row('P9c', 'panel border on a card (non-text)', AA_LARGE, c('--color-muted'), c('--color-surface')),
  row('P10a', 'focus ring on the paper floor (non-text)', AA_LARGE, c('--color-ring'), floor),
  row('P10b', 'focus ring on a card (non-text)', AA_LARGE, c('--color-ring'), c('--color-surface')),
  row('P10c', 'focus ring on the paper tint (non-text)', AA_LARGE, c('--color-ring'), c('--color-bg')),
  row('P11', 'error and "Tried" label on a card', AA_TEXT, c('--color-danger-ink'), c('--color-surface')),
  row('P12', 'error and "Tried" label on the paper tint', AA_TEXT, c('--color-danger-ink'), c('--color-bg')),
  row('P13', 'tried-option mark on a card (non-text)', AA_LARGE, c('--color-accent'), c('--color-surface')),
];

export interface Measured {
  id: string;
  context: 'dark' | 'paper';
  what: string;
  min: number;
  ratio: number;
}
/** Measure every row; a pair that cannot be resolved is reported as a failure with ratio 0. */
export function measure(s: Sources, land: LandMix = DESIGN_LAND): { measured: Measured[]; failures: string[] } {
  const { dark, paper } = scopesOf(s);
  const out: Measured[] = [];
  const failures: string[] = [];
  const run = (context: 'dark' | 'paper', vars: Vars, rows: Row[]) => {
    // the dark-context link and ring fall back to glow when no variable is declared (ui.css: var(--color-link, var(--color-glow)))
    const withFallbacks: Vars = { '--color-link': 'var(--color-glow)', '--color-ring': 'var(--color-glow)', ...vars };
    const get: Get = (name) => resolve(`var(${name})`, withFallbacks);
    for (const r of rows) {
      const label = `${context} ${r.id} ${r.what}`;
      try {
        const ratio = contrastRatio(r.fg(get), r.bg(get));
        out.push({ id: r.id, context, what: r.what, min: r.min, ratio });
        if (ratio < r.min) failures.push(`${label}: ${ratio.toFixed(2)}:1, needs ${r.min}:1`);
      } catch (e) {
        if (!(e instanceof Unresolved)) throw e;
        failures.push(`${label}: ${e.message}`);
      }
    }
  };
  run('dark', dark, darkRows(land));
  run('paper', paper, paperRows());
  return { measured: out, failures };
}
