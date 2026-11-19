export type Locale = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';

const DIRECTION: Record<Locale, Direction> = { en: 'ltr', ar: 'rtl' };

/** First language tag in an Accept-Language header that we support, by the client's order of preference. */
function fromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const tags = header
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      return { lang: tag.toLowerCase().split('-')[0], q: q ? Number(q.slice(2)) : 1 };
    })
    .filter((t) => Number.isFinite(t.q) && t.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const t of tags) if (t.lang === 'ar' || t.lang === 'en') return t.lang;
  return null;
}

/**
 * Decision 26: English always, unless FEATURE_ARABIC is on. With the flag on, an explicit `lang` cookie wins, then
 * the browser's Accept-Language, then English.
 */
export function resolveLocale(arabicEnabled: boolean, cookie: string | null, acceptLanguage: string | null): { lang: Locale; dir: Direction } {
  let lang: Locale = 'en';
  if (arabicEnabled) {
    if (cookie === 'ar' || cookie === 'en') lang = cookie;
    else lang = fromAcceptLanguage(acceptLanguage) ?? 'en';
  }
  return { lang, dir: DIRECTION[lang] };
}
