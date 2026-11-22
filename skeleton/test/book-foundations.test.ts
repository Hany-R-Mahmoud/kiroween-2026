import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BASE_PALETTE, contrastRatio } from '../src/theme/contrast.ts';
import { BOOK_ACCENT, BOOK_INK, PAPER_FLOOR, bookColors, keyToDelta, pageCount, pageOfOffset, readBookPref, writeBookPref } from '../src/book/index.ts';

// Smoke tests for task 5.1; the property tests (Properties 4 to 8) come in 5.2 and 5.3.
describe('book foundations', () => {
  it('pages: 1 for one view, 2 for one view plus a gutter and a column, offsets map to pages', () => {
    expect(pageCount(300, 300, 40)).toBe(1);
    expect(pageCount(640, 300, 40)).toBe(2);
    expect(pageOfOffset(0, 300, 40, 1)).toBe(0);
    expect(pageOfOffset(340, 300, 40, 1)).toBe(1);
    expect(pageOfOffset(340, 300, 40, 2)).toBe(1);
  });
  it('arrow keys swap in rtl', () => {
    expect(keyToDelta('ArrowRight', 'ltr')).toBe(1);
    expect(keyToDelta('ArrowRight', 'rtl')).toBe(-1);
    expect(keyToDelta('x', 'ltr')).toBeNull();
  });
  it('the preference round-trips and defaults to pages', () => {
    const m = new Map<string, string>();
    const s = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    expect(readBookPref(s)).toBe('pages');
    writeBookPref(s, 'scroll');
    expect(readBookPref(s)).toBe('scroll');
  });
  it('book ink and accent reach 4.5:1 on the paper floor; the base palette falls back', () => {
    expect(contrastRatio(BOOK_INK, PAPER_FLOOR)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(BOOK_ACCENT, PAPER_FLOOR)).toBeGreaterThanOrEqual(4.5);
    expect(bookColors(BASE_PALETTE)).toEqual({ ink: BOOK_INK, accent: BOOK_ACCENT });
  });
  it('book.css names only the shared paper image', () => {
    const css = readFileSync(new URL('../src/book/book.css', import.meta.url), 'utf8');
    expect([...css.matchAll(/\/media\/[^'")]+/g)].map((m) => m[0])).toEqual(['/media/shared/shared-atlas-paper-01.webp']);
  });
});

describe('book.css: dark-theme colours do not reach the paper', () => {
  it('re-points ink, muted, glow and accent inside .book-paper at book colours that reach 4.5:1 on the paper floor', async () => {
    const { readFileSync } = await import('node:fs');
    const { contrastRatio } = await import('../src/theme/contrast.ts');
    const { BOOK_ACCENT, BOOK_INK, PAPER_FLOOR } = await import('../src/book/bookColors.ts');
    const css = readFileSync(new URL('../src/book/book.css', import.meta.url), 'utf8');
    const rules = [...css.matchAll(/(?:^|\n)\.book-paper\s*\{([^}]*)\}/g)].map((m) => m[1]!).join('\n');
    const decl = (name: string) => new RegExp(`${name}:\\s*var\\((--book-[a-z]+)\\)`).exec(rules)?.[1];
    const book: Record<string, string> = { '--book-ink': BOOK_INK, '--book-accent': BOOK_ACCENT };
    for (const v of ['--color-ink', '--color-muted', '--color-glow', '--color-accent']) {
      const target = decl(v);
      expect(target, v).toBeDefined();
      expect(contrastRatio(book[target!]!, PAPER_FLOOR), v).toBeGreaterThanOrEqual(4.5);
    }
  });
});
describe('book.css: Phase 6 re-pointed variables', () => {
  const NEW = ['--color-bg', '--color-surface', '--color-surface-raised', '--color-rule', '--color-link', '--color-ring', '--color-danger-ink'];
  const declared = (css: string): string[] => {
    const rules = [...css.matchAll(/(?:^|\n)\.book-paper\s*\{([^}]*)\}/g)].map((m) => m[1]!).join('\n');
    return NEW.filter((v) => new RegExp(`(^|[;\\s])${v}\\s*:\\s*var\\(--book-[a-z-]+\\)`).test(rules));
  };
  const css = readFileSync(new URL('../src/book/book.css', import.meta.url), 'utf8');
  it('declares each of them in the plain .book-paper block, pointing at a --book-* variable', () => {
    expect(declared(css)).toEqual(NEW);
  });
  it('fails when one is removed', () => {
    for (const v of NEW) expect(declared(css.replace(new RegExp(`${v}:[^;]+;`), ''))).not.toContain(v);
  });
});
