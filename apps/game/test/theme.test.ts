import { readFileSync } from 'node:fs';
import { AA_LARGE, AA_TEXT, BASE_PALETTE, contrastRatio, hubContrastReport, resolveTheme } from '@kiroween/skeleton/client';
import { describe, expect, it } from 'vitest';
import { themeClass, themeColorMeta, themeStyle } from '../src/lib/theme';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const PACK = {
  palette: 'background #0b1420; surface #14202e; ink #e6edf3; accent #6fb7d6; danger #b23a3a; glow #bfe3f2',
  displayFont: 'Playfair Display SC',
  bodyFont: 'Crimson Pro',
};

describe('hub theme (Hall and Tutorial_Room)', () => {
  it('every text pairing meets its WCAG AA minimum, and the report pins the fear fill edge', () => {
    const report = hubContrastReport();
    expect(report.filter((p) => !p.ok)).toEqual([]);
    expect(report.find((p) => p.name.startsWith('danger fill'))!.ratio).toBeGreaterThanOrEqual(AA_LARGE);
    expect(report.find((p) => p.name === 'ink on background')!.ratio).toBeGreaterThanOrEqual(AA_TEXT);
  });
  it('the hub tokens in tokens.css equal the base palette, and theme.css redefines none of them', () => {
    const tokens = read('../../../skeleton/src/design/tokens.css');
    for (const [k, v] of Object.entries({ bg: BASE_PALETTE.bg, surface: BASE_PALETTE.surface, ink: BASE_PALETTE.ink, muted: BASE_PALETTE.muted, accent: BASE_PALETTE.accent, glow: BASE_PALETTE.glow }))
      expect(tokens, k).toContain(`--color-${k}: ${v};`);
    const css = read('../src/styles/theme.css').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i); // components use variables, never raw colours
    expect(css).not.toMatch(/--(?:color|font)-[\w-]+\s*:/); // no base token is redefined here
  });
  it('the hub uses no pack: no inline style', () => {
    expect(themeStyle(null)).toEqual({});
    expect(themeClass(null)).toBe('hub-theme');
    expect(themeColorMeta(null)).toEqual([]);
  });
});

describe('World theme', () => {
  const resolved = resolveTheme(PACK);
  it('applies exactly the resolved variables, readable on the pack background and surface', () => {
    const style = themeStyle(resolved) as Record<string, string>;
    expect(style).toEqual(resolved.vars);
    for (const role of ['--color-ink', '--color-accent', '--color-muted'])
      for (const bg of ['--color-bg', '--color-surface']) expect(contrastRatio(style[role]!, style[bg]!), `${role} on ${bg}`).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(style['--color-glow']!, style['--color-bg']!)).toBeGreaterThanOrEqual(AA_LARGE);
    expect(themeClass(resolved)).toBe('world-theme');
    expect(themeColorMeta(resolved)).toEqual([{ name: 'theme-color', content: '#0b1420' }]);
  });
  it('drops any variable resolveTheme does not own', () => {
    const style = themeStyle({ vars: { ...resolved.vars, '--evil': 'url(x)', 'background-image': 'url(x)' } }) as Record<string, string>;
    expect(Object.keys(style).sort()).toEqual(Object.keys(resolved.vars).sort());
  });
});

describe('fonts in the root', () => {
  it('the root links the base families', () => {
    const root = read('../src/routes/__root.tsx');
    expect(root).toContain('fontLinks(BASE_FONTS)');
    expect(read('../src/fonts.ts')).toContain("['IM Fell English SC', 'Source Serif 4', 'Inter']");
  });
});
