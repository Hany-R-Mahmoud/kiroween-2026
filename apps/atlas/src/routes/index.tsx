import { SHARED_ATLAS_IMAGES } from '@kiroween/skeleton/client';
import { createFileRoute } from '@tanstack/react-router';
import { HomeView } from '../components/HomeView';
import { heroPreloads, imageBaseOf } from '../components/imageSet';
import { useT } from '../i18n/useT';
import { getHome } from '../server/functions';

const { hero } = SHARED_ATLAS_IMAGES;

export const Route = createFileRoute('/')({
  loader: () => getHome(),
  head: ({ matches }) => ({ links: heroPreloads(hero, imageBaseOf(matches), false) }),
  component: Home,
});

function Home() {
  const { legends } = Route.useLoaderData();
  return <HomeView legends={legends} t={useT()} />;
}
