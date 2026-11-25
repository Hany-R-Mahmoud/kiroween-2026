import { listLegends } from '@kiroween/skeleton';
import { createFileRoute } from '@tanstack/react-router';
import { buildLlmsTxt } from '../seo/llms';
import { database } from '../server/db';
import { getEnv } from '../server/env';

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const legends = await listLegends(database());
          return new Response(buildLlmsTxt(getEnv().publicOrigin, legends), {
            status: 200,
            headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' },
          });
        } catch {
          return new Response('Unavailable', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
        }
      },
    },
  },
});
