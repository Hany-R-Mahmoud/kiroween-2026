/**
 * The Neon Auth endpoints this app uses, and the only ones our proxy forwards (least privilege: admin, organization,
 * email-change and every other endpoint are not reachable through us). The Google return trip lands on Neon's own
 * domain, and the server finishes it by calling Neon directly, so it needs no entry here.
 */
export const AUTH_ENDPOINTS = new Set(['get-session', 'sign-in/email', 'sign-up/email', 'sign-in/social', 'sign-out']);

/** True only for an exact endpoint above: no extra segments, no encoding tricks, no "." or "..". */
export const isAllowedAuthPath = (path: string): boolean => AUTH_ENDPOINTS.has(path);
