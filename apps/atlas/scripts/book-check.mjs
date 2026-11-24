// Headless Chrome check of the atlas Book (launch-and-polish task 5.8; requirements 15.10, 16.1-16.3, 17.6, 18.6, 26.2, 28.8).
//
// Same approach as apps/game/scripts/browser-check.mjs: the DevTools protocol over Node's built-in WebSocket, no new dependency.
// Chrome is found on the usual macOS/Linux paths or in CHROME_BIN. It needs a RUNNING atlas (built or dev, with its database
// env); the script itself never touches the database. Legend ids come from the atlas legend list (/legends), anchors from the legend page's own
// element ids.
//
//   pnpm --filter @kiroween/atlas test:browser -- [--base http://localhost:3001] [--out docs/phase-5-notes/book-check-g5.json]
//        [--slow4g] [--legends banshee,...]
//
// Output: PASS/FAIL lines on stdout and a JSON file with pass/fail and numbers only (never a cookie or a header). Exit 1 on any
// failure. Screenshots of a failing page go to .debug/book-check/ (git-ignored).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ---- pure helpers (unit-tested without a browser) ------------------------------------------------------------------------
/** Same shape as the skeleton's stored anchors: `<legend-id>--ch-<n>`, `--versions`, `--versions--<version-id>`. */
export const ANCHOR_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*--(ch-[1-9][0-9]?|versions(--[a-z0-9]+(-[a-z0-9]+)*)?)$/;
export const KEEPERS_NOTE = 'keepers-note';
export const AA_TEXT = 4.5;
export const PAPER_FLOOR = '#a89368';

