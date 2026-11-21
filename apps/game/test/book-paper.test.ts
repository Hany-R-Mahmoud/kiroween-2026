import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { applyMotionAttribute } from '../src/lib/motion.ts';
import { SpiritPanel } from '../src/components/SpiritPanel.tsx';
const read = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8');
describe('game panels use the shared book paper (launch-and-polish 5.6)', () => {
  it('imports book.css through the skeleton export and has no paper image until a scene loads', () => {
    const css = read('../src/styles.css');
    expect(css).toContain("@import '@kiroween/skeleton/book/book.css';");
    expect(css).toMatch(/:root \{\s*--book-paper-image: none;/);
  });
  it('spirit panel and tutorial question carry book-paper', () => {
    expect(renderToStaticMarkup(createElement(SpiritPanel, { legendId: 'banshee', mediaBase: '', children: 'Q' }))).toContain('book-paper');
    expect(read('../src/components/TutorialRoom.tsx')).toMatch(/className="book-paper[^"]*"[^>]*>\s*<p>\{question === null/);
  });
  it('motion.ts sets data-motion=reduce and removes it otherwise', () => {
    const root = { dataset: {} as DOMStringMap };
    applyMotionAttribute(root, true);
    expect(root.dataset.motion).toBe('reduce');
    applyMotionAttribute(root, false);
    expect('motion' in root.dataset).toBe(false);
  });
});
