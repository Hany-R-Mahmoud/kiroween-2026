// Pure parts of the production smoke (task 10.2, Requirement 27). No network, no server.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BURST_ANSWERS, cacheImmutable, classifyBurst, countId, findLeaks, hasContentEncoding, parseArgs, resultLine, SERVER_FN_ORDER,
  securityHeaders, serverFnIds, stepEnabled, summarise, yesNo,
} from '../scripts/smokeProdLib.ts';

describe('parseArgs', () => {
  it('takes an https base, normalised to its origin', () => {
    expect(parseArgs(['https://x.example.app/'])).toEqual({ ok: true, base: 'https://x.example.app', skipBurst: false, only: null });
  });
  it('reads --skip-burst and --only by name or number', () => {
    expect(parseArgs(['https://x.example.app', '--skip-burst'])).toMatchObject({ ok: true, skipBurst: true });
    expect(parseArgs(['--only', 'user', 'https://x.example.app'])).toMatchObject({ ok: true, only: 'user' });
    expect(parseArgs(['https://x.example.app', '--only', '6'])).toMatchObject({ ok: true, only: 'burst' });
  });
  it('refuses a missing base, plain http for a real host, a bad step, an unknown flag and two bases', () => {
    for (const bad of [[], ['http://x.example.app'], ['https://x.example.app', '--only', '7'], ['https://x.example.app', '--only'], ['https://x.example.app', '--nope'], ['https://a.app', 'https://b.app'], ['not a url']]) {
      expect(parseArgs(bad).ok).toBe(false);
    }
  });
  it('allows http for localhost only', () => {
    expect(parseArgs(['http://localhost:3000']).ok).toBe(true);
  });
  it('--only runs one step; --skip-burst drops only the burst', () => {
    expect(stepEnabled('anchor', { only: 'anchor', skipBurst: false })).toBe(true);
    expect(stepEnabled('guest', { only: 'anchor', skipBurst: false })).toBe(false);
    expect(stepEnabled('burst', { only: null, skipBurst: true })).toBe(false);
    expect(stepEnabled('user', { only: null, skipBurst: true })).toBe(true);
    expect(stepEnabled('burst', { only: 'burst', skipBurst: true })).toBe(true);
  });
});

describe('header checks on a fake Response', () => {
  const good = new Headers({
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'x-frame-options': 'DENY',
    'content-security-policy': "default-src 'self'; frame-ancestors 'none'",
  });
  it('reports yes for every security header present', () => {
    expect(Object.values(securityHeaders(good)).every(Boolean)).toBe(true);
  });
  it('reports no for what is missing, and frame blocking can come from the CSP alone', () => {
    const r = securityHeaders(new Headers({ 'content-security-policy': "frame-ancestors 'none'" }));
    expect(Object.values(r)).toEqual([false, false, true, true]);
    expect(Object.values(securityHeaders(new Headers())).some(Boolean)).toBe(false);
  });
  it('prints names and yes/no, never a value', () => {
    const text = yesNo(securityHeaders(good));
    expect(text).toContain('Content-Security-Policy yes');
    expect(text).not.toContain('default-src');
    expect(text).not.toContain('DENY');
  });
  it('checks immutable on media and content-encoding on JS', () => {
    expect(cacheImmutable(new Headers({ 'cache-control': 'public, max-age=31536000, immutable' }))).toBe(true);
    expect(cacheImmutable(new Headers({ 'cache-control': 'public, max-age=0' }))).toBe(false);
    expect(hasContentEncoding(new Headers({ 'content-encoding': 'br' }))).toBe(true);
    expect(hasContentEncoding(new Headers())).toBe(false);
  });
});

describe('burst classification', () => {
  it('a 429 within the first 40 passes, with its position', () => {
    expect(classifyBurst([200, 200, 429])).toEqual({ kind: 'pass', at: 3 });
    expect(classifyBurst([...Array(BURST_ANSWERS - 1).fill(400), 429])).toEqual({ kind: 'pass', at: BURST_ANSWERS });
  });
  it('no 429 is a finding, not a failure', () => {
    expect(classifyBurst(Array(BURST_ANSWERS).fill(400))).toEqual({ kind: 'finding' });
    expect(classifyBurst([])).toEqual({ kind: 'finding' });
  });
  it('a 429 after the 40th answer does not count', () => {
    expect(classifyBurst([...Array(BURST_ANSWERS).fill(400), 429])).toEqual({ kind: 'finding' });
  });
});

describe('results, leaks, ids', () => {
  it('a finding does not count as a failure in the summary', () => {
    const lines = [resultLine('PASS', 'a'), resultLine('FINDING', 'burst', 'per instance'), resultLine('FAIL', 'b')];
    expect(summarise(lines)).toBe('summary: 1 PASS, 1 FAIL, 1 FINDING, 0 SKIP');
    expect(summarise(lines.slice(0, 2))).toContain('0 FAIL');
  });
  it('finds quoted secret keys and ignores ordinary words', () => {
    expect(findLeaks('{"correctIndex":2,"x":1}')).toEqual(['correctIndex']);
    expect(findLeaks('{"k":["seed"]}')).toEqual(['seed']);
    expect(findLeaks('The seed pods were dry and the lead was cold.')).toEqual([]);
  });
  it('reads server function ids in source order, and refuses a wrong count', () => {
    const ids = SERVER_FN_ORDER.map((_, i) => String(i % 10).repeat(64));
    const chunk = ids.map((id) => `Z({method:\`GET\`}).middleware([$]).handler(X(\`${id}\`))`).join(',');
    const map = serverFnIds(chunk);
    expect(map?.get('getShell')).toBe(ids[0]);
    expect(map?.get('myCompletedWorldsFn')).toBe(ids[SERVER_FN_ORDER.length - 1]);
    expect(serverFnIds(chunk.slice(0, chunk.lastIndexOf(',')))).toBeNull();
  });
  it('the id order list equals the createServerFn exports of the game, in order', () => {
    const src = readFileSync(new URL('../../apps/game/src/server/functions.ts', import.meta.url), 'utf8');
    const names = [...src.matchAll(/^export const (\w+) = createServerFn/gm)].map((m) => m[1]);
    expect(names).toEqual([...SERVER_FN_ORDER]);
  });
  it('counts an element id', () => {
    expect(countId('<h2 id="a--ch-1">x</h2><p id="a--ch-10"></p>', 'a--ch-1')).toBe(1);
    expect(countId('<p></p>', 'a--ch-1')).toBe(0);
  });
});
