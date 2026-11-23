import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { assetUrl, MEDIA_PREFIX } from '../src/assets/assetUrl.ts';
import { imageUrl, parseImageBase, responsiveImage } from '../src/assets/imageCdn.ts';

const BASE = 'https://ik.imagekit.io/hrim';
const SCENE = 'banshee-game-scene-01';
// Valid ids: the shapes assetUrl accepts.
const word = fc.stringMatching(/^[a-z0-9]{1,8}$/);
const validId = fc.oneof(
  word.map((w) => `shared-${w}`),
  word.map((w) => `hub-${w}`),
  word.map((w) => `tutorial-${w}`),
  fc.tuple(word, fc.constantFrom('atlas', 'game', 'shared'), word).map(([l, s, k]) => `${l}-${s}-${k}`),
);

describe('imageUrl', () => {
  it('without a base returns exactly what assetUrl returns, whatever the transform', () => {
    expect(imageUrl(SCENE, '')).toBe(assetUrl(SCENE));
    expect(imageUrl(SCENE, '', { axis: 'h', n: 900 })).toBe('/media/banshee/game/banshee-game-scene-01.webp');
  });
  it('property: the no-CDN path equals assetUrl for every valid id', () => {
    fc.assert(fc.property(validId, (id) => imageUrl(id, '') === assetUrl(id)));
  });
  it('property: the CDN path is base + the path after /media/, and a transform adds only tr=<axis>-<integer>', () => {
    fc.assert(
      fc.property(validId, fc.constantFrom('w', 'h'), fc.integer({ min: 1, max: 8192 }), (id, axis, n) => {
        const plain = imageUrl(id, BASE);
        expect(plain).toBe(`${BASE}/${assetUrl(id).slice(MEDIA_PREFIX.length)}`);
        expect(imageUrl(id, BASE, { axis, n })).toBe(`${plain}?tr=${axis}-${n}`);
      }),
    );
  });
  it('gives the owner-documented example URL', () => {
    expect(imageUrl(SCENE, BASE, { axis: 'h', n: 900 })).toBe('https://ik.imagekit.io/hrim/banshee/game/banshee-game-scene-01.webp?tr=h-900');
    expect(imageUrl(SCENE, `${BASE}/`)).toBe('https://ik.imagekit.io/hrim/banshee/game/banshee-game-scene-01.webp');
  });
  it('refuses ids assetUrl refuses, with and without a base', () => {
    for (const bad of ['', '../x', 'Banshee-game-scene-01', 'a/b', 'nosurface', 'x'.repeat(101)]) {
      expect(() => imageUrl(bad, '')).toThrow();
      expect(() => imageUrl(bad, BASE)).toThrow();
    }
  });
  it('builds tr only from integers in range', () => {
    for (const n of [0, -1, 1.5, NaN, Infinity, 8193, Number.MAX_SAFE_INTEGER + 2]) {
      expect(() => imageUrl(SCENE, BASE, { axis: 'w', n })).toThrow(RangeError);
    }
    expect(() => imageUrl(SCENE, BASE, { axis: 'x' as 'w', n: 5 })).not.toThrow(); // axis is typed; a string is never interpolated from input
  });
});

describe('responsiveImage', () => {
  const scene = { id: SCENE, width: 4096, height: 1536, axis: 'h' as const, steps: [600, 900, 1200], sizes: 'S' };
  it('is null without a base, so the caller keeps today\'s markup', () => {
    expect(responsiveImage({ ...scene, base: '' })).toBeNull();
  });
  it('height steps get w descriptors from the aspect ratio', () => {
    const r = responsiveImage({ ...scene, base: BASE })!;
    expect(r.srcSet).toBe(
      `${BASE}/banshee/game/${SCENE}.webp?tr=h-600 1600w, ${BASE}/banshee/game/${SCENE}.webp?tr=h-900 2400w, ${BASE}/banshee/game/${SCENE}.webp?tr=h-1200 3200w`,
    );
    expect(r.src).toBe(`${BASE}/banshee/game/${SCENE}.webp?tr=h-900`);
    expect(r.sizes).toBe('S');
  });
  it('width steps use the step as the descriptor and never exceed the original', () => {
    const r = responsiveImage({ id: 'shared-atlas-hero-01', base: BASE, axis: 'w', steps: [400, 800, 1200, 1600, 2400], width: 1000, height: 500, sizes: 'S' })!;
    expect(r.srcSet.split(', ').map((p) => p.split(' ')[1])).toEqual(['400w', '800w']);
  });
  it('is null when no step fits the original', () => {
    expect(responsiveImage({ id: 'shared-atlas-marker-01', base: BASE, axis: 'w', steps: [400], width: 256, height: 256, sizes: 'S' })).toBeNull();
  });
});

describe('parseImageBase', () => {
  it('empty or unset means off', () => {
    expect(parseImageBase(undefined)).toBe('');
    expect(parseImageBase('')).toBe('');
    expect(parseImageBase('  ')).toBe('');
  });
  it('accepts the ImageKit endpoint and drops a trailing slash', () => {
    expect(parseImageBase(BASE)).toBe(BASE);
    expect(parseImageBase(`${BASE}/`)).toBe(BASE);
  });
  it.each(['http://ik.imagekit.io/hrim', 'ik.imagekit.io', 'https://u:p@ik.imagekit.io/hrim', 'https://ik.imagekit.io/a/b', 'https://ik.imagekit.io/hrim?x=1', 'https://ik.imagekit.io/hrim#x'])('refuses %s', (v) => {
    expect(() => parseImageBase(v)).toThrow(RangeError);
  });
});
