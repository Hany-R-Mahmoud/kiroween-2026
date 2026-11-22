// Phase 6 browser contrast scan for the game (ui-rework task 2.5; requirements 13.5, 36.6, 36.7).
// Measures every Banshee puzzle option and its focus ring at 390 and 1280 px: colour against the effective background, font
// size and weight. Needs a RUNNING game (built, with its database env). Guest only; prints numbers, never a cookie or a header.
//   node apps/game/scripts/ui-check.mjs [--game http://localhost:3000/game] [--world banshee] [--shots .debug/phase-6] [--tag after]
// Exit 1 when an option or its ring falls short.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const GAME = arg('game', 'http://localhost:3000/game').replace(/\/+$/, '');
const WORLD = arg('world', 'banshee');
const SHOTS = join(ROOT, arg('shots', '.debug/phase-6'));
const TAG = arg('tag', 'after');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const largeText = (px, weight) => px >= 24 || (px >= 18.66 && weight >= 700);
export const minRatio = (px, weight) => (largeText(px, weight) ? 3 : 4.5);

// In-page helpers: resolve any CSS colour to sRGB through a canvas, composite ancestor backgrounds.
const PAGE_LIB = `(() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (top, under) => { const a = top[3] + under[3] * (1 - top[3]); return a === 0 ? [0,0,0,0] : [0,1,2].map((i) => (top[i] * top[3] + under[i] * under[3] * (1 - top[3])) / a).concat(a); };
  const lum = ([r, g, b]) => { const f = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (el) => { const chain = []; for (let e = el; e; e = e.parentElement) chain.push(e); let acc = [0, 0, 0, 0]; for (const e of chain) { const s = getComputedStyle(e); const bg = rgba(s.backgroundColor); const o = Number(s.opacity); acc = over(acc, bg[3] ? [bg[0], bg[1], bg[2], bg[3] * 1] : bg); if (acc[3] >= 0.999) break; } return over(acc, [255, 255, 255, 1]); };
  const opacityOf = (el) => { let o = 1; for (let e = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; };
  const fgOf = (el, bg) => { const s = getComputedStyle(el); const c = rgba(s.color); const o = opacityOf(el); return over([c[0], c[1], c[2], c[3] * o], bg); };
  return { rgba, over, ratio, bgOf, fgOf, opacityOf };
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
  const chrome = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => p && existsSync(p));
  if (!chrome) throw new Error('No Chrome binary found. Set CHROME_BIN.');
  const dir = mkdtempSync(join(tmpdir(), 'kw-gui-'));
  const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--no-first-run', '--disable-gpu', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
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
  const rows = [];
  let failed = false;
  mkdirSync(SHOTS, { recursive: true });
  try {
    for (const w of [390, 1280]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: w === 390 ? 844 : 800, deviceScaleFactor: 1, mobile: w === 390 });
      await cdp.send('Page.navigate', { url: `${GAME}/world/${WORLD}` });
      const end = Date.now() + 60000;
      while (Date.now() < end && !(await ev(`!!document.querySelector('.world-fear') && Object.keys(document.querySelector('.scene-viewport') ?? {}).some((k) => k.startsWith('__reactFiber'))`).catch(() => false))) await sleep(200);
      await sleep(800);
      // Open the puzzle: click every hotspot of every scene until an option list shows (guest, no key needed).
      const tabs = await ev(`document.querySelectorAll('.scene-tab').length || 1`);
      for (let s = 0; s < tabs && !(await ev(`!!document.querySelector('.world-option')`)); s++) {
        await ev(`document.querySelectorAll('.scene-tab')[${s}]?.click()`);
        await sleep(300);
        const n = await ev(`document.querySelectorAll('button[data-hotspot]').length`);
        for (let i = 0; i < n; i++) {
          await ev(`document.querySelectorAll('button[data-hotspot]')[${i}]?.click()`);
          await sleep(120);
        }
      }
      await sleep(500);
      const optionCount = await ev(`document.querySelectorAll('.world-option').length`);
      if (!optionCount) {
        rows.push({ width: w, note: 'no puzzle option on screen after tapping every hotspot', pass: false });
        failed = true;
        continue;
      }
      await ev(`document.querySelector('.world-option')?.scrollIntoView({block:'center'})`);
      await sleep(300);
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(SHOTS, `item5-game-${w}-${TAG}.png`), Buffer.from(data, 'base64'));
      // Keyboard modality so :focus-visible applies on programmatic focus.
      await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      const measured = await ev(`(() => { const L = ${PAGE_LIB};
        return [...document.querySelectorAll('.world-option')].map((b, i) => {
          const bg = L.bgOf(b); const s = getComputedStyle(b);
          const fg = L.fgOf(b, bg);
          const px = parseFloat(s.fontSize), weight = Number(s.fontWeight) || 400;
          const textRatio = L.ratio(fg, bg);
          const bc = L.rgba(s.borderTopColor);
          const parentBg = L.bgOf(b.parentElement);
          const borderRatio = parseFloat(s.borderTopWidth) > 0 ? L.ratio(L.over(bc, bg), parentBg) : null;
          b.focus();
          const fs = getComputedStyle(b);
          const ringW = parseFloat(fs.outlineWidth); const ringC = L.rgba(fs.outlineColor);
          const ringRatio = ringW > 0 && fs.outlineStyle !== 'none' ? L.ratio(ringC, parentBg) : null;
          const t = b.cloneNode(true); t.querySelectorAll('.sr-only').forEach((x) => x.remove());
          return { i, text: t.textContent.trim().slice(0, 40), disabled: b.disabled, px, weight, textRatio, borderRatio, ringWidth: ringW, ringRatio, paper: !!b.closest('.book-paper') };
        }); })()`);
      for (const m of measured) {
        const need = minRatio(m.px, m.weight);
        const pass = m.textRatio >= need && (m.ringRatio === null ? false : m.ringRatio >= 3);
        if (!pass) failed = true;
        rows.push({ width: w, ...m, need, pass });
      }
    }
  } finally {
    proc.kill();
  }
  const fixed = (n) => (n === null || n === undefined ? 'none' : n.toFixed(2));
  for (const r of rows) {
    if (r.note) console.log(`FAIL ${r.width} ${r.note}`);
    else console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.width} option ${r.i}${r.disabled ? ' (tried)' : ''} text ${fixed(r.textRatio)} (need ${r.need}) ring ${fixed(r.ringRatio)} (need 3) border ${fixed(r.borderRatio)} ${r.px}px/${r.weight}${r.paper ? ' paper' : ''}`);
  }
  writeFileSync(join(SHOTS, `ui-check-game-${TAG}.json`), JSON.stringify(rows, null, 1));
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
