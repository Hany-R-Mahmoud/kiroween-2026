import { handleAuthProxyRequest } from '@neon/auth/server';
import { cleanDisplayName } from '@kiroween/skeleton/client';
import { createFileRoute } from '@tanstack/react-router';
import { authLog, SAME_SITE } from '../server/auth';
import { getEnv } from '../server/env';
import { isAllowedAuthPath } from '../server/proxyPath';

const MAX_BODY = 10_000;
const json = (status: number, body: object) => Response.json(body, { status });

/** Sign-up goes straight to Neon, so the display name (R2.2) is checked here: cleaned, or a fixed 400. */
async function withCheckedName(request: Request): Promise<Request | Response> {
  const text = await request.text();
  if (text.length > MAX_BODY) return json(413, { message: 'Request too large.' });
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('not an object');
    body = parsed as Record<string, unknown>;
  } catch {
    return json(400, { message: 'Invalid request.' });
  }
  const name = cleanDisplayName(body['name']);
  if (!name) return json(400, { code: 'INVALID_DISPLAY_NAME', message: 'Choose a display name of 2 to 30 letters or digits.' });
  body['name'] = name;
  delete body['image']; // no profile pictures: nothing to host, nothing to point at a tracker
  return new Request(request.url, { method: request.method, headers: request.headers, body: JSON.stringify(body) });
}

/**
 * First-party proxy to Neon Auth (design 4.2). The upstream host is fixed by NEON_AUTH_BASE_URL; only the five endpoints
 * the app uses are forwarded; only GET and POST are mounted; nothing from bodies or cookies is logged.
 */
async function proxy({ request, params }: { request: Request; params: { _splat?: string } }): Promise<Response> {
  const path = params._splat ?? '';
  if (!isAllowedAuthPath(path)) return new Response('Not found', { status: 404 });
  let upstream = request;
  if (request.method === 'POST' && path === 'sign-up/email') {
    const checked = await withCheckedName(request);
    if (checked instanceof Response) return checked;
    upstream = checked;
  }
  const env = getEnv();
  return handleAuthProxyRequest({ request: upstream, path, baseUrl: env.authBaseUrl, cookieSecret: env.cookieSecret, sameSite: SAME_SITE, log: authLog });
}

// Without explicit handlers, other methods fall through to the page router and get an HTML page.
const notAllowed = () => new Response('Method not allowed', { status: 405, headers: { allow: 'GET, POST' } });

export const Route = createFileRoute('/api/auth/$')({
  server: { handlers: { GET: proxy, POST: proxy, PUT: notAllowed, PATCH: notAllowed, DELETE: notAllowed } },
});
