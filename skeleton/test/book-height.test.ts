// Phase 6 task 6.2 (Requirement 21.1): the book page height rule. Measured before the change at 1280x800: 576 px (variable
// `min(72dvh, 44rem)`, which is the limiting element: no ancestor set a height). The browser numbers (page height, Banshee
// page count 22 -> 21) are in docs/phase-6-notes/decisions.md; this test pins the CSS rule that produces them.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const bookCss = read('../src/book/book.css');
const tokensCss = read('../src/design/tokens.css');

const REM = 16;
const MEASURED_BEFORE_1280 = 576;

/** The value of `--book-page-height` in a stylesheet text, or null. */
function pageHeightRule(css: string): string | null {
  return /--book-page-height:\s*([^;]+);/.exec(css)?.[1]?.trim() ?? null;
}

/** Evaluates `clamp(Arem, calc(100dvh - var(--app-header-h) - Brem), Crem)` in px for a viewport height; null if another shape. */
function evalPageHeight(rule: string, viewportH: number, headerPx: number): number | null {
  const m = /^clamp\(\s*([\d.]+)rem,\s*calc\(100dvh - var\(--app-header-h\) - ([\d.]+)rem\),\s*([\d.]+)rem\s*\)$/.exec(rule);
  if (!m) return null;
  const [min, off, max] = [m[1], m[2], m[3]].map((x) => Number(x) * REM) as [number, number, number];
  return Math.min(max, Math.max(min, viewportH - headerPx - off));
}

const headerPx = (() => {
  const v = /--app-header-h:\s*([\d.]+)rem/.exec(tokensCss)?.[1];
  return v ? Number(v) * REM : NaN;
})();

describe('book page height (Requirement 21.1)', () => {
  const rule = pageHeightRule(bookCss);

  it('uses the viewport height minus the header, clamped', () => {
    expect(rule).not.toBeNull();
    expect(evalPageHeight(rule ?? '', 800, headerPx)).not.toBeNull();
    expect(headerPx).toBe(56);
  });

  it('is at least 60% of the viewport and 480 px at 1280x800, and taller than the measured 576 px', () => {
    const h = evalPageHeight(rule ?? '', 800, headerPx) ?? 0;
    expect(h).toBeGreaterThanOrEqual(480);
    expect(h).toBeGreaterThanOrEqual(0.6 * 800);
    expect(h).toBeGreaterThan(MEASURED_BEFORE_1280);
  });

  it('stays inside the clamp on a short and a very tall viewport', () => {
    expect(evalPageHeight(rule ?? '', 400, headerPx)).toBe(30 * REM);
    expect(evalPageHeight(rule ?? '', 4000, headerPx)).toBe(52 * REM);
  });

  it('drives the viewport block-size and the plate limit', () => {
    expect(bookCss).toMatch(/\.book-viewport\s*\{[^}]*block-size:\s*var\(--book-page-height\)/);
    expect(bookCss).toMatch(/\.book-plate\s*\{[^}]*max-block-size:\s*var\(--book-page-height\)/);
  });

  it('the old rule and a fixed-height rule would fail', () => {
    expect(evalPageHeight('min(72dvh, 44rem)', 800, headerPx)).toBeNull();
    const fixed = 'clamp(30rem, calc(100dvh - var(--app-header-h) - 15rem), 52rem)';
    expect(evalPageHeight(fixed, 800, headerPx) ?? 0).toBeLessThanOrEqual(MEASURED_BEFORE_1280);
  });
});
