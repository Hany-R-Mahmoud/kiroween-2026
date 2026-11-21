import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { BOOK_ACCENT, BOOK_INK, PAPER_FLOOR, bookColors } from '../src/book/index.ts';
import { AA_TEXT, BASE_PALETTE, contrastRatio, resolveTheme } from '../src/theme/contrast.ts';
import { allLegends } from './helpers/legends.ts';

const hex = fc.integer({ min: 0, max: 0xffffff }).map((n) => `#${n.toString(16).padStart(6, '0')}`);
const asTheme = (ink: string, accent: string) => ({ ...BASE_PALETTE, ink, accent });

describe('Property 8: Book ink and accent reach 4.5:1 on the paper', () => {
  it('for any ink and accent, the returned colours reach 4.5:1 on the paper floor', () => {
    // **Validates: Requirements 18.1, 18.2**
    fc.assert(
      fc.property(hex, hex, (ink, accent) => {
        const c = bookColors(asTheme(ink, accent));
        expect(contrastRatio(c.ink, PAPER_FLOOR)).toBeGreaterThanOrEqual(AA_TEXT);
        expect(contrastRatio(c.accent, PAPER_FLOOR)).toBeGreaterThanOrEqual(AA_TEXT);
      }),
      { numRuns: 500 },
    );
  });
  it('pack colours are kept when they pass; the book colours are used only when they fail', () => {
    // **Validates: Requirements 18.1, 18.2**
    fc.assert(
      fc.property(hex, hex, (ink, accent) => {
        const c = bookColors(asTheme(ink, accent));
        expect(c.ink).toBe(contrastRatio(ink, PAPER_FLOOR) >= AA_TEXT ? ink : BOOK_INK);
        expect(c.accent).toBe(contrastRatio(accent, PAPER_FLOOR) >= AA_TEXT ? accent : BOOK_ACCENT);
      }),
      { numRuns: 500 },
    );
  });
  it('invalid colour values fall back to the book colours', () => {
    fc.assert(fc.property(fc.string(), fc.string(), (ink, accent) => {
      fc.pre(!/^#[0-9a-fA-F]{6}$/.test(ink) && !/^#[0-9a-fA-F]{6}$/.test(accent));
      expect(bookColors(asTheme(ink, accent))).toEqual({ ink: BOOK_INK, accent: BOOK_ACCENT });
    }));
  });
  it('the twelve packs and the base theme (the Keeper\'s Note page uses it) reach 4.5:1; the pack accent and fonts are untouched (18.5)', () => {
    // **Validates: Requirements 18.1, 18.2**
    expect(allLegends).toHaveLength(12);
    for (const l of allLegends) {
      const theme = resolveTheme(l.theme);
      const before = JSON.stringify(theme);
      const c = bookColors(theme);
      expect(JSON.stringify(theme), `${l.id} theme (fonts, glow) untouched`).toBe(before);
      expect(Object.keys(c).sort(), l.id).toEqual(['accent', 'ink']);
      expect(contrastRatio(c.ink, PAPER_FLOOR), `${l.id} ink`).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(c.accent, PAPER_FLOOR), `${l.id} accent`).toBeGreaterThanOrEqual(AA_TEXT);
      const packAccent = theme.vars['--color-accent']!;
      if (contrastRatio(packAccent, PAPER_FLOOR) >= AA_TEXT) expect(c.accent, `${l.id} keeps its accent`).toBe(packAccent);
    }
    const base = bookColors(BASE_PALETTE);
    expect(contrastRatio(base.ink, PAPER_FLOOR)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(base.accent, PAPER_FLOOR)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
