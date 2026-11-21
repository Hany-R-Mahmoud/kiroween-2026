// Tutorial answer rate limit at the server-function layer (Requirements 10.2 to 10.5, 26.7). No database, no network:
// Start's request helpers are replaced, the real middleware and the real limiter run.
import { createRateLimiter, TOO_MANY_TRIES_MESSAGE } from '@kiroween/skeleton';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ headers: new Headers(), status: 200 }));
vi.mock('@tanstack/react-start/server', () => ({
  getRequest: () => new Request('https://example.test/game/_serverFn/x', { method: 'POST', headers: http.headers }),
  setResponseStatus: (s: number) => {
    http.status = s;
  },
}));
const { tutorialRateLimit } = await import('../src/server/middleware');
const { tutorialRateRefusal } = await import('../src/server/tutorialRateLimit');
const runMiddleware = (tutorialRateLimit as unknown as { options: { server: (a: { next: () => Promise<string> }) => Promise<string> } }).options.server;
const handler = vi.fn(async () => 'answered');

const logs: string[] = [];
beforeEach(() => {
  http.status = 200;
  handler.mockClear();
  logs.length = 0;
  for (const m of ['log', 'info', 'warn', 'error', 'debug'] as const) vi.spyOn(console, m).mockImplementation((...a: unknown[]) => void logs.push(a.map(String).join(' ')));
});
afterEach(() => vi.restoreAllMocks());

/** Calls the real middleware the way Start does: it either passes to the handler or throws. */
async function call(ip: string | null): Promise<{ ok: true; value: string } | { ok: false; status: number; message: string }> {
  http.headers = new Headers(ip === null ? {} : { 'x-forwarded-for': ip });
  http.status = 200;
  try {
    return { ok: true, value: await runMiddleware({ next: handler }) };
  } catch (e) {
    return { ok: false, status: http.status, message: (e as Error).message };
  }
}

describe('tutorial answer rate limit', () => {
  it('passes the first 30 answers of a visitor unchanged and refuses the 31st with 429 and the fixed text', async () => {
    const ip = '203.0.113.7';
    for (let i = 0; i < 30; i++) expect(await call(ip)).toEqual({ ok: true, value: 'answered' });
    expect(handler).toHaveBeenCalledTimes(30);
    const refused = await call(ip);
    expect(refused).toEqual({ ok: false, status: 429, message: TOO_MANY_TRIES_MESSAGE });
    expect(handler).toHaveBeenCalledTimes(30); // the handler, and so the play rules and fear, never ran
  });

  it('the refusal holds no answer, no number and no address, and nothing is logged', async () => {
    const ip = '198.51.100.23';
    for (let i = 0; i < 31; i++) await call(ip);
    const r = await call(ip);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toBe('Too many tries. Wait a moment.');
      expect(r.message).not.toMatch(/\d/);
    }
    expect(logs.join('\n')).not.toContain(ip);
    expect(logs).toEqual([]);
  });

  it('another visitor is not affected', async () => {
    for (let i = 0; i < 40; i++) await call('192.0.2.1');
    expect(await call('192.0.2.2')).toEqual({ ok: true, value: 'answered' });
  });

  it('a request with no visitor address is never limited (fail open)', async () => {
    for (let i = 0; i < 100; i++) expect((await call(null)).ok).toBe(true);
  });

  it('the refusal decision uses the limiter it is given', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 10, now: () => 0 });
    const h = new Headers({ 'x-forwarded-for': '203.0.113.99' });
    expect(tutorialRateRefusal(h, limiter)).toBeNull();
    expect(tutorialRateRefusal(h, limiter)).toEqual({ status: 429, message: TOO_MANY_TRIES_MESSAGE });
  });
});

describe('where the limit applies', () => {
  const src = readFileSync(fileURLToPath(new URL('../src/server/functions.ts', import.meta.url)), 'utf8');
  it('only tutorialAct uses it, after the auth middleware', () => {
    expect(src.match(/tutorialRateLimit\]/g)).toHaveLength(1);
    expect(src).toMatch(/export const tutorialAct = createServerFn\(\{ method: 'POST' \}\)\n\s+\.middleware\(\[authMiddleware, tutorialRateLimit\]\)/);
    expect(src).toMatch(/safely\(async \(\) => actInTutorial\(tutorialDeps\(\), context\.visitor, data\)\)/);
  });
  it('the catalog text matches the server text', async () => {
    const { en } = await import('../src/i18n/en');
    expect(en['error.tooManyTries']).toBe(TOO_MANY_TRIES_MESSAGE);
  });
});
