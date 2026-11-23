// Browser check of the atlas header (ui-rework task 10.F6, Owner feedback F6). Needs the atlas RUNNING.
//   node apps/atlas/scripts/header-check.mjs [--base http://localhost:3001] [--shots .debug/phase-6]
// At 360, 375, 390 and 1280 px: one row, height, 44 px targets, no sideways scroll, Tab order, label-in-name.
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
const BASE = arg('base', 'http://localhost:3001').replace(/\/+$/, '');
const SHOTS = join(ROOT, arg('shots', '.debug/phase-6'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => p && existsSync(p));
if (!chrome) throw new Error('No Chrome binary found. Set CHROME_BIN.');
const dir = mkdtempSync(join(tmpdir(), 'kw-ahdr-'));
const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--no-first-run', '--disable-gpu', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
const f = join(dir, 'DevToolsActivePort');
for (let i = 0; i < 100 && !existsSync(f); i++) await sleep(100);
const [port] = readFileSync(f, 'utf8').trim().split('\n');
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (m) => {
  const msg = JSON.parse(String(m.data));
  const p = msg.id && pending.get(msg.id);
  if (p) p(msg.result ?? {});
});
const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const key = (k, code, vk) => send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk }).then(() => send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk }));

const results = [];
const check = (name, ok, detail) => results.push({ name, ok: !!ok, detail });
mkdirSync(SHOTS, { recursive: true });
try {
  await send('Page.enable');
  await send('Runtime.enable');
  for (const w of [360, 375, 390, 1280]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: 800, deviceScaleFactor: 1, mobile: w < 600 });
    await send('Page.navigate', { url: `${BASE}/` });
    for (let i = 0; i < 100 && !(await ev(`!!document.querySelector('header nav a.nav-play')`)); i++) await sleep(200);
    await sleep(800);
    const m = await ev(`(() => { const r = (e) => e.getBoundingClientRect(); const nav = document.querySelector('header nav'); const header = document.querySelector('header');
      const links = [...nav.querySelectorAll('a')]; const play = nav.querySelector('a.nav-play');
      return { headerH: Math.round(r(header).height * 10) / 10, tops: [...new Set(links.map((e) => Math.round(r(e).top)))], heights: links.map((e) => Math.round(r(e).height * 10) / 10),
        overflow: document.documentElement.scrollWidth > innerWidth, visible: play.innerText.trim(), name: play.getAttribute('aria-label'), names: links.map((e) => e.getAttribute('aria-label') ?? e.innerText.trim()) }; })()`);
    const d = JSON.stringify(m);
    check(`${w}: one row`, m.tops.length === 1, d);
    check(`${w}: no sideways scroll`, !m.overflow, d);
    check(`${w}: every link at least 44 px tall`, m.heights.every((h) => h >= 44), d);
    check(`${w}: label-in-name`, m.name && m.name.toLowerCase().includes(m.visible.toLowerCase()), d);
    check(`${w}: visible label`, m.visible === (w < 640 ? 'Play' : 'Play Trick or True'), d);
    await ev(`document.activeElement?.blur(); document.body.focus()`);
    const order = [];
    for (let i = 0; i < 4; i++) {
      await key('Tab', 'Tab', 9);
      const hit = await ev(`document.activeElement?.closest('header nav') ? (document.activeElement.getAttribute('href') ?? '') : ''`);
      if (hit) order.push(hit);
    }
    // skip link may come first; the nav links must be in the order logo, legends, game
    check(`${w}: Tab order logo, legends, game`, JSON.stringify(order.slice(0, 3)) === JSON.stringify(['/', '/#legends', '/game/']), JSON.stringify(order));
    console.log(`${w}: header ${m.headerH} px, tops ${m.tops}, heights ${m.heights}`);
    await send('Page.captureScreenshot', { format: 'png' }).then((r) => writeFileSync(join(SHOTS, `f6-header-${w}-after.png`), Buffer.from(r.data, 'base64')));
  }
} finally {
  proc.kill();
}
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}${r.ok ? '' : ' ' + (r.detail ?? '')}`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
