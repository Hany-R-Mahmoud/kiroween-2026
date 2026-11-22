// Browser check of the game header menu (ui-rework Req 18.8, 18.9). Needs the game running:
//   node apps/game/scripts/header-check.mjs [--game http://localhost:3000/game] [--shots .debug/phase-6]
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
const SHOTS = join(ROOT, arg('shots', '.debug/phase-6'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => p && existsSync(p));
if (!chrome) throw new Error('No Chrome binary found. Set CHROME_BIN.');
const dir = mkdtempSync(join(tmpdir(), 'kw-hdr-'));
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
  for (const w of [390, 1280]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: 844, deviceScaleFactor: 1, mobile: w === 390 });
    await send('Page.navigate', { url: `${GAME}/` });
    for (let i = 0; i < 100 && !(await ev(`!!document.querySelector('#app-menu')`)); i++) await sleep(200);
    await sleep(600);
    const m = await ev(`(() => { const nav = document.querySelector('header nav'); const r = (e) => e.getBoundingClientRect();
      const kids = [...nav.children].filter((e) => getComputedStyle(e).display !== 'none' && getComputedStyle(e).display !== 'contents');
      const items = [...document.querySelectorAll('#app-menu a, #app-menu button')];
      const btn = document.querySelector('.nav-menu-button');
      return { navH: r(nav).height, tops: [...new Set(kids.map((e) => Math.round(r(e).top)))], overflow: document.documentElement.scrollWidth > innerWidth,
        btnShown: getComputedStyle(btn).display !== 'none', itemsShown: items.map((e) => e.getClientRects().length > 0), tabbable: items.length };})()`);
    if (w === 390) {
      check('390: one row', m.tops.length === 1 && !m.overflow, JSON.stringify(m));
      check('390: menu button visible', m.btnShown);
      await ev(`document.querySelector('.nav-menu-button').focus()`);
      await ev(`document.querySelector('.nav-menu-button').click()`);
      await sleep(300);
      check('390: button opens menu', await ev(`document.querySelector('#app-menu').matches(':popover-open')`));
      const shown = await ev(`[...document.querySelectorAll('#app-menu a, #app-menu button')].every((e) => e.getClientRects().length > 0)`);
      check('390: open menu shows every item', shown);
      await send('Page.captureScreenshot', { format: 'png' }).then((r) => writeFileSync(join(SHOTS, 'header-menu-390-after.png'), Buffer.from(r.data, 'base64')));
      await key('Escape', 'Escape', 27);
      await sleep(300);
      check('390: Escape closes menu', !(await ev(`document.querySelector('#app-menu').matches(':popover-open')`)));
      check('390: focus returns to button', await ev(`document.activeElement === document.querySelector('.nav-menu-button')`));
    } else {
      check('1280: one row', m.tops.length === 1, JSON.stringify(m));
      check('1280: menu button hidden', !m.btnShown);
      check('1280: every item visible', m.itemsShown.length >= 3 && m.itemsShown.every(Boolean), JSON.stringify(m.itemsShown));
      await ev(`document.activeElement?.blur(); document.body.focus()`);
      const seen = [];
      for (let i = 0; i < 12 && seen.length < 3; i++) {
        await key('Tab', 'Tab', 9);
        const hit = await ev(`document.activeElement?.closest('#app-menu') ? document.activeElement.textContent : ''`);
        if (hit && !seen.includes(hit)) seen.push(hit);
      }
      check('1280: Tab reaches every menu item', seen.length === m.tabbable, JSON.stringify(seen));
      await send('Page.captureScreenshot', { format: 'png' }).then((r) => writeFileSync(join(SHOTS, 'header-menu-1280-after.png'), Buffer.from(r.data, 'base64')));
    }
  }
} finally {
  proc.kill();
}
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}${r.ok ? '' : ' ' + (r.detail ?? '')}`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
