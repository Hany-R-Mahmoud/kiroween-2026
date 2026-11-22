import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { Hotspot } from '../src/components/Hotspot.tsx';
import type { HotspotBox } from '../src/layout/types.ts';

const render = (box: HotspotBox, label: string, marked: boolean, scale: number) =>
  renderToStaticMarkup(createElement(Hotspot, { box, label, marked, markedText: 'Hint: look here', scale, onActivate: () => {} }));
const classOf = (html: string) => /class="([^"]*)"/.exec(html)?.[1] ?? '';
const px = (html: string, prop: 'inline-size' | 'block-size') => Number(new RegExp(`${prop}:([\\d.]+)px`).exec(html)?.[1] ?? NaN);
const box = fc.record({ id: fc.stringMatching(/^[a-z][a-z0-9-]{0,12}$/), x: fc.integer({ min: 0, max: 3000 }), y: fc.integer({ min: 0, max: 1500 }), w: fc.integer({ min: 1, max: 600 }), h: fc.integer({ min: 1, max: 600 }) });
const REFERENCE = classOf(render({ id: 'ref', x: 0, y: 0, w: 100, h: 100 }, 'ref', false, 1));

// Feature: ui-rework, Property 8: Hotspots look the same whatever their role
describe('Hotspot look (property 8)', () => {
  it('carries the glint and one shared class list, with a box of at least 44 by 44', () => {
    // **Validates: Requirements 19.1, 19.5**
    fc.assert(
      fc.property(box, fc.string({ minLength: 1 }), fc.boolean(), fc.double({ min: 0.05, max: 3, noNaN: true }), (b, label, marked, scale) => {
        const html = render(b as HotspotBox, label, marked, scale);
        expect(classOf(html)).toBe(REFERENCE);
        expect(classOf(html).split(' ')).toContain('hotspot-glint');
        expect(px(html, 'inline-size')).toBeGreaterThanOrEqual(44);
        expect(px(html, 'block-size')).toBeGreaterThanOrEqual(44);
      }),
    );
  });
  it('shows no role or decoy flag in the markup', () => {
    // **Validates: Requirements 19.1, 19.5**
    fc.assert(fc.property(box, fc.boolean(), (b, marked) => !/decoy|role-|clue|data-kind=|data-role/i.test(render(b as HotspotBox, 'x', marked, 1).replace(/data-hotspot="[^"]*"/, ''))));
  });
});
