import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
// Reads the Vercel configuration, not responses: Vercel applies these headers at its edge, so a local build cannot show
// them. Real responses are checked on production after the deploy (Requirement 8.5).
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
type Header = { key: string; value: string };
type Rule = { source: string; headers: Header[] };
type VercelJson = { git?: unknown; regions?: unknown; headers?: Rule[]; rewrites?: { source: string; destination: string }[] };
const read = (rel: string): VercelJson => JSON.parse(readFileSync(`${repoRoot}${rel}`, 'utf8')) as VercelJson;
const files = ['vercel.json', 'apps/atlas/vercel.json', 'apps/game/vercel.json'];
const requiredGit = { deploymentEnabled: { '*': false, main: true } };
const rule = (cfg: VercelJson, source: string): Header[] => cfg.headers?.find((r) => r.source === source)?.headers ?? [];
const value = (hs: Header[], key: string) => hs.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;

describe('vercel.json files', () => {
  it.each(files)('%s keeps the git key exactly', (f) => {
    expect(read(f).git).toStrictEqual(requiredGit);
  });

  it.each(['apps/atlas/vercel.json', 'apps/game/vercel.json'])('%s runs functions in pdx1, next to Neon us-west-2', (f) => {
    expect(read(f).regions).toStrictEqual(['pdx1']);
  });

  it.each([
    ['apps/atlas/vercel.json', '/:path((?!game(?:/|$)).*)'],
    ['apps/game/vercel.json', '/game/:path*'],
  ])('%s sends the security headers on %s', (f, source) => {
    const hs = rule(read(f), source);
    expect(value(hs, 'X-Content-Type-Options')).toBe('nosniff');
    expect(value(hs, 'Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(value(hs, 'X-Frame-Options')).toBe('DENY');
    expect(value(hs, 'Content-Security-Policy')).toMatch(/(^|;\s*)frame-ancestors 'none'(;|$)/);
  });

  it.each([
    ['apps/atlas/vercel.json', '/media/:path*'],
    ['apps/atlas/vercel.json', '/assets/:path*'],
    ['apps/game/vercel.json', '/game/assets/:path*'],
  ])('%s caches %s for a year', (f, source) => {
    expect(value(rule(read(f), source), 'Cache-Control')).toBe('public, max-age=31536000, immutable');
  });

  it('the atlas sends /game to the game project before anything else', () => {
    const rw = read('apps/atlas/vercel.json').rewrites ?? [];
    expect(rw.slice(0, 2).map((r) => r.source)).toEqual(['/game', '/game/:path*']);
    for (const r of rw.slice(0, 2)) expect(r.destination).toMatch(/^https:\/\/[^/]+\.vercel\.app\/game/);
  });

  it('the atlas security rule leaves /game responses to the game project', () => {
    const re = /^\/((?!game(?:\/|$)).*)$/;
    expect(re.test('/')).toBe(true);
    expect(re.test('/legend/banshee')).toBe(true);
    expect(re.test('/gamebook')).toBe(true);
    expect(re.test('/game')).toBe(false);
    expect(re.test('/game/tutorial')).toBe(false);
  });
});
