// Phase 6 task 8.7 (Requirements 7.4, 36.5): the in-app reduced-motion switch turns the map pin transition off.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
describe('map pin under reduced motion', () => {
  it('has no transition when the in-app switch is on', () => {
    expect(css).toMatch(/html\[data-motion='reduce'\]\s+\.map-pin\s*\{\s*transition:\s*none/);
  });
});
