// Server-only configuration. Errors name the variable and never include its value.

export interface GameEnv {
  databaseUrl: string;
  authBaseUrl: string;
  cookieSecret: string;
  guestWorld: string;
  arabicEnabled: boolean;
  /** Put in front of atlas links only. '' on the shared domain (production); http://localhost:3001 locally. */
  atlasOrigin: string;
  /** AES-256-GCM key for run tokens: 32 bytes decoded from base64. Never log or serialize. */
  tokenKey: Buffer;
}

export class EnvError extends Error {
  constructor(readonly variable: string, problem: string) {
    super(`${variable} ${problem} (see .env.example)`);
    this.name = 'EnvError';
  }
}

type Source = Record<string, string | undefined>;

function required(source: Source, name: string): string {
  const v = source[name]?.trim();
  if (!v) throw new EnvError(name, 'is not set');
  return v;
}

function url(name: string, value: string, protocols: string[]): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new EnvError(name, 'is not a valid URL');
  }
  if (!protocols.includes(parsed.protocol)) throw new EnvError(name, `must start with ${protocols.join(' or ')}`);
  return value;
}

/** Base64 that decodes to exactly 32 bytes. The error never carries the value. */
function decodeTokenKey(value: string): Buffer {
  const bytes = /^[A-Za-z0-9+/_-]+={0,2}$/.test(value) ? Buffer.from(value, 'base64') : Buffer.alloc(0);
  if (bytes.length !== 32) throw new EnvError('GAME_TOKEN_KEY', 'must be base64 that decodes to 32 bytes');
  return bytes;
}

/** Pure, so it can be tested without a process environment. */
export function parseEnv(source: Source): GameEnv {
  const databaseUrl = url('DATABASE_URL', required(source, 'DATABASE_URL'), ['postgres:', 'postgresql:']);
  const authBaseUrl = url('NEON_AUTH_BASE_URL', required(source, 'NEON_AUTH_BASE_URL'), ['https:']);
  const cookieSecret = required(source, 'NEON_AUTH_COOKIE_SECRET');
  if (cookieSecret.length < 32) throw new EnvError('NEON_AUTH_COOKIE_SECRET', 'must be at least 32 characters');
  const tokenKey = decodeTokenKey(required(source, 'GAME_TOKEN_KEY'));
  const guestWorld = source['GUEST_WORLD']?.trim() || 'banshee';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(guestWorld)) throw new EnvError('GUEST_WORLD', 'must be a legend id such as banshee');
  const flag = source['FEATURE_ARABIC']?.trim().toLowerCase();
  if (flag !== undefined && flag !== '' && flag !== 'true' && flag !== 'false') throw new EnvError('FEATURE_ARABIC', 'must be true or false');
  return { databaseUrl, authBaseUrl, cookieSecret, guestWorld, arabicEnabled: flag === 'true', atlasOrigin: atlasOrigin(source), tokenKey };
}
/** Optional: an http(s) origin with no path, query, fragment or trailing slash (Phase 3, owner decision 3). */
function atlasOrigin(source: Source): string {
  const v = source['ATLAS_ORIGIN']?.trim() ?? '';
  if (!v) return '';
  let parsed: URL;
  try {
    parsed = new URL(v);
  } catch {
    throw new EnvError('ATLAS_ORIGIN', 'is not a valid URL');
  }
  if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || parsed.origin !== v) throw new EnvError('ATLAS_ORIGIN', 'must be an http or https origin with no path');
  return v;
}

let cached: GameEnv | undefined;

/** Read once per server process; call inside a request, not at module scope. */
export function getEnv(): GameEnv {
  cached ??= parseEnv(process.env);
  return cached;
}
