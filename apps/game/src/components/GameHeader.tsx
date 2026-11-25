import { Link } from '@tanstack/react-router';
import { useLayoutEffect, useRef, type MouseEvent } from 'react';
import type { MessageKey } from '../i18n/en';

/** The atlas legend list. `ATLAS_ORIGIN` unset (empty) means same origin, so the href is `/legends`. */
export function atlasHome(atlasOrigin: string): string {
  return `${atlasOrigin.replace(/\/+$/, '')}/legends`;
}

/**
 * Game header. Logo and the atlas link stay in the row; Hall, Account and Sign in/out sit in a native popover
 * (`#app-menu`). Below 40rem a menu button opens it; from 40rem CSS shows the items inline and hides the button
 * (see `.nav-menu` in styles.css). Decision recorded in docs/phase-6-notes/decisions.md (Req 18.8).
 */
export function GameHeader({ name, atlasOrigin, onSignOut, t }: { name: string | null; atlasOrigin: string; onSignOut: () => void; t: (key: MessageKey) => string }) {
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Publish the real header height so the open menu sits right under it. Without a measurement the CSS falls back to --app-header-h.
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const root = document.documentElement;
    const measure = () => root.style.setProperty('--game-header-h', `${el.getBoundingClientRect().height}px`);
    measure();
    if (typeof ResizeObserver === 'undefined') return () => root.style.removeProperty('--game-header-h');
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty('--game-header-h');
    };
  }, []);

  const closeMenu = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('a, button')) menuRef.current?.hidePopover?.();
  };

  return (
    <header ref={headerRef} className="border-b border-surface">
      <nav className="mx-auto flex max-w-6xl items-center gap-1 px-3" aria-label={t('app.title')}>
        <Link to="/" className="nav-item me-auto font-display text-lg text-glow">
          <img src="/game/brand/icon-small-gold.svg" alt="" aria-hidden="true" width={20} height={20} className="me-2 h-5 w-5 shrink-0" />
          {t('app.title')}
        </Link>
        <a href={atlasHome(atlasOrigin)} className="nav-item">
          {t('nav.atlas')}
        </a>
        <button type="button" className="btn btn-ghost nav-menu-button" popoverTarget="app-menu">
          {t('nav.menu')}
        </button>
        {/* Click on a link or button inside closes the popover; the handler only delegates. */}
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
        <div id="app-menu" ref={menuRef} popover="auto" className="nav-menu panel panel-raised" onClick={closeMenu}>
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
