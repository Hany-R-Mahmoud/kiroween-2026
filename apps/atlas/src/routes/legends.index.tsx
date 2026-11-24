import { SHARED_ATLAS_IMAGES } from '@kiroween/skeleton/client';
import { createFileRoute } from '@tanstack/react-router';
import { HomeView } from '../components/HomeView';
import { heroPreloads, imageBaseOf } from '../components/imageSet';
import { translate } from '../i18n/t';
import { useT } from '../i18n/useT';
import { getHome } from '../server/functions';

const { hero } = SHARED_ATLAS_IMAGES;

export const Route = createFileRoute('/legends/')({
  loader: () => getHome(),
  head: ({ matches }) => {
    // Absolute URLs only from PUBLIC_ORIGIN, never from the request's Host header; without it, a relative canonical and no og:url.
    const origin = (matches[0]?.loaderData as { publicOrigin?: string } | undefined)?.publicOrigin ?? '';
    const title = translate('en', 'page.legends', { app: translate('en', 'app.title') });
    const description = translate('en', 'page.legends.description');
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        ...(origin ? [{ property: 'og:url', content: `${origin}/legends` }] : []),
      ],
      links: [{ rel: 'canonical', href: `${origin}/legends` }, ...heroPreloads(hero, imageBaseOf(matches), false)],
    };
  },
  component: Home,
});

function Home() {
  const { legends } = Route.useLoaderData();
  return <HomeView legends={legends} t={useT()} />;
}
