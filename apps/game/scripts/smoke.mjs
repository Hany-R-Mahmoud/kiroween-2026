// Smoke check against the running dev server and the dev-skeleton-core branch (R8).
// Calls the real HTTP routes and the real server functions the way the browser does. Prints step results only:
// never a cookie, password, email or token. The test user's id is written to a file outside the repo for cleanup.
// Usage: node scripts/smoke.mjs [base]   (default http://localhost:3000)
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// seroval is what Start uses to encode server-function calls. Find the copy Start itself uses by walking pnpm's
// layout: react-start -> its start-client-core -> that package's seroval.
/** The node_modules folder that holds `pkgDir` (one level higher for a scoped package); its dependencies live there. */
const holder = (pkgDir) => (basename(dirname(pkgDir)).startsWith('@') ? dirname(dirname(pkgDir)) : dirname(pkgDir));
const sibling = (pkgDir, name) => realpathSync(join(holder(pkgDir), name));
const startDir = realpathSync(fileURLToPath(new URL('../node_modules/@tanstack/react-start', import.meta.url)));
const coreDir = sibling(startDir, '@tanstack/start-client-core');
const serovalDir = sibling(coreDir, 'seroval');
const serovalPkg = JSON.parse(readFileSync(join(serovalDir, 'package.json'), 'utf8'));
const serovalEntry = serovalPkg.exports?.['.']?.import?.default ?? serovalPkg.exports?.['.']?.import ?? serovalPkg.module;
const { toJSONAsync, fromCrossJSON } = await import(pathToFileURL(join(serovalDir, serovalEntry)).href);

const BASE = process.argv[2] ?? 'http://localhost:3000';
const ORIGIN = new URL(BASE).origin;
const jar = new Map();
const results = [];
let failed = 0;

