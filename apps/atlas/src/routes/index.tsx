import { assetUrl, SHARED_ATLAS_IMAGES } from '@kiroween/skeleton/client';
import { createFileRoute } from '@tanstack/react-router';
import { Img } from '../components/Img';
import { LegendList } from '../components/LegendList';
import { WorldMap } from '../components/WorldMap';
import { useT } from '../i18n/useT';
import { getHome } from '../server/functions';

const { hero, map } = SHARED_ATLAS_IMAGES;

export const Route = createFileRoute('/')({
  loader: () => getHome(),
  head: () => ({ links: [{ rel: 'preload', as: 'image', href: assetUrl(hero.id), fetchPriority: 'high' as const }] }),
  component: Home,
});

function Home() {
  const { legends } = Route.useLoaderData();
  const t = useT();
  return (
    <div className="flex flex-col gap-14 pb-8">
      <header className="flex flex-col gap-6">
        {/* the journal on the desk sets the scene; the heading below carries the page */}
        <Img image={hero} alt="" priority className="aspect-[16/7] w-full object-cover" />
        <div className="measure flex flex-col gap-4 px-4">
          <h1 className="text-4xl text-glow sm:text-5xl">{t('app.title')}</h1>
          <p className="text-lg">{t('home.intro')}</p>
        </div>
      </header>

      <section aria-labelledby="map-title" className="flex flex-col gap-4 px-4">
        <h2 id="map-title" className="text-3xl">
          {t('home.mapHeading')}
        </h2>
        {/* decoration only: the painted map is not accurate, so markers sit on the outline below, never on it */}
        <Img image={map} alt="" className="h-20 w-full rounded-xl object-cover opacity-60 sm:h-28" />
        <WorldMap legends={legends} t={t} />
      </section>

      <section aria-labelledby="list-title" className="flex flex-col gap-6 px-4">
        <h2 id="list-title" className="text-3xl">
          {t('home.listHeading')}
        </h2>
        <LegendList legends={legends} t={t} />
      </section>
    </div>
  );
}
