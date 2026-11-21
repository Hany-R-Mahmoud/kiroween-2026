/**
 * Fixed-window rate limit for one server action (the tutorial answer), kept in server memory.
 *
 * Counts live per server instance and reset on a cold start, so this slows a guessing script; it does not stop a
 * determined one. To change the limit, edit the constants below (and the burst check in the production smoke, which
 * expects a 429 within the first 40 answers). Upgrade path, not built: a Vercel firewall rule plus `@vercel/firewall`.
 */

/** Answers allowed per visitor per window. */
export const TUTORIAL_ANSWER_LIMIT = 30;
/** Window length in milliseconds. */
export const TUTORIAL_ANSWER_WINDOW_MS = 60_000;
/** Most visitors tracked at once; the oldest windows are dropped past this, so memory stays bounded. */
export const RATE_LIMIT_MAX_KEYS = 5000;
/** The one answer a refused call gets: fixed words, no answer, no limit numbers. Same words as `error.tooManyTries`. */
export const TOO_MANY_TRIES_MESSAGE = 'Too many tries. Wait a moment.';
/** A header value longer than this is not an address and is ignored. */
const MAX_KEY_LENGTH = 64;

export interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  maxKeys: number;
  /** The clock, in milliseconds. Passed in: the skeleton reads no ambient clock (rule R4.3). */
  now: () => number;
}
export type Hit = { ok: true } | { ok: false; retryAfterSeconds: number };

export function createRateLimiter(o: RateLimiterOptions): { hit(key: string): Hit; size(): number } {
  const { now } = o;
  // Map keeps insertion order; a key is re-inserted when its window restarts, so the first entry is the oldest window.
  const windows = new Map<string, { start: number; count: number }>();
  return {
    hit(key) {
      const t = now();
      const w = windows.get(key);
      if (w && t - w.start < o.windowMs) {
        if (w.count >= o.limit) return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((w.start + o.windowMs - t) / 1000)) };
        w.count += 1;
        return { ok: true };
      }
      windows.delete(key);
      while (windows.size >= o.maxKeys) {
        const oldest = windows.keys().next();
        if (oldest.done) break;
        windows.delete(oldest.value);
      }
      windows.set(key, { start: t, count: 1 });
      return { ok: true };
    },
    size: () => windows.size,
  };
}

const clean = (v: string | null | undefined): string | null => {
  const s = v?.trim();
  return s && s.length <= MAX_KEY_LENGTH ? s : null;
};

/**
 * The visitor's address as the platform reports it: the first `x-forwarded-for` entry, else `x-real-ip`. Returns
 * `null` when neither gives a usable value; the caller then does not limit (fail open). There is deliberately no
 * shared fallback key, so two visitors never share one bucket. The key is never logged.
 */
export function visitorKey(headers: Headers): string | null {
  return clean(headers.get('x-forwarded-for')?.split(',')[0]) ?? clean(headers.get('x-real-ip'));
}
