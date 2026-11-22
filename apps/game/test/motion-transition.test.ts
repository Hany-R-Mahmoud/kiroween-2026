// Phase 6 task 8.7 (Requirements 7.4, 36.5): the in-app reduced-motion switch turns the fear meter transition off.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const css = readFileSync(new URL('../src/components/fear.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
describe('fear meter fill under reduced motion', () => {
  it('has a transition by default', () => {
    expect(css).toMatch(/\.fear-meter-fill\s*\{[^}]*transition:\s*inline-size/);
  });
  it('drops it under the OS setting and the in-app switch', () => {
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce\)\s*\{\s*\.fear-meter-fill\s*\{\s*transition:\s*none/);
    expect(css).toMatch(/html\[data-motion='reduce'\]\s+\.fear-meter-fill\s*\{\s*transition:\s*none/);
  });
});
