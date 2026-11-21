import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { AA_TEXT, BASE_PALETTE, contrastRatio, resolveTheme } from '../src/theme/contrast.ts';
import { parsePalette, ThemeError } from '../src/theme/palette.ts';
import { allLegends, legendById } from './helpers/legends.ts';

const hex = fc.integer({ min: 0, max: 0xffffff }).map((n) => `#${n.toString(16).padStart(6, '0')}`);
const palette = (c: { background: string; surface: string; ink: string; accent: string; glow: string }) =>
  `background ${c.background}; surface ${c.surface}; ink ${c.ink}; accent ${c.accent}; danger #ff0000; glow ${c.glow}`;
const themeOf = (c: Parameters<typeof palette>[0]) => ({ palette: palette(c), displayFont: 'PT Serif', bodyFont: 'PT Serif' });

describe('Property 9: Panel headings reach 4.5:1 on the surface', () => {
  it('for any pack colours, the glow reaches 4.5:1 on the surface and on the background (or the theme is refused)', () => {
    // **Validates: Requirements 22.1, 22.2**
    fc.assert(
      fc.property(fc.record({ background: hex, surface: hex, ink: hex, accent: hex, glow: hex }), (c) => {
        let v: Record<string, string>;
        try {
          v = resolveTheme(themeOf(c)).vars;
        } catch (e) {
          if (e instanceof ThemeError) return; // refused, never returned below AA
          throw e;
        }
        expect(contrastRatio(v['--color-glow']!, c.background)).toBeGreaterThanOrEqual(AA_TEXT);
        expect(contrastRatio(v['--color-glow']!, c.surface)).toBeGreaterThanOrEqual(AA_TEXT);
      }),
      { numRuns: 1000 },
    );
  });

  it('the pack glow is kept when it passes on both; otherwise the base glow, otherwise the ink', () => {
    // **Validates: Requirements 22.1, 22.2**
    fc.assert(
      fc.property(fc.record({ background: hex, surface: hex, ink: hex, accent: hex, glow: hex }), (c) => {
        let r: ReturnType<typeof resolveTheme>;
        try {
          r = resolveTheme(themeOf(c));
        } catch (e) {
          if (e instanceof ThemeError) return;
          throw e;
        }
        const ok = (col: string) => contrastRatio(col, c.background) >= AA_TEXT && contrastRatio(col, c.surface) >= AA_TEXT;
        const expected = ok(c.glow.toLowerCase()) ? c.glow.toLowerCase() : ok(BASE_PALETTE.glow) ? BASE_PALETTE.glow : r.vars['--color-ink'];
        expect(r.vars['--color-glow']).toBe(expected);
      }),
      { numRuns: 500 },
    );
  });

  it('for all twelve real packs, the glow reaches 4.5:1 on the surface and the background', () => {
    // **Validates: Requirements 22.1, 22.2**
    expect(allLegends).toHaveLength(12);
    for (const l of allLegends) {
      const p = parsePalette(l.theme.palette);
      const glow = resolveTheme(l.theme).vars['--color-glow']!;
      expect(contrastRatio(glow, p.surface), `${l.id} on surface`).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(glow, p.background), `${l.id} on background`).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('spring-heeled-jack: its pack glow is 2.8:1 on the surface, so the base glow is used and the fallback is noted', () => {
    // **Validates: Requirements 22.1, 22.2**
    const t = legendById('spring-heeled-jack').theme;
    const p = parsePalette(t.palette);
    expect(contrastRatio(p.glow, p.surface)).toBeLessThan(AA_TEXT);
    const r = resolveTheme(t);
    expect(r.vars['--color-glow']).not.toBe(p.glow);
    expect(r.fallbacks.some((f) => f.startsWith('glow'))).toBe(true);
  });
});
