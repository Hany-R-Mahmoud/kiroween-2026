// Headless Chrome checks for the game (task 11.2, requirements 8.8, 13.15, 14.2, 14.3).
//
// Driver: no puppeteer or playwright is installed and nothing can be added, so this talks to Chrome over the DevTools
// protocol with Node's built-in WebSocket (Node 22+). Chrome is found on the usual macOS path or in CHROME_BIN.
//
// Run against built servers (the game build and the atlas build, which serves /media):
//   node apps/game/scripts/browser-check.mjs --game http://localhost:3200 --atlas http://localhost:3201 \
//        [--arabic http://localhost:3202] [--only keyboard,touch,motion,timing,rtl] [--shots .debug/screens] [--json out.json]
// Layout screenshots (Phase 5, task 4.4): needs a DEV server (the ?layout=1 overlay is compiled out of builds) with the database:
//   node apps/game/scripts/browser-check.mjs --only layout [--base http://localhost:3000] [--cookie-env KW_COOKIE] [--guest-world banshee]
// One PNG per scene in .debug/screens/ (git-ignored). Worlds other than the guest world need a signed-in user who finished the
// tutorial: put that user's Cookie header value in an environment variable and pass its NAME with --cookie-env. The value is
// sent as a request header and never printed. Without it, those Worlds are reported as SKIP.
// The game server must run with ATLAS_ORIGIN set to the atlas origin. The script is a guest: it uses a fresh browser
// context per scenario, reads only what a browser can read (page text, atlas pages) and prints no cookie or token.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const GAME = arg('game', 'http://localhost:3200').replace(/\/+$/, '');
const ATLAS = arg('atlas', 'http://localhost:3201').replace(/\/+$/, '');
/** An atlas page, never a game page: on production the game is served under /game on the atlas origin. */
const isAtlasPage = (url) => url.startsWith(ATLAS) && !new URL(url).pathname.startsWith('/game');
const ARABIC = arg('arabic', '').replace(/\/+$/, '');
const ONLY = new Set(arg('only', 'keyboard,touch,motion,timing,rtl').split(','));
const BASE = arg('base', 'http://localhost:3000').replace(/\/+$/, '');
const COOKIE_ENV = arg('cookie-env', '');
// --signup-temp: the keyboard pass runs signed in as a throw-away example.com user created inside the page (address and
// password are generated in the page and never leave it; only the HTTP status is printed). The caller deletes the user.
const SIGNUP_TEMP = process.argv.includes('--signup-temp');
const GUEST_WORLD = arg('guest-world', 'banshee');
const LAYOUT_DIR = join(ROOT, '.debug/screens');
// Screenshots are debug output: default to the git-ignored .debug/ folder, never docs/ (Phase 5 rule).
const SHOTS = join(ROOT, arg('shots', '.debug/screens'));
const JSON_OUT = arg('json', '');
const MAX_WORLD_RUNS = Number(arg('runs', '5'));
const CHROME = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => p && existsSync(p));
if (!CHROME) {
  console.error('No Chrome binary found. Set CHROME_BIN.');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const numbers = {};
let failed = 0;
function check(step, ok, note = '') {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${step}${note ? `  (${note})` : ''}`;
  results.push(line);
  console.log(line);
  if (!ok) failed++;
}
const info = (line) => {
  results.push(`INFO  ${line}`);
  console.log(`INFO  ${line}`);
};

// ---- DevTools protocol over WebSocket ---------------------------------------------------------------------------------
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Set();
    ws.addEventListener('message', (m) => {
      const msg = JSON.parse(String(m.data));
      if (msg.id) {
        const p = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (p) msg.error ? p.reject(new Error(`${p.method}: ${msg.error.message}`)) : p.resolve(msg.result ?? {});
      } else for (const h of this.handlers) h(msg);
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject, method }));
  }
  on(fn) {
    this.handlers.add(fn);
    return () => this.handlers.delete(fn);
  }
}

let chromeProc;
let userDir;
async function launch() {
  userDir = mkdtempSync(join(tmpdir(), 'kw-chrome-'));
  chromeProc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${userDir}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
  const file = join(userDir, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !existsSync(file); i++) await sleep(100);
  if (!existsSync(file)) throw new Error('Chrome did not start');
  const [port, path] = readFileSync(file, 'utf8').trim().split('\n');
  const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', rej);
  });
  return new Cdp(ws);
}
function shutdown() {
  try {
    chromeProc?.kill();
  } catch {}
  try {
    if (userDir) rmSync(userDir, { recursive: true, force: true });
  } catch {}
}

const KEYS = {
  Tab: { key: 'Tab', code: 'Tab', vk: 9 },
  Enter: { key: 'Enter', code: 'Enter', vk: 13, text: '\r' },
  Space: { key: ' ', code: 'Space', vk: 32, text: ' ' },
  Escape: { key: 'Escape', code: 'Escape', vk: 27 },
  Backspace: { key: 'Backspace', code: 'Backspace', vk: 8 },
  PageUp: { key: 'PageUp', code: 'PageUp', vk: 33 },
  PageDown: { key: 'PageDown', code: 'PageDown', vk: 34 },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', vk: 37 },
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', vk: 39 },
};

class Page {
  static async open(cdp, opts = {}) {
    const { browserContextId } = await cdp.send('Target.createBrowserContext', { disposeOnDetach: true });
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', browserContextId });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const p = new Page(cdp, sessionId, targetId, browserContextId);
    for (const d of ['Page', 'Runtime', 'Network']) await p.send(`${d}.enable`);
    if (opts.width) {
      await p.send('Emulation.setDeviceMetricsOverride', { width: opts.width, height: opts.height ?? 844, deviceScaleFactor: opts.dpr ?? 2, mobile: !!opts.mobile });
      if (opts.touch) await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    } else await p.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    if (opts.reduced) await p.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    if (opts.init) await p.send('Page.addScriptToEvaluateOnNewDocument', { source: opts.init });
    return p;
  }
  constructor(cdp, sessionId, targetId, ctx) {
    this.cdp = cdp;
    this.sid = sessionId;
    this.targetId = targetId;
    this.ctx = ctx;
  }
  send(method, params = {}) {
    return this.cdp.send(method, params, this.sid);
  }
  /** Subscribes to this page's protocol events. */
  on(fn) {
    return this.cdp.on((m) => m.sessionId === this.sid && fn(m));
  }
  async ev(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(`page error: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result.value;
  }
  async waitFor(expr, timeout = 15000, label = expr) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (await this.ev(`!!(${expr})`).catch(() => false)) return true;
      await sleep(80);
    }
    throw new Error(`timeout waiting for ${label}`);
  }
  async goto(url, ready = '.scene-viewport') {
    await this.send('Page.navigate', { url });
    // Hydrated: React has attached its fiber to the viewport (a button works only after that).
    await this.waitFor(`(() => { const e = document.querySelector(${JSON.stringify(ready)}); return e && Object.keys(e).some((k) => k.startsWith('__reactFiber')); })()`, 60000, `hydrated ${ready}`);
  }
  async key(name, mods = 0) {
    const k = typeof name === 'string' && KEYS[name] ? KEYS[name] : name;
    const base = { key: k.key, code: k.code, windowsVirtualKeyCode: k.vk, nativeVirtualKeyCode: k.vk, modifiers: mods };
    await this.send('Input.dispatchKeyEvent', { type: k.text ? 'keyDown' : 'rawKeyDown', ...base, ...(k.text ? { text: k.text, unmodifiedText: k.text } : {}) });
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    await sleep(25);
  }
  async typeText(text) {
    for (const ch of text) {
      const up = ch.toUpperCase();
      const code = /\d/.test(ch) ? `Digit${ch}` : /[a-z]/i.test(ch) ? `Key${up}` : 'Space';
      await this.key({ key: ch, code, vk: up.charCodeAt(0), text: ch });
    }
  }
  /** Marks the element an expression returns, then presses Tab until it has focus. Keyboard only. */
  async tabTo(elementExpr, max = 260) {
    await this.ev(`(() => { document.querySelectorAll('[data-bc]').forEach((e) => e.removeAttribute('data-bc')); const e = (${elementExpr}); if (e) e.setAttribute('data-bc', '1'); return !!e; })()`).then((ok) => {
      if (!ok) throw new Error(`tabTo: no element for ${elementExpr}`);
    });
    for (let i = 0; i < max; i++) {
      if (await this.ev(`document.activeElement?.hasAttribute('data-bc') === true`)) {
        await this.ev(`document.querySelectorAll('[data-bc]').forEach((e) => e.removeAttribute('data-bc'))`);
        return i;
      }
      await this.key('Tab');
    }
    throw new Error(`tabTo: not reached in ${max} Tab presses: ${elementExpr}`);
  }
  async shot(file, clip) {
    // a clip is in page coordinates, so add the scroll offset to a viewport rectangle
    // headless Chrome can stall a capture of a page that is not in front (e.g. after another tab was opened and closed)
    await this.send('Page.bringToFront').catch(() => {});
    const off = clip ? await this.ev(`({ x: scrollX, y: scrollY })`) : null;
    const { data } = await this.send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { x: clip.x + off.x, y: clip.y + off.y, width: clip.width, height: clip.height, scale: 2 } } : {}) });
    mkdirSync(SHOTS, { recursive: true });
    writeFileSync(join(SHOTS, file), Buffer.from(data, 'base64'));
  }
  async touch(type, points) {
    await this.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p, i) => ({ x: p.x, y: p.y, id: i })) });
  }
  async drag(x1, y, x2, steps = 12) {
    await this.touch('touchStart', [{ x: x1, y }]);
    for (let i = 1; i <= steps; i++) {
      await this.touch('touchMove', [{ x: x1 + ((x2 - x1) * i) / steps, y }]);
      await sleep(16);
    }
    await this.touch('touchEnd', []);
    await sleep(60);
  }
  async tap(x, y) {
    await this.touch('touchStart', [{ x, y }]);
    await sleep(40);
    await this.touch('touchEnd', []);
    await sleep(120);
  }
  async close() {
    await this.cdp.send('Target.disposeBrowserContext', { browserContextId: this.ctx }).catch(() => {});
  }
}

