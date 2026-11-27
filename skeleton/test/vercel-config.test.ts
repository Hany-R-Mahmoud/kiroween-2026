import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { atlasRouteRules, FUNCTION_REGIONS, GAME_PROJECT_ORIGIN, GAME_SECURITY_HEADERS, gameRouteRules, GSI, LONG_CACHE, SECURITY_HEADERS } from '../src/deploy/vercelRules.ts';
// Production routing and headers come from Nitro route rules (skeleton/src/deploy/vercelRules.ts), which Nitro writes into
// .vercel/output/config.json ahead of its catch-all. vercel.json keeps only the git rule, the install command and the
// region. Real responses are checked on production after each deploy (Requirement 8.5).
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
type VercelJson = Record<string, unknown>;
const read = (rel: string): VercelJson => JSON.parse(readFileSync(`${repoRoot}${rel}`, 'utf8')) as VercelJson;
const requiredGit = { deploymentEnabled: { '*': false, main: true } };

describe('vercel.json files', () => {
  it.each(['vercel.json', 'apps/atlas/vercel.json', 'apps/game/vercel.json'])('%s keeps the git key exactly', (f) => {
    expect(read(f).git).toStrictEqual(requiredGit);
  });
  it.each(['apps/atlas/vercel.json', 'apps/game/vercel.json'])('%s runs functions in pdx1, next to Neon us-west-2, and holds no rule Nitro would override', (f) => {
    const cfg = read(f);
    expect(cfg.regions).toStrictEqual(['pdx1']);
    expect(cfg.headers).toBeUndefined();
    expect(cfg.rewrites).toBeUndefined();
    expect(Object.keys(cfg).sort()).toEqual(['$schema', 'git', 'installCommand', 'regions']);
  });
});

