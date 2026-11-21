// The Book: story text laid out as an old open book (launch-and-polish 5.4). One DOM tree serves both views, so every Anchor
// exists once whether the reader sees pages or one scrolling page. The paging itself is CSS (book.css: columns plus a transform);
// this component measures the DOM, keeps the page number and wires the controls. The skeleton has no UI strings: labels come from
// the app catalogs. Not used without a browser: on the server, and in browsers without CSS columns or ResizeObserver, it renders
// the plain scrolling page (data-view="scroll", controls hidden).
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { readBookPref, writeBookPref, type BookPref } from './bookPref.ts';
import { keyToDelta, pageAfterReflow, pageCount, pageOfOffset } from './pagination.ts';

export interface BookLabels {
  /** Accessible name of the reading region. */
  region: string;
  previous: string;
  next: string;
  /** The "Read as one page" toggle; it is a pressed/not-pressed button, so one label serves both states. */
  toggle: string;
  /** The live "page n of m" text, built by the app from its catalog. */
  indicator: (page: number, total: number) => string;
}
export interface BookProps {
  labels: BookLabels;
  /** The hero image (or any frontispiece): shown alone on the first page or spread, before chapter 1. */
  hero?: ReactNode;
  /** The reading content: chapters (marked `book-chapter`), versions, tables. Rendered once, unchanged, in both views. */
  children: ReactNode;
}

const LANDED_MS = 2000;
const SWIPE_PX = 40;
// Elements that mark where the reader is: blocks the app tags, anchor headings and chapters.
const BLOCKS = '[data-block], [data-anchor-heading], .book-chapter';

interface Metrics {
  width: number;
  gap: number;
  cols: 1 | 2;
  rtl: boolean;
}

const supportsPages = () =>
  typeof ResizeObserver !== 'undefined' && typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('break-before', 'column');
