// Reading a legend's theme pack (content/legend-format.md section 8). The pack is free text, so this reads only what
// it can check: `role #RRGGBB` pairs, and font families from a known list. Nothing is invented (steering: design.md).
const REQUIRED_ROLES = ['background', 'surface', 'ink', 'accent', 'danger', 'glow'] as const;
export type PaletteRole = (typeof REQUIRED_ROLES)[number];
export type Palette = Record<PaletteRole, string> & Record<string, string>;
export class ThemeError extends Error {
  constructor(problem: string) {
    super(`Theme pack: ${problem}.`);
    this.name = 'ThemeError';
  }
}
/** First `#RRGGBB` per role, lower case. "background `#14110F` (forest night); surface #2A1E17 (...)". */
export function parsePalette(text: string): Palette {
  const roles: Record<string, string> = {};
  for (const m of text.matchAll(/\b([a-z]+)\s*`?(#[0-9A-Fa-f]{6})\b`?/g)) roles[m[1]!] ??= m[2]!.toLowerCase();
  const missing = REQUIRED_ROLES.filter((r) => !roles[r]);
  if (missing.length) throw new ThemeError(`missing ${missing.join(', ')}`);
  return roles as Palette;
}
/**
 * Every family the atlas can self-host. The packs name these and nothing else today; a pack that names another
 * family needs its package added (the atlas font test pins every legend's stacks).
 */
export const KNOWN_FONTS = [
  'Abril Fatface',
  'Amiri',
  'Bad Script',
  'Cormorant Garamond',
  'Crimson Pro',
  'Gowun Batang',
  'IM Fell English',
  'IM Fell English SC',
  'Inter',
  'Libre Baskerville',
  'Marck Script',
  'Nanum Myeongjo',
  'Noto Naskh Arabic',
  'Noto Serif',
  'Noto Serif Devanagari',
  'Noto Serif JP',
  'Old Standard TT',
  'PT Serif',
  'Playfair Display SC',
  'Shippori Mincho',
  'Source Serif 4',
  'Yatra One',
] as const;
export type FontFamily = (typeof KNOWN_FONTS)[number];
// Longest first, so "IM Fell English SC" is not read as "IM Fell English" and "Noto Serif JP" not as "Noto Serif".
const BY_LENGTH = [...KNOWN_FONTS].sort((a, b) => b.length - a.length);
/**
 * The families a font field names, in order, fallbacks included (a browser loads a later family only for glyphs the
 * earlier ones lack). A family named "for English ..." comes first: naddaha's body field names its Arabic font first.
 */
export function fontStack(field: string): FontFamily[] {
  const found: { family: FontFamily; at: number }[] = [];
  let rest = field;
  for (const family of BY_LENGTH) {
    const at = rest.indexOf(family);
    if (at < 0) continue;
    found.push({ family, at });
    rest = rest.slice(0, at) + ' '.repeat(family.length) + rest.slice(at + family.length);
  }
  found.sort((a, b) => a.at - b.at);
  const english = found.find((f) => field.startsWith(' for English', f.at + f.family.length));
  return english ? [english.family, ...found.filter((f) => f !== english).map((f) => f.family)] : found.map((f) => f.family);
}
export function themeFonts(theme: { displayFont: string; bodyFont: string }): { display: FontFamily[]; body: FontFamily[] } {
  const display = fontStack(theme.displayFont);
  const body = fontStack(theme.bodyFont);
  if (!display.length || !body.length) throw new ThemeError('no known display or body font');
  return { display, body };
}
