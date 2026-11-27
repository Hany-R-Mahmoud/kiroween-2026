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

/**
 * Google Identity Services (the "Continue with Google" button on the game's sign-in and sign-up pages). The sources are
 * the ones Google lists for its button, nothing wider: developers.google.com/identity/gsi/web/guides/client-library.
 */
export const GSI = {
  script: 'https://accounts.google.com/gsi/client',
  frame: 'https://accounts.google.com/gsi/',
  connect: 'https://accounts.google.com/gsi/',
  style: 'https://accounts.google.com/gsi/style',
} as const;
function csp(google: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${google ? ` ${GSI.script}` : ''}`,
    `style-src 'self' 'unsafe-inline'${google ? ` ${GSI.style}` : ''}`,
    "img-src 'self' data: https://ik.imagekit.io",
    "font-src 'self'",
    `connect-src 'self'${google ? ` ${GSI.connect}` : ''}`,
    ...(google ? [`frame-src ${GSI.frame}`] : []),
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}
const COMMON_HEADERS = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'x-frame-options': 'DENY' } as const;
/** Atlas pages: no third-party script, frame or style. */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = { ...COMMON_HEADERS, 'content-security-policy': csp(false) };
/**
 * Game pages. Every game response gets the Google sources, not only /sign-in and /sign-up: the game is a single-page app,
 * so a player who reaches the sign-in page from the hall keeps the document (and CSP) of the page first loaded.
 */
export const GAME_SECURITY_HEADERS: Readonly<Record<string, string>> = { ...COMMON_HEADERS, 'content-security-policy': csp(true) };
export const LONG_CACHE = 'public, max-age=31536000, immutable';

type Rule = { headers?: Record<string, string>; proxy?: string };

/** Atlas project: security headers everywhere, a year of cache on /media, and /game proxied to the game project. */
export function atlasRouteRules(gameOrigin = GAME_PROJECT_ORIGIN): Record<string, Rule> {
  return {
    '/**': { headers: { ...SECURITY_HEADERS } },
    '/media/**': { headers: { 'cache-control': LONG_CACHE } },
    // Nitro's exact rule matches both /game and /game/; it must target the game's /game/ (with the slash), because the
    // game answers /game with a relative 307 to /game/, which would bring the browser back here in a loop.
    // The game's CSP (with the Google sources) is repeated here for the proxied paths, so the atlas's stricter `/**`
    // headers do not decide a game page's policy. The game project sends the same value itself.
    '/game': { proxy: `${gameOrigin}/game/`, headers: { ...GAME_SECURITY_HEADERS } },
    '/game/**': { proxy: `${gameOrigin}/game/**`, headers: { ...GAME_SECURITY_HEADERS } },
  };
}

/** Game project (Nitro baseURL /game/, so keys are relative to it): game security headers (with the Google sources) on every response. */
export function gameRouteRules(): Record<string, Rule> {
  return { '/**': { headers: { ...GAME_SECURITY_HEADERS } } };
}
