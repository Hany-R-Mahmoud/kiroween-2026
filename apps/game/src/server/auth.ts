import { createAuthServer, extractNeonAuthCookies, resolveNeonAuthLogging, type RequestContext } from '@neon/auth/server';
import type { Visitor } from '@kiroween/skeleton';
import { getRequest, setCookie } from '@tanstack/react-start/server';
import { getEnv } from './env';

/** Neon's session cookie defaults: lax so the Google return trip keeps the session. */
export const SAME_SITE = 'lax' as const;
export const authLog = resolveNeonAuthLogging({ logLevel: 'warn' });

/** The toolkit's bridge to TanStack Start's current request (cookies in, Set-Cookie out). */
function requestContext(): RequestContext {
  const request = getRequest();
  return {
    getCookies: () => extractNeonAuthCookies(request.headers),
    setCookie: (name, value, options) => setCookie(name, value, options),
    getHeader: (name) => request.headers.get(name),
    getOrigin: () => request.headers.get('origin') || request.headers.get('referer')?.split('/').slice(0, 3).join('/') || '',
    getFramework: () => 'tanstack-start',
  };
}

let server: ReturnType<typeof createAuthServer> | undefined;

function auth(): ReturnType<typeof createAuthServer> {
  const env = getEnv();
  server ??= createAuthServer({ baseUrl: env.authBaseUrl, context: requestContext, cookieSecret: env.cookieSecret, sameSite: SAME_SITE, log: authLog });
  return server;
}

/**
 * Who is asking, from the session cookies of the current request, checked by Neon Auth (or its signed cache cookie).
 * Never from anything the client sends in a body or query. Any failure counts as a guest: no privilege on doubt.
 */
export async function getVisitor(): Promise<Visitor> {
  try {
    const { data, error } = await auth().getSession();
    if (error || !data?.user) return { kind: 'guest' };
    return { kind: 'user', id: data.user.id, name: data.user.name };
  } catch {
    return { kind: 'guest' };
  }
}
