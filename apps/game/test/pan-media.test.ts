import { assetUrl } from '@kiroween/skeleton';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { mediaUrl } from '../src/lib/media.ts';
import { clampPan, panToReveal } from '../src/lib/pan.ts';

const num = (max: number) => fc.integer({ min: -max, max });
const size = fc.integer({ min: 1, max: 6000 });

describe('Property 23: Pan helpers keep the scene inside the viewport', () => {
  // **Validates: Requirements 8.3, 8.6**
  it('clampPan lands in [min(0, viewport - scene), 0] and is idempotent', () => {
    fc.assert(
      fc.property(num(20000), size, size, (pan, viewport, scene) => {
        const out = clampPan(pan, viewport, scene);
        expect(out).toBeGreaterThanOrEqual(Math.min(0, viewport - scene));
        expect(out).toBeLessThanOrEqual(0);
        expect(clampPan(out, viewport, scene)).toBe(out);
      }),
      { numRuns: 300 },
    );
  });

  it('panToReveal makes a box that fits the viewport fully visible', () => {
    fc.assert(
      fc.property(
        num(20000),
        size,
        size,
        fc.nat(6000),
        fc.integer({ min: 1, max: 6000 }),
        (pan, viewport, scene, x, width) => {
          fc.pre(width <= viewport && width <= scene);
          const box = { x: x % (scene - width + 1), width };
          const out = panToReveal(pan, box, viewport, scene);
          expect(out).toBeGreaterThanOrEqual(Math.min(0, viewport - scene));
          expect(out).toBeLessThanOrEqual(0);
          expect(box.x + out).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width + out).toBeLessThanOrEqual(viewport);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('known cases', () => {
    expect(clampPan(50, 400, 1000)).toBe(0);
    expect(clampPan(-900, 400, 1000)).toBe(-600);
    expect(clampPan(-10, 800, 500)).toBe(0);
    expect(panToReveal(0, { x: 700, width: 100 }, 400, 1000)).toBe(-400);
    // one pixel past each edge must move the pan
    expect(panToReveal(0, { x: 301, width: 100 }, 400, 1000)).toBe(-1);
    expect(panToReveal(-100, { x: 99, width: 100 }, 400, 1000)).toBe(-99);
  });
});

describe('Property 24: Image URLs are the canonical ones', () => {
  // **Validates: Requirements 11.1, 11.2**
  const part = fc.stringMatching(/^[a-z][a-z0-9]{0,8}$/);
  const validId = fc.oneof(
    fc.tuple(part, fc.constantFrom('atlas', 'game', 'shared'), part, fc.nat(99)).map(
      ([l, s, k, n]) => `${l}-${s}-${k}-${String(n).padStart(2, '0')}`,
    ),
    fc.tuple(fc.constantFrom('shared', 'hub', 'tutorial'), part, fc.nat(99)).map(
      ([s, k, n]) => `${s}-${k}-${String(n).padStart(2, '0')}`,
    ),
  );
  const base = fc.oneof(
    fc.constant(''),
    fc.webUrl({ withFragments: false, withQueryParameters: false }).map((u) => new URL(u).origin),
  );

  it('equals the base followed by assetUrl(id)', () => {
    fc.assert(
      fc.property(validId, base, (id, b) => {
        expect(mediaUrl(b, id)).toBe(`${b}${assetUrl(id)}`);
      }),
      { numRuns: 300 },
    );
  });

  it('refuses every id that assetUrl refuses', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 120 }), base, (id, b) => {
        let refused = false;
        try {
          assetUrl(id);
        } catch {
          refused = true;
        }
        if (refused) expect(() => mediaUrl(b, id)).toThrow();
      }),
      { numRuns: 300 },
    );
    for (const bad of ['', '../x', 'a/b', 'nodash', 'x'.repeat(101)]) expect(() => mediaUrl('', bad)).toThrow();
  });
});
