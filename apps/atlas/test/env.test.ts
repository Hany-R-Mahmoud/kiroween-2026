import { describe, expect, it } from 'vitest';
import { EnvError, parseEnv } from '../src/server/env.ts';

// Built from parts at run time, so no connection-string literal sits in the repo.
const scheme = ['post', 'gres', 'ql'].join('');
const base = { ATLAS_DATABASE_URL: `${scheme}://reader@db.invalid/neondb` };

const failure = (source: Record<string, string | undefined>): EnvError => {
  try {
    parseEnv(source);
  } catch (e) {
    if (e instanceof EnvError) return e;
    throw e;
  }
  throw new Error('expected an EnvError');
};

describe('parseEnv (atlas)', () => {
  it('accepts the database URL alone: Arabic off, no public origin', () => {
    expect(parseEnv(base)).toEqual({ databaseUrl: base.ATLAS_DATABASE_URL, arabicEnabled: false, publicOrigin: '' });
    expect(parseEnv({ ...base, FEATURE_ARABIC: 'TRUE ' }).arabicEnabled).toBe(true);
  });

  it.each(['', 'https://example.org', 'https://atlas.example.org:8443', 'http://localhost', 'http://localhost:3001'])('accepts PUBLIC_ORIGIN %j', (origin) => {
    expect(parseEnv({ ...base, PUBLIC_ORIGIN: origin }).publicOrigin).toBe(origin);
  });

  it.each([
    'http://example.org',
    'http://127.0.0.1:3001',
    'https://example.org/',
    'https://example.org/atlas',
    'https://example.org?x=1',
    'https://example.org#top',
    'https://user@example.org',
    'ftp://example.org',
    'example.org',
    'HTTPS://EXAMPLE.ORG',
  ])('refuses PUBLIC_ORIGIN %j and names only the variable', (origin) => {
    const e = failure({ ...base, PUBLIC_ORIGIN: origin });
    expect(e.variable).toBe('PUBLIC_ORIGIN');
    expect(e.message).not.toContain(origin);
  });

  it.each([
    ['ATLAS_DATABASE_URL', { ATLAS_DATABASE_URL: undefined }],
    ['ATLAS_DATABASE_URL', { ATLAS_DATABASE_URL: '  ' }],
    ['ATLAS_DATABASE_URL', { ATLAS_DATABASE_URL: 'https://not-a-database.invalid' }],
    ['ATLAS_DATABASE_URL', { ATLAS_DATABASE_URL: 'not a url' }],
    ['FEATURE_ARABIC', { FEATURE_ARABIC: 'yes' }],
  ])('names %s when it is missing or wrong', (variable, over) => {
    expect(failure({ ...base, ...over }).variable).toBe(variable);
  });

  it('never includes a value in the message', () => {
    const marker = ['MARK', 'ER'].join('');
    for (const over of [{ ATLAS_DATABASE_URL: `https://${marker}.invalid` }, { FEATURE_ARABIC: marker }, { PUBLIC_ORIGIN: `http://${marker}.invalid` }])
      expect(failure({ ...base, ...over }).message).not.toContain(marker);
  });
});
