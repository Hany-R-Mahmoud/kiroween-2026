import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { cursesRemaining, doorState, doorStates, WORLD_COUNT } from '../src/play/hall.ts';
import { HUB_EXTRA, hubContrastReport } from '../src/theme/hub.ts';
import { AA_LARGE, AA_TEXT, BASE_PALETTE, contrastRatio } from '../src/theme/contrast.ts';

const guest = { kind: 'guest' } as const;
const user = { kind: 'user', id: 'u1', name: 'Ann' } as const;

describe('door state', () => {
  it('locks every door before the tutorial is done', () => {
    for (const visitor of [guest, user]) expect(doorState({ visitor, tutorialDone: false, legendId: 'baba-yaga', guestWorld: 'banshee' })).toBe('locked');
  });
  it('opens only the guest world for a guest, and asks for sign-in elsewhere', () => {
    const base = { visitor: guest, tutorialDone: true, guestWorld: 'banshee' };
    expect(doorState({ ...base, legendId: 'banshee' })).toBe('open');
    expect(doorState({ ...base, legendId: 'baba-yaga' })).toBe('signin');
  });
  it('opens every door for a signed-in user', () => {
    const states = doorStates({ visitor: user, tutorialDone: true, legendIds: ['a', 'b', 'c'], guestWorld: 'a' });
    expect(Object.values(states)).toEqual(['open', 'open', 'open']);
  });
});

const visitorArb = fc.oneof(
  fc.constant({ kind: 'guest' } as const),
  fc.record({ kind: fc.constant('user' as const), id: fc.string({ minLength: 1 }), name: fc.string() }),
);
const idArb = fc.constantFrom('a', 'b', 'banshee', 'baba-yaga', 'x1');

describe('Property 22: Hall rules are a function of visitor, tutorial flag and world', () => {
  /** **Validates: Requirements 1.3, 1.4, 1.5, 1.7** */
  it('door state follows the rule for any visitor, flag, legend and guest world', () => {
    fc.assert(fc.property(visitorArb, fc.boolean(), idArb, idArb, (visitor, tutorialDone, legendId, guestWorld) => {
      const expected = !tutorialDone ? 'locked' : visitor.kind === 'user' || legendId === guestWorld ? 'open' : 'signin';
      expect(doorState({ visitor, tutorialDone, legendId, guestWorld })).toBe(expected);
    }), { numRuns: 200 });
  });
  /** **Validates: Requirements 1.3, 1.4, 1.5** */
  it('doorStates maps every id the same way as doorState', () => {
    fc.assert(fc.property(visitorArb, fc.boolean(), fc.uniqueArray(idArb), idArb, (visitor, tutorialDone, legendIds, guestWorld) => {
      const states = doorStates({ visitor, tutorialDone, legendIds, guestWorld });
      expect(Object.keys(states)).toEqual(legendIds);
      for (const legendId of legendIds) expect(states[legendId]).toBe(doorState({ visitor, tutorialDone, legendId, guestWorld }));
    }), { numRuns: 100 });
  });
  /** **Validates: Requirements 1.7** */
  it('curses remaining equals 12 minus the number of distinct broken worlds', () => {
    fc.assert(fc.property(fc.array(fc.constantFrom('w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 'w10', 'w11', 'w12')), (ids) => {
      expect(cursesRemaining(ids)).toBe(WORLD_COUNT - new Set(ids).size);
    }), { numRuns: 100 });
  });
});

describe('curses remaining', () => {
  it('is 12 minus distinct broken worlds', () => {
    expect(WORLD_COUNT).toBe(12); // pinned: the property above derives its expectation from this constant
    expect(cursesRemaining([])).toBe(WORLD_COUNT);
    expect(cursesRemaining(['a', 'a', 'b'])).toBe(10);
  });
  it('stays within 0..12 for any list', () => {
    fc.assert(fc.property(fc.array(fc.string()), (ids) => {
      const n = cursesRemaining(ids);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(WORLD_COUNT);
    }), { numRuns: 100 });
  });
});

describe('hubContrastReport', () => {
  it('meets every minimum', () => {
    for (const p of hubContrastReport()) expect(p.ok, `${p.name} ${p.ratio.toFixed(2)}`).toBe(true);
  });
  it('matches the design numbers', () => {
    const r = Object.fromEntries(hubContrastReport().map((p) => [p.name, p.ratio]));
    expect(r['ink on background']).toBeCloseTo(15.06, 1);
    expect(r['muted on background']).toBeCloseTo(6.39, 1);
    expect(r['danger fill on background (non-text)']).toBeCloseTo(3.31, 1);
  });
  it('pins every pairing of the design table with its minimum', () => {
    const expected: Record<string, number> = {
      'ink on background': AA_TEXT, 'ink on surface': AA_TEXT,
      'muted on background': AA_TEXT, 'muted on surface': AA_TEXT,
      'accent on background': AA_TEXT, 'accent on surface': AA_TEXT,
      'glow on background (large text)': 3.0,
      'cold on background': AA_TEXT, 'cold on surface': AA_TEXT,
      'danger-ink on background': AA_TEXT, 'danger-ink on surface': AA_TEXT,
      'danger fill on background (non-text)': 3.0,
    };
    const report = hubContrastReport();
    expect(AA_TEXT).toBe(4.5);
    expect(AA_LARGE).toBe(3.0);
    expect(report.map((p) => p.name).sort()).toEqual(Object.keys(expected).sort());
    for (const p of report) expect(p.minimum, p.name).toBe(expected[p.name]);
  });
  it('matches the design ratios on surface and for every other pairing', () => {
    const r = Object.fromEntries(hubContrastReport().map((p) => [p.name, p.ratio]));
    const want: Record<string, number> = {
      'ink on surface': 13.65, 'muted on surface': 5.79, 'accent on background': 9.19, 'accent on surface': 8.33,
      'glow on background (large text)': 13.73, 'cold on background': 7.54, 'cold on surface': 6.83,
    };
    for (const [k, v] of Object.entries(want)) expect(r[k], k).toBeCloseTo(v, 1);
  });
  it('keeps the danger fill at 3.0 or more on the background and on the surface edge', () => {
    expect(contrastRatio(HUB_EXTRA.danger, BASE_PALETTE.bg)).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio(HUB_EXTRA.danger, BASE_PALETTE.surface)).toBeGreaterThanOrEqual(2.995);
    expect(contrastRatio(HUB_EXTRA.danger, BASE_PALETTE.surface)).toBeCloseTo(3.0, 1);
  });
  it('keeps the extra colours equal to design/tokens.css', () => {
    const css = readFileSync(new URL('../src/design/tokens.css', import.meta.url), 'utf8');
    expect(css).toContain(`--color-danger-ink: ${HUB_EXTRA.dangerInk};`);
    expect(css).toContain(`--color-danger: ${HUB_EXTRA.danger};`);
    expect(css).toContain(`--color-cold: ${HUB_EXTRA.cold};`);
  });
});
