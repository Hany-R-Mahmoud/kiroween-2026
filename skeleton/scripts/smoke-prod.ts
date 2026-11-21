// Production smoke (task 10.2, Requirement 27, design "Production smoke"). Runs against a deployed site over https, through the
// same HTTP routes and server functions a browser uses. It never opens a database and never loads .env.
//   pnpm --filter @kiroween/skeleton exec tsx scripts/smoke-prod.ts <https base> [--skip-burst] [--only <step name or 1-6>]
// Steps: 1 headers, 2 guest, 3 user, 4 anchor, 5 leak, 6 burst. Prints PASS / FAIL / FINDING / SKIP lines and a summary.
// It prints header NAMES with yes/no, never a header value, cookie, password, token, receipt or seed. The only file it writes is
// the temporary user's id (no other data) in the OS temp folder, for the cleanup by exact id that the main agent does later.
import { randomBytes } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { atlasLegendFromModel, type AtlasLegend } from '../src/atlas/view.ts';
import { parseKeepersNoteOrThrow } from '../src/keepers/parse.ts';
import { loadLegends } from '../src/parser/loadLegends.ts';
import { rawId } from '../src/play/engine.ts';
import { TOO_MANY_TRIES_MESSAGE } from '../src/play/rateLimit.ts';
import { GAME_PROJECT_ORIGIN } from '../src/deploy/vercelRules.ts';
import { createRng } from '../src/rng/rng.ts';
import { score } from '../src/score/score.ts';
import type { Action, PlayView, SlotView } from '../src/play/types.ts';
import {
  BURST_ANSWERS, BURST_FINDING, cacheImmutable, chunkImports, classifyBurst, countId, countStatuses, findLeaks, firstMediaPath,
  hasContentEncoding, numberCandidates, parseArgs, rankOptions, resultLine, scriptPaths, securityHeaders, serverFnIds, stepEnabled,
  summarise, atlasText, yesNo, type StepName, type Verdict,
} from './smokeProdLib.ts';

const args = parseArgs(process.argv.slice(2));
if (!args.ok) {
  console.error(args.error);
  process.exit(2);
}
const BASE = args.base;
const ORIGIN = new URL(BASE).origin; // CSRF: the Origin header must equal the site's own origin
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ID_FILE = join(tmpdir(), 'kiroween-smoke-prod-user-id');
const GUEST_WORLD = 'banshee';
const USER_WORLD = 'baba-yaga'; // the scripted player wins it on every seed (docs/phase-4-notes/fairness.md)
const GUEST_ATTEMPTS = 8;
const WINDOW_WAIT_MS = 60_000;

const lines: string[] = [];
function report(v: Verdict, step: string, note = ''): void {
  const line = resultLine(v, step, note);
  lines.push(line);
  console.log(line);
}
const check = (step: string, ok: boolean, note = ''): void => report(ok ? 'PASS' : 'FAIL', step, note);
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const scrub = (e: unknown): string => (e instanceof Error ? e.message.replace(/https?:\/\/\S+/g, '[url]') : 'error');

// ---- Start's wire format (seroval), found the way scripts/smoke.mjs finds it ----------------------------------------------
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

// ---- a browser: its own cookie jar, in memory only --------------------------------------------------------------------------
/** Response bodies of calls that did not end a run, for the leak check. Held in memory only, never printed. */
const unfinishedBodies: string[] = [];
let fnIds: Map<string, string> | null = null;

