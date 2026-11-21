// Sets a new random password for the production atlas_web role and copies the full ATLAS_DATABASE_URL to the
// clipboard. Run by the Owner in a terminal (docs: phase-5 design, Requirement 6):
//
//   DATABASE_URL_UNPOOLED="$(pbpaste)" pnpm --filter @kiroween/skeleton db:set-atlas-web-password
//
// The connection string comes from that inline variable only. This script never loads .env (the local .env holds
// the dev branch). It prints only yes/no lines: never the password, the connection string, its host or its user.
// The password goes to psql over standard input; psql gets the admin connection through PG* environment variables,
// so no argument carries a secret. Neon refuses SCRAM hashes and the Console reset shows no password, hence this.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export interface Child {
  /** Runs a command with the given environment and standard input; resolves with its exit code (null on spawn error). */
  run(cmd: string, args: string[], env: Record<string, string>, input: string): Promise<number | null>;
}
export interface Deps {
  child: Child;
  newPassword: () => string;
  out: (line: string) => void;
}

/** psql's environment for the admin connection. Null when the string is not a usable postgres URL. */
export function psqlEnv(url: string): Record<string, string> | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (!/^postgres(ql)?:$/.test(u.protocol) || !u.hostname || !u.username || !u.password) return null;
  return {
    PGHOST: u.hostname,
    PGPORT: u.port || '5432',
    PGUSER: decodeURIComponent(u.username),
    PGPASSWORD: decodeURIComponent(u.password),
    PGDATABASE: decodeURIComponent(u.pathname.slice(1)) || 'neondb',
    PGSSLMODE: 'require',
  };
}

/** Neon's pooled host: the endpoint id plus `-pooler` (left as is when already pooled). */
export const pooledHost = (host: string): string => {
  const [first, ...rest] = host.split('.');
  return [first!.endsWith('-pooler') ? first : `${first}-pooler`, ...rest].join('.');
};

/** The reader connection string the atlas uses. The password is base64url, so it needs no escaping. */
export function atlasUrl(env: Record<string, string>, password: string): string {
  const u = new URL(`postgresql://${pooledHost(env.PGHOST!)}`);
  u.username = 'atlas_web';
  u.password = password;
  u.pathname = `/${encodeURIComponent(env.PGDATABASE!)}`;
  u.search = 'sslmode=require';
  return u.href;
}

/** Returns the exit code. Output is only the fixed yes/no lines. */
export async function setPassword(url: string | undefined, deps: Deps): Promise<number> {
  const env = url ? psqlEnv(url) : null;
  if (!env) {
    deps.out('connection string: no');
    deps.out('password set: no');
    return 2;
  }
  const password = deps.newPassword();
  const sql = `ALTER ROLE atlas_web WITH PASSWORD '${password}';\n`;
  const set = await deps.child.run('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1'], env, sql);
  if (set !== 0) {
    deps.out('password set: no');
    return 1;
  }
  deps.out('password set: yes');
  const copied = await deps.child.run('pbcopy', [], {}, atlasUrl(env, password));
  deps.out(`copied to clipboard: ${copied === 0 ? 'yes' : 'no'}`);
  return copied === 0 ? 0 : 1;
}

/** Real child processes. Their output is discarded: psql errors can name the host or the role. */
const realChild: Child = {
  run: (cmd, args, env, input) =>
    new Promise((resolve) => {
      const p = spawn(cmd, args, { env: { PATH: process.env['PATH'] ?? '', HOME: process.env['HOME'] ?? '', ...env }, stdio: ['pipe', 'ignore', 'ignore'] });
      p.on('error', () => resolve(null));
      p.on('close', (code) => resolve(code));
      p.stdin.on('error', () => {});
      p.stdin.end(input);
    }),
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const code = await setPassword(process.env['DATABASE_URL_UNPOOLED'], {
    child: realChild,
    newPassword: () => randomBytes(24).toString('base64url'),
    out: (line) => console.log(line),
  });
  process.exit(code);
}
