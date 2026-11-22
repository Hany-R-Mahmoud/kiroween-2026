import { Link } from '@tanstack/react-router';
import type { MessageKey } from '../i18n/en';

/** The atlas home. `ATLAS_ORIGIN` unset (empty) means same origin, so the href is `/` (Req 22.4). */
export function atlasHome(atlasOrigin: string): string {
  return `${atlasOrigin.replace(/\/+$/, '')}/`;
}

/**
 * Game header. Logo and the atlas link stay in the row; Hall, Account and Sign in/out sit in a native popover
 * (`#app-menu`). Below 40rem a menu button opens it; from 40rem CSS shows the items inline and hides the button
 * (see `.nav-menu` in styles.css). Decision recorded in docs/phase-6-notes/decisions.md (Req 18.8).
 */
export function GameHeader({ name, atlasOrigin, onSignOut, t }: { name: string | null; atlasOrigin: string; onSignOut: () => void; t: (key: MessageKey) => string }) {
  return (
    <header className="border-b border-surface">
      <nav className="mx-auto flex max-w-6xl items-center gap-1 px-3" aria-label={t('app.title')}>
        <Link to="/" className="nav-item me-auto font-display text-lg text-glow">
          {t('app.title')}
        </Link>
        <a href={atlasHome(atlasOrigin)} className="nav-item">
          {t('nav.atlas')}
        </a>
        <button type="button" className="btn btn-ghost nav-menu-button" popoverTarget="app-menu">
          {t('nav.menu')}
        </button>
        <div id="app-menu" popover="auto" className="nav-menu panel panel-raised">
          <Link to="/" className="nav-item">
            {t('nav.hall')}
          </Link>
          <Link to="/account" className="nav-item">
            {t('nav.account')}
          </Link>
          {name === null ? (
            <Link to="/sign-in" className="nav-item">
              {t('nav.signIn')}
            </Link>
          ) : (
            <button type="button" className="nav-item" onClick={onSignOut}>
              {t('nav.signOut')}
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
