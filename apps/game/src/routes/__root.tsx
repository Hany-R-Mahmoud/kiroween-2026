import { createRootRoute, HeadContent, Link, Outlet, Scripts, useRouter } from '@tanstack/react-router';
import { signOut } from '../auth/client';
import { BASE_FONTS, fontLinks } from '../fonts';
import { translate } from '../i18n/t';
import { useT } from '../i18n/useT';
import { getShell } from '../server/functions';
import appCss from '../styles.css?url';

export const Route = createRootRoute({
  loader: () => getShell(),
  head: () => ({
    meta: [{ charSet: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }, { title: translate('en', 'app.title') }],
    links: [{ rel: 'stylesheet', href: appCss }, ...fontLinks(BASE_FONTS)],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});
/** Shown inside the shell for any unknown path under /game (Phase 3: the dev log warned the root had none). */
function NotFound() {
  const t = useT();
  return (
    <section aria-labelledby="not-found-title" className="flex flex-col gap-4">
      <h1 id="not-found-title" className="font-display text-3xl text-glow">
        {t('notFound.heading')}
      </h1>
      <p>{t('notFound.body')}</p>
      <p>
        <Link to="/" className="text-accent underline underline-offset-4">
          {t('notFound.hall')}
        </Link>
      </p>
    </section>
  );
}

const navLink = 'inline-flex min-h-11 items-center rounded px-3 text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-glow';

function RootComponent() {
  const { lang, dir, name } = Route.useLoaderData();
  const t = useT();
  const router = useRouter();
  return (
    <html lang={lang} dir={dir}>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-bg font-body text-ink">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:rounded focus:bg-surface focus:p-2">
          {t('nav.skip')}
        </a>
        <header className="border-b border-surface">
          <nav className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 p-3 font-ui text-sm" aria-label={t('app.title')}>
            <Link to="/" className={`${navLink} me-auto font-display text-lg text-glow`}>
              {t('app.title')}
            </Link>
            <Link to="/" className={navLink}>
              {t('nav.hall')}
            </Link>
            <Link to="/account" className={navLink}>
              {t('nav.account')}
            </Link>
            {name === null ? (
              <Link to="/sign-in" className={navLink}>
                {t('nav.signIn')}
              </Link>
            ) : (
              <button
                type="button"
                className={navLink}
                onClick={async () => {
                  await signOut();
                  await router.invalidate();
                  await router.navigate({ to: '/' });
                }}
              >
                {t('nav.signOut')}
              </button>
            )}
          </nav>
        </header>
        <main id="main" className="mx-auto max-w-3xl p-4">
          <Outlet />
        </main>
        <Scripts />
      </body>
    </html>
  );
}
