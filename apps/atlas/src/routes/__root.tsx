import { BASE_PALETTE, ImageBaseContext, type ResolvedTheme } from '@kiroween/skeleton/client';
import { createRootRoute, HeadContent, Link, Outlet, Scripts, useMatches, useRouterState } from '@tanstack/react-router';
import { Mood } from '@kiroween/skeleton/mood';
import type { CSSProperties, ReactNode } from 'react';
import { NotFound } from '../components/NotFound';
import { SiteHeader } from '../components/SiteHeader';
import { BOOK_HEAD_SCRIPT } from '../bookHead';
import { BASE_FONTS, fontLinks } from '../fonts';
import { translate } from '../i18n/t';
import { useT } from '../i18n/useT';
import { getShell } from '../server/functions';
import appCss from '../styles.css?url';

export const Route = createRootRoute({
  loader: () => getShell(),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: translate('en', 'app.title') },
      { name: 'description', content: translate('en', 'app.description') },
      { name: 'theme-color', content: BASE_PALETTE.bg },
      { property: 'og:title', content: translate('en', 'app.title') },
      { property: 'og:description', content: translate('en', 'app.description') },
    ],
    links: [{ rel: 'stylesheet', href: appCss }, { rel: 'manifest', href: '/manifest.webmanifest' }, { rel: 'icon', href: '/favicon.ico', sizes: '48x48' }, { rel: 'icon', href: '/icons/favicon-32.png', type: 'image/png', sizes: '32x32' }, { rel: 'apple-touch-icon', href: '/icons/apple-touch-180.png' }, ...fontLinks(BASE_FONTS)],
    scripts: [{ children: BOOK_HEAD_SCRIPT }],
  }),
  component: RootComponent,
  notFoundComponent: () => <NotFoundInShell />,
  errorComponent: () => (
    <Document lang="en" dir="ltr" theme={undefined}>
      <ErrorPage />
    </Document>
  ),
});

/** The theme of the legend page being shown, from its loader (design 8); undefined on every other page. */
function useLegendTheme(): ResolvedTheme | undefined {
  return useMatches({ select: (matches) => matches.find((m) => m.routeId === '/legends/$legendId')?.loaderData as { theme: ResolvedTheme } | undefined })?.theme;
}

function Document({ lang, dir, theme, children }: { lang: string; dir: 'ltr' | 'rtl'; theme: ResolvedTheme | undefined; children: ReactNode }) {
  return (
    <html lang={lang} dir={dir}>
      <head>
        <HeadContent />
      </head>
      <body style={theme?.vars as CSSProperties | undefined} className="app-shell">
        <Mood />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/** The entry page (`/`) draws its own full-bleed layout: no site header, footer or width cap. Matched on the exact pathname. */

function Shell({ children }: { children: ReactNode }) {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const chromeless = pathname === '/';
  const skipLink = (
    <a href="#main" className="sr-only rounded bg-surface p-3 focus:not-sr-only focus:absolute focus:start-3 focus:top-3 focus:z-10">
      {t('nav.skip')}
    </a>
  );
  if (chromeless) {
    return (
      <>
        {skipLink}
        <main id="main" tabIndex={-1} className="outline-none">
          {children}
        </main>
      </>
    );
  }
  return (
    <>
      {skipLink}
      <SiteHeader t={t} />
      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl outline-none">
        {children}
      </main>
      <footer className="mx-auto mt-16 flex max-w-6xl flex-col gap-1 border-t border-surface px-4 py-6 font-ui text-xs text-muted">
        <p>{t('footer.fiction')}</p>
        <p>{t('footer.map')}</p>
        <p>
          <Link to="/legends/$legendId" params={{ legendId: 'keepers-note' }} className="nav-item inline-flex min-h-11 items-center">
            {t('footer.keepersNote')}
          </Link>
        </p>
      </footer>
    </>
  );
}

function RootComponent() {
  const { lang, dir, imageBase } = Route.useLoaderData();
  return (
    <Document lang={lang} dir={dir} theme={useLegendTheme()}>
      <ImageBaseContext.Provider value={imageBase}>
        <Shell>
          <Outlet />
        </Shell>
      </ImageBaseContext.Provider>
    </Document>
  );
}

function NotFoundInShell() {
  const t = useT();
  return <NotFound t={t} />;
}

/** A fixed page: the root's own data may be what failed, so it reads no loader data and shows no error text (R2.7). */
function ErrorPage() {
  return (
    <main id="main" className="measure mx-auto flex flex-col gap-4 px-4 py-16">
      <h1 className="text-4xl text-glow">{translate('en', 'error.title')}</h1>
      <p>{translate('en', 'error.body')}</p>
      <p className="flex flex-wrap gap-x-4">
        <a href="/" className="link inline-flex min-h-11 items-center">{translate('en', 'error.home')}</a>
        <a href="/legends" className="link inline-flex min-h-11 items-center">{translate('en', 'error.legends')}</a>
      </p>
    </main>
  );
}
