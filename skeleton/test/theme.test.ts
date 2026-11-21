import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AA_LARGE, AA_TEXT, BASE_PALETTE, contrastRatio, resolveTheme } from '../src/theme/contrast.ts';
import { BOOK_INK, PAPER_BASE, PAPER_FLOOR, bookColors } from '../src/book/index.ts';
import { fontStack, parsePalette, ThemeError, themeFonts } from '../src/theme/palette.ts';
import { allLegends, legendById } from './helpers/legends.ts';

// Read from each pack's text by hand (content/legends/<id>.md, "8. Theme pack"): every family named, in order;
// naddaha's body names its Arabic font first and Crimson Pro "for English body text", so Crimson Pro leads.
const STACKS: Record<string, { display: string[]; body: string[] }> = {
  'baba-yaga': { display: ['Bad Script', 'Marck Script'], body: ['PT Serif'] },
  banshee: { display: ['IM Fell English'], body: ['Source Serif 4'] },
  chupacabra: { display: ['Playfair Display SC', 'Abril Fatface'], body: ['Source Serif 4'] },
  draugr: { display: ['IM Fell English SC', 'Cormorant Garamond'], body: ['Crimson Pro'] },
  'el-coco': { display: ['Playfair Display SC'], body: ['Source Serif 4'] },
  'flying-dutchman': { display: ['IM Fell English SC'], body: ['Source Serif 4'] },
  gumiho: { display: ['Nanum Myeongjo'], body: ['Gowun Batang'] },
  'jersey-devil': { display: ['IM Fell English SC'], body: ['Libre Baskerville'] },
  naddaha: { display: ['Amiri', 'Cormorant Garamond'], body: ['Crimson Pro', 'Noto Naskh Arabic'] },
  'spring-heeled-jack': { display: ['IM Fell English SC', 'Old Standard TT'], body: ['Libre Baskerville'] },
  vetala: { display: ['Yatra One', 'Noto Serif'], body: ['Noto Serif Devanagari'] },
  'yuki-onna': { display: ['Shippori Mincho', 'Noto Serif JP'], body: ['Noto Serif JP'] },
};
// Computed in the design (section 8) and expected again here: the pack accent fails as a link colour on these four.
const LINK_FALLBACKS = ['baba-yaga', 'draugr', 'jersey-devil', 'yuki-onna'];