describe('Nitro route rules (the source of production routing and headers)', () => {
  const sec = (h: Record<string, string> | undefined) => {
    expect(h?.['x-content-type-options']).toBe('nosniff');
    expect(h?.['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(h?.['x-frame-options']).toBe('DENY');
    expect(h?.['content-security-policy']).toMatch(/(^|;\s*)frame-ancestors 'none'(;|$)/);
  };
  it('the atlas sends the security headers everywhere and caches /media for a year', () => {
    const r = atlasRouteRules();
    sec(r['/**']?.headers);
    expect(r['/media/**']?.headers?.['cache-control']).toBe(LONG_CACHE);
    expect(LONG_CACHE).toBe('public, max-age=31536000, immutable');
  });
  it('the atlas forwards /game and everything under it to the game project', () => {
    const r = atlasRouteRules();
    expect(GAME_PROJECT_ORIGIN).toBe('https://trick-or-true.vercel.app');
    expect(r['/game']?.proxy).toBe(`${GAME_PROJECT_ORIGIN}/game/`);
    expect(r['/game/**']?.proxy).toBe(`${GAME_PROJECT_ORIGIN}/game/**`);
  });
  it('the game sends the security headers on every response', () => {
    sec(gameRouteRules()['/**']?.headers);
    expect(Object.keys(SECURITY_HEADERS)).toHaveLength(4);
  });
  describe("Google's sign-in button (Google Identity Services) CSP", () => {
    const directives = (csp: string) => Object.fromEntries(csp.split('; ').map((d) => [d.split(' ')[0], d.split(' ').slice(1)]));
    const game = () => directives(gameRouteRules()['/**']?.headers?.['content-security-policy'] ?? '');
    const atlas = () => directives(atlasRouteRules()['/**']?.headers?.['content-security-policy'] ?? '');
    it('the game allows exactly the four sources Google lists, each in its own directive', () => {
      const g = game();
      expect(g['script-src']).toEqual(["'self'", "'unsafe-inline'", 'https://accounts.google.com/gsi/client']);
      expect(g['style-src']).toEqual(["'self'", "'unsafe-inline'", 'https://accounts.google.com/gsi/style']);
      expect(g['connect-src']).toEqual(["'self'", 'https://accounts.google.com/gsi/']);
      expect(g['frame-src']).toEqual(['https://accounts.google.com/gsi/']);
      expect(GSI).toEqual({ script: 'https://accounts.google.com/gsi/client', frame: 'https://accounts.google.com/gsi/', connect: 'https://accounts.google.com/gsi/', style: 'https://accounts.google.com/gsi/style' });
    });
    it('every other game directive is the atlas one, and frame-ancestors stays none', () => {
      const { 'script-src': _s, 'style-src': _y, 'connect-src': _c, 'frame-src': _f, ...gameRest } = game();
      const { 'script-src': _s2, 'style-src': _y2, 'connect-src': _c2, ...atlasRest } = atlas();
      expect(gameRest).toEqual(atlasRest);
      expect(game()['frame-ancestors']).toEqual(["'none'"]);
    });
    it('no other host appears, and nothing is widened', () => {
      const csp = GAME_SECURITY_HEADERS['content-security-policy'] ?? '';
      expect([...new Set(csp.match(/https:\/\/[a-z.]+/g))].sort()).toEqual(['https://accounts.google.com', 'https://ik.imagekit.io']);
      expect(csp).not.toMatch(/\*/);
    });
    it('the atlas pages stay strict: no Google source, no frame-src', () => {
      expect(JSON.stringify(atlas())).not.toContain('google');
      expect(atlas()['frame-src']).toBeUndefined();
    });
    it('the atlas gives the proxied /game paths the same headers as the game project', () => {
      const r = atlasRouteRules();
      expect(r['/game']?.headers).toEqual(gameRouteRules()['/**']?.headers);
      expect(r['/game/**']?.headers).toEqual(gameRouteRules()['/**']?.headers);
      expect(r['/game/**']?.proxy).toBe(`${GAME_PROJECT_ORIGIN}/game/**`);
    });
  });
  it.each([['atlas', atlasRouteRules], ['game', gameRouteRules]] as const)('the %s CSP allows images from self, data: and the ImageKit CDN only', (_app, rules) => {
    const csp = rules()['/**']?.headers?.['content-security-policy'] ?? '';
    expect(csp).toMatch(/(^|;\s*)img-src 'self' data: https:\/\/ik\.imagekit\.io(;|$)/);
    // the one approved change: no other directive mentions the CDN, and nothing is widened to a wildcard
    expect(csp.match(/imagekit/g)).toHaveLength(1);
    expect(csp).not.toMatch(/\*/);
  });
  it('functions run in pdx1', () => {
    expect(FUNCTION_REGIONS).toEqual(['pdx1']);
  });
  it.each(['atlas', 'game'])('the %s vite config passes the rules and the region to Nitro', (app) => {
    const src = readFileSync(`${repoRoot}apps/${app}/vite.config.ts`, 'utf8');
    expect(src).toContain(`routeRules: ${app}RouteRules()`);
    expect(src).toContain('vercel: { functions: { regions: FUNCTION_REGIONS } }');
  });
});

// The Vercel build output, when a VERCEL=1 build exists (not committed): rules must come before Nitro's catch-all.
const out = (app: string) => `${repoRoot}apps/${app}/.vercel/output`;
describe.skipIf(!existsSync(`${out('atlas')}/config.json`) || !existsSync(`${out('game')}/config.json`))('built Vercel output', () => {
  type Route = { src?: string; dest?: string; headers?: Record<string, string>; handle?: string };
  const routes = (app: string) => (JSON.parse(readFileSync(`${out(app)}/config.json`, 'utf8')) as { routes: Route[] }).routes;
  const before = (rs: Route[], i: number) => i >= 0 && i < rs.findIndex((r) => r.dest === '/__server');
  it('atlas: /game and /game/ go to the game project before the atlas server', () => {
    const rs = routes('atlas');
    for (const path of ['/game', '/game/', '/game/tutorial', '/game/_serverFn/abc']) {
      const i = rs.findIndex((r) => r.dest?.startsWith(GAME_PROJECT_ORIGIN) && new RegExp(r.src!).test(path));
      expect(before(rs, i), path).toBe(true);
    }
    expect(rs.some((r) => r.dest?.startsWith(GAME_PROJECT_ORIGIN) && new RegExp(r.src!).test('/gamebook'))).toBe(false);
  });
  it('atlas: /game and /game/ never map to a slash-less /game (the game 307s that back to /game/: a loop)', () => {
    const rs = routes('atlas');
    for (const path of ['/game', '/game/']) {
      const first = rs.find((r) => r.dest !== undefined && new RegExp(r.src!).test(path));
      expect(first?.dest, path).toBe(`${GAME_PROJECT_ORIGIN}/game/`);
    }
  });
  it.each([['atlas', '/legends/banshee'], ['game', '/game/']])('%s: %s gets the security headers before the server', (app, path) => {
    const rs = routes(app);
    const i = rs.findIndex((r) => r.headers?.['x-content-type-options'] === 'nosniff' && new RegExp(r.src!).test(path));
    expect(before(rs, i)).toBe(true);
  });
  it('atlas: the proxied /game/ route carries the game CSP (Google sources) after the strict atlas one, and /legends keeps the strict one', () => {
    const rs = routes('atlas');
    const csp = (r: Route | undefined) => r?.headers?.['content-security-policy'] ?? '';
    const strict = rs.findIndex((r) => csp(r) !== '' && !csp(r).includes('google') && new RegExp(r.src!).test('/game/'));
    const game = rs.findIndex((r) => r.dest?.startsWith(GAME_PROJECT_ORIGIN) && new RegExp(r.src!).test('/game/'));
    expect(csp(rs[game])).toBe(GAME_SECURITY_HEADERS['content-security-policy']);
    expect(strict).toBeGreaterThanOrEqual(0);
    expect(strict).toBeLessThan(game);
    expect(rs.some((r) => csp(r).includes('google') && new RegExp(r.src!).test('/legends/banshee'))).toBe(false);
  });
  it.each(['atlas', 'game'])('%s: the function runs in pdx1', (app) => {
    const vc = JSON.parse(readFileSync(`${out(app)}/functions/__server.func/.vc-config.json`, 'utf8')) as { regions?: string[] };
    expect(vc.regions).toEqual(['pdx1']);
  });
});
