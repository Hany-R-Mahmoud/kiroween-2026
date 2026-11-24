import type { AtlasChapter, AtlasLegend, AtlasVersion } from '@kiroween/skeleton/client';
import { Book } from '@kiroween/skeleton/book';
import type { Translate } from '../i18n/t';
import { bookLabels } from './bookLabels';
import { ChaptersControl } from './ChaptersControl';
import { HintBanner } from './HintBanner';
import { Img } from './Img';
import { PlayLink } from './PlayLink';
import { HERO_SIZES, PLATE_SIZES } from './imageSet';
import { MetaList } from './MetaList';
import { InlineText, StoryText } from './StoryText';

// Every stored anchor is the id of exactly one section here, with a focusable heading (R5.1, R5.5).
const headingProps = { 'data-anchor-heading': '', tabIndex: -1 } as const;
const isWebLink = (url: string) => /^https?:\/\//i.test(url.trim());

function Chapter({ chapter, t }: { chapter: AtlasChapter; t: Translate }) {
  const headingId = `${chapter.anchor}-title`;
  return (
    <section id={chapter.anchor} aria-labelledby={headingId} className="book-chapter measure mx-auto flex flex-col gap-3">
      <h2 id={headingId} {...headingProps} className="text-3xl text-glow">
        <span className="text-muted">{`${t('legend.chapter', { n: chapter.ordinal })}: `}</span>
        <InlineText text={chapter.title} t={t} />
      </h2>
      {chapter.plate && (
        <figure className="plate book-plate mood-torn">
          <Img image={chapter.plate} sizes={PLATE_SIZES} alt={t('alt.plate', { n: chapter.ordinal, title: chapter.title })} />
        </figure>
      )}
      <StoryText text={chapter.text} t={t} />
      <StoryText text={chapter.hook} t={t} className="border-s border-muted ps-4 italic" />
    </section>
  );
}

function Version({ version, t }: { version: AtlasVersion; t: Translate }) {
  const headingId = `${version.anchor}-title`;
  const rows: [string, string][] = [
    [t('legend.versionEra'), version.era],
    [t('legend.versionClaim'), version.claim],
    [t('legend.versionConflicts'), version.conflicts],
    [t('legend.versionSource'), version.sourceId],
  ];
  return (
    <article id={version.anchor} aria-labelledby={headingId} className="panel flex flex-col gap-2 rounded-xl bg-surface p-4">
      <h3 id={headingId} {...headingProps} className="text-xl">
        <InlineText text={version.sourceType} t={t} />
      </h3>
      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="font-ui text-muted">{label}</dt>
            <dd className="mb-2 sm:mb-0">
              <InlineText text={value} t={t} />
            </dd>
          </div>
        ))}
      </dl>
      <StoryText text={version.paragraph} t={t} />
    </article>
  );
}

function LegendHeader({ legend, t }: { legend: AtlasLegend; t: Translate }) {
  return (
    <header className="legend-header flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-center lg:py-4">
      {legend.hero && <Img image={legend.hero} hero sizes={HERO_SIZES} alt={t('alt.hero', { title: legend.title })} priority className="legend-hero" />}
      <div className="legend-intro measure mx-auto flex w-full flex-col gap-4 px-4 lg:mx-0 lg:max-w-none lg:px-0">
        <h1 id="legend-title" className="text-4xl text-glow sm:text-5xl">
          {legend.title}
        </h1>
        <p className="text-lg">{legend.oneLineHook}</p>
        <MetaList legend={legend} t={t} />
      </div>
    </header>
  );
}

function Versions({ legend, t }: { legend: AtlasLegend; t: Translate }) {
  return (
    <section id={legend.versionsAnchor} aria-labelledby="versions-title" className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4">
      <h2 id="versions-title" {...headingProps} className="text-3xl text-glow">
        {t('legend.versions')}
      </h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {legend.versions.map((v) => (
          <Version key={v.anchor} version={v} t={t} />
        ))}
      </div>
    </section>
  );
}

function DocumentedTold({ legend, t }: { legend: AtlasLegend; t: Translate }) {
  const cell = 'rule-b p-3';
  const head = 'rule-b p-3 text-start font-ui';
  return (
    <section aria-labelledby="table-title" className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4">
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-labelledby="table-title">
        <table className="w-full border-collapse text-start text-sm">
          <caption id="table-title" className="mb-3 text-start font-display text-2xl text-glow">
            {t('legend.table')}
          </caption>
          <thead>
            <tr>
              <th scope="col" className={head}>
                {t('legend.documented')}
              </th>
              <th scope="col" className={head}>
                {t('legend.told')}
              </th>
            </tr>
          </thead>
          <tbody>
            {legend.documentedTold.rows.map((r, i) => (
              <tr key={i} className="align-top">
                <td className={cell}>
                  <StoryText text={r.documented} t={t} />
                </td>
                <td className={cell}>
                  <StoryText text={r.told} t={t} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <StoryText text={legend.documentedTold.closing} t={t} className="measure" />
    </section>
  );
}

function Sources({ legend, t }: { legend: AtlasLegend; t: Translate }) {
  return (
    <section id="sources" aria-labelledby="sources-title" className="measure mx-auto w-full px-4">
      <h2 id="sources-title" {...headingProps} className="text-2xl">
        {t('legend.sources')}
      </h2>
      <ol className="mt-4 flex flex-col gap-2 text-sm">
        {legend.sources.map((s) => (
          <li key={s.id} className="flex gap-3">
            <span className="font-ui text-muted">{s.id}</span>
            <span>
              {isWebLink(s.url) ? (
                <a href={s.url.trim()} rel="noopener noreferrer" className="link source-link">
                  <InlineText text={s.title} t={t} />
                  <span aria-hidden="true"> ↗</span>
                  <span className="sr-only">{` (${t('legend.sourceExternal')})`}</span>
                </a>
              ) : (
                <InlineText text={s.title} t={t} />
              )}
              {`. ${s.author}, ${s.year}.`}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The whole documentary, in content order (R4.1). Rendered by the route, and by the tests from the content files. */
export function LegendPage({ legend, t, showHintBanner = false }: { legend: AtlasLegend; t: Translate; showHintBanner?: boolean }) {
  return (
    <article aria-labelledby="legend-title" className="legend-page">
      <LegendHeader legend={legend} t={t} />
      <Book
        labels={bookLabels(t)}
        banner={showHintBanner ? <HintBanner t={t} /> : undefined}
        controlsStart={<ChaptersControl legend={legend} t={t} />}
        controlsEnd={<PlayLink legendId={legend.id} variant="quiet" t={t} />}
      >
        <div className="flex flex-col gap-[var(--space-4)]">
          <section aria-label={t('legend.coldOpen')} className="measure mx-auto px-4">
            <StoryText text={legend.coldOpen} t={t} className="text-lg" />
          </section>
          <div className="flex flex-col gap-[var(--space-4)] px-4">
            {legend.chapters.map((c) => (
              <Chapter key={c.anchor} chapter={c} t={t} />
            ))}
          </div>
          <Versions legend={legend} t={t} />
          <DocumentedTold legend={legend} t={t} />
          <Sources legend={legend} t={t} />
          <section className="measure mx-auto flex w-full px-4">
            <PlayLink legendId={legend.id} variant="primary" t={t} />
          </section>
        </div>
      </Book>
    </article>
  );
}
