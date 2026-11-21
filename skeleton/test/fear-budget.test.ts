import { describe, expect, it } from 'vitest';
import { FEAR } from '../src/play/fear.ts';
import { HOTSPOT_FEAR, HOTSPOT_FEAR_STEP } from '../src/play/fearTable.ts';
import { allLegends } from './helpers/legends.ts';

// The design's assumed maxima (design: "Fear amounts"). These are counts, not fear amounts. The amounts always come
// from the constants. If a legend grows past a maximum, this test fails and the budget must be re-approved.
const ASSUMED = { hint2Slots: 5, deadEnds: 4, hotspotTicks: 3 } as const;

const positiveTicks = (legendId: string): number =>
  Object.entries(HOTSPOT_FEAR).filter(([k, v]) => v > 0 && k.startsWith(`${legendId}:`)).length;

/** Most dead ends one Run can offer: every other lead that carries a contradiction (see `chooseLeads`). */
const deadEndsAvailable = (l: (typeof allLegends)[number]): number =>
  Math.min(l.leads.length - 1, l.leads.filter((x) => x.contradiction !== null).length);

const worstCase = (slots: number, deadEnds: number, ticks: number): number =>
  slots * FEAR.hint2 + deadEnds * FEAR.deadEnd + ticks * HOTSPOT_FEAR_STEP + 2 * FEAR.wrongAnswer;

describe('fear budget (requirement 6.1)', () => {
  it('loads the 12 legends', () => {
    expect(allLegends).toHaveLength(12);
  });

  it('the assumed worst case plus two wrong answers stays below FEAR.max', () => {
    expect(worstCase(ASSUMED.hint2Slots, ASSUMED.deadEnds, ASSUMED.hotspotTicks)).toBeLessThan(FEAR.max);
  });

  it('every hotspot tick uses the shared step', () => {
    for (const v of Object.values(HOTSPOT_FEAR)) expect(Math.abs(v)).toBe(HOTSPOT_FEAR_STEP);
  });

  it('the global count of positive hotspot entries is within the assumed maximum', () => {
    const positive = Object.values(HOTSPOT_FEAR).filter((v) => v > 0).length;
    expect(positive).toBeLessThanOrEqual(ASSUMED.hotspotTicks);
  });

  it.each(allLegends.map((l) => [l.id, l] as const))('%s stays inside the assumed maxima and the budget', (_id, l) => {
    const slots = l.world.slots.length;
    const deadEnds = deadEndsAvailable(l);
    const ticks = positiveTicks(l.id);
    expect(slots, 'slots').toBeLessThanOrEqual(ASSUMED.hint2Slots);
    expect(deadEnds, 'dead ends available').toBeLessThanOrEqual(ASSUMED.deadEnds);
    expect(ticks, 'positive hotspot ticks').toBeLessThanOrEqual(ASSUMED.hotspotTicks);
    expect(worstCase(slots, deadEnds, ticks)).toBeLessThan(FEAR.max);
  });
});

// The owner-approved literal values. The tests above derive from the constants, so they cannot see a changed value.
describe('approved fear and score values are pinned', () => {
  it('fear amounts and the full-meter value are the approved ones', () => {
    expect({ ...FEAR }).toEqual({ wrongAnswer: 15, hint2: 6, deadEnd: 6, tutorialHint2: 10, max: 100 });
    expect(HOTSPOT_FEAR_STEP).toBe(3);
  });
});
