import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
// Phase 6 task 7.3 (Req 32.3): scene, world, tutorial and mood CSS use tokens, never hex colours or hex fallbacks.
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const FILES = [
  'apps/game/src/components/scene.css',
  'apps/game/src/components/world.css',
  'apps/game/src/components/tutorial.css',
  'skeleton/src/design/mood.css',
];
const strip = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');
export const hexes = (css: string): string[] => strip(css).match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
describe('no hex colours or hex fallbacks', () => {
  it('scanner finds a hex and a hex fallback', () => {
    expect(hexes('a{color:var(--color-glow, #f4d58d)}')).toEqual(['#f4d58d']);
    expect(hexes('a{color:var(--color-glow)} /* #fff */')).toEqual([]);
  });
  it.each(FILES)('%s has none', (f) => {
    expect(hexes(readFileSync(join(ROOT, f), 'utf8'))).toEqual([]);
  });
  it('--mood-ink is the background token', () => {
    const css = strip(readFileSync(join(ROOT, 'skeleton/src/design/mood.css'), 'utf8'));
    expect(css).toMatch(/--mood-ink:\s*var\(--color-bg\)\s*;/);
  });
});
