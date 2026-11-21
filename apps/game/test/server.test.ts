// Game server layer tests (spec game-play, task 5.4; requirements 7.6, 7.12, 7.15, 13.1, 13.5).
// No database, no network. Payload tests call the same Play_Service functions the server functions call, over the
// in-memory store and the real token codec built from the same key parsing the server uses. The built-output checks
// read dist/ and are skipped only when no build exists (dist is not committed); run `pnpm --filter @kiroween/game build`.
import { actInWorld, generate, PlayError, startWorld, type PlayResponse, type Visitor } from '@kiroween/skeleton';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { playableLegends, playSetup, winningActions } from '../../../skeleton/test/helpers/play.ts';
import { createTokenCodec } from '@kiroween/skeleton';
import { parseEnv } from '../src/server/env';

const here = (p: string): string => fileURLToPath(new URL(p, import.meta.url));
const read = (p: string): string => readFileSync(here(p), 'utf8');
/** Source with comments removed, so a comment that mentions a removed name cannot hide or fake a match. */
const code = (p: string): string => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const FUNCTIONS = '../src/server/functions.ts';
const REMOVED = ['startRunFn', 'finishRunFn'];
const EXPECTED_PLAY_FNS = ['startWorld', 'worldAct', 'startTutorial', 'tutorialAct', 'redeemTutorialReceipt'];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe('server functions: source rules', () => {
  const src = code(FUNCTIONS);
  // Each `export const name = createServerFn(...)` up to the next export or end of file.
  const chunks = [...src.matchAll(/export const (\w+) = createServerFn\(([\s\S]*?)(?=\nexport const |\n(?:async )?function |$)/g)].map((m) => ({ name: m[1]!, text: m[2]! }));

  it('finds the server functions it is meant to check', () => {
    const names = chunks.map((c) => c.name);
    for (const n of EXPECTED_PLAY_FNS) expect(names).toContain(n);
    expect(chunks.length).toBeGreaterThanOrEqual(10);
  });

  it('startRunFn and finishRunFn exist nowhere in the game source (R7.6)', () => {
    const files = walk(here('../src')).filter((f) => /\.(ts|tsx)$/.test(f));
    for (const f of files) {
      const text = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
      for (const name of REMOVED) expect(text, `${name} in ${f}`).not.toContain(name);
    }
  });

  it('every server function runs behind the auth middleware or requireUser', () => {
    // authMiddleware or requireUser comes first; tutorialAct adds only the rate limit after it (Phase 5)
    for (const c of chunks) expect(c.text, c.name).toMatch(/\.middleware\(\[(authMiddleware|requireUser)(, tutorialRateLimit)?\]\)/);
  });

  it('functions for signed-in users only use requireUser', () => {
    for (const n of ['redeemTutorialReceipt', 'listMyRunsFn', 'myCompletedWorldsFn']) {
      expect(chunks.find((c) => c.name === n)?.text, n).toContain('[requireUser]');
    }
  });

  it('no function takes a user id from the browser', () => {
    expect(src).not.toMatch(/data\.(userId|user_id|user)\b/);
    for (const c of chunks) expect(c.text, c.name).not.toMatch(/\b(userId|user_id)\s*:/);
  });

  it('every play function sends its work through safely() and the Play_Service', () => {
    const pairs: Record<string, string> = { startWorld: 'startWorldRun', worldAct: 'actInWorld', startTutorial: 'startTutorialRun', tutorialAct: 'actInTutorial', redeemTutorialReceipt: 'redeemReceipt' };
    for (const [fn, svc] of Object.entries(pairs)) {
      const text = chunks.find((c) => c.name === fn)!.text;
      expect(text, fn).toContain('safely(');
      expect(text, fn).toContain(`${svc}(`);
    }
  });

  it('a guest refused at a world gets the sign-in redirect and the fixed error path, never a raw error', () => {
    expect(src).toMatch(/e\.code === 'sign-in-required'\) throw redirect\(\{ to: '\/sign-in' \}\)/);
    expect(src).toMatch(/new PlayError\('unavailable'\)/); // unknown errors become the one fixed message
    expect(src).toMatch(/canEnter\(target, visitor, getEnv\(\)\.guestWorld\)\) throw redirect\(/);
  });

  it('keeps the CSRF middleware on server functions (start.ts)', () => {
    const start = code('../src/start.ts');
    expect(start).toContain('createCsrfMiddleware');
    expect(start).toMatch(/handlerType === 'serverFn'/);
    expect(start).toMatch(/requestMiddleware: \[csrf,/);
  });

  it('defines requireUser, and builds the token codec from GAME_TOKEN_KEY through the env parser (R7.12)', () => {
    expect(code('../src/server/middleware.ts')).toMatch(/export const requireUser/);
    expect(code('../src/server/db.ts')).toContain('key: getEnv().tokenKey');
    expect(code('../src/server/env.ts')).toContain("'GAME_TOKEN_KEY'");
    expect(read('../../../.env.example')).toMatch(/^GAME_TOKEN_KEY=$/m); // named, with no value
  });

  it('game logic uses no Math.random', () => {
    for (const f of walk(here('../src/server')).filter((p) => p.endsWith('.ts'))) expect(readFileSync(f, 'utf8'), f).not.toContain('Math.random');
  });
});

const dist = here('../dist');
const built = existsSync(join(dist, 'server/server.js')) && existsSync(join(dist, 'client/assets'));
describe.skipIf(!built)('built output', () => {
  const serverFiles = built ? walk(join(dist, 'server')).filter((f) => f.endsWith('.js')) : [];
  const clientFiles = built ? walk(join(dist, 'client')).filter((f) => /\.(js|mjs|html|json)$/.test(f)) : [];
  const grep = (files: string[], re: RegExp): string[] => files.filter((f) => re.test(readFileSync(f, 'utf8')));

  it('the built server has the new functions and neither removed one', () => {
    const names = new Set<string>();
    for (const f of serverFiles) for (const m of readFileSync(f, 'utf8').matchAll(/createServerRpc\(\{\s*id: "[0-9a-f]+",\s*name: "(\w+)"/g)) names.add(m[1]!);
    for (const n of EXPECTED_PLAY_FNS) expect([...names]).toContain(n);
    for (const n of REMOVED) {
      expect([...names]).not.toContain(n);
      expect(grep(serverFiles, new RegExp(n)), n).toEqual([]);
    }
  });

  it('the built server still has the CSRF middleware and requireUser', () => {
    expect(grep(serverFiles, /createCsrfMiddleware\(\{ filter: [^}]*serverFn/).length).toBeGreaterThan(0);
    expect(grep(serverFiles, /middleware\(\[requireUser\]\)/).length).toBeGreaterThan(0);
  });

  it('the client bundle has no GAME_TOKEN_KEY, no token codec and no answer data', () => {
    expect(clientFiles.length).toBeGreaterThan(0);
    expect(grep(clientFiles, /GAME_TOKEN_KEY/)).toEqual([]);
    expect(grep(clientFiles, /aes-256-gcm/i)).toEqual([]);
    for (const word of REMOVED) expect(grep(clientFiles, new RegExp(word))).toEqual([]);
    for (const word of ['correctIndex', 'trueVersionId', 'trueLead', 'swaps']) expect(grep(clientFiles, new RegExp(`\\b${word}\\b`)), word).toEqual([]);
    // the rate limiter and its key header are server only (Phase 5)
    expect(grep(clientFiles, /x-forwarded-for|retryAfterSeconds/)).toEqual([]);
  });
});

// ---- payloads from real service responses --------------------------------------------------------------------------

const alice: Visitor = { kind: 'user', id: 'alice', name: 'Alice' };
const guest: Visitor = { kind: 'guest' };
const FORBIDDEN_KEYS = ['correctIndex', 'role', 'swaps', 'trueVersionId', 'trueLead', 'seed'];

/** Every object key at any depth. `skip` names keys whose subtree is left out (the end summary may carry the Seed). */
function keysOf(value: unknown, skip: string[] = []): string[] {
  if (Array.isArray(value)) return value.flatMap((v) => keysOf(v, skip));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => (skip.includes(k) ? [] : [k, ...keysOf(v, skip)]));
  return [];
}

/** The key the server reads, parsed by the server's own env code, and the real codec over it. */
const tokenKey = parseEnv({
  DATABASE_URL: `${['post', 'gres'].join('')}://u:p@db.invalid/x`,
  NEON_AUTH_BASE_URL: 'https://auth.invalid/x',
  NEON_AUTH_COOKIE_SECRET: 'k'.repeat(40),
  GAME_TOKEN_KEY: Buffer.alloc(32, 9).toString('base64'),
}).tokenKey;

function setup(guestWorld: string, seeds: string[]) {
  const s = playSetup(guestWorld, seeds);
  return { ...s, deps: { ...s.deps, tokens: createTokenCodec({ key: tokenKey, now: () => 1_700_000_000_000 }) } };
}

function assertNoSecrets(res: PlayResponse, run: ReturnType<typeof generate>): void {
  const live = !res.ended;
  expect(keysOf(res, ['ended']).filter((k) => FORBIDDEN_KEYS.includes(k))).toEqual([]);
  const text = JSON.stringify(res.view) + JSON.stringify(res.reply);
  if (live) {
    expect(text).not.toContain(run.seed);
    expect(JSON.stringify(res)).not.toContain(run.seed); // the token is encrypted, so the Seed is not readable in it either
    expect(text).not.toContain(run.trueVersionId);
  }
  for (const sv of res.view.slots) {
    const slot = run.slots.find((s) => s.slotId.endsWith(`:${sv.slotId}`) || s.slotId === sv.slotId)!;
    if (sv.options) {
      expect(sv.options).toHaveLength(4);
      expect(sv.options).toEqual(slot.options); // generator order, texts only
      expect(sv.options.every((o) => typeof o === 'string')).toBe(true);
    }
  }
}

describe('browser payloads: real service responses', () => {
  const legends = playableLegends.slice(0, 3);

  it('has legends to test', () => {
    expect(legends.length).toBeGreaterThan(0);
  });

  for (const mode of ['guest', 'user'] as const) {
    it(`${mode}: no response holds a secret, fresh or after each action`, async () => {
      for (const legend of legends) {
        for (const seed of ['zq-alpha', 'zq-bravo', 'zq-charlie']) {
          const { deps } = setup(legend.id, [seed, `${seed}-next`]);
          const visitor = mode === 'guest' ? guest : alice;
          const run = generate(legend, seed);
          let token: string | null = null;
          let res = await startWorld(deps, visitor, { legendId: legend.id, token });
          assertNoSecrets(res, run);
          token = res.token;
          for (const action of winningActions(run)) {
            res = await actInWorld(deps, visitor, { legendId: legend.id, token, action });
            assertNoSecrets(res, run);
            token = res.token;
          }
          expect(res.ended?.status).toBe('won');
        }
      }
    });
  }

  it('the correct option does not sit in the same position for every seed', () => {
    for (const legend of legends) {
      const positions = new Set<number>();
      for (let i = 0; i < 40; i++) for (const s of generate(legend, `pos-${i}`).slots) positions.add(s.correctIndex);
      expect(positions.size, legend.id).toBeGreaterThan(1);
    }
  });
});

describe('guest world refusal (R7.15)', () => {
  const [home, other] = playableLegends;

  it('a guest at another world is refused with the sign-in error, no world data, and nothing stored', async () => {
    const { deps, store } = setup(home!.id, ['g-1']);
    for (const call of [
      () => startWorld(deps, guest, { legendId: other!.id, token: null }),
      () => actInWorld(deps, guest, { legendId: other!.id, token: null, action: { kind: 'tap', hotspotId: 'x' } }),
    ]) {
      const err = await call().then(
        () => null,
        (e: unknown) => e,
      );
      expect(err).toBeInstanceOf(PlayError);
      expect((err as PlayError).code).toBe('sign-in-required');
      expect((err as PlayError).status).toBe(401);
      expect(JSON.stringify((err as PlayError).message)).not.toContain(other!.id);
    }
    expect(await store.current('alice', other!.id)).toBeNull();
  });

  it('the same guest may enter the guest world, and a signed-in user may enter the other', async () => {
    const { deps } = setup(home!.id, ['g-2', 'g-3']);
    expect((await startWorld(deps, guest, { legendId: home!.id, token: null })).view.status).toBe('in_progress');
    expect((await startWorld(deps, alice, { legendId: other!.id, token: null })).view.status).toBe('in_progress');
  });

  it('a browser cannot send a user id, score, count, status or seed', async () => {
    const { deps } = setup(home!.id, ['g-4']);
    for (const extra of [{ userId: 'bob' }, { score: 999 }, { status: 'won' }, { seed: 'x' }, { wrongAnswers: 0 }]) {
      const err = await startWorld(deps, alice, { legendId: home!.id, token: null, ...extra }).then(
        () => null,
        (e: unknown) => e,
      );
      expect(err).toBeInstanceOf(PlayError);
      expect((err as PlayError).code).toBe('invalid');
    }
  });
});

describe('server functions: fixed errors (guard 5.5)', () => {
  const src = code(FUNCTIONS);

  it('validators never throw, so safely() always maps the status', () => {
    const validators = [...src.matchAll(/\.validator\((\w+)\)/g)].map((m) => m[1]);
    expect(validators.length).toBeGreaterThan(0);
    for (const v of validators) expect(['passThrough', 'targetOf']).toContain(v);
    expect(src).toMatch(/const targetOf = \(raw: unknown\): unknown => raw;/);
  });

  it('getShell runs through safely() so an env error never reaches the browser', () => {
    const shell = /export const getShell = [\s\S]*?(?=\nconst stripPrefix)/.exec(src)?.[0] ?? '';
    expect(shell).toContain('safely(');
  });
});