function check(step, ok, note = '') {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${step}${note ? `  (${note})` : ''}`);
  if (!ok) failed++;
}

const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
function keepCookies(res) {
  for (const c of res.headers.getSetCookie()) {
    const [pair] = c.split(';');
    const i = pair.indexOf('=');
    const name = pair.slice(0, i).trim();
    const value = pair.slice(i + 1);
    if (/max-age=0|expires=thu, 01 jan 1970/i.test(c) || value === '') jar.delete(name);
    else jar.set(name, value);
  }
}

async function http(path, init = {}) {
  const res = await fetch(BASE + path, {
    redirect: 'manual',
    ...init,
    headers: { cookie: cookieHeader(), origin: ORIGIN, 'sec-fetch-site': 'same-origin', ...(init.headers ?? {}) },
  });
  keepCookies(res);
  return res;
}

const authPost = (endpoint, body) => http(`/game/api/auth/${endpoint}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

// server-function ids, read from the dev server's own module for src/server/functions.ts
const fnSource = await (await fetch(`${BASE}/game/src/server/functions.ts?tsr-shared=1`)).text();
const fnId = (name) => new RegExp(`export const ${name} = [\\s\\S]*?createClientRpc\\("([^"]+)"`).exec(fnSource)?.[1];

/** Calls a server function. Returns { status, value } on success or { status, message } on a thrown error. */
async function serverFn(name, data) {
  const id = fnId(name);
  if (!id) throw new Error(`no id for ${name}`);
  const body = data === undefined ? undefined : JSON.stringify(await toJSONAsync({ data }));
  const method = body === undefined ? 'GET' : 'POST';
  const res = await http(`/game/_serverFn/${id}`, {
    method,
    headers: { 'x-tsr-serverFn': 'true', accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) },
    ...(body ? { body } : {}),
  });
  const text = await res.text();
  try {
    // responses come back in seroval's cross-reference form, which is what Start's client decodes
    const decoded = fromCrossJSON(JSON.parse(text), { refs: new Map() });
    if (decoded && 'result' in decoded) return { status: res.status, value: decoded.result };
  } catch {
    // an error payload uses Start's own Error node; read its message from the JSON
  }
  const message = /"message".*?"s":"([^"]*)"/.exec(text)?.[1] ?? /"s":"([^"]+)"/.exec(text)?.[1] ?? '';
  return { status: res.status, message };
}

const strip = (html) => html.replace(/<script[\s\S]*?<\/script>/g, '');

// --- 1. guest hall and access rule
let res = await http('/game/');
let html = strip(await res.text());
const openDoors = [...html.matchAll(/aria-label="Enter ([^"]+)"/g)].map((m) => m[1]);
const lockedDoors = (html.match(/Locked: sign in to enter/g) ?? []).length;
check('guest hall: twelve legends, only the guest world open', res.status === 200 && openDoors.length === 1 && lockedDoors === 11, `open: ${openDoors.join(', ')}; locked: ${lockedDoors}`);
res = await http('/game/world/draugr');
check('guest asks for another world: redirect, no world data', res.status === 307 && !strip(await res.text()).includes('Draugr'), `status ${res.status}`);
let fn = await serverFn('startWorld', { legendId: 'draugr', token: null });
check('guest asks for another world through the play function: refused, no world data', fn.status !== 200 && fn.value === undefined, `status ${fn.status}`);
check('the removed run functions have no endpoint', fnId('startRunFn') === undefined && fnId('finishRunFn') === undefined);
fn = await serverFn('listMyRunsFn');
check('guest cannot list runs', fn.status === 401, `status ${fn.status}`);

// --- 2. sign up, sign out, sign in
const email = `smoke-${randomUUID()}@kiroween-smoke.invalid`;
const password = randomBytes(18).toString('base64url');
res = await authPost('sign-up/email', { name: '<b>x</b>', email, password });
check('sign-up with a markup display name is refused before Neon', res.status === 400, `status ${res.status}`);
res = await authPost('sign-up/email', { name: 'Smoke Tester', email, password });
check('sign up a test user', res.ok, `status ${res.status}`);
res = await authPost('sign-out', {});
check('sign out after sign-up', res.ok, `status ${res.status}`);
res = await authPost('sign-in/email', { email, password });
check('sign in with email and password', res.ok, `status ${res.status}`);
res = await http('/game/api/auth/get-session');
const session = await res.json().catch(() => null);
const userId = session?.user?.id;
check('get-session returns the verified user', typeof userId === 'string' && session?.user?.name === 'Smoke Tester');
if (userId) writeFileSync(join(tmpdir(), 'kiroween-smoke-user-id'), userId);
res = await http('/game/api/auth/admin/list-users');
check('an endpoint the app does not use is not forwarded', res.status === 404, `status ${res.status}`);

// --- 3. signed in: access and runs through the real server functions
res = await http('/game/world/draugr');
check('signed in: another world opens with its title', res.status === 200 && strip(await res.text()).includes('Draugr'), `status ${res.status}`);
const first = await serverFn('startWorld', { legendId: 'draugr', token: null });
check('start a world: a view with no seed and no token', first.status === 200 && first.value?.view?.status === 'in_progress' && first.value?.token === null && !JSON.stringify(first.value).includes('seed'), `status ${first.status}`);
const second = await serverFn('startWorld', { legendId: 'draugr', token: null });
check('start again: the run in progress resumes', second.status === 200 && JSON.stringify(second.value?.view) === JSON.stringify(first.value?.view), `status ${second.status}`);
fn = await serverFn('startWorld', { legendId: 'draugr', token: null, seed: 'mine' });
check('a client-sent seed is refused', fn.status === 400, `status ${fn.status}`);
fn = await serverFn('worldAct', { legendId: 'draugr', token: null, action: { kind: 'hint1', slotId: 'x' }, score: 99999 });
check('a client-sent score is refused', fn.status === 400, `status ${fn.status}`);
const list = await serverFn('listMyRunsFn');
const statuses = (list.value ?? []).map((r) => r.status).sort().join(',');
check('list my runs: one run in progress', list.status === 200 && statuses === 'in_progress', statuses);
const completed = await serverFn('myCompletedWorldsFn');
check('my completed worlds: none yet', completed.status === 200 && completed.value?.length === 0);
res = await http('/game/account');
html = strip(await res.text());
check('account page shows the user’s runs', res.status === 200 && html.includes('Your progress'));

// --- 4. sign out
res = await authPost('sign-out', {});
check('sign out', res.ok, `status ${res.status}`);
res = await http('/game/api/auth/get-session');
check('after sign-out the session is gone', (await res.text()).trim() === 'null');
res = await http('/game/world/draugr');
check('after sign-out another world is closed again', res.status === 307, `status ${res.status}`);

console.log(results.join('\n'));
console.log(failed ? `${failed} step(s) failed` : 'all smoke steps passed');
process.exitCode = failed ? 1 : 0;
