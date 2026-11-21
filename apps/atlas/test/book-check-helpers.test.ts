import { describe, expect, it } from 'vitest';
// @ts-expect-error plain JS script without type declarations
import * as bc from '../scripts/book-check.mjs';

type Fn = (...a: any[]) => any;
const { atColumnTop, contrastOfCss, contrastRatio, filterAnchors, legendIdsFromHrefs, maxDurationMs, parseArgs, parseCssColor, parseIndicator } = bc as unknown as {
  atColumnTop: Fn; contrastOfCss: Fn; contrastRatio: Fn; filterAnchors: Fn; legendIdsFromHrefs: Fn; maxDurationMs: Fn; parseArgs: Fn; parseCssColor: Fn; parseIndicator: Fn;
};

describe('book-check helpers (no browser)', () => {
  it('parses arguments and rejects bad ones', () => {
    expect(parseArgs([])).toMatchObject({ base: 'http://localhost:3001', out: 'docs/phase-5-notes/book-check-g5.json', slow4g: false });
    expect(parseArgs(['--', '--base', 'http://localhost:4000/', '--slow4g', '--out', 'x.json'])).toMatchObject({ base: 'http://localhost:4000', out: 'x.json', slow4g: true });
    expect(() => parseArgs(['--nope'])).toThrow();
    expect(() => parseArgs(['--base'])).toThrow();
    expect(() => parseArgs(['--base', 'ftp://x'])).toThrow();
  });

  it('keeps only stored anchors of the legend, once each', () => {
    const ids = ['banshee--ch-1', 'banshee--ch-1', 'banshee--versions', 'banshee--versions--v-a', 'other--ch-1', 'banshee--ch-0', 'banshee', 'main', 'banshee--ch-12'];
    expect(filterAnchors(ids, 'banshee')).toEqual(['banshee--ch-1', 'banshee--versions', 'banshee--versions--v-a', 'banshee--ch-12']);
  });

  it('reads legend ids from hrefs without the Keeper\'s Note', () => {
    expect(legendIdsFromHrefs(['/legends/banshee', '/legends/keepers-note', '/legends/banshee/', '/legends/a-b#x', '/about', '/legends/Bad'])).toEqual(['banshee', 'a-b']);
  });

  it('computes contrast like WCAG', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(parseCssColor('rgb(43, 29, 18)')).toEqual([43, 29, 18]);
    expect(parseCssColor('#a89368')).toEqual([168, 147, 104]);
    expect(parseCssColor('oklch(1 0 0)')).toBeNull();
    expect(contrastOfCss('#2b1d12', '#a89368')).toBeGreaterThan(4.5);
    expect(contrastOfCss('#a89368', '#a89368')).toBeCloseTo(1, 5);
    expect(contrastOfCss('nope', '#fff')).toBeNull();
  });

  it('reads the indicator, page boundaries and durations', () => {
    expect(parseIndicator('Page 2 of 7')).toEqual({ page: 2, count: 7 });
    expect(parseIndicator('Page 2')).toBeNull();
    expect(atColumnTop(0)).toBe(true);
    expect(atColumnTop(1)).toBe(true);
    expect(atColumnTop(-1.2)).toBe(true);
    expect(atColumnTop(300)).toBe(false); // lower in the column: not a new page (the old left-offset test passed or failed this wrongly)
    expect(atColumnTop(Number.NaN)).toBe(false);
    expect(maxDurationMs('0s')).toBe(0);
    expect(maxDurationMs('0.3s, 300ms')).toBe(300);
  });
});
