import { createRateLimiter, RATE_LIMIT_MAX_KEYS, TOO_MANY_TRIES_MESSAGE, TUTORIAL_ANSWER_LIMIT, TUTORIAL_ANSWER_WINDOW_MS, visitorKey } from '@kiroween/skeleton';

/** One limiter per server instance for tutorial answers (30 per 60 s per visitor; values in skeleton/src/play/rateLimit.ts). */
const tutorialLimiter = createRateLimiter({ limit: TUTORIAL_ANSWER_LIMIT, windowMs: TUTORIAL_ANSWER_WINDOW_MS, maxKeys: RATE_LIMIT_MAX_KEYS, now: () => Date.now() });

/**
 * The refusal for this request, or null to let it through. No usable visitor address: null (fail open), so visitors
 * never share one bucket. The address is used as a map key only and never logged. Server only.
 */
export function tutorialRateRefusal(headers: Headers, limiter: Pick<typeof tutorialLimiter, 'hit'> = tutorialLimiter): { status: 429; message: string } | null {
  const key = visitorKey(headers);
  if (key === null) return null;
  return limiter.hit(key).ok ? null : { status: 429, message: TOO_MANY_TRIES_MESSAGE };
}
