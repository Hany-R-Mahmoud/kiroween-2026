import { legendUrl, shareTags } from '@kiroween/skeleton/client';
import { createFileRoute } from '@tanstack/react-router';
import { KeepersNotePage } from '../components/KeepersNotePage';
import { LegendPage } from '../components/LegendPage';
import { heroPreloads, imageBaseOf } from '../components/imageSet';
import { fontLinks } from '../fonts';
import { translate } from '../i18n/t';
import { useT } from '../i18n/useT';
import { parseHintSearch } from '../lib/hintMarker';
import { getLegend } from '../server/functions';

export const Route = createFileRoute('/legends/$legendId')({
  validateSearch: parseHintSearch,
  loader: ({ params }) => getLegend({ data: params.legendId }),
  head: ({ loaderData, matches }) => {
    if (!loaderData) return {};
    // Absolute URLs only from PUBLIC_ORIGIN, never from the request's Host header (R9.1); without it, relative canonical and no image tags.
    const origin = (matches[0]?.loaderData as { publicOrigin?: string } | undefined)?.publicOrigin ?? '';
    if (loaderData.kind === 'note') {
      const { note } = loaderData;
      const title = translate('en', 'page.legend', { title: note.title, app: translate('en', 'app.title') });
      return {
        meta: [
          { title },
          { name: 'description', content: note.oneLineHook },
          { property: 'og:title', content: title },
          { property: 'og:description', content: note.oneLineHook },
          ...shareTags({ origin, title, description: note.oneLineHook, imageAlt: translate('en', 'share.image.alt'), siteName: translate('en', 'app.title') }),
        ],
        links: [{ rel: 'canonical', href: `${origin}${legendUrl('keepers-note')}` }],
      };
    }
    const { legend, theme } = loaderData;
    const title = translate('en', 'page.legend', { title: legend.title, app: translate('en', 'app.title') });
    return {
      meta: [
        { title },
        { name: 'description', content: legend.oneLineHook },
        { name: 'theme-color', content: theme.themeColor },
        { property: 'og:title', content: title },
        { property: 'og:description', content: legend.oneLineHook },
        ...shareTags({ origin, title, description: legend.oneLineHook, imageAlt: translate('en', 'share.image.alt'), siteName: translate('en', 'app.title') }),
        ...(origin ? [{ property: 'og:url', content: `${origin}${legendUrl(legend.id)}` }] : []),
      ],
      links: [{ rel: 'canonical', href: `${origin}${legendUrl(legend.id)}` }, ...fontLinks(theme.families), ...heroPreloads(legend.hero, imageBaseOf(matches), true)],
    };
  },
  component: Legend,
});

function Legend() {
  const data = Route.useLoaderData();
  const t = useT();
  const { hint } = Route.useSearch();
  return data.kind === 'note' ? <KeepersNotePage note={data.note} t={t} /> : <LegendPage legend={data.legend} t={t} showHintBanner={hint === 1} />;
}
