import { Link } from '@tanstack/react-router';
import { CONTINENTS } from '../geo/continents';
import type { Translate } from '../i18n/t';
import type { HomeLegend } from './home';

/** The accessible way in (R3.2): every legend, grouped by continent in a fixed order, by title inside each group. */
export function LegendList({ legends, t }: { legends: HomeLegend[]; t: Translate }) {
  const groups = CONTINENTS.map((c) => ({ continent: c, items: legends.filter((l) => l.continent === c).sort((a, b) => a.title.localeCompare(b.title)) })).filter((g) => g.items.length > 0);
  return (
    <div className="grid gap-10 md:grid-cols-2">
      {groups.map(({ continent, items }) => (
        <section key={continent} aria-labelledby={`continent-${continent}`}>
          <h3 id={`continent-${continent}`} className="border-b border-muted pb-2 text-2xl">
            {t(`continent.${continent}`)}
          </h3>
          <ul className="mt-4 flex flex-col gap-5">
            {items.map((l) => (
              <li key={l.id} className="flex flex-col gap-1">
                <Link to="/legends/$legendId" params={{ legendId: l.id }} className="inline-flex min-h-11 items-center font-display text-xl">
                  {l.title}
                </Link>
                <p className="text-sm text-muted">{l.region}</p>
                <p className="text-sm">{l.oneLineHook}</p>
                <p className="font-ui text-xs text-muted">{`${t('meta.readingValue', { n: l.readingTimeMin })} · ${t('meta.scare')} ${t('meta.scareValue', { n: l.scareLevel })}`}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
