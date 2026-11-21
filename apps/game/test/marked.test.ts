import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { stripMarks } from '@kiroween/skeleton/client';
import { Marked } from '../src/components/Marked.tsx';
import { Hotspot } from '../src/components/Hotspot.tsx';

// Italic marks in content text (Requirements 4.4, 4.7, 5.1, 8.7, 14.1).
const html = (text: string) => renderToStaticMarkup(createElement(Marked, { text }));

describe('Marked', () => {
  it('draws *words* as <em> and leaves no asterisk', () => {
    const out = html('Who *really* kept the key?');
    expect(out).toBe('Who <em>really</em> kept the key?');
    expect(out).not.toContain('*');
  });
  it('keeps unbalanced asterisks literal and never throws', () => {
    for (const s of ['a * b', '*open', 'close*', '**', '']) {
      expect(() => html(s)).not.toThrow();
    }
    expect(html('2 * 3')).toBe('2 * 3');
  });
  it('escapes markup: text is never HTML', () => {
    expect(html('<b>x</b> *y*')).toBe('&lt;b&gt;x&lt;/b&gt; <em>y</em>');
  });
  // Validates: Requirements 4.4, 8.7
  it('property: rendered text with tags removed equals the stripped plain text (balanced marks)', () => {
    const word = fc.stringMatching(/^[A-Za-z0-9]{1,8}$/);
    const plain = fc.stringMatching(/^[A-Za-z0-9 ]{0,8}$/);
    fc.assert(
      fc.property(fc.array(fc.tuple(plain, word), { maxLength: 4 }), plain, (parts, tail) => {
        const src = parts.map(([p, w]) => `${p}*${w}*`).join('') + tail;
        expect(html(src).replace(/<\/?em>/g, '')).toBe(stripMarks(src));
        expect(stripMarks(src)).not.toContain('*');
      }),
    );
  });
});

describe('accessible names carry no asterisks', () => {
  it('Hotspot name is plain text', () => {
    const out = renderToStaticMarkup(
      createElement(Hotspot, { box: { id: 'h1', x: 0, y: 0, w: 10, h: 10 } as never, label: 'The *old* door', marked: false, markedText: 'Hint', scale: 1, onActivate: () => {} }),
    );
    expect(out).toContain('The old door');
    expect(out).not.toContain('*');
    expect(out).not.toContain('<em>');
  });
});
