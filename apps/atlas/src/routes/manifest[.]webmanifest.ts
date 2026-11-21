import { BASE_PALETTE } from '@kiroween/skeleton/client';
import { createFileRoute } from '@tanstack/react-router';
import { translate } from '../i18n/t';
const PREFIX = '';
const icon = (id: string, size: number, purpose?: 'maskable') => ({ src: `${PREFIX}/icons/${id}.png`, sizes: `${size}x${size}`, type: 'image/png', ...(purpose ? { purpose } : {}) });
/** Web app manifest (Requirement 20). Names come from the catalog; icon files are supplied by the Owner (Needs_File). */
export function buildManifest() {
  const title = translate('en', 'app.title');
  return {
    name: title,
    short_name: title,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: BASE_PALETTE.bg,
    background_color: BASE_PALETTE.bg,
    icons: [icon('icon-192', 192), icon('icon-512', 512), icon('icon-maskable-512', 512, 'maskable')],
  };
}
export const Route = createFileRoute('/manifest.webmanifest')({
  server: {
    handlers: {
      GET: () => new Response(JSON.stringify(buildManifest()), { headers: { 'content-type': 'application/manifest+json; charset=utf-8', 'cache-control': 'public, max-age=3600' } }),
    },
  },
});
