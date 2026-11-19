import { describe, expect, it } from 'vitest';
import { AUTH_ENDPOINTS, isAllowedAuthPath } from '../src/server/proxyPath';

describe('isAllowedAuthPath', () => {
  it.each(['get-session', 'sign-in/email', 'sign-up/email', 'sign-in/social', 'sign-out'])('forwards %s, which the app uses', (p) => {
    expect(isAllowedAuthPath(p)).toBe(true);
  });

  it('forwards nothing else', () => {
    expect([...AUTH_ENDPOINTS].sort()).toEqual(['get-session', 'sign-in/email', 'sign-in/social', 'sign-out', 'sign-up/email']);
  });

  it.each([
    ['an admin endpoint', 'admin/list-users'],
    ['an organization endpoint', 'organization/create'],
    ['email change', 'change-email'],
    ['profile update', 'update-user'],
    ['account deletion', 'delete-user'],
    ['the JWKS document', '.well-known/jwks.json'],
    ['empty', ''],
    ['parent segment', '../get-session'],
    ['extra segment', 'sign-in/email/x'],
    ['leading slash', '/get-session'],
    ['trailing slash', 'get-session/'],
    ['double slash', 'sign-in//email'],
    ['full URL', 'https://evil.example/get-session'],
    ['encoded slash', 'sign-in%2Femail'],
    ['query', 'get-session?x=1'],
    ['different case', 'Get-Session'],
  ])('rejects %s', (_label, p) => {
    expect(isAllowedAuthPath(p)).toBe(false);
  });
});