function localStore(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
const clamp = (n: number, last: number) => Math.max(0, Math.min(last, n));

export function Book({ labels, hero, children }: BookProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const [supported, setSupported] = useState(false);
  const [pref, setPref] = useState<BookPref>('pages');
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(1);
  const paged = supported && pref === 'pages';

  const pagedRef = useRef(false);
  const pageRef = useRef(0);
  const countRef = useRef(1);
  const blockRef = useRef<number | null>(null); // index of the block the reader is on
  const hashRef = useRef(false); // the URL hash names an Anchor and the reader has not turned away from it
  const landingRef = useRef(false); // focus is being moved by the hash landing, not by the reader
  const pendingRef = useRef<number | null>(null); // block to keep when the toggle flips the view
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  const blocks = useCallback(() => Array.from(flowRef.current?.querySelectorAll<HTMLElement>(BLOCKS) ?? []), []);
  const metrics = useCallback((): Metrics | null => {
    const flow = flowRef.current;
    if (!flow) return null;
    const cs = getComputedStyle(flow);
    return { width: flow.clientWidth, gap: Number.parseFloat(cs.columnGap) || 0, cols: cs.columnCount === '2' ? 2 : 1, rtl: cs.direction === 'rtl' };
  }, []);
  // Distance from the flow's inline start to the element's inline start. Rects are physical, so right-to-left reads the far edges.
  // Both rects move with the page-turn transform, so the difference does not depend on the current page.
  const startOffset = useCallback((el: Element, m: Metrics) => {
    const a = el.getBoundingClientRect();
    const f = flowRef.current!.getBoundingClientRect();
    return m.rtl ? f.right - a.right : a.left - f.left;
  }, []);

  const show = useCallback((p: number) => {
    pageRef.current = p;
    setPage(p);
  }, []);
  /** Remember the first block on page `p` (else the last block before it) so a reflow can return to the same text. */
  const trackBlock = useCallback(
    (p: number) => {
      const m = metrics();
      if (!m) return;
      const pages = blocks().map((el) => pageOfOffset(startOffset(el, m), m.width, m.gap, m.cols));
      const on = pages.indexOf(p);
      let before = -1;
      for (const [i, q] of pages.entries()) if (q < p) before = i;
      blockRef.current = on >= 0 ? on : before >= 0 ? before : null;
    },
    [blocks, metrics, startOffset],
  );
  const hashTarget = useCallback((): HTMLElement | null => {
    let id = '';
    try {
      id = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return null;
    }
    const el = id ? document.getElementById(id) : null;
    return el && flowRef.current?.contains(el) ? el : null;
  }, []);

  /** Turn to page `p` (clamped). A turn by the reader ends the hash's hold on the page. */
  const goTo = useCallback(
    (p: number, byReader: boolean) => {
      const next = clamp(p, countRef.current - 1);
      if (byReader) hashRef.current = false;
      show(next);
      trackBlock(next);
    },
    [show, trackBlock],
  );

  /** Re-measure after a resize, a font or an image load; stay on the same text, or on the hash's Anchor (it wins). */
  const reflow = useCallback(() => {
    const flow = flowRef.current;
    const m = metrics();
    if (!flow || !m || !pagedRef.current || m.width <= 0) return;
    const total = pageCount(flow.scrollWidth, m.width, m.gap);
    countRef.current = total;
    setCount(total);
    const hashEl = hashRef.current ? hashTarget() : null;
    let target: number;
    // Page of the Anchor's heading, not of the Anchor's box: a card that starts at the foot of a page can carry its heading
    // over to the next page, and the heading is what the reader must see and what receives focus (16.3).
    if (hashEl) target = pageOfOffset(startOffset(hashEl.querySelector('[data-anchor-heading]') ?? hashEl, m), m.width, m.gap, m.cols);
    else {
      const offsets = new Map(blocks().map((el, i) => [String(i), startOffset(el, m)] as const));
      target = pageAfterReflow(blockRef.current === null ? null : String(blockRef.current), offsets, m.width, m.gap, m.cols);
    }
    show(clamp(target, total - 1));
  }, [blocks, hashTarget, metrics, show, startOffset]);

  // Capability and stored choice, before first paint.
  useLayoutEffect(() => {
    setSupported(supportsPages());
    const s = localStore();
    if (s) setPref(readBookPref(s));
  }, []);

  // Tell the CSS which view is on, and keep the reader at the same chapter when the toggle flips the view (17.6).
  useLayoutEffect(() => {
    pagedRef.current = paged;
    document.documentElement.dataset.book = paged ? 'on' : 'off';
    const idx = pendingRef.current;
    pendingRef.current = null;
    if (idx === null || !supported) return;
    if (paged) {
      blockRef.current = idx;
      hashRef.current = false;
      reflow();
    } else blocks()[idx]?.scrollIntoView();
  }, [paged, supported, reflow, blocks]);

  // Reflow on size changes, font loads and image loads while the pages are on.
  useEffect(() => {
    const viewport = viewportRef.current;
    const flow = flowRef.current;
    if (!paged || !viewport || !flow) return;
    let live = true;
    const run = () => live && reflow();
    const ro = new ResizeObserver(run);
    ro.observe(viewport);
    ro.observe(flow);
    flow.addEventListener('load', run, true);
    void document.fonts?.ready.then(run);
    reflow();
    return () => {
      live = false;
      ro.disconnect();
      flow.removeEventListener('load', run, true);
    };
  }, [paged, reflow]);

  // Land on the URL hash in both views: open its page (or scroll), focus its heading without scrolling the window.
  // Runs without column support too: the router no longer scrolls to the hash, so the Book must (16.2).
  useEffect(() => {
    let timer: number | undefined;
    const land = () => {
      const target = hashTarget();
      if (!target) {
        hashRef.current = false;
        return;
      }
      hashRef.current = true;
      if (pagedRef.current) reflow();
      else target.scrollIntoView();
      const heading = target.querySelector<HTMLElement>('[data-anchor-heading]');
      landingRef.current = true;
      heading?.focus({ preventScroll: true });
      landingRef.current = false;
      target.setAttribute('data-landed', '');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => target.removeAttribute('data-landed'), LANDED_MS);
    };
    land();
    window.addEventListener('hashchange', land);
    return () => {
      window.removeEventListener('hashchange', land);
      window.clearTimeout(timer);
    };
  }, [paged, hashTarget, reflow]);

  const turn = (d: -1 | 1 | 'first' | 'last') =>
    goTo(d === 'first' ? 0 : d === 'last' ? countRef.current - 1 : pageRef.current + d, true);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!pagedRef.current || countRef.current <= 1 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const d = keyToDelta(e.key, rootRef.current && getComputedStyle(rootRef.current).direction === 'rtl' ? 'rtl' : 'ltr');
    if (d === null) return;
    e.preventDefault();
    turn(d);
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    touchRef.current = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start || !pagedRef.current || countRef.current <= 1) return;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(e.clientY - start.y)) return;
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    turn((dx < 0) !== rtl ? 1 : -1); // a swipe toward the inline start shows the next page
  };
  // Focus never rests on text that is out of view: turn to the page of whatever receives focus.
  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    const m = metrics();
    if (!pagedRef.current || !m || e.target === e.currentTarget) return;
    const p = clamp(pageOfOffset(startOffset(e.target, m), m.width, m.gap, m.cols), countRef.current - 1);
    if (p !== pageRef.current) goTo(p, !landingRef.current);
  };
  const flip = () => {
    if (pagedRef.current) pendingRef.current = blockRef.current;
    else {
      const i = blocks().findIndex((el) => el.getBoundingClientRect().bottom > 0);
      pendingRef.current = i >= 0 ? i : null;
    }
    const next: BookPref = pref === 'pages' ? 'scroll' : 'pages';
    setPref(next);
    const s = localStore();
    if (s) writeBookPref(s, next);
  };

  const single = paged && count <= 1; // everything fits one page: no controls (the game's small panels)
  const atFirst = page <= 0;
  const atLast = page >= count - 1;
  return (
    <div ref={rootRef} className="book" data-view={paged ? 'pages' : 'scroll'} onKeyDown={onKeyDown}>
      <div
        ref={viewportRef}
        className={paged ? 'book-viewport book-paper' : 'book-viewport'}
        role="region"
        aria-label={labels.region}
        tabIndex={paged ? 0 : undefined}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (touchRef.current = null)}
        onFocus={onFocus}
      >
        <div ref={flowRef} className="book-flow" style={{ '--book-page': page } as CSSProperties}>
          {hero ? <div className="book-frontispiece">{hero}</div> : null}
          {children}
        </div>
      </div>
      <div className="book-controls" hidden={!supported || single}>
        <button type="button" hidden={!paged} aria-label={labels.previous} aria-disabled={atFirst} onClick={() => !atFirst && turn(-1)}>
          <Chevron dir="previous" />
        </button>
        <span className="book-indicator" role="status" aria-live="polite" aria-atomic="true" hidden={!paged}>
          {labels.indicator(page + 1, count)}
        </span>
        <button type="button" hidden={!paged} aria-label={labels.next} aria-disabled={atLast} onClick={() => !atLast && turn(1)}>
          <Chevron dir="next" />
        </button>
        <button type="button" aria-pressed={pref === 'scroll'} onClick={flip}>
          {labels.toggle}
        </button>
      </div>
    </div>
  );
}

/** A chevron that points toward the inline start (previous) or end (next); book.css mirrors it in right-to-left. */
function Chevron({ dir }: { dir: 'previous' | 'next' }) {
  return (
    <svg className="book-chevron" viewBox="0 0 20 20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2">
      <path d={dir === 'next' ? 'M7 3l7 7-7 7' : 'M13 3l-7 7 7 7'} />
    </svg>
  );
}
