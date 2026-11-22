import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Reply } from '@kiroween/skeleton/client';
import { en } from '../src/i18n/en.ts';
import { translate } from '../src/i18n/t.ts';
import { replyLine } from '../src/lib/world.ts';

const t = (key: keyof typeof en) => translate('en', key);
const blank = fc.constantFrom('', ' ', '  \n\t ', '\u00a0 ');
const nonBlank = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0);
const key = fc.constantFrom('tap.nothing' as const, 'tap.something' as const);
const tap = (o: { text?: string; key?: 'tap.nothing' | 'tap.something' }): Reply => ({ kind: 'tap', opened: [], collected: 0, ...o });
const nonTap: fc.Arbitrary<Reply> = fc.constantFrom<Reply>(
  { kind: 'hint1', text: '', highlight: [] },
  { kind: 'hint2', anchor: 'a--ch-1', charged: true },
  { kind: 'answer', correct: false, slotId: 's' },
  { kind: 'follow', result: 'dead', anchors: [] },
);
const anyReply: fc.Arbitrary<Reply | null> = fc.oneof(
  fc.constant(null),
  nonTap,
  fc.record({ text: fc.option(fc.oneof(blank, nonBlank), { nil: undefined }), key: fc.option(key, { nil: undefined }) }).map((o) => {
    const out: { text?: string; key?: 'tap.nothing' | 'tap.something' } = {};
    if (o.text !== undefined) out.text = o.text;
    if (o.key !== undefined) out.key = o.key;
    return tap(out);
  }),
);

// Feature: ui-rework, Property 5: A reply line is never empty
describe('replyLine (property 5)', () => {
  it('has a non-whitespace character for any reply', () => {
    // **Validates: Requirements 19.3, 19.4, 19.7**
    fc.assert(fc.property(anyReply, (r) => replyLine(r, t).trim().length > 0));
  });
  it('equals the server text when it is not blank', () => {
    // **Validates: Requirements 19.3, 19.4, 19.7**
    fc.assert(fc.property(nonBlank, fc.option(key, { nil: undefined }), (text, k) => replyLine(tap(k ? { text, key: k } : { text }), t) === text));
  });
  it('falls back to the key text, then to the nothing line, for blank server text', () => {
    // **Validates: Requirements 19.3, 19.4, 19.7**
    fc.assert(fc.property(blank, key, (text, k) => replyLine(tap({ text, key: k }), t) === t(k)));
    expect(replyLine(tap({}), t)).toBe(en['tap.nothing']);
    expect(replyLine(tap({ text: '   ' }), t)).toBe(en['tap.nothing']);
    expect(replyLine(null, t)).toBe(en['scene.reply.idle']);
    expect(replyLine({ kind: 'answer', correct: true, slotId: 's' }, t)).toBe(en['scene.reply.idle']);
  });
  it('the checker itself rejects a blank line', () => {
    expect(replyLine(tap({ text: ' ' }), () => ' ').trim().length).toBe(0);
  });
});
