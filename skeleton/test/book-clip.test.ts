// Phase 6 task 7.1 (Requirement 32.1): the page-turn layer is clipped to the page box while the pages are on.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/book/book.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** Declaration body of the first rule whose selector is exactly `selector`, or null. */
function body(text: string, selector: string): string | null {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\})\\s*${esc}\\s*\\{([^}]*)\\}`).exec(text)?.[1] ?? null;
}

describe('book viewport clip', () => {
  const rule = body(css, "html[data-book='on'] .book-viewport");
  it('has a rule', () => expect(rule).not.toBeNull());
  it('contains paint and clips to the box', () => {
    expect(rule).toMatch(/contain:\s*paint\s*;/);
    expect(rule).toMatch(/clip-path:\s*inset\(0\)\s*;/);
  });
  it('detects a rule without the clip', () => {
    expect(body("a .b { overflow: clip; }", 'a .b')).not.toMatch(/contain:\s*paint/);
  });
});
