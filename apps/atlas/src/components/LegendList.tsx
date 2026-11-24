import { assetUrl, heroSmall, useImageBase, type AtlasImage } from '@kiroween/skeleton/client';
import { Link } from '@tanstack/react-router';
import { CONTINENTS } from '../geo/continents';
import type { Translate } from '../i18n/t';
import type { HomeLegend } from './home';
import { widthCopies } from './imageSet';

/** What a card shows: the phone copy of the hero when the build made one, else the hero, else the marker (R15.11). */
export function cardImage(l: Pick<HomeLegend, 'hero' | 'marker'>): AtlasImage | null {
  if (l.hero) return heroSmall(l.hero) ?? l.hero;
  return l.marker;
}

/** One column on a phone, two from 40rem, three from 64rem. */
const CARD_SIZES = '(min-width: 64rem) 22rem, (min-width: 40rem) 50vw, 100vw';

/** The accessible way in (R3.2): every legend, grouped by continent in a fixed order, by title inside each group. */
export function LegendList({ legends, t }: { legends: HomeLegend[]; t: Translate }) {
  const imageBase = useImageBase();
  const groups = CONTINENTS.map((c) => ({ continent: c, items: legends.filter((l) => l.continent === c).sort((a, b) => a.title.localeCompare(b.title)) })).filter((g) => g.items.length > 0);
  return (
    <div className="grid gap-10">
      {groups.map(({ continent, items }) => (
        <section key={continent} aria-labelledby={`continent-${continent}`}>
          <h3 id={`continent-${continent}`} className="border-b border-muted pb-2 text-2xl">
            {t(`continent.${continent}`)}
          </h3>
          <ul className="legend-cards mt-4">
            {items.map((l) => {
              const img = cardImage(l);
              const copies = l.hero ? widthCopies(l.hero, imageBase, CARD_SIZES) : null;
              return (
                <li key={l.id} className="legend-card panel">
                  {img && (
                    <img
                      {...(copies ?? { src: assetUrl(img.id), sizes: CARD_SIZES })}
                      width={copies && l.hero ? l.hero.width : img.width}
                      height={copies && l.hero ? l.hero.height : img.height}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="legend-card-img"
                    />
                  )}
                  <div className="legend-card-body">
                    <p className="font-ui text-xs text-muted">{l.region}</p>
                    <h4 className="font-display text-xl">
                      <Link to="/legends/$legendId" params={{ legendId: l.id }} className="legend-card-link">
                        {l.title}
                      </Link>
                    </h4>
                    <p className="text-sm">{l.oneLineHook}</p>
                    <p className="font-ui text-xs text-muted">{`${t('meta.readingValue', { n: l.readingTimeMin })} · ${t('meta.scare')} ${t('meta.scareValue', { n: l.scareLevel })}`}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
