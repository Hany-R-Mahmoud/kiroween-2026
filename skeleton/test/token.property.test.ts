import { randomBytes } from 'node:crypto';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PLAY_ERROR_MESSAGES, PlayError } from '../src/play/errors.ts';
import {
  PLAY_TOKEN_TTL_SECONDS,
  RECEIPT_TOKEN_TTL_SECONDS,
  createTokenCodec,
  type TokenKind,
  type TokenPayload,
} from '../src/play/token.ts';

const NOW = 1_800_000_000_000;
const KINDS: TokenKind[] = ['play', 'tutorial', 'receipt'];
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// A random key per test run. It is never printed.
const key = randomBytes(32);
const codec = createTokenCodec({ key, now: () => NOW });

const idArb = fc.stringMatching(/^[a-z0-9][a-z0-9-]{0,30}$/);
// Long, distinctive text so a clear-text match cannot happen by chance.
const secretArb = fc.stringMatching(/^[A-Za-z0-9]{12,40}$/);
const payloadArb: fc.Arbitrary<TokenPayload> = fc.record({
  legendId: idArb,
  seed: secretArb,
  state: fc.record({
    fear: fc.integer({ min: 0, max: 100 }),
    answer: secretArb,
    list: fc.array(fc.integer({ min: 0, max: 9 }), { maxLength: 5 }),
    flag: fc.boolean(),
  }),
});
const kindArb = fc.constantFrom(...KINDS);

