import { createFileRoute } from '@tanstack/react-router';
import { buildRobots } from '../seo/sitemap';
import { getEnv } from '../server/env';

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(buildRobots(getEnv().publicOrigin), {
          headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' },
        }),
    },
  },
});
