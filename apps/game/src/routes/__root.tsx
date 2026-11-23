import { createRootRoute, HeadContent, Link, Outlet, Scripts, useRouter } from '@tanstack/react-router';
import { BASE_PALETTE, ImageBaseContext } from '@kiroween/skeleton/client';
import { Mood } from '@kiroween/skeleton/mood';
import { GameHeader } from '../components/GameHeader';
import { signOut } from '../auth/client';
import { BASE_FONTS, fontLinks } from '../fonts';
import { translate } from '../i18n/t';
import { useT } from '../i18n/useT';
import { getShell } from '../server/functions';
import appCss from '../styles.css?url';

export const Route = createRootRoute({
  loader: () => getShell(),
  head: () => ({
    meta: [{ charSet: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }, { title: translate('en', 'app.title') }, { name: 'theme-color', content: BASE_PALETTE.bg }],
    links: [{ rel: 'stylesheet', href: appCss }, { rel: 'manifest', href: '/game/manifest.webmanifest' }, { rel: 'apple-touch-icon', href: '/game/icons/apple-touch-180.png' }, ...fontLinks(BASE_FONTS)],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});
/** Shown inside the shell for any unknown path under /game (Phase 3: the dev log warned the root had none). */
function NotFound() {
  const t = useT();
  return (
    <section aria-labelledby="not-found-title" className="page-narrow flex flex-col gap-4">
      <h1 id="not-found-title" className="font-display text-3xl text-glow">
        {t('notFound.heading')}
      </h1>
      <p>{t('notFound.body')}</p>
      <p>
        <Link to="/" className="link">
          {t('notFound.hall')}
        </Link>
      </p>
    </section>
  );
}

function RootComponent() {
  const { lang, dir, name, mediaBase, imageBase } = Route.useLoaderData();
  const t = useT();
  const router = useRouter();
  return (
    <html lang={lang} dir={dir}>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-bg font-body text-ink">
        <Mood />
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:rounded focus:bg-surface focus:p-2">
          {t('nav.skip')}
        </a>
        <GameHeader
          t={t}
          name={name}
          atlasOrigin={mediaBase}
          onSignOut={async () => {
            await signOut();
            await router.invalidate();
            await router.navigate({ to: '/' });
          }}
        />
        <main id="main" className="mx-auto max-w-6xl p-4">
          <ImageBaseContext.Provider value={imageBase}>
            <Outlet />
          </ImageBaseContext.Provider>
        </main>
        <Scripts />
      </body>
    </html>
  );
}
