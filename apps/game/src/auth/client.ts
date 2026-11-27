// Browser calls to our own auth proxy (/game/api/auth). Same origin, so the session cookies are first-party.
// Server messages are not shown to the player: each failure maps to one fixed message key.

const AUTH = '/game/api/auth';

async function post(path: string, body: object): Promise<Response> {
  return fetch(`${AUTH}/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
}

export async function signInEmail(email: string, password: string): Promise<boolean> {
  return (await post('sign-in/email', { email, password })).ok;
}

export async function signUpEmail(name: string, email: string, password: string): Promise<'ok' | 'bad-name' | 'failed'> {
  const res = await post('sign-up/email', { name, email, password });
  if (res.ok) return 'ok';
  const body = (await res.json().catch(() => null)) as { code?: string } | null;
  return body?.code === 'INVALID_DISPLAY_NAME' ? 'bad-name' : 'failed';
}

/** Asks Neon for Google's sign-in page and goes there. Neon sends the player back to the hall. */
export async function signInGoogle(): Promise<boolean> {
  const res = await post('sign-in/social', { provider: 'google', callbackURL: `${window.location.origin}/game/` });
  const body = (await res.json().catch(() => null)) as { url?: unknown } | null;
  const url = typeof body?.url === 'string' ? body.url : null;
  // only follow an https URL (Google or Neon), never a script or data URL
  if (!res.ok || !url || !url.startsWith('https://')) return false;
  window.location.assign(url);
  return true;
}

/**
 * Finishes a Google sign-in done with Google's own button (Google Identity Services): sends the ID token and the nonce
 * this page view gave Google to Neon, which checks both and sets the session cookies. True when Neon accepted it. The
 * token is never logged or shown, and nothing from the response is read.
 */
export async function signInGoogleIdToken(credential: string, nonce: string): Promise<boolean> {
  return (await post('sign-in/social', { provider: 'google', idToken: { token: credential, nonce } })).ok;
}
export async function signOut(): Promise<void> {
  await post('sign-out', {});
}