export function parseArgs(argv) {
  const out = { base: 'http://localhost:3001', out: 'docs/phase-5-notes/book-check-g5.json', slow4g: false, legends: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--slow4g') out.slow4g = true;
    else if (a === '--base' || a === '--out' || a === '--legends') {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`);
      if (a === '--base') out.base = v.replace(/\/+$/, '');
      else if (a === '--out') out.out = v;
      else out.legends = v.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (a === '--') continue;
    else throw new Error(`unknown argument ${a}`);
  }
  if (!/^https?:\/\/[^/\s]+$/.test(out.base)) throw new Error('--base must be an origin such as http://localhost:3001');
  return out;
}

/** True when `id` is a stored anchor of the given legend. */
export function isLegendAnchor(id, legendId) {
  return typeof id === 'string' && id.startsWith(`${legendId}--`) && id.length <= 120 && ANCHOR_PATTERN.test(id);
}
/** Unique anchors of a legend from a list of element ids, in first-seen order. */
export function filterAnchors(ids, legendId) {
  return [...new Set(ids.filter((id) => isLegendAnchor(id, legendId)))];
}
/** Unique legend ids from the hrefs of a page (`/legends/<id>`), without the Keeper's Note. */
export function legendIdsFromHrefs(hrefs) {
  const ids = [];
  for (const h of hrefs) {
    const m = /^\/legends\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?(?:[#?].*)?$/.exec(h);
    if (m && m[1] !== KEEPERS_NOTE && !ids.includes(m[1])) ids.push(m[1]);
  }
  return ids;
}

/** `#rrggbb`, `rgb(r, g, b)` or `rgba(r, g, b, a)` to [r, g, b] (0..255), or null. */
export function parseCssColor(s) {
  if (typeof s !== 'string') return null;
  const hex = /^#([0-9a-f]{6})$/i.exec(s.trim());
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16));
  const m = /^rgba?\(\s*(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)/i.exec(s.trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
export function luminance([r, g, b]) {
  const f = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function contrastRatio(a, b) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
/** Contrast of two CSS colour strings, or null when either cannot be read. */
export function contrastOfCss(fg, bg) {
  const a = parseCssColor(fg);
  const b = parseCssColor(bg);
  return a && b ? contrastRatio(a, b) : null;
}
/** Current page and page count from indicator text such as "Page 2 of 7"; null when it holds fewer than two numbers. */
export function parseIndicator(text) {
  const m = /(\d+)\D+(\d+)/.exec(String(text ?? ''));
  return m ? { page: Number(m[1]), count: Number(m[2]) } : null;
}
/** True when a chapter's first fragment is at the top of its column (`top` is its distance below the flow's top edge). */
export function atColumnTop(top, tolerance = 1.5) {
  return Number.isFinite(top) && Math.abs(top) <= tolerance;
}
/** Seconds in a CSS time list such as "0.3s, 300ms" to the largest value in milliseconds. */
export function maxDurationMs(list) {
  const parts = String(list ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return 0;
  return Math.max(...parts.map((p) => (p.endsWith('ms') ? parseFloat(p) : parseFloat(p) * 1000) || 0));
}

// ---- browser driver -------------------------------------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener('message', (m) => {
      const msg = JSON.parse(String(m.data));
      if (!msg.id) return;
      const p = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      if (p) msg.error ? p.reject(new Error(`${p.method}: ${msg.error.message}`)) : p.resolve(msg.result ?? {});
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject, method }));
  }
}

const KEYS = {
  Home: { key: 'Home', code: 'Home', vk: 36 },
  End: { key: 'End', code: 'End', vk: 35 },
  PageUp: { key: 'PageUp', code: 'PageUp', vk: 33 },
  PageDown: { key: 'PageDown', code: 'PageDown', vk: 34 },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', vk: 37 },
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', vk: 39 },
};

class Page {
  static async open(cdp, { width, height = 844, mobile = false, dpr = 1, reduced = false, cookies = null, base = '' }) {
    const { browserContextId } = await cdp.send('Target.createBrowserContext', { disposeOnDetach: true });
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', browserContextId });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const p = new Page(cdp, sessionId, browserContextId);
    for (const d of ['Page', 'Runtime', 'Network']) await p.send(`${d}.enable`);
    await p.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile });
    await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    if (reduced) await p.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    if (cookies) await p.send('Network.setCookies', { cookies: cookies.map((c) => ({ ...c, url: base })) });
    return p;
  }
  constructor(cdp, sid, ctx) {
    this.cdp = cdp;
    this.sid = sid;
    this.ctx = ctx;
  }
  send(method, params = {}) {
    return this.cdp.send(method, params, this.sid);
  }
  async ev(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(`page error: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result.value;
  }
  async waitFor(expr, timeout = 20000, label = expr) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (await this.ev(`!!(${expr})`).catch(() => false)) return;
      await sleep(80);
    }
    throw new Error(`timeout waiting for ${label}`);
  }
  /** Navigates and waits until React has hydrated the Book viewport and the view attribute is set. */
  async goto(url, timeout = 60000) {
    await this.send('Page.navigate', { url });
    await this.waitFor(
      `(() => { const e = document.querySelector('.book-viewport'); return e && Object.keys(e).some((k) => k.startsWith('__reactFiber')) && document.documentElement.dataset.book; })()`,
      timeout,
      'hydrated book',
    );
    await sleep(300);
  }
  async key(name) {
    const k = KEYS[name];
    const base = { key: k.key, code: k.code, windowsVirtualKeyCode: k.vk, nativeVirtualKeyCode: k.vk };
    await this.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base });
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    await sleep(450);
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
    await sleep(450);
  }
  async shot(file) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, Buffer.from(data, 'base64'));
  }
  async close() {
    await this.cdp.send('Target.disposeBrowserContext', { browserContextId: this.ctx }).catch(() => {});
  }
}

// In-page reads, as expression strings.
const INDICATOR = `document.querySelector('.book-indicator')?.textContent ?? ''`;
const VIEW = `document.querySelector('.book')?.dataset.view`;
const landed = (a) => `(() => {
  const el = document.getElementById(${JSON.stringify(a)});
  const vp = document.querySelector('.book-viewport').getBoundingClientRect();
  if (!el) return { found: false };
  // The heading is what must be visible (design: "the anchor's heading is inside the book viewport"). The anchor's own box
  // is the union of all its column fragments, so its left edge can sit on the shown page while the heading is on the next.
  const r = (el.querySelector('[data-anchor-heading]') ?? el).getBoundingClientRect();
  const ae = document.activeElement;
  return { found: true,
    inside: r.left >= vp.left - 1 && r.left < vp.right && r.top >= vp.top - 1 && r.top < vp.bottom,
    focused: !!ae && ae !== document.body && (ae === el || el.contains(ae)) };
})()`;
const visibleInPage = (a) => `(() => { const el = document.getElementById(${JSON.stringify(a)}); if (!el) return false; const r = el.getBoundingClientRect(); return r.top >= -2 && r.top < innerHeight; })()`;

function launchChrome() {
  const chrome = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => p && existsSync(p));
  if (!chrome) throw new Error('No Chrome binary found. Set CHROME_BIN.');
  const userDir = mkdtempSync(join(tmpdir(), 'kw-book-'));
  const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${userDir}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
  return { proc, userDir };
}
async function connect(userDir) {
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

// ---- the checks -----------------------------------------------------------------------------------------------------------
async function main() {
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const opts = parseArgs(process.argv.slice(2));
  const checks = [];
  let failed = 0;
  const record = (name, ok, numbers = {}, note = '') => {
    checks.push({ name, result: ok === 'skip' ? 'skipped' : ok ? 'pass' : 'fail', numbers, ...(note ? { note } : {}) });
    console.log(`${ok === 'skip' ? 'SKIP' : ok ? 'PASS' : 'FAIL'}  ${name}${note ? `  (${note})` : ''}`);
    if (ok === false) failed++;
  };

  let legends = opts.legends;
  if (!legends.length) {
    const html = await fetch(`${opts.base}/legends`).then((r) => r.text());
    legends = legendIdsFromHrefs([...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]));
  }
  record('legend list', legends.length === 12 || opts.legends.length > 0, { legends: legends.length }, legends.length === 12 ? '' : 'expected 12 legends from /legends');
  const targets = [...legends, KEEPERS_NOTE];

  const { proc, userDir } = launchChrome();
  let cdp;
  try {
    cdp = await connect(userDir);
    for (const id of targets) for (const width of [390, 1280]) await checkPage(cdp, opts, root, id, width, record);
    await checkMotion(cdp, opts, legends[0] ?? KEEPERS_NOTE, record);
    await checkRtl(cdp, opts, legends[0] ?? KEEPERS_NOTE, record);
    await checkKeepersRedirect(cdp, opts, record);
    if (opts.slow4g) await checkTexture(cdp, opts, legends[0] ?? KEEPERS_NOTE, record);
    else record('paper texture on Slow 4G', 'skip', {}, 'run with --slow4g');
  } catch (e) {
    record('script', false, {}, String(e?.message ?? e).slice(0, 200));
  } finally {
    try {
      proc.kill();
    } catch {}
    try {
      rmSync(userDir, { recursive: true, force: true });
    } catch {}
  }

  const summary = { pass: checks.filter((c) => c.result === 'pass').length, fail: failed, skipped: checks.filter((c) => c.result === 'skipped').length };
  const outPath = join(root, opts.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify({ base: opts.base, generatedAt: new Date().toISOString(), summary, checks }, null, 2)}\n`);
  console.log(`\n${summary.pass} passed, ${summary.fail} failed, ${summary.skipped} skipped. Wrote ${opts.out}`);
  process.exit(failed ? 1 : 0);
}

