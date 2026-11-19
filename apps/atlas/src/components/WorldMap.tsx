import { Link } from '@tanstack/react-router';
import { BOX, BUTTON } from '../geo/placeMarkers';
import type { Translate } from '../i18n/t';
import type { HomeLegend } from './home';
import { Img } from './Img';
import { MetaList } from './MetaList';

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/** One marker per legend on a real world outline (R3.3, R3.4). The card is a native popover: Escape and focus return come with it. */
function Marker({ legend, t }: { legend: HomeLegend; t: Translate }) {
  const cardId = `card-${legend.id}`;
  const titleId = `${cardId}-title`;
  const { button } = legend.place;
  return (
    <>
      <button
        type="button"
        popoverTarget={cardId}
        className="absolute flex items-center justify-center rounded-full bg-bg/70 ring-1 ring-muted motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:scale-110"
        // Physical position inside a dir="ltr" box: a map is not mirrored (steering: i18n-rtl.md, the pan exception).
        style={{ insetInlineStart: pct(button.x, BOX.width), insetBlockStart: pct(button.y, BOX.height), inlineSize: BUTTON, blockSize: BUTTON, translate: '-50% -50%' }}
      >
        {legend.marker ? <Img image={legend.marker} alt={t('alt.marker', { title: legend.title })} className="size-9" /> : <span className="sr-only">{legend.title}</span>}
      </button>
      <div popover="auto" id={cardId} role="dialog" aria-labelledby={titleId} className="map-card" dir="auto">
        <div className="flex flex-col gap-3">
          <h3 id={titleId} className="text-2xl text-glow">
            {legend.title}
          </h3>
          <p>{legend.oneLineHook}</p>
          <MetaList legend={legend} t={t} />
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 font-ui text-sm">
            <Link to="/legends/$legendId" params={{ legendId: legend.id }} className="inline-flex min-h-11 items-center">
              {t('card.read')}
            </Link>
            <button type="button" popoverTarget={cardId} popoverTargetAction="hide" className="min-h-11 rounded px-3 text-ink ring-1 ring-muted">
              {t('card.close')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function WorldMap({ legends, t }: { legends: HomeLegend[]; t: Translate }) {
  return (
    <div role="region" aria-label={t('home.mapRegion')} tabIndex={0} className="overflow-x-auto rounded-xl bg-surface">
      <div dir="ltr" className="relative" style={{ minInlineSize: BOX.width, aspectRatio: `${BOX.width} / ${BOX.height}` }}>
        <div className="land absolute inset-0" aria-hidden="true" />
        <svg viewBox={`0 0 ${BOX.width} ${BOX.height}`} className="absolute inset-0 size-full" aria-hidden="true">
          {legends.map(({ id, place: { point, button } }) => (
            <g key={id}>
              {(point.x !== button.x || point.y !== button.y) && <line x1={point.x} y1={point.y} x2={button.x} y2={button.y} stroke="var(--color-glow)" strokeWidth={1} opacity={0.7} />}
              <circle cx={point.x} cy={point.y} r={3.5} fill="var(--color-glow)" />
            </g>
          ))}
        </svg>
        {legends.map((l) => (
          <Marker key={l.id} legend={l} t={t} />
        ))}
      </div>
    </div>
  );
}