// In-page counters for input that is not the keyboard. `click` with detail 0 is the keyboard's own button activation.
const MOUSE_WATCH = `(() => {
  const bump = (t) => { try { const o = JSON.parse(sessionStorage.getItem('bc-mouse') || '{}'); o[t] = (o[t] || 0) + 1; sessionStorage.setItem('bc-mouse', JSON.stringify(o)); } catch {} };
  for (const t of ['mousedown', 'mouseup', 'mousemove', 'pointerdown', 'pointermove', 'pointerup', 'touchstart', 'wheel', 'contextmenu', 'dblclick'])
    addEventListener(t, () => bump(t), true);
  addEventListener('click', (e) => { if (e.detail > 0 || (e.pointerType && e.pointerType !== '')) bump('click'); }, true);
})()`;

// ---- atlas text, read the way a player reads the atlas tab ---------------------------------------------------------------
const decode = (s) => s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
const textOf = (html) => decode(html.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const atlasCache = new Map();
/** The text of the section with this id on the atlas page the anchor URL leads to (a chapter, a version, or the versions block). */
async function atlasSectionText(href) {
  if (atlasCache.has(href)) return atlasCache.get(href);
  const res = await fetch(href, { redirect: 'follow' });
  const html = await res.text();
  const u = new URL(href);
  const anchor = decodeURIComponent(u.hash ? u.hash.slice(1) : (u.pathname.split('/').pop() ?? ''));
  const i = html.search(new RegExp(`id="${anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
  let text;
  if (i < 0) text = textOf(html);
  else {
    const start = html.lastIndexOf('<', i);
    const rest = html.slice(start + 1);
    const next = rest.search(/<(section|article)\b[^>]*\sid="[^"]+"/);
    text = textOf(html.slice(start, next < 0 ? undefined : start + 1 + next));
  }
  atlasCache.set(href, text);
  return text;
}

// ---- the reading rule (the overlap reader of skeleton/test/helpers/playFromAtlas.ts, as in skeleton/scripts/smoke-play.ts) ----
function normalise(s) {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[*_]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w)).join(' ');
}
const NEAR = 80;
const padded = (s) => ` ${normalise(s)} `;
const occurrences = (hay, needle) => {
  const out = [];
  if (needle.trim() === '') return out;
  for (let at = hay.indexOf(needle); at >= 0; at = hay.indexOf(needle, at + 1)) out.push(at);
  return out;
};
const STOP = new Set(['the', 'that', 'this', 'with', 'from', 'were', 'was', 'for', 'and', 'but', 'are', 'has', 'have', 'had', 'its', 'her', 'his', 'their', 'who', 'which', 'what', 'when', 'where', 'said', 'says', 'into', 'than', 'then', 'one', 'also', 'told', 'named', 'called']);
const contentWords = (s) => normalise(s).split(' ').filter((w) => w.length >= 3 && !STOP.has(w));
function overlap(question, option, hay) {
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
function rankOptions(question, options, text) {
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
  return options.map((_, i) => i).sort((a, b) => key[b] - key[a] || a - b);
}
const NUMBER_WORDS = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split(' ');
const NUMERIC = new RegExp(`\\b(\\d{1,4}|${NUMBER_WORDS.join('|')})\\b`, 'gi');
function numberCandidates(question, text) {
  const q = new Set(contentWords(question));
  const sentences = text.split(/(?<=[.!?])\s+/);
  const scored = sentences.map((s) => ({ s, n: contentWords(s).filter((w) => q.has(w)).length })).sort((a, b) => b.n - a.n);
  const out = [];
  for (const { s } of scored) for (const m of s.matchAll(NUMERIC)) if (!out.includes(m[1])) out.push(m[1]);
  return out.slice(0, 12);
}

// ---- page expressions ------------------------------------------------------------------------------------------------------
const BTN = (re, scope = 'document') => `[...${scope}.querySelectorAll('button')].find((e) => ${re}.test(e.textContent) && !e.disabled)`;
const HOTSPOT = (id) => `document.querySelector('button[data-hotspot="${id}"]')`;
const panX = `new DOMMatrix(getComputedStyle(document.querySelector('.scene-stage')).transform).m41`;
const mouseCounts = (p) => p.ev(`JSON.parse(sessionStorage.getItem('bc-mouse') || '{}')`);

/** Taps (Enter) every hotspot of every scene with the keyboard, scene by scene (PageDown inside the viewer). */
async function tapEverything(p) {
  const scenes = await p.ev(`document.querySelectorAll('.scene-tab').length || 1`);
  const current = () => p.ev(`[...document.querySelectorAll('.scene-tab')].findIndex((e) => e.getAttribute('aria-current') === 'true')`);
  // back to scene 1 with PageUp from inside the viewer
  while ((await current()) > 0) {
    await p.tabTo(`document.querySelector('.scene-viewport')`);
    await p.key('PageUp');
    await sleep(150);
  }
  for (let s = 0; s < scenes; s++) {
    const ids = await p.ev(`[...document.querySelectorAll('button[data-hotspot]')].map((e) => e.dataset.hotspot)`);
    for (const id of ids) {
      await p.tabTo(HOTSPOT(id));
      await p.key('Enter');
      await sleep(60);
    }
    if (s < scenes - 1) {
      await p.tabTo(`document.querySelector('.scene-viewport')`);
      await p.key('PageDown');
      await sleep(200);
    }
  }
  await waitIdle(p);
}
async function waitIdle(p) {
  await sleep(250);
  await p.waitFor(`document.querySelector('.world-play')?.getAttribute('aria-busy') !== 'true'`, 40000, 'run idle');
}

const stateOf = (p) =>
  p.ev(`(() => {
    const lis = [...document.querySelectorAll('li.world-slot')];
    return {
      ending: !!document.querySelector('.world-ending'),
      restart: !!document.querySelector('#world-restart-title'),
      states: lis.map((l) => l.dataset.state),
      follow: [...document.querySelectorAll('.world-lead button')].filter((b) => !b.disabled && /\\S/.test(b.textContent)).length,
      question: document.querySelector('.world-question')?.textContent ?? null,
      busy: document.querySelector('.world-play')?.getAttribute('aria-busy') === 'true',
    };
  })()`);

/** Selects a World tab with the keyboard: Tab to the selected tab, then the arrow keys (the tabs pattern selects as focus moves). */
async function showTab(p, id) {
  const sel = `document.getElementById('world-tab-${id}')?.getAttribute('aria-selected') === 'true'`;
  if (await p.ev(sel)) return;
  await p.tabTo(`document.querySelector('[role="tab"][aria-selected="true"]')`);
  for (let i = 0; i < 4 && !(await p.ev(sel)); i++) await p.key('ArrowRight');
  await sleep(100);
}

/** Plays one World with the keyboard only, from the first scene to a broken curse. Returns what happened. */
async function playWorldByKeyboard(p, logPrefix) {
  const out = { won: false, runs: 0, hint2: 0, wrong: 0, atlasTabs: 0, restarts: 0, problem: '' };
  const tabsSeen = new Set();
  const off = p.cdp.on((m) => {
    if (m.method === 'Target.targetCreated' && m.params.targetInfo.type === 'page' && isAtlasPage(m.params.targetInfo.url)) tabsSeen.add(m.params.targetInfo.targetId);
  });
  await p.cdp.send('Target.setDiscoverTargets', { discover: true });
  for (let run = 1; run <= MAX_WORLD_RUNS && !out.won; run++) {
    out.runs = run;
    await p.waitFor(`document.querySelector('.world-fear')`, 30000, 'world view');
    await tapEverything(p);
    let stuck = 0;
    for (let step = 0; step < 60; step++) {
      const st = await stateOf(p);
      if (st.ending) {
        out.won = true;
        break;
      }
      if (st.restart) {
        out.restarts += 1;
        await p.tabTo(BTN(/Try again/i));
        await p.key('Enter');
        await sleep(300);
        break;
      }
      const openIdx = st.states.indexOf('open');
      if (openIdx >= 0) {
        stuck = 0;
        // The one hint area serves the active puzzle, which is the first open slot (`activeSlot`), i.e. openIdx.
        const area = `document.querySelector('.hint-area')`;
        let href = await p.ev(`${area}?.querySelector('a[data-hint2-link]')?.href ?? null`);
        if (!href) {
          await p.tabTo(BTN(/Hint 2/i, area));
          await p.key('Enter');
          out.hint2 += 1;
          await p.waitFor(`${area}?.querySelector('a[data-hint2-link]')`, 20000, 'Hint 2 link');
          href = await p.ev(`${area}.querySelector('a[data-hint2-link]').href`);
          await sleep(2500); // let the atlas page finish streaming: closing it early left a stream open and crashed the local atlas server
          for (const ti of (await p.cdp.send('Target.getTargets')).targetInfos) {
            if (ti.type === 'page' && isAtlasPage(ti.url)) {
              tabsSeen.add(ti.targetId);
              await p.cdp.send('Target.closeTarget', { targetId: ti.targetId }).catch(() => {});
            }
          }
        }
        await showTab(p, 'question');
        const text = await atlasSectionText(href);
        const q = await p.ev(`({ question: document.querySelector('.world-question').textContent, options: [...document.querySelectorAll('.world-option')].map((b) => { const c = b.cloneNode(true); c.querySelectorAll('.sr-only').forEach((x) => x.remove()); return c.textContent; }) })`);
        let solved = false;
        for (const i of rankOptions(q.question, q.options, text)) {
          if (!(await p.ev(`!document.querySelectorAll('.world-option')[${i}]?.disabled`))) continue;
          await p.tabTo(`document.querySelectorAll('.world-option')[${i}]`);
          await p.key(step % 2 ? 'Enter' : 'Space');
          await sleep(300);
          await waitIdle(p);
          const after = await stateOf(p);
          if (after.ending || after.restart || after.states[openIdx] === 'solved') {
            solved = true;
            break;
          }
          out.wrong += 1;
        }
        if (!solved) out.problem = `${logPrefix}: no option accepted`;
        continue;
      }
      if (st.follow > 0) {
        stuck = 0;
        await showTab(p, 'leads');
        const n = Math.floor(Math.random() * st.follow);
        await p.tabTo(`[...document.querySelectorAll('.world-lead button')].filter((b) => !b.disabled && /\\S/.test(b.textContent))[${n}]`);
        await p.key('Enter');
        await sleep(300);
        await waitIdle(p);
        continue;
      }
      if (++stuck > 4) {
        out.problem = `${logPrefix}: stuck with no open puzzle and no thread`;
        break;
      }
      await sleep(500);
    }
    if (out.problem) break;
  }
  off();
  out.atlasTabs = tabsSeen.size;
  const t = await p.cdp.send('Target.getTargets');
  for (const ti of t.targetInfos) if (ti.type === 'page' && isAtlasPage(ti.url)) await p.cdp.send('Target.closeTarget', { targetId: ti.targetId }).catch(() => {});
  return out;
}


const loaded = (p) => p.waitFor(`(() => { const i = document.querySelector('.scene-image'); return i && i.complete && i.naturalWidth > 0; })()`, 60000, 'scene image loaded').then(() => true, () => false);
/** Drags the scene until the hotspot lies fully inside the viewport, then returns its centre. */
async function revealByDrag(p, id) {
  const sel = `document.querySelector('button[data-hotspot="${id}"]').getBoundingClientRect()`;
  const vp = await p.ev(`(() => { const r = document.querySelector('.scene-viewport').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })()`);
  for (let i = 0; i < 10; i++) {
    const r = await p.ev(`(() => { const r = ${sel}; return { x: r.x, right: r.right }; })()`);
    if (r.x >= vp.x + 4 && r.right <= vp.x + vp.w - 4) break;
    await p.drag(vp.x + vp.w / 2, vp.y + vp.h - 20, vp.x + vp.w / 2 + (r.x > vp.x + vp.w / 2 ? -120 : 120));
  }
  return p.ev(`(() => { const r = ${sel}; return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
}
const fearMeterMetrics = async (p) => {
  await sleep(600); // the fill eases for 300 ms
  return p.ev(`(() => { const f = document.querySelector('.fear-meter'); if (!f) return null; const fr = f.querySelector('.fear-meter-frame').getBoundingClientRect(); const tr = f.querySelector('.fear-meter-track').getBoundingClientRect(); const fi = f.querySelector('.fear-meter-fill').getBoundingClientRect(); return { frame: [fr.width, fr.height].map(Math.round), trackInsideFrame: tr.left >= fr.left && tr.right <= fr.right && tr.top >= fr.top && tr.bottom <= fr.bottom, track: [tr.width, tr.height].map(Math.round), fillRatio: +(fi.width / tr.width).toFixed(3), valuenow: f.querySelector('[role=meter]').getAttribute('aria-valuenow') }; })()`);
};
async function shotFearMeter(p, file) {
  await p.ev(`document.querySelector('.fear-meter').scrollIntoView({ block: 'center' })`);
  await sleep(450);
  const r = await p.ev(`(() => { const r = document.querySelector('.fear-meter').getBoundingClientRect(); return { x: Math.max(0, r.x - 8), y: Math.max(0, r.y - 8), width: r.width + 16, height: r.height + 16 }; })()`);
  await p.shot(file, r);
}

// ---- (1) keyboard only -----------------------------------------------------------------------------------------------------
async function keyboardCheck(cdp) {
  info(`--- (1) keyboard only: hall, tutorial, hall, Banshee${SIGNUP_TEMP ? ' (signed in as a temporary user)' : ''} ---`);
  const p = await Page.open(cdp, { init: MOUSE_WATCH });
  try {
    if (SIGNUP_TEMP) {
      await p.goto(`${GAME}/game/`); // goto() waits for a scene, so sign up from the Hall page (same origin)
      const status = await p.ev(`(async () => {
        const hex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
        const r = await fetch('/game/api/auth/sign-up/email', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Browser Check', email: 'kw-browser-' + hex(6) + '@example.com', password: hex(16) }) });
        return r.status;
      })()`);
      check('temporary example.com user signed up in the page', status === 200, `status ${status}`);
    }
    await p.goto(`${GAME}/game/`);
    // pan with the arrow keys: Tab to the viewport itself
    await p.tabTo(`document.querySelector('.scene-viewport')`);
    const before = await p.ev(panX);
    for (let i = 0; i < 4; i++) await p.key('ArrowRight');
    await sleep(100);
    const right = await p.ev(panX);
    for (let i = 0; i < 2; i++) await p.key('ArrowLeft');
    await sleep(100);
    const left = await p.ev(panX);
    check('hall pans with the arrow keys', right < before && left > right, `x ${before.toFixed(0)} -> ${right.toFixed(0)} -> ${left.toFixed(0)}`);
    // a locked door: Tab to it, Enter, the tutorial opens
    await p.tabTo(HOTSPOT('hub-door-banshee'));
    check('focus pans the focused hotspot into view', await p.ev(`(() => { const r = document.querySelector('button[data-hotspot="hub-door-banshee"]').getBoundingClientRect(); const v = document.querySelector('.scene-viewport').getBoundingClientRect(); return r.right > v.left && r.left < v.right; })()`));
    const ring = await p.ev(`(() => { const s = getComputedStyle(document.activeElement); return { w: s.outlineWidth, st: s.outlineStyle, c: s.outlineColor }; })()`);
    numbers.focusRing = ring;
    await p.shot('focus-ring-hall.png');
    await p.key('Enter');
    await p.waitFor(`!!([...document.querySelectorAll('[data-panel="door"] button')].find((e) => e.textContent.trim() === 'Start in the study'))`, 10000, 'door panel link');
    await p.tabTo(`([...document.querySelectorAll('[data-panel="door"] button')].find((e) => e.textContent.trim() === 'Start in the study'))`);
    await p.key('Enter');
    await p.waitFor(`location.pathname.endsWith('/tutorial')`, 20000, 'tutorial route');
    check('Enter on a locked hall door opens the door panel, and its "Start in the study" link opens the tutorial', true);
    await p.waitFor(`document.querySelector('.scene-viewport') && Object.keys(document.querySelector('.scene-viewport')).some((k) => k.startsWith('__reactFiber'))`);
    await p.waitFor(`document.querySelector('[data-tutorial="pan-prompt"]') && !document.querySelector('[role="status"]')?.textContent?.includes('oading')`, 30000, 'tutorial view');
    await sleep(500);
    // tutorial: candle (light), mirror (fear event), Hint 1, drawer, Hint 2 (atlas tab), code, reward
    await p.tabTo(HOTSPOT('tut-candle'));
    await p.key('Space');
    await p.waitFor(`document.querySelector('[data-panel="object"]')`);
    check('Space activates a tutorial hotspot and its panel takes focus', await p.ev(`document.activeElement?.getAttribute('data-panel') === 'object'`));
    await p.key('Escape');
    check('Escape closes the panel and returns focus to the hotspot', await p.ev(`document.activeElement?.dataset?.hotspot === 'tut-candle'`));
    await p.tabTo(BTN(/Hint 1/));
    await p.key('Enter');
    await p.waitFor(`document.querySelector('.hint-area .hint-sheet')`);
    check('Hint 1 by keyboard shows its text in the hint sheet', await p.ev(`document.querySelector('.hint-area .hint-sheet p')?.textContent.trim().length > 0`));
    await p.key('Escape');
    await p.tabTo(HOTSPOT('tut-drawer'));
    await p.key('Enter');
    await p.waitFor(`document.querySelector('#tutorial-code') && document.querySelector('[data-panel="drawer"] form p')?.textContent.trim().length > 5`, 30000, 'drawer question');
    const question = await p.ev(`document.querySelector('[data-panel="drawer"] form p').textContent`);
    await p.key('Escape');
    for (let tries = 0; tries < 3 && !(await p.ev(`!!document.querySelector('[data-hint2-link]')`)); tries++) {
      await p.waitFor(`document.querySelector('[aria-busy]')?.getAttribute('aria-busy') !== 'true'`, 30000, 'idle before Hint 2');
      await p.tabTo(BTN(/Hint 2/));
      await p.key('Enter');
      await p.waitFor(`document.querySelector('[data-hint2-link]')`, 8000, 'Hint 2 link').catch(() => {});
    }
    await p.waitFor(`document.querySelector('[data-hint2-link]')`, 10000, 'Hint 2 link');
    const href = await p.ev(`document.querySelector('[data-hint2-link]').href`);
    await sleep(2500);
    const tabs = (await cdp.send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page' && isAtlasPage(t.url));
    check('Hint 2 opens the atlas tab at the chapter anchor', href.startsWith(`${ATLAS}/`) && tabs.length >= 1, `${tabs.length} atlas tab(s), href path ${new URL(href).pathname}`);
    for (const t of tabs) await cdp.send('Target.closeTarget', { targetId: t.targetId }).catch(() => {});
    await p.waitFor(`document.querySelector('[aria-busy]')?.getAttribute('aria-busy') !== 'true'`, 30000);
    const fmT = await fearMeterMetrics(p);
    numbers.fearMeterAfterHint2 = fmT;
    check('fear meter (tutorial, after Hint 2): fill is inside its frame and equals value/100', !!fmT && Number(fmT.valuenow) > 0 && fmT.trackInsideFrame && Math.abs(fmT.fillRatio - Number(fmT.valuenow) / 100) < 0.02, JSON.stringify(fmT));
    await shotFearMeter(p, 'fear-meter-filled.png');
    const text = await atlasSectionText(href);
    const candidates = numberCandidates(question, text);
    let solved = false;
    for (const c of candidates) {
      await p.tabTo(HOTSPOT('tut-drawer'));
      await p.key('Enter');
      await p.waitFor(`document.querySelector('#tutorial-code')`);
      await p.tabTo(`document.querySelector('#tutorial-code')`);
      const have = await p.ev(`document.querySelector('#tutorial-code').value.length`);
      for (let i = 0; i < have; i++) await p.key('Backspace');
      await p.typeText(c);
      await p.key('Tab');
      await p.key('Enter');
      await sleep(500);
      await p.waitFor(`document.querySelector('[aria-busy]')?.getAttribute('aria-busy') !== 'true'`, 30000);
      if (await p.ev(`document.querySelector('[data-solved="true"]') !== null`)) {
        solved = true;
        break;
      }
      await p.key('Escape');
    }
    check('the drawer code, typed as digits from the atlas text, opens the drawer', solved, `${candidates.length} candidate(s) read from the chapter`);
    if (!solved) throw new Error('tutorial not solved');
    await p.waitFor(`document.querySelector('[data-reward="true"]')`);
    await p.tabTo(BTN(/Go to the hall/));
    await p.key('Enter');
    await p.waitFor(`location.pathname.replace(/\\/$/, '').endsWith('/game')`, 20000, 'back in the hall');
    await p.waitFor(`document.querySelector('button[data-hotspot="hub-door-banshee"]')`);
    await sleep(500);
    const label = await p.ev(`document.querySelector('button[data-hotspot="hub-door-banshee"]').textContent`);
    check('back in the hall, the Banshee door is open after the tutorial', /^Enter/i.test(label.trim()) || !/locked/i.test(label), label.trim().slice(0, 60));
    // into the Banshee world with the keyboard
    await p.tabTo(HOTSPOT('hub-door-banshee'));
    await p.key('Enter');
    await p.waitFor(`document.querySelector('[data-panel="door"]')`);
    await p.tabTo(BTN(/^\s*Enter /, `document.querySelector('.hall-panel')`));
    await p.key('Enter');
    await p.waitFor(`location.pathname.includes('/world/banshee')`, 30000, 'world route');
    const w = await playWorldByKeyboard(p, 'banshee');
    check('Banshee: curse broken with the keyboard alone', w.won, `${w.runs} run(s), ${w.restarts} restart(s), ${w.hint2} Hint 2 use(s), ${w.wrong} wrong answer(s), ${w.atlasTabs} atlas tab(s)${w.problem ? `, ${w.problem}` : ''}`);
    numbers.keyboardWorld = w;
    if (w.won) {
      // The ending is a modal dialog that traps Tab; the scene top bar has a button with the same label behind it.
      await p.tabTo(BTN(/Back to the hall/, `document.querySelector('.world-ending')`));
      await p.key('Enter');
      await p.waitFor(`location.pathname.replace(/\\/$/, '').endsWith('/game')`, 20000, 'hall again');
      check('Back to the hall from the ending, by keyboard', true);
    }
    const m = await mouseCounts(p);
    check('no mouse, pointer or touch input was used', Object.keys(m).length === 0, JSON.stringify(m));
  } finally {
    await p.close();
  }
}

// ---- (2) 390 px touch -------------------------------------------------------------------------------------------------------
const OVERFLOW = `({ doc: document.documentElement.scrollWidth, body: document.body.scrollWidth, inner: window.innerWidth })`;
async function targetAudit(p, where) {
  const bad = await p.ev(`[...document.querySelectorAll('button[data-hotspot]')].map((e) => { const r = e.getBoundingClientRect(); return { id: e.dataset.hotspot, w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; }).filter((x) => x.w < 43.5 || x.h < 43.5)`);
  const all = await p.ev(`document.querySelectorAll('button[data-hotspot]').length`);
  check(`${where}: every hotspot target is at least 44 x 44 CSS px`, bad.length === 0 && all > 0, `${all} hotspots${bad.length ? `, small: ${JSON.stringify(bad)}` : ''}`);
  const controls = await p.ev(`[...document.querySelectorAll('main button:not([data-hotspot]), main a, button.scene-button, button.world-button, a.world-button')].map((e) => { const r = e.getBoundingClientRect(); return { t: (e.textContent || '').trim().slice(0, 28), w: +r.width.toFixed(0), h: +r.height.toFixed(0) }; }).filter((x) => x.w > 0 && (x.h < 44 || x.w < 44))`);
  info(`${where}: controls under 44 px: ${controls.length ? JSON.stringify(controls) : 'none'}`);
}
async function touchCheck(cdp) {
  info('--- (2) 390 px touch pass ---');
  const p = await Page.open(cdp, { width: 390, height: 844, dpr: 2, mobile: true, touch: true });
  try {
    // hall
    await p.goto(`${GAME}/game/`);
    await sleep(800);
    let o = await p.ev(OVERFLOW);
    check('hall: no horizontal page scroll at 390 px', o.doc <= o.inner && o.body <= o.inner, JSON.stringify(o));
    check('hall: the panorama loaded', await loaded(p), await p.ev(`document.querySelector('.scene-image').naturalWidth + 'x' + document.querySelector('.scene-image').naturalHeight`));
    await targetAudit(p, 'hall');
    const vp = await p.ev(`(() => { const r = document.querySelector('.scene-viewport').getBoundingClientRect(); const cs = getComputedStyle(document.querySelector('.scene-viewport')); return { x: r.x, y: r.y, w: r.width, h: r.height, touchAction: cs.touchAction, inner: innerHeight }; })()`);
    const x0 = await p.ev(panX);
    await p.drag(vp.x + vp.w - 40, vp.y + vp.h / 2, vp.x + 40);
    const x1 = await p.ev(panX);
    check('hall: a finger drag pans the scene', x1 < x0 - 100, `x ${x0.toFixed(0)} -> ${x1.toFixed(0)}`);
    await p.drag(vp.x + 40, vp.y + vp.h / 2, vp.x + vp.w - 40);
    const x2 = await p.ev(panX);
    check('hall: dragging back restores the pan', x2 > x1 + 100);
    // dragging that starts on a hotspot must not activate it (8.10); then a tap does
    const c2 = await revealByDrag(p, 'hub-clock');
    await p.drag(c2.x, c2.y, c2.x + 90);
    check('hall: a drag that starts on a hotspot does not activate it', !(await p.ev(`!!document.querySelector('.hall-panel')`)));
    const c3 = await revealByDrag(p, 'hub-clock');
    await p.tap(c3.x, c3.y);
    check('hall: a tap on a hotspot opens its panel', await p.ev(`!!document.querySelector('.hall-panel')`));
    await p.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await p.ev(`document.querySelector('.hall-panel')?.querySelector('button')?.click()`);
    await p.ev(`window.scrollTo(0, 0)`);
    await p.shot('hall-390.png');
    // dvh
    const dvh = await p.ev(`(() => { let found = false; for (const sh of document.styleSheets) { try { for (const r of sh.cssRules) if (/dvh/.test(r.cssText) && /scene-viewport/.test(r.cssText)) found = true; } catch {} } const h = document.querySelector('.scene-viewport').getBoundingClientRect().height; return { found, h, inner: innerHeight, expected: Math.min(0.7 * innerHeight, 36 * parseFloat(getComputedStyle(document.documentElement).fontSize)) }; })()`);
    check('hall: the scene height follows the dynamic viewport (dvh rule present, height = min(70dvh, 36rem))', dvh.found && Math.abs(dvh.h - dvh.expected) < 1.5, JSON.stringify(dvh));
    numbers.hotspotsHall = await p.ev(`[...document.querySelectorAll('button[data-hotspot]')].map((e) => { const r = e.getBoundingClientRect(); return { id: e.dataset.hotspot, w: Math.round(r.width), h: Math.round(r.height) }; })`);

    // tutorial
    await p.goto(`${GAME}/game/tutorial`);
    await p.waitFor(`document.querySelector('.scene-image')?.complete`, 30000);
    await sleep(800);
    o = await p.ev(OVERFLOW);
    check('tutorial: no horizontal page scroll at 390 px', o.doc <= o.inner && o.body <= o.inner, JSON.stringify(o));
    check('tutorial: the panorama loaded', await loaded(p));
    await targetAudit(p, 'tutorial');
    const tvp = await p.ev(`(() => { const r = document.querySelector('.scene-viewport').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })()`);
    for (let i = 0; i < 6 && !(await p.ev(`(() => { const r = document.querySelector('button[data-hotspot="tut-candle"]').getBoundingClientRect(); return r.x >= 8 && r.right <= innerWidth - 8; })()`)); i++) {
      const r = await p.ev(`document.querySelector('button[data-hotspot="tut-candle"]').getBoundingClientRect().x`);
      await p.drag(tvp.x + tvp.w / 2, tvp.y + tvp.h - 20, tvp.x + tvp.w / 2 + (r > 195 ? -140 : 140));
    }
    const tc = await p.ev(`(() => { const r = document.querySelector('button[data-hotspot="tut-candle"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await p.tap(tc.x, tc.y);
    check('tutorial: a tap on the candle lights it', await p.ev(`document.querySelector('[data-lit]').dataset.lit === 'true' && !!document.querySelector('[data-panel="object"]')`));
    await p.ev(`window.scrollTo(0, 0)`);
    await p.shot('tutorial-390.png');
    await p.ev(`document.querySelector('[data-panel] button')?.click()`);

    // banshee world: taps by touch for the first hotspots, then the rest by script for setup, then the question panel
    await p.goto(`${GAME}/game/world/banshee`);
    await p.waitFor(`document.querySelector('.world-fear')`, 30000, 'world view');
    await sleep(800);
    o = await p.ev(OVERFLOW);
    check('banshee: no horizontal page scroll at 390 px', o.doc <= o.inner && o.body <= o.inner, JSON.stringify(o));
    check('banshee: the first panorama loaded', await loaded(p));
    await targetAudit(p, 'banshee scene 1');
    const wvp = await p.ev(`(() => { const r = document.querySelector('.scene-viewport').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })()`);
    const wx0 = await p.ev(panX);
    await p.drag(wvp.x + wvp.w - 40, wvp.y + wvp.h / 2, wvp.x + 40);
    check('banshee: a finger drag pans the scene', (await p.ev(panX)) < wx0 - 100);
    const ids = await p.ev(`[...document.querySelectorAll('button[data-hotspot]')].map((e) => e.dataset.hotspot)`);
    let touchTaps = 0;
    for (const id of ids.slice(0, 3)) {
      for (let i = 0; i < 8 && !(await p.ev(`(() => { const r = document.querySelector('button[data-hotspot="${id}"]').getBoundingClientRect(); return r.x >= 4 && r.right <= innerWidth - 4; })()`)); i++) {
        const r = await p.ev(`document.querySelector('button[data-hotspot="${id}"]').getBoundingClientRect().x`);
        await p.drag(wvp.x + wvp.w / 2, wvp.y + wvp.h - 20, wvp.x + wvp.w / 2 + (r > 195 ? -120 : 120));
      }
      const pt = await p.ev(`(() => { const r = document.querySelector('button[data-hotspot="${id}"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
      await p.tap(pt.x, pt.y);
      touchTaps++;
    }
    await waitIdle(p);
    check('banshee: touch taps on hotspots reach the server and show a result', touchTaps === 3 && (await p.ev(`!!document.querySelector('[aria-label]') && [...document.querySelectorAll('[role="status"]')].some((e) => e.textContent.trim().length > 0)`)), `${touchTaps} taps`);
    await p.ev(`document.querySelector('.scene-viewport').scrollIntoView()`);
    await p.shot('world-scene-390.png');
    // open the puzzles by script (setup only), then look at the question panel
    for (const id of ids) await p.ev(`document.querySelector('button[data-hotspot="${id}"]')?.click()`);
    await waitIdle(p);
    if (await p.ev(`!!document.querySelector('.spirit-panel')`)) {
      await p.ev(`document.querySelector('.spirit-panel').scrollIntoView()`);
      const sp = await p.ev(`(() => { const s = document.querySelector('.spirit-panel'); const b = s.querySelector('.spirit-panel-body'); const q = [...b.querySelectorAll('h2,p')].map((e) => e.getBoundingClientRect()); const sr = s.getBoundingClientRect(); const cs = getComputedStyle(s); return { panelW: Math.round(sr.width), panelH: Math.round(sr.height), padInline: cs.paddingInlineStart + ' / ' + cs.paddingInlineEnd, padBlock: cs.paddingBlockStart + ' / ' + cs.paddingBlockEnd, textInside: q.every((r) => r.left >= sr.left - 0.5 && r.right <= sr.right + 0.5 && r.top >= sr.top - 0.5 && r.bottom <= sr.bottom + 0.5), bodyW: Math.round(b.getBoundingClientRect().width), scrollOverflow: s.scrollWidth > s.clientWidth + 1, fontSize: getComputedStyle(b).fontSize, color: getComputedStyle(b).color }; })()`);
      numbers.spiritPanel390 = sp;
      check('spirit panel: question text stays inside the painted frame at 390 px', sp.textInside && !sp.scrollOverflow, JSON.stringify(sp));
      await p.shot('world-question-390.png');
    } else info('no question panel opened after tapping every hotspot (setup tap); screenshot skipped');
    o = await p.ev(OVERFLOW);
    check('banshee: still no horizontal page scroll with the question panel open', o.doc <= o.inner && o.body <= o.inner, JSON.stringify(o));
    const fm = await p.ev(`(() => { const f = document.querySelector('.fear-meter'); if (!f) return null; const fr = f.querySelector('.fear-meter-frame').getBoundingClientRect(); const tr = f.querySelector('.fear-meter-track').getBoundingClientRect(); const fi = f.querySelector('.fear-meter-fill').getBoundingClientRect(); return { frame: [fr.width, fr.height].map(Math.round), trackInsideFrame: tr.left >= fr.left && tr.right <= fr.right && tr.top >= fr.top && tr.bottom <= fr.bottom, track: [tr.width, tr.height].map(Math.round), fillRatio: +(fi.width / tr.width).toFixed(3), valuenow: f.querySelector('[role=meter]').getAttribute('aria-valuenow') }; })()`);
    numbers.fearMeter390 = fm;
    check('fear meter: the fill sits inside the frame and its width equals value/100', !!fm && fm.trackInsideFrame && Math.abs(fm.fillRatio - Number(fm.valuenow) / 100) < 0.02, JSON.stringify(fm));
    await shotFearMeter(p, 'fear-meter-390.png');
  } finally {
    await p.close();
  }
}

// ---- (3) reduced motion --------------------------------------------------------------------------------------------------------
async function motionPass(cdp, reduced) {
  const p = await Page.open(cdp, { reduced });
  try {
    await p.goto(`${GAME}/game/tutorial`);
    await p.waitFor(`document.querySelector('.fear-overlay')`);
    await sleep(1200);
    await p.tabTo(HOTSPOT('tut-mirror'));
    await p.key('Enter');
    const samples = [];
    const t0 = Date.now();
    while (Date.now() - t0 < 1800) {
      samples.push(
        await p.ev(`(() => { const f = document.querySelector('.fear-look'); const c = document.querySelector('.fear-overlay-caption'); return { t: Math.round(performance.now()), flash: f ? +getComputedStyle(f).opacity : null, flashAnim: f ? getComputedStyle(f).animationName : null, capAnim: c ? getComputedStyle(c).animationName : null, cap: c ? c.textContent.trim().slice(0, 60) : null, mode: document.querySelector('.fear-overlay').dataset.motion, running: document.getAnimations().map((a) => a.animationName || a.constructor.name) }; })()`),
      );
      await sleep(50);
    }
    const flashMax = Math.max(...samples.map((s) => s.flash ?? 0));
    const names = [...new Set(samples.flatMap((s) => s.running))].filter((n) => /^fear-/.test(n));
    const cap = samples.find((s) => s.cap)?.cap ?? null;
    return { mode: samples[0].mode, flashMax, flashAnim: [...new Set(samples.map((s) => s.flashAnim))], capAnim: [...new Set(samples.map((s) => s.capAnim).filter(Boolean))], fearAnimations: names, caption: cap, samples: samples.length };
  } finally {
    await p.close();
  }
}
async function motionCheck(cdp) {
  info('--- (3) reduced motion ---');
  const full = await motionPass(cdp, false);
  const red = await motionPass(cdp, true);
  numbers.motion = { full, reduced: red };
  check('control (motion allowed): the event flashes and runs the flash keyframes', full.mode === 'full' && full.flashMax > 0.1 && full.fearAnimations.includes('fear-flash'), JSON.stringify(full));
  check('reduced motion: the overlay is in reduced mode and a caption shows', red.mode === 'reduced' && !!red.caption, `caption "${red.caption}"`);
  check('reduced motion: no flash runs on a fear event (flash opacity stays 0, no fear-flash animation)', red.flashMax === 0 && !red.fearAnimations.includes('fear-flash') && !red.flashAnim.includes('fear-flash'), JSON.stringify({ flashMax: red.flashMax, flashAnim: red.flashAnim, running: red.fearAnimations }));
  check('reduced motion: only the opacity fade runs', red.fearAnimations.every((n) => n === 'fear-fade') && red.fearAnimations.includes('fear-fade'), JSON.stringify(red.fearAnimations));
}

// ---- (4) Slow 4G first view ------------------------------------------------------------------------------------------------------
const PAINT = `(() => {
  const obs = new MutationObserver(() => {
    const i = document.querySelector('img.scene-image');
    if (!i || i.__w) return;
    i.__w = 1;
    const go = () => i.decode().catch(() => {}).then(() => requestAnimationFrame(() => requestAnimationFrame(() => { window.__scenePaint = performance.now(); })));
    if (i.complete && i.naturalWidth) go(); else i.addEventListener('load', go, { once: true });
  });
  obs.observe(document, { childList: true, subtree: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__fcp = e.startTime; }).observe({ type: 'paint', buffered: true });
})()`;
async function timeOne(cdp, url, blockExtras = false) {
  const p = await Page.open(cdp, { width: 390, height: 844, dpr: 2, mobile: true, touch: true, init: PAINT });
  const reqs = new Map();
  const off = p.on((m) => {
    if (m.method === 'Network.requestWillBeSent') reqs.set(m.params.requestId, { url: m.params.request.url, bytes: 0, done: false, t0: m.params.timestamp });
    if (m.method === 'Network.loadingFinished') {
      const r = reqs.get(m.params.requestId);
      if (r) Object.assign(r, { bytes: m.params.encodedDataLength, done: true, t1: m.params.timestamp });
    }
  });
  try {
    await p.send('Network.setCacheDisabled', { cacheDisabled: true });
    // diagnostic only: drop sprites, spirit figures and the meter frame, to see how much they delay the scene
    if (blockExtras) await p.send('Network.setBlockedURLs', { urls: ['*game-hotspot*', '*game-spirit*', '*shared-game-ui*'] });
    await p.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: Math.round((1.6 * 1024 * 1024) / 8), uploadThroughput: Math.round((750 * 1024) / 8) });
    await p.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await p.send('Page.navigate', { url });
    await p.waitFor(`window.__scenePaint`, 90000, 'first scene paint');
    const paint = await p.ev(`window.__scenePaint`);
    const fcp = await p.ev(`window.__fcp ?? null`);
    const res = await p.ev(`(() => { const i = document.querySelector('img.scene-image'); const e = performance.getEntriesByType('resource').find((x) => x.name === i.currentSrc); return { src: i.currentSrc, end: e ? e.responseEnd : null, encoded: e ? e.encodedBodySize : null }; })()`);
    await sleep(2500);
    const all = [...reqs.values()].filter((r) => r.done);
    const first = Math.min(...[...reqs.values()].map((r) => r.t0));
    const imgs = all.filter((r) => /\/media\//.test(r.url));
    // What the non-image files would weigh compressed: the local build server sends them as they are.
    const others = all.filter((r) => !/\/media\//.test(r.url) && r.url.startsWith(new URL(url).origin) && /\.(js|css)(\?|$)/.test(r.url));
    let gz = 0;
    for (const r of others) gz += gzipSync(Buffer.from(await (await fetch(r.url)).arrayBuffer())).length;
    return {
      url,
      scenePaintMs: Math.round(paint),
      fcpMs: fcp === null ? null : Math.round(fcp),
      sceneImageMs: res.end === null ? null : Math.round(res.end),
      sceneImage: new URL(res.src).pathname,
      sceneBytes: all.find((r) => r.url === res.src)?.bytes ?? null, // from the protocol: resource timing hides the size of a cross-origin image
      totalBytes: all.reduce((a, r) => a + r.bytes, 0),
      imageBytes: imgs.reduce((a, r) => a + r.bytes, 0),
      requests: all.length,
      codeCssBytes: others.reduce((a, r) => a + r.bytes, 0),
      codeCssGzipBytes: gz,
      imageUrls: imgs.map((r) => new URL(r.url).pathname),
      imageDone: imgs.map((r) => ({ f: new URL(r.url).pathname.split('/').pop(), bytes: r.bytes, endMs: Math.round((r.t1 - first) * 1000) })),
    };
  } finally {
    off();
    await p.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});
    await p.close();
  }
}
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
async function timingCheck(cdp) {
  info('--- (4) panorama timing on Slow 4G (1.6 Mbps down, 150 ms RTT) with 4x CPU throttle, cache off, 390 px phone ---');
  // every scene file in assets/, as ls -l reports it
  const sizes = [];
  for (const dir of readdirSync(join(ROOT, 'assets'), { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const g = join(ROOT, 'assets', dir.name, dir.name === 'hub' || dir.name === 'tutorial' ? '' : 'game');
    if (!existsSync(g)) continue;
    for (const f of readdirSync(g).filter((x) => /-game-scene-\d+\.webp$/.test(x))) sizes.push({ file: `${dir.name}/${f}`, bytes: statSync(join(g, f)).size });
  }
  numbers.sceneSizes = sizes;
  info(`scene files under assets/: ${sizes.length}, largest ${Math.max(...sizes.map((s) => s.bytes))} bytes`);
  const screens = [
    ['hall', `${GAME}/game/`],
    ['tutorial', `${GAME}/game/tutorial`],
    ['banshee first scene', `${GAME}/game/world/banshee`],
  ];
  numbers.timing = {};
  for (const [name, url] of screens) {
    const runs = [];
    for (let i = 0; i < 3; i++) runs.push(await timeOne(cdp, url));
    const m = median(runs.map((r) => r.scenePaintMs));
    numbers.timing[name] = { runs, medianScenePaintMs: m };
    const last = runs[runs.length - 1];
    info(`${name}: scene paint ${runs.map((r) => r.scenePaintMs).join(', ')} ms (median ${m}); scene image ${last.sceneImage} ${last.sceneBytes} bytes arrived at ${runs.map((r) => r.sceneImageMs).join(', ')} ms; FCP ${runs.map((r) => r.fcpMs).join(', ')} ms; total transfer ${last.totalBytes} bytes in ${last.requests} requests, of which images ${last.imageBytes}, js and css ${last.codeCssBytes} (${last.codeCssGzipBytes} gzipped)`);
    check(`${name}: first scene view within the 3.0 s budget on Slow 4G (finding if not)`, m <= 3000, `median ${m} ms`);
  }
  numbers.timingSceneOnly = {};
  for (const [name, url] of screens) {
    const runs = [];
    for (let i = 0; i < 3; i++) runs.push(await timeOne(cdp, url, true));
    numbers.timingSceneOnly[name] = { runs, medianScenePaintMs: median(runs.map((r) => r.scenePaintMs)) };
    info(`${name} with sprites, spirit figures and meter frame blocked (diagnostic): scene paint ${runs.map((r) => r.scenePaintMs).join(', ')} ms (median ${numbers.timingSceneOnly[name].medianScenePaintMs}); transfer ${runs[2].totalBytes} bytes`);
  }
  const bansheeImages = numbers.timing['banshee first scene'].runs[0].imageUrls;
  const foreign = bansheeImages.filter((u) => !/\/media\/(banshee|shared)/.test(u));
  check('banshee: only Banshee and shared images are requested on first load (8.9)', foreign.length === 0, `${bansheeImages.length} images${foreign.length ? `, others: ${foreign.join(', ')}` : ''}`);
  check('banshee: scenes 2 and 3 are not fetched on first load', !bansheeImages.some((u) => /game-scene-0[23]/.test(u)), bansheeImages.filter((u) => /game-scene/.test(u)).join(', '));
}

// ---- (5) the right-to-left pass and the 9.13 list -----------------------------------------------------------------------
async function rtlCheck(cdp) {
  info('--- right-to-left pass (FEATURE_ARABIC=true, lang cookie ar) ---');
  if (!ARABIC) {
    info('no --arabic server given: the right-to-left pass was not run');
    return;
  }
  const p = await Page.open(cdp, { width: 390, height: 844, dpr: 2, mobile: true, touch: true });
  try {
    const host = new URL(ARABIC).hostname;
    await p.send('Network.setCookie', { name: 'lang', value: 'ar', domain: host, path: '/' });
    await p.goto(`${ARABIC}/game/`);
    await sleep(800);
    const r = await p.ev(`(() => { const v = document.querySelector('.scene-viewport'); const pan = [...document.querySelectorAll('.scene-pan button')].map((b) => ({ text: b.textContent.trim(), x: Math.round(b.getBoundingClientRect().x) })); return { dir: document.documentElement.dir, lang: document.documentElement.lang, viewportDir: getComputedStyle(v).direction, over: document.documentElement.scrollWidth - innerWidth, pan, h1: document.querySelector('h1,h2')?.textContent.trim().slice(0, 40), stageOrigin: new DOMMatrix(getComputedStyle(document.querySelector('.scene-stage')).transform).m41 }; })()`);
    numbers.rtl = r;
    check('rtl: the root is dir=rtl and lang=ar', r.dir === 'rtl' && r.lang === 'ar', `${r.dir} ${r.lang}`);
    check('rtl: the scene viewport stays ltr (painted image, physical pan) and starts at pan 0', r.viewportDir === 'ltr' && r.stageOrigin === 0, `direction ${r.viewportDir}, x ${r.stageOrigin}`);
    check('rtl: no horizontal page scroll at 390 px', r.over <= 0, `overflow ${r.over}`);
    info(`rtl: pan buttons in DOM order with their x: ${JSON.stringify(r.pan)}`);
    const vp = await p.ev(`(() => { const r = document.querySelector('.scene-viewport').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })()`);
    const x0 = await p.ev(panX);
    await p.drag(vp.x + vp.w - 40, vp.y + vp.h / 2, vp.x + 40);
    check('rtl: a finger drag still pans (drag left moves the scene left)', (await p.ev(panX)) < x0 - 100);
    await p.ev(`window.scrollTo(0, 0)`);
    await p.shot('hall-rtl-390.png');
  } finally {
    await p.close();
  }
}

// ---- (6) layout screenshots (task 4.4) ----------------------------------------------------------------------------------------
/** One PNG per scene: the whole panorama with every tap box outlined and labelled (`?layout=1`, dev server only). */
async function layoutCheck(cdp) {
  info(`--- (6) layout screenshots from ${BASE}, saved under .debug/screens/ ---`);
  const cookie = COOKIE_ENV ? process.env[COOKIE_ENV] : '';
  if (COOKIE_ENV && !cookie) info(`environment variable ${COOKIE_ENV} is empty: running as a guest`);
  mkdirSync(LAYOUT_DIR, { recursive: true });
  const worlds = readdirSync(join(ROOT, 'apps/game/src/layout/worlds')).filter((f) => f.endsWith('.ts')).map((f) => f.slice(0, -3)).sort();
  const targets = [
    { name: 'hall', path: '/game/?layout=1' },
    { name: 'tutorial', path: '/game/tutorial?layout=1' },
    ...worlds.map((w) => ({ name: w, path: `/game/world/${w}?layout=1`, world: w })),
  ];
  const p = await Page.open(cdp, { width: 1800, height: 1000, dpr: 1 });
  try {
    if (cookie) await p.send('Network.setExtraHTTPHeaders', { headers: { Cookie: cookie } });
    for (const t of targets) {
      if (t.world && !cookie && t.world !== GUEST_WORLD) {
        info(`SKIP  ${t.name}: needs --cookie-env (signed-in user who finished the tutorial)`);
        continue;
      }
      try {
        await p.send('Page.navigate', { url: `${BASE}${t.path}` });
        await p.waitFor(`document.querySelector('.scene-viewport') || (${JSON.stringify(!!t.world)} && !location.pathname.startsWith('/game/world/'))`, 60000, `${t.name} page`);
        if (!(await p.ev(`!!document.querySelector('.scene-viewport')`))) {
          info(`SKIP  ${t.name}: redirected to ${await p.ev('location.pathname')} (not allowed for this visitor)`);
          continue;
        }
        const count = t.world ? await p.ev(`document.querySelectorAll('.scene-tab').length || 1`) : 1;
        for (let i = 0; i < count; i++) {
          if (t.world && count > 1) await p.ev(`document.querySelectorAll('.scene-tab')[${i}].click()`);
          await p.waitFor(`(() => { const i = document.querySelector('.scene-image'); return i && i.complete && i.naturalWidth > 0 && document.querySelector('.scene-outline'); })()`, 60000, `${t.name} scene ${i + 1} outlines`);
          await sleep(400);
          const sceneId = await p.ev(`document.querySelector('.scene-viewport').dataset.sceneId`);
          const fits = await p.ev(`(() => { const v = document.querySelector('.scene-viewport').getBoundingClientRect(); const s = document.querySelector('.scene-image').getBoundingClientRect(); return s.width <= v.width + 1; })()`);
          const clip = await p.ev(`(() => { const r = document.querySelector('.scene-viewport').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`);
          const file = `${t.name}--${sceneId}.png`;
          const { data } = await p.send('Page.captureScreenshot', { format: 'png', clip: { ...clip, x: clip.x + (await p.ev('scrollX')), y: clip.y + (await p.ev('scrollY')), scale: 1 } });
          writeFileSync(join(LAYOUT_DIR, file), Buffer.from(data, 'base64'));
          check(`${t.name} ${sceneId}: .debug/screens/${file}`, true, fits ? '' : 'panorama wider than the window: only part shown');
        }
      } catch (e) {
        check(`${t.name}: layout screenshot`, false, String(e.message).slice(0, 200));
      }
    }
  } finally {
    await p.close();
  }
}

// ---- main -----------------------------------------------------------------------------------------------------------------------
const cdp = await launch();
process.on('exit', shutdown);
try {
  const version = await cdp.send('Browser.getVersion');
  info(`browser ${version.product}; driver: Node ${process.version} WebSocket over the DevTools protocol`);
  const steps = { keyboard: keyboardCheck, touch: touchCheck, motion: motionCheck, timing: timingCheck, rtl: rtlCheck, layout: layoutCheck };
  for (const [name, fn] of Object.entries(steps)) {
    if (!ONLY.has(name)) continue;
    try {
      await fn(cdp);
    } catch (e) {
      check(`${name} check ran to the end`, false, String(e.message).slice(0, 300));
    }
  }
} finally {
  if (JSON_OUT) writeFileSync(join(ROOT, JSON_OUT), JSON.stringify({ results, numbers }, null, 2));
  console.log(`\n${results.filter((r) => r.startsWith('PASS')).length} passed, ${failed} failed`);
  shutdown();
  process.exit(failed ? 1 : 0);
}