async function checkPage(cdp, opts, root, id, width, record) {
  const tag = `${id}@${width}`;
  const mobile = width < 600;
  const p = await Page.open(cdp, { width, height: mobile ? 844 : 800, mobile, dpr: mobile ? 2 : 1 });
  const step = async (name, fn) => {
    try {
      const r = await fn();
      record(`${tag} ${name}`, r.ok, r.numbers ?? {}, r.note ?? '');
      if (!r.ok) await p.shot(join(root, '.debug/book-check', `${id}-${width}-${name.replace(/\W+/g, '-')}.png`)).catch(() => {});
    } catch (e) {
      record(`${tag} ${name}`, false, {}, String(e?.message ?? e).slice(0, 160));
    }
  };
  try {
    await p.goto(`${opts.base}/legends/${id}`);
    const paged = await p.ev(`document.documentElement.dataset.book === 'on' && ${VIEW} === 'pages'`);
    if (!paged) {
      record(`${tag} pages on`, false, {}, 'html[data-book] is not on or the Book is in scroll view');
      return;
    }
    const ind0 = parseIndicator(await p.ev(INDICATOR));
    await step('page count and spread', async () => {
      const cols = await p.ev(`getComputedStyle(document.querySelector('.book-flow')).columnCount`);
      return { ok: !!ind0 && ind0.count >= 1 && String(cols) === (width >= 1024 ? '2' : '1'), numbers: { pages: ind0?.count ?? 0, columns: Number(cols) } };
    });
    await step('no horizontal page scroll', async () => {
      const n = await p.ev(`({ sw: document.documentElement.scrollWidth, iw: innerWidth })`);
      return { ok: n.sw <= n.iw, numbers: n };
    });
    await step('chapters start at page boundaries', async () => {
      // A chapter starts a new page when its first fragment sits at the top of a column. The left offset is not used: the
      // app wraps the chapters in a padded box, so a chapter is inset a few pixels inside its column on every page.
      const m = await p.ev(`(() => {
        const flow = document.querySelector('.book-flow');
        const top = flow.getBoundingClientRect().top;
        const cols = [...flow.querySelectorAll('.book-chapter')].map((c) => c.getClientRects()[0].top - top);
        return { tops: cols };
      })()`);
      const bad = m.tops.filter((t) => !atColumnTop(t));
      return { ok: m.tops.length > 0 && bad.length === 0, numbers: { chapters: m.tops.length, off_boundary: bad.length } };
    });
    // anchors
    const ids = await p.ev(`[...document.querySelectorAll('.book [id]')].map((e) => e.id)`);
    const anchors = filterAnchors(ids, id);
    await step('anchors found', async () => ({ ok: anchors.length > 0, numbers: { anchors: anchors.length } }));
    await step('every anchor lands visible and focused', async () => {
      const bad = [];
      for (const a of anchors) {
        await p.ev(`(document.activeElement && document.activeElement.blur(), location.hash = '', 0)`);
        await sleep(120);
        await p.ev(`(location.hash = ${JSON.stringify(`#${a}`)}, 0)`);
        await sleep(450);
        // An image that finishes loading makes the Book reflow; the hash must still win (16.6). Lazy plates load while the
        // reader turns, so the first real run hit this only by timing; firing the Book's load listener makes it every time.
        await p.ev(`(document.querySelector('.book-flow img')?.dispatchEvent(new Event('load')), 0)`);
        await sleep(450);
        const r = await p.ev(landed(a));
        if (!r.found || !r.inside || !r.focused) bad.push(a);
      }
      return { ok: bad.length === 0, numbers: { anchors: anchors.length, failed: bad.length }, note: bad.slice(0, 3).join(' ') };
    });

    // controls, keys, swipe
    await p.ev(`(location.hash = '', document.querySelector('.book-viewport').focus(), 0)`);
    await p.key('Home');
    const multi = !!ind0 && ind0.count > 1;
    const page = async () => (parseIndicator(await p.ev(INDICATOR)) ?? { page: 0, count: 0 });
    await step('buttons turn pages', async () => {
      if (!multi) return { ok: true, note: 'single page' };
      // the two buttons with aria-disabled are previous (first) and next (second)
      const before = await page();
      await p.ev(`(() => { const b = [...document.querySelectorAll('.book-controls button')].filter((x) => x.hasAttribute('aria-disabled')); b[1].click(); })()`);
      await sleep(450);
      const afterNext = await page();
      await p.ev(`(() => { const b = [...document.querySelectorAll('.book-controls button')].filter((x) => x.hasAttribute('aria-disabled')); b[0].click(); })()`);
      await sleep(450);
      const afterPrev = await page();
      return { ok: afterNext.page === before.page + 1 && afterPrev.page === before.page, numbers: { before: before.page, next: afterNext.page, prev: afterPrev.page } };
    });
    await step('arrow keys, Home, End, PageUp, PageDown', async () => {
      if (!multi) return { ok: true, note: 'single page' };
      await p.key('Home');
      const a = (await page()).page;
      await p.key('ArrowRight');
      const b = (await page()).page;
      await p.key('ArrowLeft');
      const c = (await page()).page;
      await p.key('PageDown');
      const d = (await page()).page;
      await p.key('PageUp');
      const e = (await page()).page;
      await p.key('End');
      const f = (await page()).page;
      await p.key('Home');
      const g = (await page()).page;
      return { ok: a === 1 && b === 2 && c === 1 && d === 2 && e === 1 && f === ind0.count && g === 1, numbers: { a, b, c, d, e, f, g } };
    });
    await step('swipe turns pages', async () => {
      if (!multi) return { ok: true, note: 'single page' };
      // The book sits below the page header: bring it into the window and read its position right before each swipe, or
      // the touch lands outside it (on the header). Images above it can still load and move it, so it is read every time.
      const swipe = async (from, to) => {
        await p.ev(`(document.querySelector('.book-viewport').scrollIntoView({ block: 'center' }), 0)`);
        await sleep(300);
        const y = Math.round(await p.ev(`(() => { const r = document.querySelector('.book-viewport').getBoundingClientRect(); const t = Math.max(r.top, 0); return t + (Math.min(r.bottom, innerHeight) - t) / 2; })()`));
        await p.drag(from, y, to);
      };
      const x1 = Math.round(width * 0.8);
      const x2 = Math.round(width * 0.2);
      const a = (await page()).page;
      await swipe(x1, x2);
      const b = (await page()).page;
      await swipe(x2, x1);
      const c = (await page()).page;
      return { ok: a === 1 && b === 2 && c === 1, numbers: { a, b, c } };
    });
    await step('indicator text', async () => {
      const t = await p.ev(INDICATOR);
      const n = parseIndicator(t);
      return { ok: !!n && n.page === 1 && n.count === ind0?.count, numbers: { page: n?.page ?? 0, count: n?.count ?? 0 } };
    });

    // toggle keeps the chapter
    await step('toggle keeps the chapter', async () => {
      const a = anchors.find((x) => /--ch-2$/.test(x)) ?? anchors[0];
      if (!a) return { ok: false, note: 'no anchor' };
      await p.ev(`(location.hash = '', 0)`);
      await sleep(120);
      await p.ev(`(location.hash = ${JSON.stringify(`#${a}`)}, 0)`);
      await sleep(450);
      await p.ev(`document.querySelector('.book-controls button[aria-pressed]').click(); 0`);
      await sleep(700);
      const inScroll = (await p.ev(VIEW)) === 'scroll' && (await p.ev(visibleInPage(a)));
      await p.ev(`document.querySelector('.book-controls button[aria-pressed]').click(); 0`);
      await sleep(700);
      const back = (await p.ev(VIEW)) === 'pages' && (await p.ev(landed(a))).inside;
      return { ok: inScroll && back, numbers: { scroll_view_shows_chapter: inScroll ? 1 : 0, pages_view_shows_chapter: back ? 1 : 0 } };
    });

    // reflow: the hash wins on resize (desktop only)
    if (!mobile) {
      await step('hash wins on resize', async () => {
        const a = anchors.find((x) => /--ch-3$/.test(x)) ?? anchors[anchors.length - 1];
        if (!a) return { ok: false, note: 'no anchor' };
        await p.ev(`(location.hash = '', 0)`);
        await sleep(120);
        await p.ev(`(location.hash = ${JSON.stringify(`#${a}`)}, 0)`);
        await sleep(450);
        await p.send('Emulation.setDeviceMetricsOverride', { width: 900, height: 800, deviceScaleFactor: 1, mobile: false });
        await sleep(900);
        const r = await p.ev(landed(a));
        await p.send('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 1, mobile: false });
        await sleep(600);
        return { ok: r.found && r.inside, numbers: { inside_after_resize: r.inside ? 1 : 0 } };
      });
    }

    // contrast of what is really rendered
    await step('ink and paper contrast >= 4.5', async () => {
      const c = await p.ev(`(() => {
        const col = (s) => s && getComputedStyle(s).color;
        const vp = document.querySelector('.book-viewport');
        return { paper: getComputedStyle(vp).backgroundColor, body: col(document.querySelector('.book [data-block]')),
          heading: col(document.querySelector('.book h2, .book h3')), link: col(document.querySelector('.book a:not(.contents-link):not(.btn)')) };
      })()`);
      const floor = PAPER_FLOOR;
      const nums = {};
      let ok = true;
      for (const k of ['body', 'heading', 'link']) {
        if (!c[k]) continue;
        const r = contrastOfCss(c[k], floor);
        const rp = contrastOfCss(c[k], c.paper);
        nums[`${k}_on_floor`] = r === null ? 0 : Math.round(r * 100) / 100;
        if (rp !== null) nums[`${k}_on_tint`] = Math.round(rp * 100) / 100;
        if (r === null || r < AA_TEXT || (rp !== null && rp < AA_TEXT)) ok = false;
      }
      return { ok: ok && 'body' in c && !!c.body, numbers: nums };
    });
  } catch (e) {
    record(`${tag} page`, false, {}, String(e?.message ?? e).slice(0, 160));
  } finally {
    await p.close();
  }
}

async function checkMotion(cdp, opts, id, record) {
  for (const reduced of [false, true]) {
    const name = `${id} turn transition ${reduced ? 'reduced motion' : 'normal'}`;
    const p = await Page.open(cdp, { width: 1280, height: 800, reduced });
    try {
      await p.goto(`${opts.base}/legends/${id}`);
      const ms = maxDurationMs(await p.ev(`getComputedStyle(document.querySelector('.book-flow')).transitionDuration`));
      record(name, reduced ? ms === 0 : ms > 0 && ms <= 400, { ms });
    } catch (e) {
      record(name, false, {}, String(e?.message ?? e).slice(0, 160));
    } finally {
      await p.close();
    }
  }
}

async function checkRtl(cdp, opts, id, record) {
  const name = `${id} arrow keys swap in RTL`;
  // The Arabic path is the `lang=ar` cookie, which only counts when the server has FEATURE_ARABIC on.
  const host = new URL(opts.base);
  const p = await Page.open(cdp, { width: 1280, height: 800, cookies: [{ name: 'lang', value: 'ar' }], base: `${host.protocol}//${host.host}` });
  try {
    await p.goto(`${opts.base}/legends/${id}`);
    if ((await p.ev(`document.documentElement.dir`)) !== 'rtl') {
      record(name, 'skip', {}, 'Arabic flag path not reachable (server has FEATURE_ARABIC off)');
      return;
    }
    const page = async () => (parseIndicator(await p.ev(INDICATOR)) ?? { page: 0, count: 0 });
    await p.ev(`document.querySelector('.book-viewport').focus(); 0`);
    await p.key('Home');
    const a = (await page()).page;
    await p.key('ArrowLeft');
    const b = (await page()).page;
    await p.key('ArrowRight');
    const c = (await page()).page;
    record(name, a === 1 && b === 2 && c === 1, { a, b, c });
  } catch (e) {
    record(name, false, {}, String(e?.message ?? e).slice(0, 160));
  } finally {
    await p.close();
  }
}

async function checkKeepersRedirect(cdp, opts, record) {
  const name = 'anchor route keepers-note--ch-1';
  const p = await Page.open(cdp, { width: 390, height: 844, mobile: true, dpr: 2 });
  try {
    await p.goto(`${opts.base}/anchor/${KEEPERS_NOTE}--ch-1`);
    await sleep(600);
    const r = await p.ev(`({ path: location.pathname, hash: location.hash, count: document.querySelectorAll('[id="keepers-note--ch-1"]').length })`);
    record(name, r.path === `/legends/${KEEPERS_NOTE}` && r.hash === `#${KEEPERS_NOTE}--ch-1` && r.count === 1, { elements: r.count });
  } catch (e) {
    record(name, false, {}, String(e?.message ?? e).slice(0, 160));
  } finally {
    await p.close();
  }
}

/** Paper texture load time on the Slow 4G profile (same numbers as the game's timing check: 150 ms, 1.6 Mbit/s down, 750 kbit/s up, CPU x4). */
async function checkTexture(cdp, opts, id, record) {
  const name = 'paper texture load on Slow 4G';
  const p = await Page.open(cdp, { width: 390, height: 844, mobile: true, dpr: 2 });
  try {
    await p.send('Network.setCacheDisabled', { cacheDisabled: true });
    await p.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: Math.round((1.6 * 1024 * 1024) / 8), uploadThroughput: Math.round((750 * 1024) / 8) });
    await p.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await p.goto(`${opts.base}/legends/${id}`, 120000);
    await p.waitFor(`performance.getEntriesByType('resource').some((e) => e.name.includes('shared-atlas-paper-01') && e.responseEnd > 0)`, 60000, 'paper texture');
    const t = await p.ev(`(() => { const e = performance.getEntriesByType('resource').find((x) => x.name.includes('shared-atlas-paper-01')); return { start_ms: Math.round(e.startTime), end_ms: Math.round(e.responseEnd), duration_ms: Math.round(e.duration), bytes: e.encodedBodySize }; })()`);
    record(name, t.bytes > 0, t);
  } catch (e) {
    record(name, false, {}, String(e?.message ?? e).slice(0, 160));
  } finally {
    await p.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(String(e?.message ?? e));
    process.exit(2);
  });
}
