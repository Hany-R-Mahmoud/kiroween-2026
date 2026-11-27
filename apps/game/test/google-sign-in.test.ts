import { afterEach, describe, expect, it, vi } from 'vitest';
import { signInGoogleIdToken } from '../src/auth/client';
import { buttonWidth, newNonce } from '../src/auth/google';

afterEach(() => vi.unstubAllGlobals());

describe('Google ID-token sign-in', () => {
  it('posts the exact body to the auth proxy, same origin, and reports Neon\u2019s answer', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    // placeholders, not real values
    expect(await signInGoogleIdToken('credential-placeholder', 'nonce-placeholder')).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/game/api/auth/sign-in/social');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('same-origin');
    expect(JSON.parse(init.body as string)).toStrictEqual({ provider: 'google', idToken: { token: 'credential-placeholder', nonce: 'nonce-placeholder' } });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
    expect(await signInGoogleIdToken('c', 'n')).toBe(false);
  });
  it('makes a fresh 32-hex-character nonce each time', () => {
    const a = newNonce();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(newNonce()).not.toBe(a);
  });
  it('keeps the button width inside Google\u2019s 200 to 400 range', () => {
    expect([buttonWidth(100), buttonWidth(336.7), buttonWidth(900)]).toEqual(['200', '336', '400']);
  });
});
