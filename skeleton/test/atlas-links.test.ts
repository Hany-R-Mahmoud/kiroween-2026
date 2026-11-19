import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { atlasUrl, AtlasLinkError, isAnchor, legendUrl } from '../src/atlas/links.ts';
import { allLegends } from './helpers/legends.ts';

const RUNS = { numRuns: 100 };
const word = fc.stringMatching(/^[a-z0-9]{1,8}$/);
const kebab = fc.array(word, { minLength: 1, maxLength: 4 }).map((parts) => parts.join('-'));
const tail = fc.oneof(
  fc.integer({ min: 1, max: 99 }).map((n) => `ch-${n}`),
  fc.constant('versions'),
  kebab.map((v) => `versions--${v}`),
);

describe('atlasUrl and legendUrl (decision 9)', () => {
  it('every valid anchor links to its legend page with the anchor as the hash', () => {
    fc.assert(
      fc.property(kebab, tail, (legend, rest) => {
        const anchor = `${legend}--${rest}`;
        fc.pre(anchor.length <= 120);
        expect(isAnchor(anchor)).toBe(true);
        expect(atlasUrl(anchor)).toBe(`/legends/${legend}#${anchor}`);
      }),
      RUNS,
    );
  });

  it('every anchor in the twelve legend files is valid and links to its own legend', () => {
    const anchors = allLegends.flatMap((l) => l.anchors.map((a) => [l.id, a] as const));
    expect(anchors.length).toBeGreaterThan(140);
    for (const [legend, anchor] of anchors) expect(atlasUrl(anchor), anchor).toBe(`/legends/${legend}#${anchor}`);
  });

  it.each([
    '',
    'banshee',
    'banshee--',
    'banshee--ch-0',
    'banshee--ch-100',
    'banshee--ch-1x',
    'Banshee--ch-1',
    'banshee--CH-1',
    '../banshee--ch-1',
    'banshee/--ch-1',
    'banshee--ch-1/',
    'banshee--ch-1#x',
    'banshee%2D--ch-1',
    '-banshee--ch-1',
    'banshee---ch-1',
    'banshee--versions--',
    'banshee--versions--v_log',
    'banshee--chapter-1',
    'banshee--ch-1 ',
    `${'a'.repeat(110)}--versions--v`,
  ])('refuses the malformed anchor %j', (anchor) => {
    expect(isAnchor(anchor)).toBe(false);
    expect(() => atlasUrl(anchor)).toThrow(AtlasLinkError);
  });

  it('refuses malformed legend ids', () => {
    for (const id of ['', 'Banshee', '../x', 'a/b', 'a--b', '-a', 'a-', 'a b']) expect(() => legendUrl(id), id).toThrow(AtlasLinkError);
    expect(legendUrl('spring-heeled-jack')).toBe('/legends/spring-heeled-jack');
  });
});
