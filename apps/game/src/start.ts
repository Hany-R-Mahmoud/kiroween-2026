import { processAuthMiddleware } from '@neon/auth/server';
import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start';
import { authLog, SAME_SITE } from './server/auth';
import { getEnv } from './server/env';

const AUTH_API = '/game/api/auth/';

/**
 * CSRF check (Sec-Fetch-Site, then Origin, then Referer must be same-origin). Start applies it to server functions by
 * default only when the app has no start.ts; once this file exists it must be listed explicitly. It also covers POSTs
 * to our auth proxy; GETs there (the Google return trip) are cross-site by design and are not filtered.
 */
const csrf = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn' || (ctx.request.method === 'POST' && ctx.pathname.startsWith(AUTH_API)),
});

/**
 * On page requests: finish the Google return trip (exchanges the one-time code for the session) and refresh the session
 * cache cookie. Every page is public (guests see the hall), so this never redirects to sign-in.
 */
const neonAuth = createMiddleware().server(async ({ request, pathname, handlerType, next }) => {
  if (handlerType !== 'router' || request.method !== 'GET' || pathname.startsWith(AUTH_API)) return next();
  const env = getEnv();
  const result = await processAuthMiddleware({
    request,
    pathname,
    skipRoutes: ['/game'],
    loginUrl: '/game/sign-in',
    baseUrl: env.authBaseUrl,
    cookieSecret: env.cookieSecret,
    sameSite: SAME_SITE,
    log: authLog,
  });
  if (result.action === 'redirect_oauth') {
    const headers = new Headers({ location: result.redirectUrl.toString() });
    for (const c of result.cookies) headers.append('set-cookie', c); // one header per cookie: joining corrupts dates
    return new Response(null, { status: 302, headers });
  }
  const out = await next();
  for (const c of result.cookies ?? []) out.response.headers.append('set-cookie', c);
  return out;
});

export const startInstance = createStart(() => ({ requestMiddleware: [csrf, neonAuth] }));
