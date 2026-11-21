import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createRateLimiter, visitorKey } from '../src/play/rateLimit.ts';

const clock = () => {
  let t = 0;
  return { now: () => t, set: (v: number) => (t = v) };
};

// Property 1: Rate limiter counts per key and window (Requirements 10.2, 10.3).
describe('createRateLimiter', () => {
  it('allows the first `limit` calls of a window, refuses the rest, and opens again after the window', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 1, max: 10_000 }),
        fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 1, maxLength: 80 }),
        (limit, windowMs, gaps) => {
          const c = clock();
          const rl = createRateLimiter({ limit, windowMs, maxKeys: 100, now: c.now });
          let start = Number.NEGATIVE_INFINITY; // the first call opens the first window
          let okInWindow = 0;
          let t = 0;
          for (const g of gaps) {
            t += g;
            c.set(t);
            const fresh = t - start >= windowMs;
            if (fresh) {
              start = t;
              okInWindow = 0;
            }
            const r = rl.hit('a');
            if (okInWindow < limit) {
              expect(r).toEqual({ ok: true });
              okInWindow++;
            } else {
              expect(r.ok).toBe(false);
              if (!r.ok) expect(r.retryAfterSeconds).toBeGreaterThanOrEqual(1);
            }
          }
          c.set(t + windowMs);
          expect(rl.hit('a')).toEqual({ ok: true });
        },
      ),
    );
  });

  it('keeps keys apart', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 }), fc.integer({ min: 0, max: 40 }), (limit, extra) => {
        const c = clock();
        const rl = createRateLimiter({ limit, windowMs: 60_000, maxKeys: 100, now: c.now });
        for (let i = 0; i < limit + extra; i++) rl.hit('busy');
        for (let i = 0; i < limit; i++) expect(rl.hit('quiet')).toEqual({ ok: true });
      }),
    );
  });

  it('never stores more than maxKeys windows', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), fc.array(fc.string({ minLength: 1, maxLength: 4 }), { maxLength: 300 }), (maxKeys, keys) => {
        const rl = createRateLimiter({ limit: 3, windowMs: 60_000, maxKeys, now: () => 0 });
        for (const k of keys) {
          rl.hit(k);
          expect(rl.size()).toBeLessThanOrEqual(maxKeys);
        }
      }),
    );
  });

  it('uses the shipped values: 30 per 60 s', async () => {
    const m = await import('../src/play/rateLimit.ts');
    expect([m.TUTORIAL_ANSWER_LIMIT, m.TUTORIAL_ANSWER_WINDOW_MS, m.RATE_LIMIT_MAX_KEYS]).toEqual([30, 60_000, 5000]);
  });
});

// Property 15: The rate-limit key is the visitor address, or nothing (Requirements 10.6, 10.7).
const addr = fc.oneof(fc.ipV4(), fc.ipV6());
const junk = fc.constantFrom('', '   ', 'x'.repeat(65));
describe('visitorKey', () => {
  it('takes the first x-forwarded-for entry, trimmed', () => {
    fc.assert(
      fc.property(addr, fc.array(addr, { maxLength: 3 }), fc.option(addr), (first, rest, real) => {
        const h = new Headers({ 'x-forwarded-for': [` ${first} `, ...rest].join(',') });
        if (real) h.set('x-real-ip', real);
        expect(visitorKey(h)).toBe(first);
      }),
    );
  });

  it('falls back to x-real-ip, then to nothing; never to a shared constant', () => {
    fc.assert(
      fc.property(fc.option(junk), addr, (xff, real) => {
        const h = new Headers(xff === null ? {} : { 'x-forwarded-for': xff });
        expect(visitorKey(h)).toBeNull();
        h.set('x-real-ip', ` ${real}`);
        expect(visitorKey(h)).toBe(real);
        h.set('x-real-ip', 'y'.repeat(65));
        expect(visitorKey(h)).toBeNull();
      }),
    );
  });

  it('gives different visitors different keys', () => {
    fc.assert(
      fc.property(addr, addr, (a, b) => {
        fc.pre(a !== b);
        expect(visitorKey(new Headers({ 'x-forwarded-for': a }))).not.toBe(visitorKey(new Headers({ 'x-forwarded-for': b })));
      }),
    );
  });
});
