import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { HERO_SMALL_MEDIA, HERO_SMALL_WIDTH, heroSmall, heroSmallSize, heroSource } from '../src/assets/heroCopy.ts';

/**
 * Model of the browser's `picture` choice for the one `source` the hero has: the first source whose media query
 * matches wins, else the `img`. The source has no `x` or `w` descriptor, so the pixel ratio cannot change the choice.
 */
function pictureChoice(viewportCssWidth: number, _devicePixelRatio: number): 'small' | 'full' {
  const max = /^\(max-width: (\d+)px\)$/.exec(HERO_SMALL_MEDIA);
  if (!max) throw new Error(`unexpected media query ${HERO_SMALL_MEDIA}`);
  return viewportCssWidth <= Number(max[1]) ? 'small' : 'full';
}

const dprArb = fc.constantFrom(1, 2, 3);

describe('hero copy', () => {
  /** **Validates: Requirements 13.3, 13.4, 13.8, 13.9** (Property 2: Hero copy is chosen by viewport width only) */
  it('Property 2: the small copy is chosen exactly when the width is 1000 CSS px or less, at any pixel ratio', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 8000, noNaN: true }), dprArb, (w, dpr) => {
        const expected = w <= 1000 ? 'small' : 'full';
        expect(heroSource(w, dpr)).toBe(expected);
        expect(pictureChoice(w, dpr)).toBe(expected);
        expect(heroSource(w, dpr)).toBe(heroSource(w, 1));
      }),
    );
    expect(HERO_SMALL_WIDTH).toBe(1000);
    for (const w of [1000, 1001]) for (const dpr of [1, 2, 3]) expect(heroSource(w, dpr)).toBe(w === 1000 ? 'small' : 'full');
  });

  /** **Validates: Requirements 13.3, 13.8, 13.9** */
  it('Property 2: a 390 px viewport never gets the 2400 px image at ratio 1, 2 or 3', () => {
    for (const dpr of [1, 2, 3]) {
      expect(heroSource(390, dpr)).toBe('small');
      expect(pictureChoice(390, dpr)).toBe('small');
    }
  });

  /** **Validates: Requirements 13.5** (Property 3: Hero copy keeps the aspect ratio) */
  it('Property 3: the small copy is 1000 wide and its height keeps the full image ratio within rounding', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1001, max: 6000 }), fc.integer({ min: 1, max: 6000 }), (width, height) => {
        const s = heroSmallSize(width, height);
        expect(s.width).toBe(1000);
        expect(s.height).toBe(Math.round((height * 1000) / width));
        expect(Math.abs(s.height - (height * 1000) / width)).toBeLessThanOrEqual(0.5);
      }),
    );
    expect(heroSmall({ id: 'banshee-atlas-hero-01', width: 2400, height: 1350 })).toEqual({ id: 'banshee-atlas-hero-01-w1000', width: 1000, height: 563 });
    expect(heroSmall({ id: 'banshee-atlas-hero-01', width: 1000, height: 563 })).toBeNull();
  });
});
