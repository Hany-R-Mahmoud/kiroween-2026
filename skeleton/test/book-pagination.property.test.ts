import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { BOOK_PREF_KEY, DEFAULT_BOOK_PREF, keyToDelta, pageAfterReflow, pageCount, pageOfOffset, readBookPref, writeBookPref, type BookPref } from '../src/book/index.ts';

// Properties 4 to 7 of launch-and-polish (Requirements 15.8, 15.9, 15.11, 15.13, 16.1-16.3, 16.6, 17.4).
// Layout numbers are whole CSS pixels, as the browser reports offsets of laid-out text.
const layout = fc.record({
  view: fc.integer({ min: 120, max: 1600 }),
  gap: fc.integer({ min: 0, max: 80 }),
  cols: fc.constantFrom<1 | 2>(1, 2),
});
const strideOf = (view: number, gap: number) => view + gap; // one page advance, whatever the column count

describe('Property 4: an anchor\'s page makes the anchor visible', () => {
  /** An anchor on `page`, `r` px into the view (never inside the gutter), in a flow that ends after it. */
  const anchor = fc.tuple(layout, fc.integer({ min: 0, max: 40 }), fc.nat(), fc.nat(), fc.integer({ min: 1, max: 500 })).map(([l, page, r, , extra]) => {
    const inView = r % l.view;
    const offset = page * strideOf(l.view, l.gap) + inView;
    return { ...l, page, offset, scrollWidth: offset + extra };
  });

  it('the page is inside [0, pageCount) and the anchor lies inside the view of that page', () => {
    fc.assert(
      fc.property(anchor, ({ view, gap, cols, offset, scrollWidth, page }) => {
        const p = pageOfOffset(offset, view, gap, cols);
        expect(p).toBe(page);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThan(pageCount(scrollWidth, view, gap));
        const within = offset - p * strideOf(view, gap);
        expect(within).toBeGreaterThanOrEqual(0);
        expect(within).toBeLessThan(view);
      }),
    );
  });

  it('a larger offset never gives a smaller page', () => {
    fc.assert(
      fc.property(layout, fc.integer({ min: 0, max: 100000 }), fc.integer({ min: 0, max: 100000 }), ({ view, gap, cols }, a, b) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        expect(pageOfOffset(lo, view, gap, cols)).toBeLessThanOrEqual(pageOfOffset(hi, view, gap, cols));
      }),
    );
  });
});

describe('Property 5: reflow keeps the reader on the same text, and the hash wins', () => {
  const blocks = fc.array(fc.integer({ min: 0, max: 60000 }), { minLength: 1, maxLength: 30 });

  it('returns the page that holds the first visible block in the new layout', () => {
    fc.assert(
      fc.property(blocks, blocks, fc.nat(), layout, (_before, after, pick, { view, gap, cols }) => {
        const offsets = new Map<string, number>(after.map((o, i) => [`b${i}`, o] as const));
        const id = `b${pick % after.length}`;
        expect(pageAfterReflow(id, offsets, view, gap, cols)).toBe(pageOfOffset(offsets.get(id)!, view, gap, cols));
      }),
    );
  });

  it('the page of a hash Anchor wins: asking with the anchor gives the anchor\'s page, not the reader\'s block', () => {
    // The hash rule itself (read location.hash, prefer it) lives in Book.tsx (task 5.4). The pure part tested here: given the
    // anchor as the block to keep, the result is the anchor's page whatever the first visible block was.
    fc.assert(
      fc.property(blocks, fc.nat(), layout, (offs, a, { view, gap, cols }) => {
        const offsets = new Map<string, number>(offs.map((o, i) => [`b${i}`, o] as const));
        const anchorId = `b${a % offs.length}`;
        expect(pageAfterReflow(anchorId, offsets, view, gap, cols)).toBe(pageOfOffset(offsets.get(anchorId)!, view, gap, cols));
      }),
    );
  });

  it('no block, or a block that no longer exists, gives the first page', () => {
    expect(pageAfterReflow(null, new Map([['a', 900]]), 300, 40, 1)).toBe(0);
    expect(pageAfterReflow('gone', new Map([['a', 900]]), 300, 40, 1)).toBe(0);
  });
});

describe('Property 6: page keys move within bounds in either direction', () => {
  const KEYS = ['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp', 'Home', 'End'];
  const dirs = fc.constantFrom<'ltr' | 'rtl'>('ltr', 'rtl');
  const apply = (key: string, dir: 'ltr' | 'rtl', page: number, count: number) => {
    const d = keyToDelta(key, dir);
    if (d === null) return page;
    const next = d === 'first' ? 0 : d === 'last' ? count - 1 : page + d;
    return Math.min(count - 1, Math.max(0, next));
  };
  const state = fc.integer({ min: 1, max: 500 }).chain((count) => fc.tuple(fc.constant(count), fc.integer({ min: 0, max: count - 1 })));

  it('every supported key keeps the page in [0, count - 1]', () => {
    fc.assert(
      fc.property(fc.constantFrom(...KEYS), dirs, state, (key, dir, [count, page]) => {
        const n = apply(key, dir, page, count);
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(count - 1);
      }),
    );
  });

  it('ArrowRight and ArrowLeft are opposite and swap in rtl; paging keys do not depend on direction', () => {
    fc.assert(
      fc.property(dirs, (dir) => {
        const r = keyToDelta('ArrowRight', dir) as number;
        const l = keyToDelta('ArrowLeft', dir) as number;
        expect(r).toBe(-l);
        expect(keyToDelta('ArrowRight', 'ltr')).toBe(-(keyToDelta('ArrowRight', 'rtl') as number));
        expect(keyToDelta('PageDown', dir)).toBe(1);
        expect(keyToDelta('PageUp', dir)).toBe(-1);
      }),
    );
  });

  it('Home and End reach the first and last page from any page', () => {
    fc.assert(
      fc.property(dirs, state, (dir, [count, page]) => {
        expect(apply('Home', dir, page, count)).toBe(0);
        expect(apply('End', dir, page, count)).toBe(count - 1);
      }),
    );
  });

  it('unsupported keys change nothing', () => {
    fc.assert(
      fc.property(fc.string().filter((k) => !KEYS.includes(k)), dirs, state, (key, dir, [count, page]) => {
        expect(keyToDelta(key, dir)).toBeNull();
        expect(apply(key, dir, page, count)).toBe(page);
      }),
    );
  });
});

describe('Property 7: the reading-mode preference round-trips', () => {
  const memory = (initial?: string) => {
    const m = new Map<string, string>();
    if (initial !== undefined) m.set(BOOK_PREF_KEY, initial);
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };

  it('read after write returns the written value', () => {
    fc.assert(
      fc.property(fc.constantFrom<BookPref>('pages', 'scroll'), (v) => {
        const s = memory();
        writeBookPref(s, v);
        expect(readBookPref(s)).toBe(v);
      }),
    );
  });

  it('any other stored string, or nothing stored, gives the default', () => {
    fc.assert(
      fc.property(fc.string().filter((v) => v !== 'pages' && v !== 'scroll'), (v) => {
        expect(readBookPref(memory(v))).toBe(DEFAULT_BOOK_PREF);
      }),
    );
    expect(readBookPref(memory())).toBe('pages');
  });

  it('a storage that throws never throws out of read or write', () => {
    const boom = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
    };
    fc.assert(
      fc.property(fc.constantFrom<BookPref>('pages', 'scroll'), (v) => {
        expect(() => writeBookPref(boom, v)).not.toThrow();
        expect(readBookPref(boom)).toBe(DEFAULT_BOOK_PREF);
      }),
    );
  });
});
