// Book view page maths (pure; the Book component measures the DOM and calls these). One page is one view: one column on a
// phone, two columns (a spread) from 1024 px. Distances are CSS pixels measured along the inline axis of the flow.

/** Pixel tolerance for sub-pixel layout: an element starting a hair before a page boundary still belongs to the next page. */
const EDGE_TOLERANCE = 0.5;

const finite = (n: number) => Number.isFinite(n);

/** Distance from one page start to the next: the view width plus the gutter. */
function stride(viewWidth: number, gap: number, columnsPerView: 1 | 2): number {
  // Each column is (view - (cols - 1) * gap) / cols wide and is followed by one gap, so a view always advances by view + gap.
  const column = (viewWidth - (columnsPerView - 1) * gap) / columnsPerView;
  return columnsPerView * (column + gap);
}

/** Number of pages in a flow whose scroll width is `scrollWidth`. At least 1; bad measurements give 1. */
export function pageCount(scrollWidth: number, viewWidth: number, gap: number): number {
  if (!finite(scrollWidth) || !finite(viewWidth) || !finite(gap) || viewWidth <= 0 || gap < 0 || scrollWidth <= 0) return 1;
  return Math.max(1, Math.ceil((scrollWidth + gap - EDGE_TOLERANCE) / (viewWidth + gap)));
}

/** Zero-based page that holds an element whose inline start is `offset` px from the flow's inline start. */
export function pageOfOffset(offset: number, viewWidth: number, gap: number, columnsPerView: 1 | 2): number {
  if (!finite(offset) || !finite(viewWidth) || !finite(gap) || viewWidth <= 0 || gap < 0 || offset <= 0) return 0;
  const s = stride(viewWidth, gap, columnsPerView);
  if (!(s > 0)) return 0;
  return Math.floor((offset + EDGE_TOLERANCE) / s);
}

/**
 * Page to show after a reflow (resize, font load): the page of the block the reader was on, found by the block's new offset.
 * Unknown or missing block: the first page. (The URL hash, when it names an Anchor, is applied by the caller afterwards
 * and wins over this.)
 */
export function pageAfterReflow(
  firstVisibleBlockId: string | null,
  blockOffsets: ReadonlyMap<string, number>,
  viewWidth: number,
  gap: number,
  columnsPerView: 1 | 2,
): number {
  if (firstVisibleBlockId === null) return 0;
  const offset = blockOffsets.get(firstVisibleBlockId);
  return offset === undefined ? 0 : pageOfOffset(offset, viewWidth, gap, columnsPerView);
}

/** What a key does to the page: -1 previous, 1 next, 'first', 'last', or null (not ours). Arrows swap in right-to-left. */
export function keyToDelta(key: string, dir: 'ltr' | 'rtl'): -1 | 1 | 'first' | 'last' | null {
  switch (key) {
    case 'ArrowRight':
      return dir === 'rtl' ? -1 : 1;
    case 'ArrowLeft':
      return dir === 'rtl' ? 1 : -1;
    case 'PageDown':
      return 1;
    case 'PageUp':
      return -1;
    case 'Home':
      return 'first';
    case 'End':
      return 'last';
    default:
      return null;
  }
}