describe('theme packs', () => {
  it('pins a font stack for every legend, and themeFonts reads exactly it', () => {
    expect(allLegends.map((l) => l.id).sort()).toEqual(Object.keys(STACKS).sort());
    for (const l of allLegends) expect(themeFonts(l.theme), l.id).toEqual(STACKS[l.id]);
  });

  it('reads the longer family name, not the shorter one inside it', () => {
    expect(fontStack('IM Fell English SC (Google Fonts)')).toEqual(['IM Fell English SC']);
    expect(fontStack('Noto Serif JP; fallback Noto Serif')).toEqual(['Noto Serif JP', 'Noto Serif']);
    expect(fontStack('Comic Sans')).toEqual([]);
    expect(() => themeFonts({ displayFont: 'Comic Sans', bodyFont: 'PT Serif' })).toThrow(ThemeError);
  });

  it('parses every palette with the six required roles', () => {
    for (const l of allLegends) expect(Object.keys(parsePalette(l.theme.palette)), l.id).toEqual(expect.arrayContaining(['background', 'surface', 'ink', 'accent', 'danger', 'glow']));
    expect(parsePalette('background `#14110F` (night); surface #2A1E17; ink #EADFC8; accent #B3362B; danger #7A1F1A; glow #E8A33D; secondary #1F3B2D; secondary #2B3A5C')).toMatchObject({ background: '#14110f', secondary: '#1f3b2d' });
    expect(() => parsePalette('background #000000; ink #ffffff')).toThrow(ThemeError);
    expect(() => parsePalette('background #000; surface #111111; ink #fff; accent #ff0000; danger #ff0000; glow #ffff00')).toThrow(ThemeError);
  });

  it('every resolved theme meets AA for body text, links and secondary text on background and surface, and 3:1 for large headings', () => {
    for (const l of allLegends) {
      const p = parsePalette(l.theme.palette);
      const v = resolveTheme(l.theme).vars;
      for (const role of ['--color-ink', '--color-accent', '--color-muted'])
        for (const bg of [p.background, p.surface]) expect(contrastRatio(v[role]!, bg), `${l.id} ${role} on ${bg}`).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(v['--color-glow']!, p.background), `${l.id} glow`).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  it('book ink and accent reach 4.5:1 on the paper (floor, base and warm tint) for all twelve packs, the base theme and the Keeper\'s Note page', () => {
    const css = readFileSync(new URL('../src/book/book.css', import.meta.url), 'utf8');
    const tint = /--book-paper-tint:\s*(#[0-9a-f]{6})/i.exec(css)![1]!;
    const pages: [string, Parameters<typeof bookColors>[0]][] = [
      ...allLegends.map((l) => [l.id, resolveTheme(l.theme)] as [string, ReturnType<typeof resolveTheme>]),
      ['base theme', BASE_PALETTE],
      ["keeper's note page (base theme)", BASE_PALETTE],
    ];
    expect(pages).toHaveLength(14);
    for (const [name, theme] of pages) {
      const c = bookColors(theme);
      for (const paper of [PAPER_FLOOR, PAPER_BASE, tint])
        for (const [role, colour] of [['ink', c.ink], ['accent', c.accent]] as const)
          expect(contrastRatio(colour, paper), `${name} ${role} ${colour} on ${paper}`).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
  it('PAPER_FLOOR is no lighter than the darkest paper text can sit on (book.css layers over the texture\'s darkest 8 px patch)', () => {
    // Patch mean measured from shared-atlas-paper-01 (512 px tile, 8 px blocks): rgb(218 202 179). Text sits at least the 1.25rem page
    // padding (20 px) inside the edge: edge gradient 0.18 fades over 7% (about 25 px), the 3rem inset shadow (0.3) is about 0.06 at 20 px.
    const css = readFileSync(new URL('../src/book/book.css', import.meta.url), 'utf8');
    const tint = /--book-paper-tint:\s*#([0-9a-f]{6})/i.exec(css)![1]!.match(/../g)!.map((h) => parseInt(h, 16));
    const mul = (c: number[], s: number[], a: number) => c.map((v, i) => (1 - a) * v + (a * v * s[i]!) / 255);
    let c = [218, 202, 179].map((v, i) => (v * tint[i]!) / 255);
    c = mul(c, [130, 80, 30], 0.1);
    c = mul(c, [120, 90, 40], 0.18 * (1 - 20 / 25));
    c = c.map((v, i) => 0.94 * v + 0.06 * [60, 40, 15][i]!);
    const hex = `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
    expect(contrastRatio(bookColors(BASE_PALETTE).ink, hex)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(bookColors(BASE_PALETTE).accent, hex)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(BOOK_INK, hex), 'the floor is the darker (safer) estimate').toBeGreaterThanOrEqual(contrastRatio(BOOK_INK, PAPER_FLOOR));
  });
  it('falls back to the base accent exactly where the pack accent fails as a link colour', () => {
    const withFallback = allLegends.filter((l) => resolveTheme(l.theme).fallbacks.some((f) => f.startsWith('accent'))).map((l) => l.id);
    expect(withFallback).toEqual(LINK_FALLBACKS);
    for (const id of LINK_FALLBACKS) {
      const r = resolveTheme(legendById(id).theme);
      const accentNotes = r.fallbacks.filter((f) => f.startsWith('accent'));
      expect(accentNotes, id).toHaveLength(1);
      expect(accentNotes[0], id).toMatch(/^accent \(links\): the pack accent .*using the base accent$/);
      expect(r.vars['--color-accent'], id).toBe(BASE_PALETTE.accent);
    }
    expect(resolveTheme(legendById('banshee').theme).vars['--color-accent']).toBe(parsePalette(legendById('banshee').theme.palette).accent);
  });

  it('uses the pack colours and the pinned fonts as CSS variables', () => {
    const r = resolveTheme(legendById('naddaha').theme);
    expect(r.themeColor).toBe('#0b1420');
    expect(r.vars['--font-body']).toBe("'Crimson Pro', 'Noto Naskh Arabic', 'Iowan Old Style', Georgia, serif");
  });

  it('never returns a colour below AA: a pack whose every candidate fails is refused', () => {
    const unreadable = { palette: 'background #ffffff; surface #ffffff; ink #fefefe; accent #fefefe; danger #ff0000; glow #fefefe', displayFont: 'PT Serif', bodyFont: 'PT Serif' };
    expect(() => resolveTheme(unreadable)).toThrow(ThemeError);
  });

  it('known contrast values (WCAG examples)', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });

  it('BASE_PALETTE equals the base tokens in design/tokens.css', () => {
    const css = readFileSync(new URL('../src/design/tokens.css', import.meta.url), 'utf8');
    for (const [role, hex] of Object.entries(BASE_PALETTE)) expect(css, role).toContain(`--color-${role}: ${hex};`);
  });
});
