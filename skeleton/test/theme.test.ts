import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AA_LARGE, AA_TEXT, BASE_PALETTE, contrastRatio, resolveTheme } from '../src/theme/contrast.ts';
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

  it('falls back to the base accent exactly where the pack accent fails as a link colour', () => {
    const withFallback = allLegends.filter((l) => resolveTheme(l.theme).fallbacks.length > 0).map((l) => l.id);
    expect(withFallback).toEqual(LINK_FALLBACKS);
    for (const id of LINK_FALLBACKS) {
      const r = resolveTheme(legendById(id).theme);
      expect(r.fallbacks, id).toHaveLength(1);
      expect(r.fallbacks[0], id).toMatch(/^accent \(links\): the pack accent .*using the base accent$/);
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