function expectRefused(fn: () => unknown): void {
  let caught: unknown;
  try {
    fn();
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(PlayError);
  const err = caught as PlayError;
  expect(err.code).toBe('session');
  expect(err.status).toBe(400);
  expect(err.message).toBe(PLAY_ERROR_MESSAGES.session);
}

const rawBytes = (token: string): Buffer => Buffer.from(token.slice(3), 'base64url');

describe('Property 1: Token round trip', () => {
  /** **Validates: Requirements 7.8, 7.9** */
  it('decodes to an equal payload and hides the seed and state values', () => {
    fc.assert(
      fc.property(kindArb, payloadArb, (kind, payload) => {
        const token = codec.encode(kind, payload);
        expect(codec.decode(kind, payload.legendId, token)).toEqual(payload);
        const state = payload.state as { answer: string };
        const bytes = rawBytes(token);
        // 12-byte IV + ciphertext (same length as the plain JSON in GCM) + 16-byte tag.
        const exp = Math.floor(NOW / 1000) + (kind === 'receipt' ? RECEIPT_TOKEN_TTL_SECONDS : PLAY_TOKEN_TTL_SECONDS);
        const plainLen = Buffer.byteLength(JSON.stringify({ v: 1, exp, ...payload }));
        expect(bytes.length).toBe(12 + plainLen + 16);
        for (const secret of [payload.seed, state.answer]) {
          expect(token.includes(secret)).toBe(false);
          expect(bytes.includes(Buffer.from(secret))).toBe(false);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('pins the lifetimes: 6 hours for play and tutorial tokens, 365 days for a receipt', () => {
    expect(PLAY_TOKEN_TTL_SECONDS).toBe(21_600);
    expect(RECEIPT_TOKEN_TTL_SECONDS).toBe(31_536_000);
  });

  it('uses a fresh IV, so equal payloads give different tokens', () => {
    const p: TokenPayload = { legendId: 'a', seed: 'seed-1', state: { n: 1 } };
    expect(codec.encode('play', p)).not.toBe(codec.encode('play', p));
  });

  it('is valid just before expiry for each kind', () => {
    const p: TokenPayload = { legendId: 'a', seed: 'seed-1', state: {} };
    for (const [kind, ttl] of [
      ['play', PLAY_TOKEN_TTL_SECONDS],
      ['tutorial', PLAY_TOKEN_TTL_SECONDS],
      ['receipt', RECEIPT_TOKEN_TTL_SECONDS],
    ] as const) {
      const token = codec.encode(kind, p);
      const late = createTokenCodec({ key, now: () => NOW + (ttl - 1) * 1000 });
      expect(late.decode(kind, 'a', token)).toEqual(p);
      const expired = createTokenCodec({ key, now: () => NOW + ttl * 1000 });
      expectRefused(() => expired.decode(kind, 'a', token));
    }
  });
});

describe('Property 2: Bad tokens are refused with one message', () => {
  /** **Validates: Requirements 7.8, 7.9, 7.10, 13.7** */
  it('refuses a one-character change at every position', () => {
    fc.assert(
      fc.property(kindArb, payloadArb, fc.nat(), (kind, payload, pick) => {
        const token = codec.encode(kind, payload);
        const original = rawBytes(token);
        for (let i = 0; i < token.length; i++) {
          const current = token[i]!;
          // Choose a different character from the alphabet, varying with the random pick.
          const options = [...B64].filter((c) => c !== current);
          const replacement = options[(pick + i) % options.length]!;
          const changed = token.slice(0, i) + replacement + token.slice(i + 1);
          // Unused trailing bits of the last base64 character do not change the bytes; skip only that case.
          if (i >= 3 && rawBytes(changed).equals(original)) continue;
          expectRefused(() => codec.decode(kind, payload.legendId, changed));
        }
      }),
      { numRuns: 15 },
    );
  });

  it('refuses every truncation', () => {
    fc.assert(
      fc.property(kindArb, payloadArb, (kind, payload) => {
        const token = codec.encode(kind, payload);
        for (let len = 0; len < token.length; len++) {
          expectRefused(() => codec.decode(kind, payload.legendId, token.slice(0, len)));
        }
      }),
      { numRuns: 15 },
    );
  });

  it('refuses extra trailing data and non-string input', () => {
    const token = codec.encode('play', { legendId: 'a', seed: 's', state: {} });
    expectRefused(() => codec.decode('play', 'a', token + 'A'));
    expectRefused(() => codec.decode('play', 'a', token + '.'));
    expectRefused(() => codec.decode('play', 'a', undefined as unknown as string));
  });

  it('refuses a token read for another legend', () => {
    fc.assert(
      fc.property(kindArb, payloadArb, idArb, (kind, payload, other) => {
        fc.pre(other !== payload.legendId);
        expectRefused(() => codec.decode(kind, other, codec.encode(kind, payload)));
      }),
      { numRuns: 100 },
    );
  });

  it('refuses a token read as another kind', () => {
    fc.assert(
      fc.property(kindArb, kindArb, payloadArb, (made, read, payload) => {
        fc.pre(made !== read);
        expectRefused(() => codec.decode(read, payload.legendId, codec.encode(made, payload)));
      }),
      { numRuns: 100 },
    );
  });

  it('refuses a token read after its expiry', () => {
    fc.assert(
      fc.property(kindArb, payloadArb, fc.integer({ min: 0, max: 10_000_000 }), (kind, payload, extra) => {
        const ttl = kind === 'receipt' ? RECEIPT_TOKEN_TTL_SECONDS : PLAY_TOKEN_TTL_SECONDS;
        const later = createTokenCodec({ key, now: () => NOW + ttl * 1000 + extra * 1000 });
        expectRefused(() => later.decode(kind, payload.legendId, codec.encode(kind, payload)));
      }),
      { numRuns: 100 },
    );
  });

  it('refuses a token read with a different key', () => {
    fc.assert(
      fc.property(kindArb, payloadArb, (kind, payload) => {
        const other = createTokenCodec({ key: randomBytes(32), now: () => NOW });
        expectRefused(() => other.decode(kind, payload.legendId, codec.encode(kind, payload)));
      }),
      { numRuns: 50 },
    );
  });

  it('gives the same message and status whatever the reason', () => {
    const p: TokenPayload = { legendId: 'a', seed: 'seed-1', state: {} };
    const token = codec.encode('play', p);
    const expired = createTokenCodec({ key, now: () => NOW + (PLAY_TOKEN_TTL_SECONDS + 1) * 1000 });
    const wrongKey = createTokenCodec({ key: randomBytes(32), now: () => NOW });
    const reasons: Array<() => unknown> = [
      () => codec.decode('play', 'b', token),
      () => codec.decode('tutorial', 'a', token),
      () => expired.decode('play', 'a', token),
      () => wrongKey.decode('play', 'a', token),
      () => codec.decode('play', 'a', token.slice(0, 30)),
      () => codec.decode('play', 'a', 'garbage'),
    ];
    const seen = new Set<string>();
    for (const run of reasons) {
      try {
        run();
      } catch (e) {
        const err = e as PlayError;
        seen.add(`${err.status}|${err.code}|${err.message}`);
      }
    }
    expect(seen.size).toBe(1);
  });
});
