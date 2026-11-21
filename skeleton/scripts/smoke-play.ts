// Smoke check for game play (task 11.1) against the dev-skeleton-core branch, through the real server functions of a
// running game server (the dev server, port 3000 by default). Run it with:
//   pnpm --filter @kiroween/skeleton exec tsx scripts/smoke-play.ts [base]
// The script loads the root .env itself. It prints step results only: never a cookie, password, token, receipt,
// connection string, or the Seed of a Run that is not finished. Test users get random credentials generated here and
// are deleted by exact id at the end (and on any failure) together with their runs and player_flags rows.
//
// The scripted player reads only what a browser could: the views the server functions return, and atlas text (the
// chapters, versions and the Keeper's Note) read with the read-only atlas role through the atlas's own read functions.
// Hotspot ids are the public layout ids. It never reads a correct index, a role or a Seed.
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { config } from 'dotenv';
import pg from 'pg';
import { createDb } from '../src/db/client.ts';
import { getAtlasLegend } from '../src/db/atlasRead.ts';
import { getKeepersNote } from '../src/db/keepersRead.ts';
import { normalise } from '../src/generator/normalise.ts';
import { rawId } from '../src/play/engine.ts';
import { createRng } from '../src/rng/rng.ts';
import { score } from '../src/score/score.ts';
import type { AtlasLegend } from '../src/atlas/view.ts';
import type { Action, PlayView, SlotView } from '../src/play/types.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
config({ path: `${ROOT}.env`, quiet: true });

const DEV_ENDPOINT = 'ep-little-boat-arrb1poz'; // dev-skeleton-core; only the hostname prefix is compared, never printed
const BASE = process.argv.slice(2).find((a) => a.startsWith('http')) ?? 'http://localhost:3000';
const ORIGIN = new URL(BASE).origin;
const WIN_WORLD = 'baba-yaga'; // the scripted player wins it on every seed (docs/phase-4-notes/fairness.md)
const RESTART_WORLD = 'draugr';
const GUEST_ATTEMPTS = 8;

