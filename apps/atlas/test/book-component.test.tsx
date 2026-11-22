import { Book, toggleState, type BookLabels } from '@kiroween/skeleton/book';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { translate } from '../src/i18n/t';
// Server markup of the Book (no DOM). Page layout, keys, swipe, focus turning and reflow need a real browser: task 5.8 (book-check).
const labels = (lang: 'en' | 'ar'): BookLabels => ({
  region: translate(lang, 'book.region'),
  previous: translate(lang, 'book.previous'),
  next: translate(lang, 'book.next'),
  toggle: translate(lang, 'book.readAsOnePage'),
  toggleBook: translate(lang, 'book.readAsBook'),
  indicator: (n, m) => translate(lang, 'book.pageOf', { n, m }),
});
const content = (
  <>
    <section id="x--ch-1" className="book-chapter">
      <h2 data-anchor-heading tabIndex={-1}>
        One
      </h2>
    </section>
    <section id="x--ch-2" className="book-chapter">
      <h2 data-anchor-heading tabIndex={-1}>
        Two
      </h2>
    </section>
  </>
);
const html = renderToStaticMarkup(
  <Book labels={labels('en')} hero={<img alt="hero" src="/h.webp" />}>
    {content}
  </Book>,
);
const flow = (h: string) => /<div class="book-flow"[^>]*>([\s\S]*)<\/div><\/div><div class="book-controls"/.exec(h)![1]!;
describe('Book markup', () => {
  it('renders the content subtree identically with or without a hero, and each anchor once', () => {
    const plain = renderToStaticMarkup(<Book labels={labels('en')}>{content}</Book>);
    expect(flow(html).replace(/<div class="book-frontispiece">.*?<\/div>/, '')).toBe(flow(plain));
    for (const id of ['x--ch-1', 'x--ch-2']) expect(html.split(`id="${id}"`)).toHaveLength(2);
  });
  it('puts the hero before chapter 1', () => {
    expect(html.indexOf('book-frontispiece')).toBeGreaterThan(-1);
    expect(html.indexOf('book-frontispiece')).toBeLessThan(html.indexOf('id="x--ch-1"'));
  });
  it('has named controls, a live indicator and a toggle labelled from the catalog; starts as scroll view with controls hidden', () => {
    expect(html).toContain('aria-label="Previous page"');
    expect(html).toContain('aria-label="Next page"');
    expect(html).toContain('aria-label="Story pages"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Page 1 of 1');
    expect(html).toContain('>Read as one page</button>');
    expect(html).toContain('data-view="scroll"');
    expect(/class="book-controls" hidden/.test(html)).toBe(true);
  });
  it('takes labels from props (an ar catalog still falls back per key)', () => {
    const h = renderToStaticMarkup(<Book labels={{ ...labels('ar'), toggle: 'TOGGLE' }}>{content}</Book>);
    expect(h).toContain('>TOGGLE</button>');
  });
  it('book view: toggle reads "Read as one page", aria-pressed false, and carries btn classes', () => {
    expect(/<button type="button" class="btn btn-secondary" aria-pressed="false">Read as one page<\/button>/.test(html)).toBe(true);
    expect(toggleState('pages', labels('en'))).toEqual({ label: 'Read as one page', pressed: false });
    expect(html).toContain('class="btn btn-secondary btn-icon"');
  });
  it('scroll view: toggle reads "Read as a book" and aria-pressed is true', () => {
    expect(toggleState('scroll', labels('en'))).toEqual({ label: 'Read as a book', pressed: true });
  });
  it('keeps the pinned classes', () => {
    for (const c of ['book-controls', 'book-flow', 'book-frontispiece']) expect(html).toContain(c);
  });
});
