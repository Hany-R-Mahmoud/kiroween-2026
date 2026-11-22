import fc from 'fast-check';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FearMeter } from '../src/components/FearMeter.tsx';
import type { en } from '../src/i18n/en.ts';
import { translate } from '../src/i18n/t.ts';

// Same stand-in as the other component tests: the real hook reads the language from the router's root loader.
vi.mock('../src/i18n/useT.ts', () => ({
  useT: () => (key: keyof typeof en, vars?: Record<string, string | number>) => translate('en', key, vars),
  useLang: () => 'en',
}));
vi.mock('../src/i18n/useT', () => ({
  useT: () => (key: keyof typeof en, vars?: Record<string, string | number>) => translate('en', key, vars),
  useLang: () => 'en',
}));

const render = (value: number) => renderToStaticMarkup(createElement(FearMeter, { value, mediaBase: '' }));

/** What the meter must show for any input: finite numbers rounded and clamped to 0..100, everything else 0. */
const expected = (v: number): number => (Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : 0);

/** The three places the value is printed, read back from the markup. */
function read(html: string) {
  const text = /<span class="fear-meter-text"[^>]*>Fear: (-?[\d.e+]+|NaN|Infinity) of 100<\/span>/.exec(html)?.[1];
  const now = /aria-valuenow="([^"]*)"/.exec(html)?.[1];
  const width = /class="fear-meter-fill" style="[^"]*inline-size:([\d.e+-]+)%/.exec(html)?.[1];
  const label = /aria-label="Fear: ([^"]*) of 100"/.exec(html)?.[1];
  return { text, now, width, label };
}

const anyNumber = fc.oneof(
  fc.double({ min: -1e6, max: 1e6 }),
  fc.integer({ min: -50, max: 150 }),
  fc.constantFrom(Number.NaN, Infinity, -Infinity, -0.4, 99.5, 100.4, 0.5),
);

describe('Property 9: the fear text matches the fear value', () => {
  // Feature: ui-rework, Property 9: The fear text matches the fear value
  // **Validates: Requirements 25.1, 25.2, 25.4**
  it('visible text, aria-valuenow, label and fill width use one clamped, rounded value', () => {
    fc.assert(
      fc.property(anyNumber, (v) => {
        const n = expected(v);
        const r = read(render(v));
        expect(r.text).toBe(String(n));
        expect(r.now).toBe(String(n));
        expect(r.label).toBe(String(n));
        expect(Number(r.width)).toBeCloseTo(n, 6);
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(100);
      }),
      { numRuns: 200 },
    );
  });

  it('the visible text is aria-hidden so the meter label is the only announcement', () => {
    expect(render(24)).toMatch(/<span class="fear-meter-text" aria-hidden="true">Fear: 24 of 100<\/span>/);
  });

  it.each([
    [-5, 0],
    [250, 100],
    [Number.NaN, 0],
    [41.6, 42],
  ])('example %s shows %s', (v, n) => {
    const r = read(render(v));
    expect([r.text, r.now, r.width]).toEqual([String(n), String(n), String(n)]);
  });

  it('checker self-test: a mismatched text is detected', () => {
    const bad = render(30).replace('Fear: 30 of 100</span>', 'Fear: 31 of 100</span>');
    const r = read(bad);
    expect(r.text).not.toBe(r.now);
  });
});
