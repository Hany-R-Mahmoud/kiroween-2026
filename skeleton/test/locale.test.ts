import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { resolveLocale } from '../src/locale/resolveLocale.ts';

describe('resolveLocale (decision 26)', () => {
  it('with the flag off, it is always English and left to right', () => {
    fc.assert(
      fc.property(fc.option(fc.string(), { nil: null }), fc.option(fc.string(), { nil: null }), (cookie, accept) => {
        expect(resolveLocale(false, cookie, accept)).toEqual({ lang: 'en', dir: 'ltr' });
      }),
      { numRuns: 100 },
    );
    expect(resolveLocale(false, 'ar', 'ar-EG,ar;q=0.9')).toEqual({ lang: 'en', dir: 'ltr' });
  });

  it('with the flag on, Arabic is right to left', () => {
    expect(resolveLocale(true, 'ar', null)).toEqual({ lang: 'ar', dir: 'rtl' });
    expect(resolveLocale(true, null, 'ar-EG,ar;q=0.9,en;q=0.5')).toEqual({ lang: 'ar', dir: 'rtl' });
  });

  it('with the flag on, the cookie wins over the browser, and English is the fallback', () => {
    expect(resolveLocale(true, 'en', 'ar-EG')).toEqual({ lang: 'en', dir: 'ltr' });
    expect(resolveLocale(true, null, 'fr-FR,de;q=0.8')).toEqual({ lang: 'en', dir: 'ltr' });
    expect(resolveLocale(true, 'xx', null)).toEqual({ lang: 'en', dir: 'ltr' });
  });

  it('respects the browser’s order of preference, and ignores q=0', () => {
    expect(resolveLocale(true, null, 'en;q=0.4,ar;q=0.9')).toEqual({ lang: 'ar', dir: 'rtl' });
    expect(resolveLocale(true, null, 'ar;q=0,en')).toEqual({ lang: 'en', dir: 'ltr' });
  });
});
