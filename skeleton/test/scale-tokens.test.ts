import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
// Phase 6 task 7.2 (Req 32.2): gaps and font sizes that equal a scale step use the token, not a rem literal.
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SPACE = ['0.25rem', '0.5rem', '0.75rem', '1rem', '1.5rem', '2rem', '3rem', '4rem'];
const TYPE = ['0.75rem', '0.875rem', '1.0625rem', '1.25rem'];
const strip = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    if (['node_modules', 'dist', '.output', '.vercel', '.git'].includes(f)) return [];
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.css') ? [p] : [];
  });
/** declarations that use a scale value as a raw literal */
export const literalScaleUses = (css: string): string[] =>
  strip(css)
    .split(/[;{}]/)
    .map((d) => d.trim())
    .filter((d) => {
      const m = /^(gap|row-gap|column-gap|font-size)\s*:\s*(.+)$/.exec(d);
      if (!m || /var\(/.test(m[2] ?? '')) return false;
      const list = m[1] === 'font-size' ? TYPE : SPACE;
      return (m[2] ?? '').split(/\s+/).some((v) => list.includes(v));
    });
const files = [
  ...walk(join(ROOT, 'skeleton/src')).filter((p) => !/design\/(tokens|ui)\.css$/.test(p)),
  ...walk(join(ROOT, 'apps/game/src')),
  ...walk(join(ROOT, 'apps/atlas/src')),
];
describe('scale tokens (Req 32.2)', () => {
  it('the scanner flags a literal gap and font size and accepts tokens', () => {
    expect(literalScaleUses('a{gap:0.5rem}')).toHaveLength(1);
    expect(literalScaleUses('a{font-size:0.875rem}')).toHaveLength(1);
    expect(literalScaleUses('a{gap:0.25rem 0.75rem}')).toHaveLength(1);
    expect(literalScaleUses('a{gap:var(--space-2);font-size:var(--type-small)}')).toHaveLength(0);
    expect(literalScaleUses('a{gap:0.4rem}')).toHaveLength(0);
  });
  for (const f of files)
    it(`${f.slice(ROOT.length)} has no scale-sized gap or font-size literal`, () => {
      expect(literalScaleUses(readFileSync(f, 'utf8'))).toEqual([]);
    });
});
