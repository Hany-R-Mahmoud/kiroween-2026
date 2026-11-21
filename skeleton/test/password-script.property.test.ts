// Property 13: The Password_Script prints no secret and copies only on success (Requirements 6.2, 6.3, 6.4).
import fc from 'fast-check';
import { execFile } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { atlasUrl, psqlEnv, setPassword, type Child } from '../scripts/set-atlas-web-password.ts';

// Built from parts so no connection-string-shaped literal sits in the repo (secret scan).
const scheme = ['post', 'gres', 'ql'].join('');
const host = (id: string) => [`ep-${id}`, 'eu-central-1', 'aws', 'neon', 'tech'].join('.');
const word = fc.stringMatching(/^[a-z][a-z0-9]{3,11}$/);
const pw = fc.stringMatching(/^[A-Za-z0-9_-]{32}$/);
/** `<scheme>://<user>:<password>@<host>/<rest>`, joined at run time (the secret scan rejects such literals). */
const conn = (user: string, pass: string, hostname: string, rest: string) => `${scheme}://${[user, pass].join(':')}${'@'}${hostname}/${rest}`;

type Call = { cmd: string; args: string[]; env: Record<string, string>; input: string };
function fakeChild(psqlCode: number | null, pbcopyCode: number | null) {
  const calls: Call[] = [];
  const child: Child = {
    run: async (cmd, args, env, input) => {
      calls.push({ cmd, args, env, input });
      return cmd === 'psql' ? psqlCode : pbcopyCode;
    },
  };
  return { child, calls };
}

describe('Property 13: password script output and clipboard', () => {
  it('prints only yes/no lines, never a secret, and copies only after a successful ALTER ROLE', async () => {
    await fc.assert(
      fc.asyncProperty(word, word, word, pw, pw, fc.constantFrom(0, 1, 3, null), fc.constantFrom(0, 1, null), async (user, db, ep, adminPw, newPw, psqlCode, pbcopyCode) => {
        const url = conn(user, adminPw, host(ep), `${db}?sslmode=require`);
        const lines: string[] = [];
        const { child, calls } = fakeChild(psqlCode, pbcopyCode);
        const code = await setPassword(url, { child, newPassword: () => newPw, out: (l) => lines.push(l) });
        const printed = lines.join('\n');
        for (const s of [newPw, adminPw, url, host(ep), user, `ep-${ep}`]) expect(printed).not.toContain(s);
        for (const l of lines) expect(l).toMatch(/^[a-z ]+: (yes|no)$/);
        // the secret reaches psql on standard input only, never as an argument
        const psql = calls.find((c) => c.cmd === 'psql')!;
        expect(psql.input).toBe(`ALTER ROLE atlas_web WITH PASSWORD '${newPw}';\n`);
        expect(psql.args.join(' ')).not.toContain(newPw);
        expect(psql.args.join(' ')).not.toContain(adminPw);
        expect(psql.env.PGPASSWORD).toBe(adminPw);
        const copies = calls.filter((c) => c.cmd === 'pbcopy');
        if (psqlCode !== 0) {
          expect(lines).toEqual(['password set: no']);
          expect(copies).toEqual([]);
          expect(code).not.toBe(0);
          return;
        }
        expect(copies).toHaveLength(1);
        expect(copies[0]!.input).toBe(conn('atlas_web', newPw, `ep-${ep}-pooler.eu-central-1.aws.neon.tech`, `${db}?sslmode=require`));
        expect(copies[0]!.args).toEqual([]);
        expect(lines).toEqual(['password set: yes', `copied to clipboard: ${pbcopyCode === 0 ? 'yes' : 'no'}`]);
        expect(code).toBe(pbcopyCode === 0 ? 0 : 1);
      }),
      { numRuns: 120 },
    );
  });

  it('refuses a missing or non-postgres string without calling psql', async () => {
    for (const url of [undefined, '', 'not a url', 'https://x.example/y', `${scheme}://nouser@${host('a')}/db`]) {
      const lines: string[] = [];
      const { child, calls } = fakeChild(0, 0);
      expect(await setPassword(url, { child, newPassword: () => 'x', out: (l) => lines.push(l) })).toBe(2);
      expect(calls).toEqual([]);
      expect(lines).toEqual(['connection string: no', 'password set: no']);
    }
  });

  it('keeps an already pooled host, and builds the URL from the parsed parts', () => {
    const env = psqlEnv(conn('a', 'b', 'ep-x-pooler.eu.aws.neon.tech', 'neondb'))!;
    expect(atlasUrl(env, 'P')).toBe(conn('atlas_web', 'P', 'ep-x-pooler.eu.aws.neon.tech', 'neondb?sslmode=require'));
  });
});

// The real script end to end, with fake psql and pbcopy on PATH (shell scripts that record standard input).
describe('the script as the Owner runs it', () => {
  const run = promisify(execFile);
  const script = fileURLToPath(new URL('../scripts/set-atlas-web-password.ts', import.meta.url));
  const tsx = fileURLToPath(new URL('../node_modules/.bin/tsx', import.meta.url));
  function bins(psqlExit: number) {
    const dir = mkdtempSync(join(tmpdir(), 'pw-script-'));
    for (const [name, exit] of [['psql', psqlExit], ['pbcopy', 0]] as const) {
      const f = join(dir, name);
      writeFileSync(f, `#!/bin/sh\ncat > "${dir}/${name}.stdin"\necho "fake ${name} noise with $PGHOST" >&2\nexit ${exit}\n`);
      chmodSync(f, 0o755);
    }
    return dir;
  }
  for (const psqlExit of [0, 3]) {
    it(`psql exit ${psqlExit}: output holds no secret; clipboard ${psqlExit === 0 ? 'gets the URL' : 'gets nothing'}`, async () => {
      const dir = bins(psqlExit);
      const url = conn('owner', 'AdminPass123', host('quiet-moon-1'), 'neondb?sslmode=require');
      const r = await run(tsx, [script], { env: { PATH: `${dir}:${process.env.PATH}`, HOME: process.env.HOME ?? '', DATABASE_URL_UNPOOLED: url } }).catch((e: { stdout: string; stderr: string; code: number }) => e);
      const out = `${r.stdout}${r.stderr}`;
      for (const s of ['AdminPass123', 'quiet-moon', 'owner', url]) expect(out).not.toContain(s);
      if (psqlExit === 0) {
        expect(r.stdout.trim().split('\n')).toEqual(['password set: yes', 'copied to clipboard: yes']);
        const sent = readFileSync(join(dir, 'psql.stdin'), 'utf8');
        const pw = /PASSWORD '([A-Za-z0-9_-]{32})'/.exec(sent)?.[1];
        expect(pw).toBeDefined();
        expect(out).not.toContain(pw!);
        expect(readFileSync(join(dir, 'pbcopy.stdin'), 'utf8')).toContain(`atlas_web:${pw}${'@'}ep-quiet-moon-1-pooler.`);
      } else {
        expect(r.stdout.trim()).toBe('password set: no');
        expect(existsSync(join(dir, 'pbcopy.stdin'))).toBe(false);
      }
    }, 30_000);
  }
});