const results: string[] = [];
let failed = 0;
function check(step: string, ok: boolean, note = ''): void {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${step}${note ? `  (${note})` : ''}`;
  results.push(line);
  console.log(line);
  if (!ok) failed++;
}

function hostOf(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return new URL(v).hostname;
}
// Guard: every connection the check uses must be on the dev-skeleton-core endpoint. Print booleans only.
for (const name of ['DATABASE_URL_UNPOOLED', 'DATABASE_URL', 'ATLAS_DATABASE_URL']) {
  const ok = hostOf(name).startsWith(DEV_ENDPOINT);
  if (!ok) {
    console.error(`${name} is not on the dev-skeleton-core endpoint. Stopping before any request.`);
    process.exit(2);
  }
}

// ---- Start's wire format (seroval), found the way scripts/smoke.mjs finds it ----------------------------------------
const holder = (pkgDir: string): string => (basename(dirname(pkgDir)).startsWith('@') ? dirname(dirname(pkgDir)) : dirname(pkgDir));
const sibling = (pkgDir: string, name: string): string => realpathSync(join(holder(pkgDir), name));
const startDir = realpathSync(join(ROOT, 'apps/game/node_modules/@tanstack/react-start'));
const serovalDir = sibling(sibling(startDir, '@tanstack/start-client-core'), 'seroval');
const serovalPkg = JSON.parse(readFileSync(join(serovalDir, 'package.json'), 'utf8'));
const serovalEntry = serovalPkg.exports?.['.']?.import?.default ?? serovalPkg.exports?.['.']?.import ?? serovalPkg.module;
const { toJSONAsync, fromCrossJSON } = (await import(pathToFileURL(join(serovalDir, serovalEntry)).href)) as {
  toJSONAsync: (v: unknown) => Promise<unknown>;
  fromCrossJSON: (v: unknown, o: { refs: Map<unknown, unknown> }) => { result?: unknown } | undefined;
};

// ---- a browser: its own cookie jar -------------------------------------------------------------------------------------
class Browser {
  private jar = new Map<string, string>();
  private cookies(): string {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  async http(path: string, init: RequestInit = {}): Promise<Response> {
    const res = await fetch(BASE + path, {
      redirect: 'manual',
      ...init,
      headers: { cookie: this.cookies(), origin: ORIGIN, 'sec-fetch-site': 'same-origin', ...((init.headers as Record<string, string>) ?? {}) },
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(';');
      const i = pair!.indexOf('=');
      const name = pair!.slice(0, i).trim();
      const value = pair!.slice(i + 1);
      if (/max-age=0|expires=thu, 01 jan 1970/i.test(c) || value === '') this.jar.delete(name);
      else this.jar.set(name, value);
    }
    return res;
  }
  auth(endpoint: string, body: unknown): Promise<Response> {
    return this.http(`/game/api/auth/${endpoint}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  }
  /** Calls a server function. `value` on success; on an error only the HTTP status and Start's fixed message. */
  async fn<T = any>(name: string, data?: unknown): Promise<{ status: number; value?: T; message?: string }> {
    const id = fnId(name);
    if (!id) throw new Error(`no id for ${name}`);
    const body = data === undefined ? undefined : JSON.stringify(await toJSONAsync({ data }));
    const res = await this.http(`/game/_serverFn/${id}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'x-tsr-serverFn': 'true', accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body } : {}),
    });
    const text = await res.text();
    try {
      const decoded = fromCrossJSON(JSON.parse(text), { refs: new Map() });
      if (decoded && 'result' in decoded) return { status: res.status, value: decoded.result as T };
    } catch {
      // an error payload: read only its message below
    }
    const message = /"message".*?"s":"([^"]*)"/.exec(text)?.[1] ?? /"s":"([^"]+)"/.exec(text)?.[1] ?? '';
    return { status: res.status, message };
  }
}

const fnSource = await (await fetch(`${BASE}/game/src/server/functions.ts?tsr-shared=1`)).text();
const fnId = (name: string): string | undefined => new RegExp(`export const ${name} = [\\s\\S]*?createClientRpc\\("([^"]+)"`).exec(fnSource)?.[1];

// ---- databases -----------------------------------------------------------------------------------------------------------
const owner = new pg.Client({ connectionString: process.env['DATABASE_URL_UNPOOLED'] });
await owner.connect();
const atlas = createDb(process.env['ATLAS_DATABASE_URL']!, 1);

// ---- atlas text (what the atlas page shows) --------------------------------------------------------------------------
const atlasCache = new Map<string, AtlasLegend>();
async function atlasLegend(id: string): Promise<AtlasLegend> {
  let l = atlasCache.get(id);
  if (!l) {
    const got = await getAtlasLegend(atlas.db, id);
    if (!got) throw new Error(`atlas has no legend ${id}`);
    atlasCache.set(id, (l = got));
  }
  return l;
}
function atlasText(legend: AtlasLegend, anchor: string): string | null {
  const chapter = legend.chapters.find((c) => c.anchor === anchor);
  if (chapter) return chapter.text;
  const version = (v: AtlasLegend['versions'][number]): string => [v.claim, v.conflicts, v.paragraph].join('\n\n');
  const one = legend.versions.find((v) => v.anchor === anchor);
  if (one) return version(one);
  if (anchor === legend.versionsAnchor) return legend.versions.map(version).join('\n\n');
  return null;
}

// ---- the reading rule (a copy of rankOptions in skeleton/test/helpers/playFromAtlas.ts, overlap reader) ----------------
const NEAR = 80;
const padded = (s: string): string => ` ${normalise(s)} `;
const occurrences = (hay: string, needle: string): number[] => {
  const out: number[] = [];
  if (needle.trim() === '') return out;
  for (let at = hay.indexOf(needle); at >= 0; at = hay.indexOf(needle, at + 1)) out.push(at);
  return out;
};
const STOP = new Set(['the', 'that', 'this', 'with', 'from', 'were', 'was', 'for', 'and', 'but', 'are', 'has', 'have', 'had', 'its', 'her', 'his', 'their', 'who', 'which', 'what', 'when', 'where', 'said', 'says', 'into', 'than', 'then', 'one', 'also', 'told', 'named', 'called']);
const contentWords = (s: string): string[] => normalise(s).split(' ').filter((w) => w.length >= 3 && !STOP.has(w));
function overlap(question: string, option: string, hay: string): number {
  const optWords = [...new Set(contentWords(option))];
  const qWords = [...new Set(contentWords(question.replace('____', ' ')))];
  if (!optWords.length) return 0;
  let covered = 0;
  let close = 0;
  for (const w of optWords) {
    const spots = occurrences(hay, ` ${w} `);
    if (!spots.length) continue;
    covered += 1;
    for (const p of spots) {
      const win = hay.slice(Math.max(0, p - NEAR), p + w.length + 2 + NEAR);
      close = Math.max(close, qWords.filter((q) => q !== w && win.includes(` ${q} `)).length);
    }
  }
  return (covered / optWords.length) * 1000 + close;
}
function rankOptions(question: string, options: readonly string[], text: string): number[] {
  const hay = padded(text);
  const parts = question.split('____');
  const longest = [...parts].map((p) => padded(p).trim()).filter((p) => p !== '' && hay.includes(` ${p} `)).sort((a, b) => b.length - a.length)[0];
  const at = longest === undefined ? -1 : hay.indexOf(` ${longest} `) + 1;
  const key = options.map((opt) => {
    const o = padded(opt);
    const spots = occurrences(hay, o);
    let tier = spots.length ? 1 : 0;
    if (question.includes('____') && hay.includes(padded(question.replace('____', opt)))) tier = 3;
    else if (at >= 0 && longest !== undefined && spots.some((p) => p + o.length - 2 >= at - NEAR && p <= at + longest.length + NEAR)) tier = 2;
    return tier >= 2 ? tier * 1_000_000 : overlap(question, opt, hay) + (tier === 1 ? 1 : 0);
  });
  return options.map((_, i) => i).sort((a, b) => key[b]! - key[a]! || a - b);
}

// ---- world play through the server functions --------------------------------------------------------------------------
interface PlayResp {
  view: PlayView;
  reply: { kind: string; correct?: boolean; charged?: boolean; anchor?: string; result?: string } | null;
  ended: { status: 'won' | 'restarted'; score: number; slotsSolved: number } | null;
  token: string | null;
}
interface Seen {
  status: 'won' | 'restarted' | 'stuck';
  /** What this player saw the server say: wrong answers and charged Hint 2 uses, to compare with the stored row. */
  wrong: number;
  hint2Charged: number;
  slots: number;
  ended: PlayResp['ended'];
  token: string | null;
  problem: string;
}

async function hotspotIds(legendId: string): Promise<string[]> {
  const r = await owner.query('select id from hotspots where legend_id = $1 order by ordinal', [legendId]);
  return r.rows.map((x: { id: string }) => rawId(legendId, x.id));
}

/** Plays one Run from `first` (the start response) to its end, or to the first restart. */
async function playRun(b: Browser, legendId: string, first: PlayResp, label: string): Promise<Seen> {
  const legend = await atlasLegend(legendId);
  const seen: Seen = { status: 'stuck', wrong: 0, hint2Charged: 0, slots: first.view.slots.length, ended: null, token: first.token, problem: '' };
  let view = first.view;
  const act = async (action: Action): Promise<PlayResp | null> => {
    const r = await b.fn<PlayResp>('worldAct', { legendId, token: seen.token, action });
    if (r.status !== 200 || !r.value) throw new Error(`worldAct refused: status ${r.status} ${r.message ?? ''}`);
    seen.token = r.value.token;
    if (r.value.ended) {
      seen.ended = r.value.ended;
      seen.status = r.value.ended.status;
      return null;
    }
    view = r.value.view;
    return r.value;
  };
  for (const id of await hotspotIds(legendId)) if (!(await act({ kind: 'tap', hotspotId: id }))) return seen;
  const order = [...view.slots].sort((a, b2) => Number(a.final) - Number(b2.final)).map((s) => s.slotId);
  const slotNow = (slotId: string): SlotView => view.slots.find((s) => s.slotId === slotId)!;
  for (const slotId of order) {
    if (slotNow(slotId).state !== 'open') {
      seen.problem = `${slotId} not open after every tap`;
      return seen;
    }
    const h2 = await act({ kind: 'hint2', slotId });
    if (!h2) return seen;
    if (h2.reply?.charged) seen.hint2Charged += 1;
    const text = h2.reply?.anchor ? atlasText(legend, h2.reply.anchor) : null;
    if (text === null) {
      seen.problem = `${slotId}: no atlas text at the Hint 2 anchor`;
      return seen;
    }
    const { question, options } = slotNow(slotId);
    let solved = false;
    for (const option of rankOptions(question!, options!, text)) {
      if ((slotNow(slotId).tried ?? []).includes(option)) continue;
      const r = await act({ kind: 'answer', slotId, option: option as 0 | 1 | 2 | 3 });
      if (!r) return seen;
      if (r.reply?.correct) {
        solved = true;
        break;
      }
      seen.wrong += 1;
    }
    if (!solved) {
      seen.problem = `${slotId}: no option accepted`;
      return seen;
    }
  }
  for (const leadId of createRng(`smoke/${label}`).shuffle(view.leads.filter((l) => l.canFollow).map((l) => l.leadId))) {
    if (!(await act({ kind: 'follow', leadId }))) return seen;
  }
  seen.problem = 'no lead confirmed';
  return seen;
}

/** Plays wrong answers and Hint 2 until the fear meter fills and the Run restarts. */
async function fillFear(b: Browser, legendId: string, first: PlayResp): Promise<Seen> {
  const seen: Seen = { status: 'stuck', wrong: 0, hint2Charged: 0, slots: first.view.slots.length, ended: null, token: null, problem: '' };
  let view = first.view;
  const act = async (action: Action): Promise<boolean> => {
    const r = await b.fn<PlayResp>('worldAct', { legendId, token: null, action });
    if (r.status !== 200 || !r.value) return false; // a refused action costs nothing
    if (r.value.ended) {
      seen.ended = r.value.ended;
      seen.status = r.value.ended.status;
      if (action.kind === 'answer') seen.wrong += 1; // the answer that filled the meter ended the Run, so no reply carries it
      return true;
    }
    view = r.value.view;
    if (r.value.reply?.kind === 'answer' && !r.value.reply.correct) seen.wrong += 1;
    if (r.value.reply?.charged) seen.hint2Charged += 1;
    return false;
  };
  for (const id of await hotspotIds(legendId)) if (await act({ kind: 'tap', hotspotId: id })) return seen;
  for (const s of view.slots.filter((x) => x.state === 'open')) if (await act({ kind: 'hint2', slotId: s.slotId })) return seen;
  for (let pass = 0; pass < 8; pass++) {
    for (const s of [...view.slots].sort((a, c) => Number(a.final) - Number(c.final))) {
      if (s.state !== 'open') continue;
      for (const option of [0, 1, 2, 3] as const) {
        if ((view.slots.find((x) => x.slotId === s.slotId)?.tried ?? []).includes(option)) continue;
        if (await act({ kind: 'answer', slotId: s.slotId, option })) return seen;
        if (view.slots.find((x) => x.slotId === s.slotId)?.state === 'solved') break;
      }
    }
  }
  return seen;
}

// ---- the tutorial, read from the Keeper's Note ---------------------------------------------------------------------------
const NUMBER_WORDS = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split(' ');
const NUMERIC = new RegExp(`\\b(\\d{1,4}|${NUMBER_WORDS.join('|')})\\b`, 'gi');
/** Candidate answers: numbers in the sentences of the note that share the most words with the question, best first. */
function numberCandidates(question: string, paragraphs: string[]): string[] {
  const q = new Set(contentWords(question));
  const sentences = paragraphs.flatMap((p) => p.split(/(?<=[.!?])\s+/));
  const scored = sentences.map((s) => ({ s, n: contentWords(s).filter((w) => q.has(w)).length })).sort((a, b) => b.n - a.n);
  const out: string[] = [];
  for (const { s } of scored) for (const m of s.matchAll(NUMERIC)) if (!out.includes(m[1]!)) out.push(m[1]!);
  return out.slice(0, 12);
}

async function guestTutorial(b: Browser): Promise<string | null> {
  const note = await getKeepersNote(atlas.db);
  if (!note) return null;
  const start = await b.fn<{ token: string }>('startTutorial', { token: null });
  if (start.status !== 200 || !start.value) return null;
  let token = start.value.token;
  const drawer = await b.fn<{ token: string; reply: { question?: string } }>('tutorialAct', { token, action: { kind: 'drawer' } });
  if (drawer.status !== 200 || !drawer.value) return null;
  token = drawer.value.token;
  const hint = await b.fn<{ token: string; reply: { anchor?: string } }>('tutorialAct', { token, action: { kind: 'hint2' } });
  if (hint.status !== 200 || !hint.value || hint.value.reply.anchor !== note.anchor) return null; // the anchor names the Keeper's Note chapter
  token = hint.value.token;
  for (const guess of numberCandidates(drawer.value.reply.question ?? '', note.paragraphs)) {
    const r = await b.fn<{ token: string; reply: { correct?: boolean }; receipt?: string }>('tutorialAct', { token, action: { kind: 'answer', value: guess } });
    if (r.status !== 200 || !r.value) return null;
    token = r.value.token;
    if (r.value.reply.correct) return r.value.receipt ?? null;
  }
  return null;
}

// ---- cleanup -----------------------------------------------------------------------------------------------------------------
const userIds: string[] = [];
const idFile = join(tmpdir(), 'kiroween-smoke-play-user-ids');
const remember = (id: string): void => {
  userIds.push(id);
  writeFileSync(idFile, userIds.join('\n')); // ids only, so a crashed run can be cleaned by exact id
};
async function count(sql: string, ids: string[]): Promise<number> {
  const r = await owner.query(sql, [ids]);
  return Number(r.rows[0].n);
}
async function cleanup(): Promise<void> {
  if (!userIds.length) return;
  const ids = [...userIds];
  await owner.query('delete from runs where user_id = any($1::text[])', [ids]);
  await owner.query('delete from player_flags where user_id = any($1::text[])', [ids]);
  let how = 'neon_auth."user" delete by id';
  try {
    await owner.query('delete from neon_auth."user" where id = any($1::uuid[])', [ids]);
  } catch {
    how += ' (after sessions and accounts)';
    await owner.query('delete from neon_auth.session where "userId" = any($1::uuid[])', [ids]);
    await owner.query('delete from neon_auth.account where "userId" = any($1::uuid[])', [ids]);
    await owner.query('delete from neon_auth."user" where id = any($1::uuid[])', [ids]);
  }
  const left = {
    runs: await count('select count(*) n from runs where user_id = any($1::text[])', ids),
    flags: await count('select count(*) n from player_flags where user_id = any($1::text[])', ids),
    users: await count('select count(*) n from neon_auth."user" where id = any($1::uuid[])', ids),
  };
  let sessions = -1;
  let accounts = -1;
  try {
    sessions = await count('select count(*) n from neon_auth.session where "userId" = any($1::uuid[])', ids);
    accounts = await count('select count(*) n from neon_auth.account where "userId" = any($1::uuid[])', ids);
  } catch {
    // table or column names differ: the user row check above is the one that counts
  }
  check(`test users deleted by exact id (${userIds.length}) via ${how}`, left.runs === 0 && left.flags === 0 && left.users === 0 && sessions <= 0 && accounts <= 0, `left: runs ${left.runs}, flags ${left.flags}, users ${left.users}, sessions ${sessions}, accounts ${accounts}`);
}

// ---- the check ----------------------------------------------------------------------------------------------------------------
async function main(): Promise<void> {
  const guestWorld = process.env['GUEST_WORLD'] || 'banshee';

  // 1. guest: tutorial, receipt, then win the guest world
  const guest = new Browser();
  const receipt = await guestTutorial(guest);
  check('guest finishes the tutorial from the Keeper\'s Note text and gets a receipt', receipt !== null);

  let won: Seen | null = null;
  let attempts = 0;
  let first: PlayResp | null = null;
  const start = await guest.fn<PlayResp>('startWorld', { legendId: guestWorld, token: null });
  check(`guest starts ${guestWorld}: view and token, no seed field`, start.status === 200 && !!start.value?.token && !JSON.stringify(start.value.view).includes('seed'), `status ${start.status}`);
  first = start.value ?? null;
  while (first && attempts < GUEST_ATTEMPTS && !won) {
    attempts += 1;
    const seen = await playRun(guest, guestWorld, first, `guest-${attempts}`);
    if (seen.status === 'won') won = seen;
    else if (seen.status === 'restarted') {
      const again = await guest.fn<PlayResp>('startWorld', { legendId: guestWorld, token: seen.token }); // the new Run's token
      first = again.value ?? null;
    } else break;
  }
  check(`guest wins ${guestWorld} through the server functions`, won !== null, `attempts ${attempts}${won ? '' : ' (' + 'no win' + ')'}; the known-findings note in fairness.md says some banshee seeds lose`);
  check('a won guest Run has no token left to resume', won?.token === null);

  // 2. a fresh test user
  const user = new Browser();
  const email = `smoke-${randomUUID()}@kiroween-smoke.invalid`;
  const password = randomBytes(18).toString('base64url');
  let res = await user.auth('sign-up/email', { name: 'Smoke Player', email, password });
  check('sign up a test user', res.ok, `status ${res.status}`);
  res = await user.auth('sign-out', {});
  res = await user.auth('sign-in/email', { email, password });
  check('sign in with email and password', res.ok, `status ${res.status}`);
  const session = (await (await user.http('/game/api/auth/get-session')).json().catch(() => null)) as { user?: { id?: string } } | null;
  const userId = session?.user?.id;
  if (typeof userId !== 'string') {
    check('get-session returns the user id', false);
    return;
  }
  remember(userId);

  // 4. receipt carry-over (done first so the flag state is read before the user plays)
  const before = (await owner.query('select tutorial_done_at from player_flags where user_id = $1', [userId])).rowCount;
  check('a fresh user has no tutorial flag', before === 0);
  const guestRedeem = await guest.fn('redeemTutorialReceipt', { receipt: receipt ?? 'v1.' + 'A'.repeat(24) });
  check('a guest cannot redeem a receipt', guestRedeem.status !== 200 && guestRedeem.value === undefined, `status ${guestRedeem.status}`);
  const bad = await user.fn('redeemTutorialReceipt', { receipt: 'v1.' + randomBytes(30).toString('base64url') });
  check('a forged receipt is refused and sets no flag', bad.status !== 200 && (await owner.query('select 1 from player_flags where user_id = $1', [userId])).rowCount === 0, `status ${bad.status}`);
  const r1 = await user.fn<{ done: boolean }>('redeemTutorialReceipt', { receipt: receipt ?? '' });
  const flag1 = (await owner.query('select tutorial_done_at from player_flags where user_id = $1', [userId])).rows;
  check('redeeming the guest receipt marks the tutorial done', r1.status === 200 && r1.value?.done === true && flag1.length === 1 && flag1[0].tutorial_done_at !== null, `status ${r1.status}`);
  const r2 = await user.fn<{ done: boolean }>('redeemTutorialReceipt', { receipt: receipt ?? '' });
  const flag2 = (await owner.query('select tutorial_done_at from player_flags where user_id = $1', [userId])).rows;
  check('a second redeem is harmless: same single row, same time', r2.status === 200 && r2.value?.done === true && flag2.length === 1 && String(flag2[0].tutorial_done_at) === String(flag1[0]?.tutorial_done_at));
  const runsAfterRedeem = (await owner.query('select count(*)::int n from runs where user_id = $1', [userId])).rows[0].n;
  check('redeeming touched no run', runsAfterRedeem === 0);

  // 2. win another world as the user, and check the row
  const begun = await user.fn<PlayResp>('startWorld', { legendId: WIN_WORLD, token: null });
  check(`user starts ${WIN_WORLD}`, begun.status === 200 && begun.value?.view.status === 'in_progress' && begun.value.token === null, `status ${begun.status}`);
  if (!begun.value) return;
  // no client-reported value is accepted, at the top level or inside the action
  const tap = (await hotspotIds(WIN_WORLD))[0]!;
  const injected: Record<string, unknown>[] = [
    { score: 99999 },
    { wrongAnswers: 0 },
    { hint2Uses: 0 },
    { status: 'won' },
    { userId: 'someone-else' },
    { seed: 'mine' },
  ];
  let allRefused = true;
  for (const extra of injected) {
    const top = await user.fn('worldAct', { legendId: WIN_WORLD, token: null, action: { kind: 'tap', hotspotId: tap }, ...extra });
    const inner = await user.fn('worldAct', { legendId: WIN_WORLD, token: null, action: { kind: 'tap', hotspotId: tap, ...extra } });
    if (top.status !== 400 || inner.status !== 400) allRefused = false;
  }
  check('client-reported score, counts, status, user id and seed are refused (top level and inside the action)', allRefused);
  const untouched = (await owner.query('select score, wrong_answers, hint2_uses, slots_solved, status from runs where user_id = $1 and legend_id = $2', [userId, WIN_WORLD])).rows;
  check('the refused calls changed nothing in the run row', untouched.length === 1 && untouched[0].status === 'in_progress' && untouched[0].score === 0 && untouched[0].wrong_answers === 0 && untouched[0].hint2_uses === 0 && untouched[0].slots_solved === 0);

  const seen = await playRun(user, WIN_WORLD, begun.value, 'user-win');
  check(`user wins ${WIN_WORLD}`, seen.status === 'won', seen.problem);
  const rows = (await owner.query('select status, slots_solved, hint2_uses, wrong_answers, score, finished_at is not null as finished from runs where user_id = $1 and legend_id = $2', [userId, WIN_WORLD])).rows;
  const row = rows[0];
  const expected = score({ slotsSolved: seen.slots, curseBroken: true, hint2Uses: seen.hint2Charged, wrongAnswers: seen.wrong });
  check('runs row is won, finished, all slots solved', rows.length === 1 && row.status === 'won' && row.finished === true && row.slots_solved === seen.slots);
  check('stored counts are the ones the server counted (wrong answers, Hint 2 uses)', !!row && row.wrong_answers === seen.wrong && row.hint2_uses === seen.hint2Charged, `wrong ${row?.wrong_answers}, hint2 ${row?.hint2_uses}`);
  check('stored score matches score() from those counts, and the won summary agrees', !!row && row.score === expected && seen.ended?.score === expected, `score ${row?.score}, expected ${expected}`);

  // 3. one full-fear restart
  const startR = await user.fn<PlayResp>('startWorld', { legendId: RESTART_WORLD, token: null });
  check(`user starts ${RESTART_WORLD}`, startR.status === 200 && startR.value?.view.status === 'in_progress', `status ${startR.status}`);
  if (!startR.value) return;
  const oldRow = (await owner.query("select id, seed from runs where user_id = $1 and legend_id = $2 and status = 'in_progress'", [userId, RESTART_WORLD])).rows[0];
  const filled = await fillFear(user, RESTART_WORLD, startR.value);
  check('wrong answers and Hint 2 fill the fear meter: the server ends the Run as restarted', filled.status === 'restarted');
  const after = (await owner.query('select id, seed, status, finished_at is not null as finished, highest_fear, wrong_answers from runs where user_id = $1 and legend_id = $2 order by started_at', [userId, RESTART_WORLD])).rows;
  const oldAfter = after.find((r) => r.id === oldRow?.id);
  const fresh = after.find((r) => r.id !== oldRow?.id);
  check('old row ended as restarted with a finish time', oldAfter?.status === 'restarted' && oldAfter.finished === true, `rows ${after.length}`);
  check('a new row is in progress with a different seed', fresh?.status === 'in_progress' && fresh.finished === false && fresh.seed !== oldRow?.seed);
  check('stored wrong-answer count equals the answers the server refused', oldAfter?.wrong_answers === filled.wrong, `stored ${oldAfter?.wrong_answers}, seen ${filled.wrong}`);
  const view = await user.fn<PlayResp>('startWorld', { legendId: RESTART_WORLD, token: null });
  check('starting again resumes the new Run with fear 0 and no seed field', view.status === 200 && view.value?.view.fear === 0 && !JSON.stringify(view.value.view).includes('seed'));
  const list = await user.fn<{ status: string }[]>('listMyRunsFn');
  check('list my runs shows won, restarted and in progress', list.status === 200 && ['won', 'restarted', 'in_progress'].every((s) => list.value?.some((r) => r.status === s)));
}

const scrub = (e: unknown): string => (e instanceof Error ? e.message.replace(/postgres(ql)?:\/\/\S+/g, '[connection string]') : 'error');
try {
  if (process.argv.includes('--cleanup-file')) {
    // Recovery: remove the users listed (by exact id) in the temp file a crashed run left behind.
    for (const id of readFileSync(idFile, 'utf8').split('\n').filter(Boolean)) userIds.push(id);
  } else {
    await main();
  }
} catch (e) {
  check('the check ran to the end', false, scrub(e));
} finally {
  try {
    await cleanup();
  } catch (e) {
    check('cleanup', false, scrub(e));
  }
  await owner.end();
  await atlas.close();
}
console.log(failed ? `${failed} step(s) failed` : 'all play smoke steps passed');
process.exitCode = failed ? 1 : 0;
