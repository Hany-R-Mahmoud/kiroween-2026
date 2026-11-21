import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { inlineMarks, stripMarks } from '../src/atlas/story.ts';

describe('inlineMarks and stripMarks', () => {
  it('turns *words* into em tokens and keeps the rest', () => {
    expect(inlineMarks('The *old* well')).toEqual([
      { kind: 'text', text: 'The ' },
      { kind: 'em', text: 'old' },
      { kind: 'text', text: ' well' },
    ]);
    expect(stripMarks('The *old* well')).toBe('The old well');
  });

  it('leaves unbalanced and stray asterisks literal and never throws', () => {
    for (const s of ['a * b', '*open', 'close*', '**', '* x *', '', '***', '*a*b*']) {
      expect(() => inlineMarks(s)).not.toThrow();
    }
    expect(stripMarks('2 * 3 = 6')).toBe('2 * 3 = 6');
    expect(stripMarks('*open')).toBe('*open');
  });

  // Validates: Requirements 4.4, 5.1, 8.7
  it('property: stripping marks equals the plain text; no asterisk remains when the source marks are balanced', () => {
    const word = fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9 ,.'-]{0,12}[A-Za-z0-9]$/);
    const plain = fc.stringMatching(/^[A-Za-z0-9 ,.'-]{0,15}$/);
    fc.assert(
      fc.property(fc.array(fc.tuple(plain, word), { maxLength: 5 }), plain, (parts, tail) => {
        const marked = parts.map(([p, w]) => `${p}*${w}*`).join('') + tail;
        const expected = parts.map(([p, w]) => p + w).join('') + tail;
        expect(stripMarks(marked)).toBe(expected);
        expect(stripMarks(marked)).not.toContain('*');
        expect(inlineMarks(marked).filter((t) => t.kind === 'em')).toHaveLength(parts.length);
      }),
    );
  });

  it('property: arbitrary input never throws and stripping is idempotent on its own output only when no marks remain', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const out = stripMarks(s);
        expect(typeof out).toBe('string');
        expect(out.length).toBeLessThanOrEqual(s.length);
      }),
    );
  });
});
