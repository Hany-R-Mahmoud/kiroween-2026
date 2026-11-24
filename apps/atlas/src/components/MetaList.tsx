import type { Translate } from '../i18n/t';

/** Where, when, how scary and how long: the same facts on the map card and at the top of a legend page. */
export function MetaList({ legend, t }: { legend: { region: string; era: string; scareLevel: number; readingTimeMin: number }; t: Translate }) {
  const rows: [string, string][] = [
    [t('meta.region'), legend.region],
    [t('meta.era'), legend.era],
    [t('meta.scare'), t('meta.scareValue', { n: legend.scareLevel })],
    [t('meta.reading'), t('meta.readingValue', { n: legend.readingTimeMin })],
  ];
  return (
    <dl className="meta-list grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
      {rows.map(([label, value]) => (
        <div key={label} className="block sm:contents">
          <dt className="font-ui text-muted">{label}</dt>
          <dd className="mb-2 sm:mb-0">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
