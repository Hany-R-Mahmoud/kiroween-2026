// Phase 6 task 8.7 (Requirements 36.4, 10.6): the focus rules added in task 8.3 stay in the CSS.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (rel: string) =>
  readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const book = read('../src/book/book.css');
const mood = read('../src/design/mood.css');
const body = (text: string, selector: string): string | null => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\})\\s*${esc}\\s*\\{([^}]*)\\}`).exec(text)?.[1] ?? null;
};
describe('focus rules', () => {
  it('book page window shows an inset ring inside its clip', () => {
    const rule = body(book, "html[data-book='on'] .book-viewport:focus-visible");
    expect(rule).toMatch(/box-shadow:\s*inset\s+0\s+0\s+0\s+3px\s+var\(--color-ring\)/);
  });
  it('hotspot focus keeps a dark band under the global ring', () => {
    const rule = body(mood, '.mood-hotspot-glow:focus-visible');
    expect(rule).toMatch(/0 0 0 9px var\(--color-bg\)/);
  });
  it('detects a missing ring', () => {
    expect(body('a:focus-visible { color: red; }', 'a:focus-visible')).not.toMatch(/box-shadow/);
  });
});