class Browser {
  private jar = new Map<string, string>();
  /** `base` defaults to the site under test; the key step also talks to the game project's own alias. */
  constructor(private readonly base: string = BASE) {}
  private cookies(): string {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  async http(path: string, init: RequestInit = {}): Promise<Response> {
    const res = await fetch(this.base + path, {
      redirect: 'manual',
      ...init,
      headers: { cookie: this.cookies(), origin: new URL(this.base).origin, 'sec-fetch-site': 'same-origin', ...((init.headers as Record<string, string>) ?? {}) },
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
  /** Calls a server function. `value` on success; on an error the HTTP status and Start's fixed message only. */
  async fn<T = any>(name: string, data?: unknown): Promise<{ status: number; value?: T; message?: string }> {
    const id = fnIds?.get(name);
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
      if (decoded && 'result' in decoded) {
        const value = decoded.result as T;
        if (!(value && typeof value === 'object' && 'ended' in value && (value as { ended: unknown }).ended)) unfinishedBodies.push(text);
        return { status: res.status, value };
      }
    } catch {
      // an error payload: read only its message below
    }
    unfinishedBodies.push(text);
    const message = /"message".*?"s":"([^"]*)"/.exec(text)?.[1] ?? /"s":"([^"]+)"/.exec(text)?.[1] ?? '';
    return { status: res.status, message };
  }
}

/** Finds the ids of the server functions in the game's built client files (the names are not in a production build). */
async function resolveFnIds(): Promise<Map<string, string> | null> {
  const html = await (await fetch(`${BASE}/game/`)).text();
  const seen = new Set<string>();
  const queue = scriptPaths(html).map((p) => new URL(p, `${BASE}/game/`).href);
  for (let n = 0; queue.length && n < 60; n++) {
    const url = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);
    const res = await fetch(url);
    if (!res.ok) continue;
    const js = await res.text();
    const ids = serverFnIds(js);
    if (ids) return ids;
    for (const next of chunkImports(js)) queue.push(new URL(next, url).href);
  }
  return null;
}

// ---- content as a player would read the atlas -------------------------------------------------------------------------------------
const loaded = loadLegends(join(ROOT, 'content/legends'));
if (loaded.errors.length) {
  console.error('the content files do not parse; stopping before any request');
  process.exit(2);
}
const legendModels = new Map(loaded.legends.map((l) => [l.id, l]));
const atlasById = new Map<string, AtlasLegend>(loaded.legends.map((l) => [l.id, atlasLegendFromModel(l)]));
const keepers = parseKeepersNoteOrThrow(readFileSync(join(ROOT, 'content/keepers-note.md'), 'utf8')).note;
const keepersParagraphs = keepers.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

// ---- world play through the server functions ----------------------------------------------------------------------------------------
interface PlayResp {
  view: PlayView;
  reply: { kind: string; correct?: boolean; charged?: boolean; anchor?: string } | null;
  ended: { status: 'won' | 'restarted'; score: number; slotsSolved: number } | null;
  token: string | null;
}
interface Seen {
  status: 'won' | 'restarted' | 'stuck';
  wrong: number;
  hint2Charged: number;
  slots: number;
  ended: PlayResp['ended'];
  token: string | null;
  problem: string;
}
const hotspotIds = (legendId: string): string[] => legendModels.get(legendId)!.world.hotspots.map((h) => rawId(legendId, h.id));

async function playRun(b: Browser, legendId: string, first: PlayResp, label: string): Promise<Seen> {
  const legend = atlasById.get(legendId)!;
  const seen: Seen = { status: 'stuck', wrong: 0, hint2Charged: 0, slots: first.view.slots.length, ended: null, token: first.token, problem: '' };
  let view = first.view;
  const act = async (action: Action): Promise<PlayResp | null> => {
    const r = await b.fn<PlayResp>('worldAct', { legendId, token: seen.token, action });
    if (r.status !== 200 || !r.value) throw new Error(`worldAct refused: status ${r.status}`);
    seen.token = r.value.token;
    if (r.value.ended) {
      seen.ended = r.value.ended;
      seen.status = r.value.ended.status;
      return null;
    }
    view = r.value.view;
    return r.value;
  };
  for (const id of hotspotIds(legendId)) if (!(await act({ kind: 'tap', hotspotId: id }))) return seen;
  const order = [...view.slots].sort((a, c) => Number(a.final) - Number(c.final)).map((s) => s.slotId);
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

/** Finishes the tutorial from the Keeper's Note text. Returns whether it ended solved. */
async function doTutorial(b: Browser): Promise<boolean> {
  const start = await b.fn<{ token: string }>('startTutorial', { token: null });
  if (start.status !== 200 || !start.value) return false;
  let token = start.value.token;
  const drawer = await b.fn<{ token: string; reply: { question?: string } }>('tutorialAct', { token, action: { kind: 'drawer' } });
  if (drawer.status !== 200 || !drawer.value) return false;
  token = drawer.value.token;
  const hint = await b.fn<{ token: string; reply: { anchor?: string } }>('tutorialAct', { token, action: { kind: 'hint2' } });
  if (hint.status !== 200 || !hint.value || hint.value.reply.anchor !== keepers.anchor) return false;
  token = hint.value.token;
  for (const guess of numberCandidates(drawer.value.reply.question ?? '', keepersParagraphs)) {
    const r = await b.fn<{ token: string; reply: { correct?: boolean } }>('tutorialAct', { token, action: { kind: 'answer', value: guess } });
    if (r.status !== 200 || !r.value) return false;
    token = r.value.token;
    if (r.value.reply.correct) return true;
  }
  return false;
}

// ---- steps ------------------------------------------------------------------------------------------------------------------------------
async function stepHeaders(): Promise<void> {
  const pages: [string, string][] = [['/', 'atlas'], ['/game/', 'game']];
  const html: string[] = [];
  for (const [path, label] of pages) {
    const res = await fetch(BASE + path, { redirect: 'manual' });
    const ok = res.status === 200;
    const sec = securityHeaders(res.headers);
    check(`headers ${path} (${label})`, ok && Object.values(sec).every(Boolean), `status ${res.status}; ${yesNo(sec)}`);
    html.push(await res.text());
  }
  const media = firstMediaPath(html[0]!) ?? firstMediaPath(html[1]!);
  if (!media) check('headers /media file: Cache-Control immutable', false, 'no /media file found on / or /game/');
  else {
    const res = await fetch(BASE + media);
    await res.body?.cancel();
    check('headers /media file: Cache-Control immutable', res.ok && cacheImmutable(res.headers), `status ${res.status}; Cache-Control immutable ${cacheImmutable(res.headers) ? 'yes' : 'no'}`);
  }
  for (const [i, [path, label]] of pages.entries()) {
    const js = scriptPaths(html[i]!)[0];
    if (!js) {
      check(`headers JS file of ${label}: Content-Encoding`, false, 'no script found on the page');
      continue;
    }
    const res = await fetch(new URL(js, BASE + path).href);
    await res.body?.cancel();
    check(`headers JS file of ${label}: Content-Encoding`, res.ok && hasContentEncoding(res.headers), `status ${res.status}; Content-Encoding ${hasContentEncoding(res.headers) ? 'yes' : 'no'}`);
  }
}

async function stepGuest(): Promise<void> {
  const guest = new Browser();
  // The Hall's doors are drawn in the browser (painted scene), so the page HTML holds none; the door states come from
  // the Hall's own server function, the same data the browser draws them from.
  const hall = await guest.http('/game/');
  const data = await guest.fn<{ doors?: { id: string; open: boolean }[] }>('getHall');
  const doors = data.value?.doors ?? [];
  const open = doors.filter((d) => d.open).length;
  const locked = doors.length - open;
  check('guest: the Hall loads with one open door and eleven locked', hall.status === 200 && data.status === 200 && open === 1 && locked === 11 && doors.find((d) => d.open)?.id === 'banshee', `status ${hall.status}/${data.status}; open ${open}; locked ${locked}`);
  check('guest finishes the tutorial from the Keeper\'s Note text', await doTutorial(guest));
  let won: Seen | null = null;
  let attempts = 0;
  const start = await guest.fn<PlayResp>('startWorld', { legendId: GUEST_WORLD, token: null });
  check(`guest starts ${GUEST_WORLD}`, start.status === 200 && !!start.value?.view, `status ${start.status}`);
  let first = start.value ?? null;
  while (first && attempts < GUEST_ATTEMPTS && !won) {
    attempts += 1;
    const seen = await playRun(guest, GUEST_WORLD, first, `guest-${attempts}`);
    if (seen.status === 'won') won = seen;
    else if (seen.status === 'restarted') first = (await guest.fn<PlayResp>('startWorld', { legendId: GUEST_WORLD, token: seen.token })).value ?? null;
    else break;
  }
  check(`guest wins ${GUEST_WORLD}`, won !== null, `attempts ${attempts}`);
}

async function stepUser(): Promise<void> {
  const user = new Browser();
  const email = `kw-smoke-${randomBytes(9).toString('hex')}@example.com`;
  const password = randomBytes(18).toString('base64url'); // in memory only
  let res = await user.auth('sign-up/email', { name: 'Smoke Player', email, password });
  check('user: sign up with a throw-away example.com address', res.ok, `status ${res.status}`);
  if (!res.ok) return;
  const session = (await (await user.http('/game/api/auth/get-session')).json().catch(() => null)) as { user?: { id?: string } } | null;
  const userId = session?.user?.id;
  if (typeof userId !== 'string') return check('user: get-session returns the user id', false);
  writeFileSync(ID_FILE, userId, { mode: 0o600 });
  console.log(`INFO  user id file written (${ID_FILE})`);

  const locked = await user.fn(`startWorld`, { legendId: USER_WORLD, token: null });
  check('user: starting a World before the tutorial is refused with the tutorial-required message', locked.status === 403 && (locked.message ?? '').includes('Do the tutorial first.'), `status ${locked.status}`);
  check('user: finishes the tutorial', await doTutorial(user));
  const begun = await user.fn<PlayResp>('startWorld', { legendId: USER_WORLD, token: null });
  check(`user: starts ${USER_WORLD} after the tutorial`, begun.status === 200 && begun.value?.view.status === 'in_progress', `status ${begun.status}`);
  if (!begun.value) return;
  const seen = await playRun(user, USER_WORLD, begun.value, 'user-win');
  check(`user: wins ${USER_WORLD}`, seen.status === 'won', seen.problem);
  const expected = score({ slotsSolved: seen.slots, curseBroken: true, hint2Uses: seen.hint2Charged, wrongAnswers: seen.wrong });
  const list = await user.fn<{ legendId: string; status: string; slotsSolved: number; score: number }[]>('listMyRunsFn');
  const row = list.value?.find((r) => r.legendId === USER_WORLD && r.status === 'won');
  check('user: the server\'s own run list shows the won row with the score of the run', !!row && row.score === expected && row.score === seen.ended?.score && row.slotsSolved === seen.slots, `status ${list.status}; score match ${row ? (row.score === expected ? 'yes' : 'no') : 'no row'}`);
  res = await user.auth('sign-out', {});
  check('user: sign out', res.ok, `status ${res.status}`);
}

async function stepAnchor(): Promise<void> {
  const res = await fetch(`${BASE}/anchor/${keepers.anchor}`, { redirect: 'manual' });
  await res.body?.cancel();
  const where = res.headers.get('location');
  if (!where || res.status < 300 || res.status >= 400) return check('anchor: /anchor/keepers-note--ch-1 redirects to the Keeper\'s Note page', false, `status ${res.status}`);
  const page = await fetch(new URL(where.split('#')[0]!, BASE).href);
  const html = await page.text();
  check('anchor: the Keeper\'s Note page holds the anchor exactly once', page.status === 200 && countId(html, keepers.anchor) === 1 && where.endsWith(`#${keepers.anchor}`), `status ${page.status}; count ${countId(html, keepers.anchor)}`);
}

async function stepLeak(): Promise<void> {
  // A short fresh probe (a guest starts a World and taps every hotspot), plus every unfinished-run response from steps 2 and 3.
  const probe = new Browser();
  const start = await probe.fn<PlayResp>('startWorld', { legendId: GUEST_WORLD, token: null });
  let token = start.value?.token ?? null;
  for (const id of start.value ? hotspotIds(GUEST_WORLD) : []) {
    const r = await probe.fn<PlayResp>('worldAct', { legendId: GUEST_WORLD, token, action: { kind: 'tap', hotspotId: id } });
    token = r.value?.token ?? token;
  }
  const bad = new Set(unfinishedBodies.flatMap(findLeaks));
  check('leak: no response before the end of a run holds correctIndex, trueVersionId, trueLead or seed', unfinishedBodies.length > 0 && bad.size === 0, `${unfinishedBodies.length} responses checked${bad.size ? '; found ' + [...bad].join(', ') : ''}`);
}

async function stepBurst(): Promise<void> {
  console.log(`INFO  waiting ${WINDOW_WAIT_MS / 1000} s so the rate-limit window is fresh`);
  await sleep(WINDOW_WAIT_MS);
  const client = new Browser();
  const start = await client.fn<{ token: string }>('startTutorial', { token: null });
  if (start.status !== 200 || !start.value) return check('burst: a guest tutorial session starts', false, `status ${start.status}`);
  const statuses: number[] = [];
  let fixedText = false;
  for (let i = 0; i < BURST_ANSWERS; i++) {
    const r = await client.fn('tutorialAct', { token: start.value.token, action: { kind: 'answer', value: '0' } });
    statuses.push(r.status);
    if (r.status === 429) {
      fixedText = (r.message ?? '') === TOO_MANY_TRIES_MESSAGE;
      break;
    }
  }
  const out = classifyBurst(statuses);
  if (out.kind === 'pass') check('burst: a 429 arrives within the first 40 answers', true, `at answer ${out.at}; fixed text ${fixedText ? 'yes' : 'no'}; statuses ${countStatuses(statuses)}`);
  else report('FINDING', `burst: no 429 in ${BURST_ANSWERS} answers: ${BURST_FINDING}`, `statuses ${countStatuses(statuses)}`);
  console.log(`INFO  waiting ${WINDOW_WAIT_MS / 1000} s so the window is clear`);
  await sleep(WINDOW_WAIT_MS);
}

/**
 * Finding S1: which address keys the tutorial limit behind the atlas proxy. Exhaust the limit through the site under test,
 * then answer straight at the game alias from the same machine. Refused there too: the key is this visitor's own address
 * (not a shared proxy address). Accepted there: retry in the other direction once; still accepted is a FINDING to stop on.
 * Prints statuses only, never an address.
 */
async function exhaust(via: Browser, token: string): Promise<number | null> {
  for (let i = 1; i <= BURST_ANSWERS; i++) if ((await via.fn('tutorialAct', { token, action: { kind: 'answer', value: '0' } })).status === 429) return i;
  return null;
}
async function refusedCount(via: Browser, token: string, n = 5): Promise<number> {
  let refused = 0;
  for (let i = 0; i < n; i++) if ((await via.fn('tutorialAct', { token, action: { kind: 'answer', value: '0' } })).status === 429) refused++;
  return refused;
}
async function stepKey(): Promise<void> {
  if (new URL(BASE).origin === GAME_PROJECT_ORIGIN) return void report('SKIP', 'key: run against the atlas origin, not the game alias');
  for (const [first, second, label] of [[new Browser(), new Browser(GAME_PROJECT_ORIGIN), 'proxy then alias'], [new Browser(GAME_PROJECT_ORIGIN), new Browser(), 'alias then proxy']] as const) {
    console.log(`INFO  waiting ${WINDOW_WAIT_MS / 1000} s so the rate-limit window is fresh`);
    await sleep(WINDOW_WAIT_MS);
    const t1 = await first.fn<{ token: string }>('startTutorial', { token: null });
    const t2 = await second.fn<{ token: string }>('startTutorial', { token: null });
    if (!t1.value || !t2.value) return check('key: guest tutorial sessions start on both addresses', false, `status ${t1.status}/${t2.status}`);
    const at = await exhaust(first, t1.value.token);
    if (at === null) {
      report('FINDING', `key (${label}): no 429 in ${BURST_ANSWERS} answers: ${BURST_FINDING}`);
      continue;
    }
    const refused = await refusedCount(second, t2.value.token);
    if (refused === 5) return check('key: the limit behind the proxy is keyed on the visitor, not a shared proxy address', true, `${label}: 429 at answer ${at}; then 5 of 5 refused on the other address`);
    console.log(`INFO  key (${label}): 429 at answer ${at}; then ${refused} of 5 refused on the other address`);
  }
  report('FINDING', 'key: the proxy and direct requests did not share a bucket in either order: visitors behind the proxy may share one key, or the requests reached different instances (stop and review)');
  console.log(`INFO  waiting ${WINDOW_WAIT_MS / 1000} s so the window is clear`);
  await sleep(WINDOW_WAIT_MS);
}

// ---- run ------------------------------------------------------------------------------------------------------------------------------------
const STEPS: [StepName, () => Promise<void>][] = [['headers', stepHeaders], ['guest', stepGuest], ['user', stepUser], ['anchor', stepAnchor], ['leak', stepLeak], ['burst', stepBurst], ['key', stepKey]];
const needsIds = (s: StepName): boolean => s === 'guest' || s === 'user' || s === 'leak' || s === 'burst' || s === 'key';
for (const [name, run] of STEPS) {
  if (!stepEnabled(name, args)) {
    if (args.only === null) report('SKIP', `step ${name}`, 'flag');
    continue;
  }
  try {
    if (needsIds(name) && !fnIds) {
      fnIds = await resolveFnIds();
      if (!fnIds) {
        check('server function ids found in the built game files', false);
        continue;
      }
    }
    await run();
  } catch (e) {
    check(`step ${name} ran to the end`, false, scrub(e));
  }
}
console.log(summarise(lines));
process.exitCode = lines.some((l) => l.startsWith('FAIL  ')) ? 1 : 0;
