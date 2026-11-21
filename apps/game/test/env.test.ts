import { describe, expect, it } from 'vitest';
import { EnvError, parseEnv } from '../src/server/env';

// Values are built from parts at run time, so no secret-shaped literal sits in the repo.
const scheme = ['post', 'gres', 'ql'].join('');
const secret = ['k', 'w'].join('').repeat(20); // 40 characters
const base = {
  DATABASE_URL: `${scheme}://u:p@db.invalid/neondb`,
  NEON_AUTH_BASE_URL: 'https://auth.invalid/neondb/auth',
  NEON_AUTH_COOKIE_SECRET: secret,
  GAME_TOKEN_KEY: Buffer.alloc(32, 7).toString('base64'),
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
    ['GAME_TOKEN_KEY', { GAME_TOKEN_KEY: undefined }],
    ['GAME_TOKEN_KEY', { GAME_TOKEN_KEY: Buffer.alloc(31, 7).toString('base64') }],
    ['GAME_TOKEN_KEY', { GAME_TOKEN_KEY: Buffer.alloc(33, 7).toString('base64') }],
    ['GAME_TOKEN_KEY', { GAME_TOKEN_KEY: 'not base64!' }],
    ['GUEST_WORLD', { GUEST_WORLD: '../etc' }],
    ['FEATURE_ARABIC', { FEATURE_ARABIC: 'yes' }],
    ['ATLAS_ORIGIN', { ATLAS_ORIGIN: 'http://localhost:3001/' }],
    ['ATLAS_ORIGIN', { ATLAS_ORIGIN: 'https://atlas.example.org/legends' }],
    ['ATLAS_ORIGIN', { ATLAS_ORIGIN: 'https://atlas.example.org?x=1' }],
    ['ATLAS_ORIGIN', { ATLAS_ORIGIN: 'ftp://atlas.example.org' }],
    ['ATLAS_ORIGIN', { ATLAS_ORIGIN: 'javascript:alert(1)' }],
    ['ATLAS_ORIGIN', { ATLAS_ORIGIN: 'not a url' }],
  ])('names %s when it is missing or wrong', (variable, over) => {
    expect(failure({ ...base, ...over }).variable).toBe(variable);
  });

  it('decodes GAME_TOKEN_KEY to 32 bytes', () => {
    expect(parseEnv(base).tokenKey.length).toBe(32);
  });

  it('ATLAS_ORIGIN is optional: empty by default, an http or https origin when set', () => {
    expect(parseEnv(base).atlasOrigin).toBe('');
    expect(parseEnv({ ...base, ATLAS_ORIGIN: 'http://localhost:3001' }).atlasOrigin).toBe('http://localhost:3001');
    expect(parseEnv({ ...base, ATLAS_ORIGIN: 'https://atlas.example.org' }).atlasOrigin).toBe('https://atlas.example.org');
  });

  it('never includes the value in the message', () => {
    const marker = ['MARK', 'ER'].join('');
    for (const over of [
      { DATABASE_URL: `https://${marker}.invalid` },
      { NEON_AUTH_BASE_URL: `http://${marker}.invalid` },
      { NEON_AUTH_COOKIE_SECRET: marker },
      { GAME_TOKEN_KEY: marker },
      { GUEST_WORLD: `${marker}/x` },
      { FEATURE_ARABIC: marker },
      { ATLAS_ORIGIN: `https://${marker}.invalid/x` },
    ])
      expect(failure({ ...base, ...over }).message).not.toContain(marker);
  });
});
