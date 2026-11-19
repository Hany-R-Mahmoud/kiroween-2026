// Server-only configuration. Errors name the variable and never include its value.
export interface AtlasEnv {
  databaseUrl: string;
  arabicEnabled: boolean;
  /** '' when unset: then pages carry no og:image or og:url (R9.1). */
  publicOrigin: string;
}
export class EnvError extends Error {
  constructor(readonly variable: string, problem: string) {
    super(`${variable} ${problem} (see .env.example)`);
    this.name = 'EnvError';
  }
}
type Source = Record<string, string | undefined>;

function databaseUrl(source: Source): string {
  const v = source['ATLAS_DATABASE_URL']?.trim();
  if (!v) throw new EnvError('ATLAS_DATABASE_URL', 'is not set');
  let protocol: string;
  try {
    protocol = new URL(v).protocol;
  } catch {
    throw new EnvError('ATLAS_DATABASE_URL', 'is not a valid URL');
  }
  if (protocol !== 'postgres:' && protocol !== 'postgresql:') throw new EnvError('ATLAS_DATABASE_URL', 'must start with postgres: or postgresql:');
  return v;
}

/**
 * Optional. An https origin, or http://localhost with an optional port, with no path, query, fragment or trailing
 * slash. Never taken from the request: the Host header is client-controlled.
 */
function publicOrigin(source: Source): string {
  const v = source['PUBLIC_ORIGIN']?.trim() ?? '';
  if (!v) return '';
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    throw new EnvError('PUBLIC_ORIGIN', 'is not a valid URL');
  }
  const allowed = url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname === 'localhost');
  if (!allowed || url.origin !== v) throw new EnvError('PUBLIC_ORIGIN', 'must be an https origin, or http://localhost with an optional port, with no path');
  return v;
}

function arabicEnabled(source: Source): boolean {
  const flag = source['FEATURE_ARABIC']?.trim().toLowerCase();
  if (flag !== undefined && flag !== '' && flag !== 'true' && flag !== 'false') throw new EnvError('FEATURE_ARABIC', 'must be true or false');
  return flag === 'true';
}

/** Pure, so it can be tested without a process environment. */
export function parseEnv(source: Source): AtlasEnv {
  return { databaseUrl: databaseUrl(source), arabicEnabled: arabicEnabled(source), publicOrigin: publicOrigin(source) };
}
let cached: AtlasEnv | undefined;
/** Read once per server process; call inside a request, not at module scope. */
export function getEnv(): AtlasEnv {
  cached ??= parseEnv(process.env);
  return cached;
}
