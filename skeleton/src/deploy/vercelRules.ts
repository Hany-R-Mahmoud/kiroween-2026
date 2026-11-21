/**
 * Production routing and headers for Vercel, written by Nitro into `.vercel/output/config.json` (Phase 5, task 3.2).
 *
 * Why here and not in vercel.json: with Nitro's Build Output the first deploy ignored the atlas `vercel.json` rewrites
 * (Nitro's own catch-all route answered `/game/` with the atlas 404) and the game project sent none of its
 * `vercel.json` headers. Nitro places route-rule headers and external proxies ahead of its catch-all in config.json,
 * so these rules are the one source. Pure data: imported by both vite configs and by the tests.
 */

/** The game project's production alias; the atlas forwards /game there. Not a secret. */
export const GAME_PROJECT_ORIGIN = 'https://trick-or-true.vercel.app';
/** Vercel region next to the Neon production database (aws-us-west-2). */
export const FUNCTION_REGIONS = ['pdx1'];

const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  'content-security-policy': CSP,
};
export const LONG_CACHE = 'public, max-age=31536000, immutable';

type Rule = { headers?: Record<string, string>; proxy?: string };

/** Atlas project: security headers everywhere, a year of cache on /media, and /game proxied to the game project. */
export function atlasRouteRules(gameOrigin = GAME_PROJECT_ORIGIN): Record<string, Rule> {
  return {
    '/**': { headers: { ...SECURITY_HEADERS } },
    '/media/**': { headers: { 'cache-control': LONG_CACHE } },
    '/game': { proxy: `${gameOrigin}/game` },
    '/game/**': { proxy: `${gameOrigin}/game/**` },
  };
}

/** Game project (Nitro baseURL /game/, so keys are relative to it): security headers on every response. */
export function gameRouteRules(): Record<string, Rule> {
  return { '/**': { headers: { ...SECURITY_HEADERS } } };
}
