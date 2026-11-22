// Phase 6 browser contrast scan for the atlas (ui-rework task 2.5; requirements 12.8, 36.6, 36.7).
// Walks every text node of Banshee and Naddaha in Book_View and Scroll_View at 390 and 1280 px, computes colour against the
// effective background, and fails below 4.5:1 (3:1 for large text, from the computed size and weight). Needs a RUNNING atlas.
//   node apps/atlas/scripts/ui-check.mjs [--base http://localhost:3001] [--legends banshee,naddaha] [--shots .debug/phase-6] [--tag after]
// Prints numbers only. Exit 1 on any failure.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const AA_TEXT = 4.5;
export const AA_LARGE = 3;
/** Large text per WCAG: at least 24 px, or at least 18.66 px and bold. */
export const isLargeText = (px, weight) => px >= 24 || (px >= 18.66 && weight >= 700);
export const requiredRatio = (px, weight) => (isLargeText(px, weight) ? AA_LARGE : AA_TEXT);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SCAN = `(() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (top, under) => { const a = top[3] + under[3] * (1 - top[3]); return a === 0 ? [0, 0, 0, 0] : [0, 1, 2].map((i) => (top[i] * top[3] + under[i] * under[3] * (1 - top[3])) / a).concat(a); };
  const lum = ([r, g, b]) => { const f = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (el) => { let acc = [0, 0, 0, 0]; for (let e = el; e; e = e.parentElement) { acc = over(acc, rgba(getComputedStyle(e).backgroundColor)); if (acc[3] >= 0.999) break; } return over(acc, [255, 255, 255, 1]); };
  const opacityOf = (el) => { let o = 1; for (let e = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; };
  const out = []; const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.textContent.replace(/\\s+/g, ' ').trim();
    const el = n.parentElement;
    if (!text || !el || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (el.closest('[hidden], [aria-hidden="true"]') && !el.closest('[data-keep]')) { /* decorative marks still count when painted */ }
    const bg = bgOf(el); const c = rgba(s.color);
    const fg = over([c[0], c[1], c[2], c[3] * opacityOf(el)], bg);
    const px = parseFloat(s.fontSize); const weight = Number(s.fontWeight) || 400;
    const key = [el.tagName, el.className, s.color, s.opacity, bg.map((v) => Math.round(v)).join(','), px, weight].join('|');
    if (seen.has(key)) continue; seen.add(key);
    out.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 50), text: text.slice(0, 40), px, weight, ratio: ratio(fg, bg) });
  }
  return out;
})()`;

class Cdp {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map();
    ws.addEventListener('message', (m) => {
      const msg = JSON.parse(String(m.data));
      if (!msg.id) return;
      const p = this.pending.get(msg.id); this.pending.delete(msg.id);
      if (p) msg.error ? p.reject(new Error(`${p.method}: ${msg.error.message}`)) : p.resolve(msg.result ?? {});
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject, method }));
  }
}

async function main() {
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
  const base = arg('base', 'http://localhost:3001').replace(/\/+$/, '');
  const legends = arg('legends', 'banshee,naddaha').split(',').filter(Boolean);
  const shots = join(root, arg('shots', '.debug/phase-6'));
  const tag = arg('tag', 'after');
  mkdirSync(shots, { recursive: true });
  const chrome = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => p && existsSync(p));
  if (!chrome) throw new Error('No Chrome binary found. Set CHROME_BIN.');
  const dir = mkdtempSync(join(tmpdir(), 'kw-aui-'));
  const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  const f = join(dir, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !existsSync(f); i++) await sleep(100);
  const [port] = readFileSync(f, 'utf8').trim().split('\n');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const cdp = new Cdp(new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl));
  await new Promise((r) => cdp.ws.addEventListener('open', r));
  for (const d of ['Page', 'Runtime']) await cdp.send(`${d}.enable`);
  const ev = async (e) => {
    const r = await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const results = [];
  let failed = false;
  try {
    for (const id of legends) {
      for (const w of [390, 1280]) {
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: w === 390 ? 844 : 800, deviceScaleFactor: 1, mobile: w === 390 });
        await cdp.send('Page.navigate', { url: `${base}/legends/${id}` });
        const end = Date.now() + 60000;
        while (Date.now() < end && !(await ev(`(() => { const e = document.querySelector('.book-viewport'); return !!e && Object.keys(e).some((k) => k.startsWith('__reactFiber')) && !!document.documentElement.dataset.book; })()`).catch(() => false))) await sleep(200);
        await sleep(500);
        for (const wanted of ['pages', 'scroll']) {
          const view = await ev(`document.querySelector('.book')?.dataset.view`);
          if (view !== wanted) {
            await ev(`document.querySelector('.book-controls button[aria-pressed]')?.click()`);
            await sleep(700);
          }
          const actual = await ev(`document.querySelector('.book')?.dataset.view ?? 'none'`);
          if (actual !== wanted) {
            results.push({ legend: id, width: w, view: wanted, note: `could not reach ${wanted} view (got ${actual})`, fails: 1 });
            failed = true;
            continue;
          }
          const items = await ev(SCAN);
          const bad = items.filter((x) => x.ratio < requiredRatio(x.px, x.weight));
          const min = items.reduce((a, x) => Math.min(a, x.ratio), Infinity);
          const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
          if (id === 'banshee') writeFileSync(join(shots, `item3-atlas-${wanted}-${w}-${tag}.png`), Buffer.from(data, 'base64'));
          results.push({ legend: id, width: w, view: wanted, nodes: items.length, min: Number(min.toFixed(2)), fails: bad.length, bad: bad.slice(0, 8) });
          if (bad.length) failed = true;
        }
      }
    }
  } finally {
    proc.kill();
  }
  for (const r of results) {
    console.log(`${r.fails ? 'FAIL' : 'PASS'} ${r.legend} ${r.width} ${r.view} ${r.note ?? `groups ${r.nodes} min ${r.min}`}`);
    for (const b of r.bad ?? []) console.log(`   ${b.ratio.toFixed(2)} ${b.px}px/${b.weight} <${b.tag} class="${b.cls}"> ${JSON.stringify(b.text)}`);
  }
  writeFileSync(join(shots, `ui-check-atlas-${tag}.json`), JSON.stringify(results, null, 1));
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(String(e?.message ?? e));
    process.exit(1);
  });
}
