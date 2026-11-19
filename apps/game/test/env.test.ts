import { describe, expect, it } from 'vitest';
import { EnvError, parseEnv } from '../src/server/env';

// Values are built from parts at run time, so no secret-shaped literal sits in the repo.
const scheme = ['post', 'gres', 'ql'].join('');
const secret = ['k', 'w'].join('').repeat(20); // 40 characters
const base = {
  DATABASE_URL: `${scheme}://u:p@db.invalid/neondb`,
  NEON_AUTH_BASE_URL: 'https://auth.invalid/neondb/auth',
  NEON_AUTH_COOKIE_SECRET: secret,
};

const failure = (source: Record<string, string | undefined>): EnvError => {
  try {
    parseEnv(source);
  } catch (e) {
    if (e instanceof EnvError) return e;
    throw e;
  }
  throw new Error('expected an EnvError');
};

describe('parseEnv', () => {
  it('accepts a full environment, with banshee and the Arabic flag off by default', () => {
    expect(parseEnv(base)).toMatchObject({ guestWorld: 'banshee', arabicEnabled: false });
    expect(parseEnv({ ...base, GUEST_WORLD: 'draugr', FEATURE_ARABIC: 'true' })).toMatchObject({ guestWorld: 'draugr', arabicEnabled: true });
  });

  it.each([
    ['DATABASE_URL', { DATABASE_URL: undefined }],
    ['DATABASE_URL', { DATABASE_URL: 'https://not-a-database.invalid' }],
    ['NEON_AUTH_BASE_URL', { NEON_AUTH_BASE_URL: '' }],
    ['NEON_AUTH_BASE_URL', { NEON_AUTH_BASE_URL: 'http://plain-http.invalid/auth' }],
    ['NEON_AUTH_BASE_URL', { NEON_AUTH_BASE_URL: 'not a url' }],
    ['NEON_AUTH_COOKIE_SECRET', { NEON_AUTH_COOKIE_SECRET: undefined }],
    ['NEON_AUTH_COOKIE_SECRET', { NEON_AUTH_COOKIE_SECRET: 'x'.repeat(31) }],
    ['GUEST_WORLD', { GUEST_WORLD: '../etc' }],
    ['FEATURE_ARABIC', { FEATURE_ARABIC: 'yes' }],
  ])('names %s when it is missing or wrong', (variable, over) => {
    expect(failure({ ...base, ...over }).variable).toBe(variable);
  });

  it('never includes the value in the message', () => {
    const marker = ['MARK', 'ER'].join('');
    for (const over of [
      { DATABASE_URL: `https://${marker}.invalid` },
      { NEON_AUTH_BASE_URL: `http://${marker}.invalid` },
      { NEON_AUTH_COOKIE_SECRET: marker },
      { GUEST_WORLD: `${marker}/x` },
      { FEATURE_ARABIC: marker },
    ])
      expect(failure({ ...base, ...over }).message).not.toContain(marker);
  });
});
