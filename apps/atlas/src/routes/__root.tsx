import { BASE_PALETTE, type ResolvedTheme } from '@kiroween/skeleton/client';
import { createRootRoute, HeadContent, Link, Outlet, Scripts, useMatches } from '@tanstack/react-router';
import type { CSSProperties, ReactNode } from 'react';
import { AnchorFocus } from '../components/AnchorFocus';
import { NotFound } from '../components/NotFound';
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
    links: [{ rel: 'stylesheet', href: appCss }, ...fontLinks(BASE_FONTS)],
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
      <body style={theme?.vars as CSSProperties | undefined} className="min-h-screen">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <>
      <a href="#main" className="sr-only rounded bg-surface p-3 focus:not-sr-only focus:absolute focus:start-3 focus:top-3 focus:z-10">
        {t('nav.skip')}
      </a>
      <header className="border-b border-surface">
        <nav aria-label={t('nav.label')} className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 font-ui text-sm">
          <Link to="/" className="inline-flex min-h-11 items-center font-display text-lg text-glow no-underline">
            {t('app.title')}
          </Link>
          <Link to="/" className="inline-flex min-h-11 items-center">
            {t('nav.home')}
          </Link>
        </nav>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl outline-none">
        {children}
      </main>
      <footer className="mx-auto mt-16 flex max-w-6xl flex-col gap-1 border-t border-surface px-4 py-6 font-ui text-xs text-muted">
        <p>{t('footer.fiction')}</p>
        <p>{t('footer.map')}</p>
      </footer>
      <AnchorFocus />
    </>
  );
}

function RootComponent() {
  const { lang, dir } = Route.useLoaderData();
  return (
    <Document lang={lang} dir={dir} theme={useLegendTheme()}>
      <Shell>
        <Outlet />
      </Shell>
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
      <p>
        <a href="/">{translate('en', 'error.home')}</a>
      </p>
    </main>
  );
}
