import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createRng } from '../src/rng/rng.ts';

const draw = (seed: string, n = 20): number[] => {
  const r = createRng(seed);
  return Array.from({ length: n }, () => r.next());
};

describe('createRng', () => {
  it('gives the same sequence for the same seed', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(draw(s)).toEqual(draw(s));
      }),
      { numRuns: 100 },
    );
  });

  it('gives different sequences for different seeds', () => {
    expect(draw('seed-a')).not.toEqual(draw('seed-b'));
    expect(draw('')).not.toEqual(draw(' '));
  });

  it('next() stays in [0, 1) and is not constant', () => {
    const xs = draw('range', 2000);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
    expect(new Set(xs).size).toBeGreaterThan(1990);
  });

  it('int() stays inside the inclusive range and reaches both ends', () => {
    fc.assert(
      fc.property(fc.string(), fc.integer({ min: -50, max: 50 }), fc.integer({ min: 0, max: 20 }), (s, lo, span) => {
        const r = createRng(s);
        for (let i = 0; i < 30; i++) {
          const v = r.int(lo, lo + span);
          expect(v).toBeGreaterThanOrEqual(lo);
          expect(v).toBeLessThanOrEqual(lo + span);
        }
      }),
      { numRuns: 100 },
    );
    const r = createRng('ends');
    const seen = new Set(Array.from({ length: 200 }, () => r.int(1, 3)));
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });

  it('rejects an empty or inverted range', () => {
    expect(() => createRng('x').int(3, 2)).toThrow(RangeError);
    expect(() => createRng('x').pick([])).toThrow(RangeError);
  });

  it('shuffle returns a permutation and leaves the input alone', () => {
    fc.assert(
      fc.property(fc.string(), fc.array(fc.integer(), { maxLength: 30 }), (s, xs) => {
        const copy = [...xs];
        const out = createRng(s).shuffle(xs);
        expect(xs).toEqual(copy);
        expect([...out].sort((a, b) => a - b)).toEqual([...xs].sort((a, b) => a - b));
      }),
      { numRuns: 100 },
    );
  });

  it('sample returns n distinct items from the list', () => {
    fc.assert(
      fc.property(fc.string(), fc.uniqueArray(fc.integer(), { minLength: 1, maxLength: 20 }), fc.nat(20), (s, xs, k) => {
        const n = Math.min(k, xs.length);
        const out = createRng(s).sample(xs, n);
        expect(out).toHaveLength(n);
        expect(new Set(out).size).toBe(n);
        for (const x of out) expect(xs).toContain(x);
      }),
      { numRuns: 100 },
    );
    expect(() => createRng('x').sample([1, 2], 3)).toThrow(RangeError);
  });

  it('fork streams do not depend on what was drawn before', () => {
    const a = createRng('run');
    const first = a.fork('version').next();
    const b = createRng('run');
    for (let i = 0; i < 50; i++) b.next();
    expect(b.fork('version').next()).toBe(first);
    expect(createRng('run').fork('slot:1').next()).not.toBe(createRng('run').fork('slot:2').next());
  });
});

describe('source rules (R4.3)', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
    });

  it('uses no ambient randomness or clock under skeleton/src', () => {
    const src = fileURLToPath(new URL('../src', import.meta.url));
    const banned = [/Math\s*\.\s*random/, /Date\s*\.\s*now/, /new\s+Date\s*\(/, /crypto\s*\.\s*random/];
    for (const f of walk(src)) {
      const text = readFileSync(f, 'utf8');
      for (const re of banned) expect(re.test(text), `${f} matches ${re}`).toBe(false);
    }
  });
});
