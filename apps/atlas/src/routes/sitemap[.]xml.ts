import { createFileRoute } from '@tanstack/react-router';
import { LEGEND_IDS } from '../seo/legendIds.gen';
import { buildSitemap, sitemapPaths } from '../seo/sitemap';
import { getEnv } from '../server/env';

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () => {
        const origin = getEnv().publicOrigin;
        if (!origin) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
        return new Response(buildSitemap(origin, sitemapPaths(LEGEND_IDS)), {
          headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
        });
      },
    },
  },
});
