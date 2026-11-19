// Server-only configuration. Errors name the variable and never include its value.

export interface GameEnv {
  databaseUrl: string;
  authBaseUrl: string;
  cookieSecret: string;
  guestWorld: string;
  arabicEnabled: boolean;
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

/** Pure, so it can be tested without a process environment. */
export function parseEnv(source: Source): GameEnv {
  const databaseUrl = url('DATABASE_URL', required(source, 'DATABASE_URL'), ['postgres:', 'postgresql:']);
  const authBaseUrl = url('NEON_AUTH_BASE_URL', required(source, 'NEON_AUTH_BASE_URL'), ['https:']);
  const cookieSecret = required(source, 'NEON_AUTH_COOKIE_SECRET');
  if (cookieSecret.length < 32) throw new EnvError('NEON_AUTH_COOKIE_SECRET', 'must be at least 32 characters');
  const guestWorld = source['GUEST_WORLD']?.trim() || 'banshee';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(guestWorld)) throw new EnvError('GUEST_WORLD', 'must be a legend id such as banshee');
  const flag = source['FEATURE_ARABIC']?.trim().toLowerCase();
  if (flag !== undefined && flag !== '' && flag !== 'true' && flag !== 'false') throw new EnvError('FEATURE_ARABIC', 'must be true or false');
  return { databaseUrl, authBaseUrl, cookieSecret, guestWorld, arabicEnabled: flag === 'true' };
}

let cached: GameEnv | undefined;

/** Read once per server process; call inside a request, not at module scope. */
export function getEnv(): GameEnv {
  cached ??= parseEnv(process.env);
  return cached;
}
