import { SHARED_ATLAS_IMAGES } from '@kiroween/skeleton/client';
import { Link } from '@tanstack/react-router';
import type { Translate } from '../i18n/t';
import { pickFirstLegend, type HomeLegend } from './home';
import { Img } from './Img';
import { HERO_SIZES } from './imageSet';
import { LegendList } from './LegendList';
import { WorldMap } from './WorldMap';

const { hero } = SHARED_ATLAS_IMAGES;

/** The atlas home page body: hero, the one map, the legend cards. The route only loads the data. */
export function HomeView({ legends, t }: { legends: HomeLegend[]; t: Translate }) {
  const first = pickFirstLegend(legends);
  return (
    <div className="flex flex-col gap-14 pb-8">
      <header className="home-hero">
        {/* the journal on the desk sets the scene; the heading carries the page */}
        <div className="home-hero-frame">
          <Img image={hero} alt="" priority sizes={HERO_SIZES} className="home-hero-img" />
        </div>
        <div className="home-hero-copy measure">
          <h1 className="text-4xl text-glow sm:text-5xl">{t('app.title')}</h1>
          <p className="text-lg">{t('home.intro')}</p>
          <div className="flex flex-wrap gap-3">
            {first ? (
              <Link to="/legends/$legendId" params={{ legendId: first.id }} className="btn btn-primary">
                {t('home.start', { title: first.title })}
              </Link>
            ) : null}
            <a href="/game/" className="btn btn-secondary">
              {t('nav.play')}
            </a>
          </div>
        </div>
      </header>

      <section aria-labelledby="map-title" className="flex flex-col gap-4 px-4">
        <h2 id="map-title" className="text-3xl">
          {t('home.mapHeading')}
        </h2>
        <WorldMap legends={legends} t={t} />
      </section>

      <section id="legends" aria-labelledby="list-title" className="flex flex-col gap-6 px-4">
        <h2 id="list-title" className="text-3xl">
          {t('home.listHeading')}
        </h2>
        <LegendList legends={legends} t={t} />
      </section>
    </div>
  );
}
