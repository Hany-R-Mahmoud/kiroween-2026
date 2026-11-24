import { Link } from '@tanstack/react-router';
import type { Translate } from '../i18n/t';

/** The atlas header: logo home, the legend list, and the way into the game (a separate app on the same domain, so a plain anchor). */
export function SiteHeader({ t }: { t: Translate }) {
  return (
    <header className="border-b border-surface">
      <nav aria-label={t('nav.label')} className="mx-auto flex h-full max-w-6xl flex-nowrap items-center justify-between gap-x-1 px-2 min-[40rem]:gap-x-2 min-[40rem]:px-4 font-ui text-sm">
        <Link to="/" activeOptions={{ exact: true }} className="nav-item me-auto min-w-0 truncate px-2 min-[40rem]:px-3 inline-flex min-h-11 items-center font-display text-lg text-glow no-underline">
          {t('app.title')}
        </Link>
        <Link to="/legends" activeOptions={{ exact: true }} className="nav-item px-2 min-[40rem]:px-3 inline-flex min-h-11 items-center">
          {t('nav.home')}
        </Link>
        {/* Short visible label on phones so the header stays on one row; the full name is the accessible name (label-in-name). */}
        <a href="/game/" aria-label={t('nav.play')} className="nav-item nav-play px-2 min-[40rem]:px-3 inline-flex min-h-11 items-center">
          <span className="min-[40rem]:hidden">{t('nav.playShort')}</span>
          <span className="hidden min-[40rem]:inline">{t('nav.play')}</span>
        </a>
      </nav>
    </header>
  );
}
