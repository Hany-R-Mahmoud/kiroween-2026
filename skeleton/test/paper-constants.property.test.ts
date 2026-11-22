import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { BOOK_ACCENT, BOOK_CARD, BOOK_EMBER, BOOK_INK, BOOK_TINT } from '../src/book/bookColors.ts';
import { allDecls, blockDecls, readSource, resolve, stripComments } from './helpers/uiContrast.ts';

// CSS variable in book.css against the constant in bookColors.ts
const PAIRS = [
  ['--book-ink', BOOK_INK],
  ['--book-accent', BOOK_ACCENT],
  ['--book-card', BOOK_CARD],
  ['--book-paper-tint', BOOK_TINT],
  ['--book-ember', BOOK_EMBER],
] as const;

/** names of the pairs whose CSS value differs from the TypeScript constant */
const disagreements = (css: string): string[] => {
  const vars = { ...allDecls(stripComments(css)), ...blockDecls(css, ':root') };
  return PAIRS.filter(([name, ts]) => {
    try {
      return resolve(`var(${name})`, vars) !== ts.toLowerCase();
    } catch {
      return true; // a variable that is gone disagrees
    }
  }).map(([name]) => name);
};

const book = readSource('skeleton/src/book/book.css');
const hex = fc.integer({ min: 0, max: 0xffffff }).map((n) => `#${n.toString(16).padStart(6, '0')}`);

describe('Property 3: Paper constants agree between CSS and TypeScript', () => {
  // Feature: ui-rework, Property 3: Paper constants agree between CSS and TypeScript
  it('ink, accent, card, tint and ember are equal in book.css and bookColors.ts', () => {
    // **Validates: Requirements 6.6**
    expect(disagreements(book)).toEqual([]);
  });
  it('changing any one CSS value to a different colour is reported by name (100 runs)', () => {
    // **Validates: Requirements 6.6**
    fc.assert(
      fc.property(fc.integer({ min: 0, max: PAIRS.length - 1 }), hex, (i, colour) => {
        const [name, ts] = PAIRS[i]!;
        fc.pre(colour.toLowerCase() !== ts.toLowerCase());
        const css = book.replace(new RegExp(`(${name}:\\s*)#[0-9a-fA-F]{6}`), `$1${colour}`);
        expect(css).not.toBe(book);
        expect(disagreements(css)).toEqual([name]);
      }),
      { numRuns: 100 },
    );
  });
  it('a variable removed from book.css is reported', () => {
    expect(disagreements(book.replace(/--book-card:[^;]+;/, ''))).toEqual(['--book-card']);
  });
});
