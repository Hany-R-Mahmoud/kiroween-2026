// Maps a URL path under /game/ to a file inside the client build folder. Kept apart from serve-build.mjs so a test
// can import it without loading the built server.
import { statSync } from 'node:fs';
import { join, normalize, sep } from 'node:path';

export const BASE = '/game/';

/**
 * Returns `{ file }` for an existing file, `{ bad: true }` for a malformed or escaping path (answer 400),
 * or `null` when the path is not a static file (hand it to the app).
 */
export function resolveStatic(pathname, clientDir) {
  if (!pathname.startsWith(BASE)) return null;
  let decoded;
  try {
    decoded = decodeURIComponent(pathname.slice(BASE.length));
  } catch {
    return { bad: true }; // URIError: a malformed percent sequence such as "%" or "%E0%A4%A"
  }
  if (decoded.includes('\0')) return { bad: true };
  const rel = normalize(decoded);
  if (rel === '..' || rel.startsWith(`..${sep}`)) return { bad: true };
  const file = join(clientDir, rel);
  if (!file.startsWith(clientDir)) return { bad: true };
  try {
    return statSync(file).isFile() ? { file } : null;
  } catch {
    return null;
  }
}
