import { assetUrl, legendUrl } from '@kiroween/skeleton/client';
import { createFileRoute } from '@tanstack/react-router';
import { KeepersNotePage } from '../components/KeepersNotePage';
import { LegendPage } from '../components/LegendPage';
import { heroPreloads, imageBaseOf } from '../components/imageSet';
import { fontLinks } from '../fonts';
import { translate } from '../i18n/t';
import { useT } from '../i18n/useT';
import { getLegend } from '../server/functions';

export const Route = createFileRoute('/legends/$legendId')({
  loader: ({ params }) => getLegend({ data: params.legendId }),
  head: ({ loaderData, matches }) => {
    if (!loaderData) return {};
    if (loaderData.kind === 'note') {
      const { note } = loaderData;
      const title = translate('en', 'page.legend', { title: note.title, app: translate('en', 'app.title') });
      return { meta: [{ title }, { name: 'description', content: note.oneLineHook }, { property: 'og:title', content: title }, { property: 'og:description', content: note.oneLineHook }] };
    }
    const { legend, theme } = loaderData;
    // Absolute og: URLs only from PUBLIC_ORIGIN, never from the request's Host header (R9.1); without it, none.
    const origin = (matches[0]?.loaderData as { publicOrigin?: string } | undefined)?.publicOrigin ?? '';
    const title = translate('en', 'page.legend', { title: legend.title, app: translate('en', 'app.title') });
    return {
      meta: [
        { title },
        { name: 'description', content: legend.oneLineHook },
        { name: 'theme-color', content: theme.themeColor },
        { property: 'og:title', content: title },
        { property: 'og:description', content: legend.oneLineHook },
        ...(origin && legend.hero ? [{ property: 'og:image', content: `${origin}${assetUrl(legend.hero.id)}` }] : []),
        ...(origin ? [{ property: 'og:url', content: `${origin}${legendUrl(legend.id)}` }] : []),
      ],
      links: [...fontLinks(theme.families), ...heroPreloads(legend.hero, imageBaseOf(matches), true)],
    };
  },
  component: Legend,
});

function Legend() {
  const data = Route.useLoaderData();
  const t = useT();
  return data.kind === 'note' ? <KeepersNotePage note={data.note} t={t} /> : <LegendPage legend={data.legend} t={t} />;
}
