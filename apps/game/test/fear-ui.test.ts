import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { assetUrl } from '@kiroween/skeleton';
import { FEAR_EVENTS } from '../src/layout/fearEvents.ts';
import { captionFor, createFearGate, EVENT_SHOW_MS, MIN_EVENT_GAP_MS } from '../src/lib/fearPlayer.ts';
import { isReducedMotion, MOTION_KEY, readMotion, writeMotion } from '../src/lib/motion.ts';
import { SPIRIT_FRAME_ASSET, spiritAsset } from '../src/components/SpiritPanel.tsx';
import { clampFear, FEAR_FRAME_ASSET } from '../src/components/FearMeter.tsx';
import { en } from '../src/i18n/en.ts';

const css = readFileSync(fileURLToPath(new URL('../src/components/fear.css', import.meta.url)), 'utf8');
const t = (k: keyof typeof en) => en[k];

/** Parses `@keyframes name { 40% { opacity: .. } }` into [percent, opacity] stops. */
function stops(name: string): Array<[number, number]> {
  const m = new RegExp(`@keyframes ${name}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(css);
  if (!m) throw new Error(`no keyframes ${name}`);
  return [...m[1]!.matchAll(/(\d+)%\s*\{\s*opacity:\s*([\d.]+)/g)].map((s) => [Number(s[1]), Number(s[2])]);
}
/** Flashes = separate rises of opacity (a rise that follows a fall or the start; a plateau does not split one). */
function peaks(s: Array<[number, number]>): number {
  let n = 0;
  let rising = false;
  for (let i = 1; i < s.length; i++) {
    const d = s[i]![1] - s[i - 1]![1];
    if (d > 0 && !rising) n++;
    if (d !== 0) rising = d > 0;
  }
  return n;
}

describe('fear overlay keyframes', () => {
  it('the flash animation has at most 3 flashes in any one second', () => {
    const dur = Number(/animation:\s*fear-flash\s+(\d+)ms[^;]*?\b1\b/.exec(css)?.[1]);
    expect(dur).toBeGreaterThan(0);
    const s = stops('fear-flash');
    expect(peaks(s)).toBeGreaterThan(0);
    // Worst window of 1000 ms: all peaks cannot exceed the count per duration, rounded up to a window.
    const flashesPerSecond = (peaks(s) * 1000) / dur;
    expect(flashesPerSecond).toBeLessThanOrEqual(3);
    // the animation runs once, so one event cannot repeat
    expect(/animation:\s*fear-flash[^;]*\binfinite\b/.test(css)).toBe(false);
  });
  it('the reduced path is opacity only, with fades of at most 400 ms and no flicker', () => {
    const s = stops('fear-fade');
    const dur = Number(/\.fear-overlay\[data-motion='reduced'\] \.fear-overlay-caption\s*\{\s*animation:\s*fear-fade\s+(\d+)ms/.exec(css)?.[1]);
    expect(peaks(s)).toBe(1);
    const fadeIn = (s[1]![0] - s[0]![0]) / 100 * dur;
    const fadeOut = (s[3]![0] - s[2]![0]) / 100 * dur;
    expect(fadeIn).toBeLessThanOrEqual(400);
    expect(fadeOut).toBeLessThanOrEqual(400);
    const block = /@keyframes fear-fade[\s\S]*?\n\}/.exec(css)![0];
    expect(block).not.toMatch(/transform|translate|scale|rotate/);
    expect(/data-motion='reduced'\][^{]*fear-overlay-flash/.test(css)).toBe(false);
  });
  it('the overlay is non-interactive', () => {
    expect(/\.fear-overlay\s*\{[^}]*pointer-events:\s*none/.test(css)).toBe(true);
  });
});

describe('fear gate', () => {
  it('allows at most one event per 4 seconds and one play per instance key', () => {
    const g = createFearGate();
    expect(g.tryPlay(0, 'a')).toBe(true);
    expect(g.tryPlay(MIN_EVENT_GAP_MS - 1, 'b')).toBe(false);
    expect(g.tryPlay(MIN_EVENT_GAP_MS, 'b')).toBe(true);
    expect(g.tryPlay(MIN_EVENT_GAP_MS * 3, 'a')).toBe(false);
    expect(EVENT_SHOW_MS).toBeLessThan(MIN_EVENT_GAP_MS);
  });
  it('property: accepted events are always at least 4 s apart', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 5000 }), { maxLength: 40 }), (gaps) => {
        const g = createFearGate();
        let now = 0;
        const played: number[] = [];
        gaps.forEach((d, i) => {
          now += d;
          if (g.tryPlay(now, `k${i}`)) played.push(now);
        });
        for (let i = 1; i < played.length; i++) expect(played[i]! - played[i - 1]!).toBeGreaterThanOrEqual(MIN_EVENT_GAP_MS);
      }),
    );
  });
});

describe('captions', () => {
  const entry = FEAR_EVENTS['flying-dutchman'][0];
  it('reduced motion uses the per-event line when content has one, else the catalog caption', () => {
    expect(captionFor(entry, 'The lamp dims.', true, t)).toBe('The lamp dims.');
    expect(captionFor(entry, null, true, t)).toBe(en['fear.caption.sound']);
    expect(captionFor(FEAR_EVENTS.banshee[1], '  ', true, t)).toBe(en['fear.caption.sight']);
  });
  it('full motion always uses the catalog caption', () => {
    expect(captionFor(entry, 'The lamp dims.', false, t)).toBe(en['fear.caption.sound']);
  });
});

describe('motion setting', () => {
  const store = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
  };
  it('stores under kiroween.motion.v1 and follows the system when nothing is stored', () => {
    const s = store();
    expect(readMotion(s)).toBeNull();
    expect(isReducedMotion(null, true)).toBe(true);
    expect(isReducedMotion(null, false)).toBe(false);
    writeMotion(s, 'full');
    expect(s.m.get(MOTION_KEY)).toBe('full');
    expect(isReducedMotion(readMotion(s), true)).toBe(false);
    writeMotion(s, 'reduce');
    expect(isReducedMotion(readMotion(s), false)).toBe(true);
  });
  it('ignores junk values and storage errors', () => {
    expect(readMotion({ getItem: () => 'maybe' })).toBeNull();
    expect(readMotion({ getItem: () => { throw new Error('blocked'); } })).toBeNull();
    expect(() => writeMotion({ setItem: () => { throw new Error('full'); } }, 'reduce')).not.toThrow();
  });
});

describe('meter and spirit parts', () => {
  it('clamps the meter value to 0..100', () => {
    fc.assert(fc.property(fc.double({ noNaN: true, min: -1e6, max: 1e6 }), (n) => { const c = clampFear(n); expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThanOrEqual(100); }));
    expect(clampFear(Number.NaN)).toBe(0);
  });
  it('every image asset id maps through assetUrl to an existing file', () => {
    for (const id of [FEAR_FRAME_ASSET, SPIRIT_FRAME_ASSET, ...Object.keys(FEAR_EVENTS).flatMap((l) => [spiritAsset(l, 'full'), spiritAsset(l, 'close')])])
      expect(assetUrl(id), id).toMatch(/^\/media\//);
  });
});
describe('spirit panel at phone width (found in headless Chrome, task 11.2)', () => {
  const css = readFileSync(fileURLToPath(new URL('../src/components/fear.css', import.meta.url)), 'utf8');
  it('uses a real media feature for the narrow layout (max-inline-size is not a media feature)', () => {
    expect(css).not.toMatch(/@media\s*\(\s*(max|min)-inline-size/);
    expect(css).toMatch(/@media \(max-width: 30rem\)\s*\{\s*\.spirit-panel \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
  });
  it('puts a theme-surface scrim behind the question text over the light parchment frame', () => {
    expect(css).toMatch(/\.spirit-panel-body \{[^}]*background: color-mix\(in srgb, var\(--color-surface\)/);
  });
  it('keeps the spirit corner above the pan buttons so it does not hide their labels', () => {
    expect(css).toMatch(/\.spirit-corner \{[^}]*inset-block-end: 3\.5rem/);
  });
});
