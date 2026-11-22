import { Link } from '@tanstack/react-router';
import type { Translate } from '../i18n/t';

/** The atlas header: logo home, the legend list, and the way into the game (a separate app on the same domain, so a plain anchor). */
export function SiteHeader({ t }: { t: Translate }) {
  return (
    <header className="border-b border-surface">
      <nav aria-label={t('nav.label')} className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-1 px-2 min-[40rem]:gap-x-2 min-[40rem]:px-4 py-2 font-ui text-sm">
        <Link to="/" activeOptions={{ exact: true }} className="nav-item me-auto px-2 min-[40rem]:px-3 inline-flex min-h-11 items-center font-display text-lg text-glow no-underline">
          {t('app.title')}
        </Link>
        <Link to="/" hash="legends" activeOptions={{ exact: true, includeHash: true }} className="nav-item px-2 min-[40rem]:px-3 inline-flex min-h-11 items-center">
          {t('nav.home')}
        </Link>
        <a href="/game/" className="nav-item nav-play px-2 min-[40rem]:px-3 inline-flex min-h-11 items-center">
          {t('nav.play')}
        </a>
      </nav>
    </header>
  );
}
