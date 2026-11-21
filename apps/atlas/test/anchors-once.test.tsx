import { readFileSync } from 'node:fs';
import { atlasLegendFromModel, type KeepersNoteView } from '@kiroween/skeleton/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { allLegends } from '../../../skeleton/test/helpers/legends.ts';
import { KeepersNotePage } from '../src/components/KeepersNotePage';
import { LegendPage } from '../src/components/LegendPage';
import { translate, type Translate } from '../src/i18n/t';

// Property 10 (16.4): every stored anchor is the id of exactly one element in the rendered page. Built from the parsed content
// files, no database. The Book renders one DOM tree for both reading preferences (the preference only sets html[data-book]
// and the CSS), so the server markup is the markup of both modes; the "no view-dependent children" check below pins that.
// Real page layout and hash landing need a browser: task 5.8.
const t: Translate = (key, vars) => translate('en', key, vars);
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const ids = (html: string) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]!);
const NOTE: KeepersNoteView = { id: 'keepers-note', title: "The Keeper's Note", label: 'Fiction', readingTimeMin: 4, oneLineHook: 'Hook.', chapterTitle: 'First', anchor: 'keepers-note--ch-1', paragraphs: ['One.', 'Two.'], hook: 'Closing.' };

const pages = [
  ...allLegends.map((l) => ({ name: l.id, anchors: l.anchors, html: renderToStaticMarkup(<LegendPage legend={atlasLegendFromModel(l)} t={t} />) })),
  { name: 'keepers-note', anchors: [NOTE.anchor], html: renderToStaticMarkup(<KeepersNotePage note={NOTE} t={t} />) },
];

describe('Property 10: every stored anchor appears once in the rendered page', () => {
  it('covers the twelve legends and the Keeper\'s Note', () => {
    expect(pages).toHaveLength(13);
  });
  it.each(pages.map((p) => [p.name, p] as const))('%s: each anchor is one element id, and no id repeats', (_n, { anchors, html }) => {
    const all = ids(html);
    expect(anchors.length).toBeGreaterThan(0);
    for (const a of anchors) expect(all.filter((x) => x === a), a).toHaveLength(1);
    expect(new Set(all).size, 'duplicate ids').toBe(all.length);
  });
  it('legend anchors include the chapters and the versions anchor', () => {
    for (const l of allLegends) {
      const v = atlasLegendFromModel(l);
      for (const a of [...v.chapters.map((c) => c.anchor), v.versionsAnchor]) expect(l.anchors).toContain(a);
    }
  });
  it('the Book renders its children once, outside any view test (so both reading modes share one tree)', () => {
    const book = read('../../../skeleton/src/book/Book.tsx');
    expect(book.match(/\{children\}/g)).toHaveLength(1);
    expect(book).not.toMatch(/(?:paged|supported|pref\b[^\n]*)\s*(?:&&|\?)\s*children/);
  });
});

describe('Book example checks', () => {
  const css = read('../../../skeleton/src/book/book.css');
  it('puts the legend hero before chapter 1', () => {
    const html = pages[0]!.html;
    const first = allLegends[0]!.chapters[0]!.anchor;
    expect(html.indexOf('<img')).toBeGreaterThan(-1);
    expect(html.indexOf('<img')).toBeLessThan(html.indexOf(`id="${first}"`));
  });
  it('the print rule forces the scroll layout', () => {
    const print = css.slice(css.indexOf('@media print'));
    expect(print).toMatch(/\.book-viewport\s*\{[^}]*overflow:\s*visible/);
    expect(print).toMatch(/\.book-flow\s*\{[^}]*column-count:\s*auto[^}]*transform:\s*none/s);
    expect(print).toMatch(/\.book-controls\s*\{\s*display:\s*none/);
  });
  it('the page turn takes at most 400 ms', () => {
    const ms = Number(/--book-turn-ms:\s*(\d+)ms/.exec(css)?.[1]);
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(400);
  });
  it("the transition is none under prefers-reduced-motion and html[data-motion='reduce']", () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*html\[data-book='on'\] \.book-flow\s*\{\s*transition:\s*none/);
    expect(css).toMatch(/html\[data-motion='reduce'\]\[data-book='on'\] \.book-flow\s*\{\s*transition:\s*none/);
  });
  it('the toggle label comes from the catalog', () => {
    expect(pages[0]!.html).toContain(`>${translate('en', 'book.readAsOnePage')}</button>`);
  });
  it('book.css loads no image except the shared paper', () => {
    const urls = [...css.matchAll(/url\(([^)]*)\)/g)].map((m) => m[1]!.replace(/['"]/g, ''));
    expect(urls).toEqual(['/media/shared/shared-atlas-paper-01.webp']);
  });
});
