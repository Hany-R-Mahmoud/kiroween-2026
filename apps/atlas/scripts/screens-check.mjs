// Phase 6 screen check for the atlas (ui-rework task 8.2; requirements 36.1, 36.2, 36.7).
// At 390x844 and 1280x800 against a RUNNING built atlas: home, world map (pin opens its card), one legend page in Book_View and
// Scroll_View with its references (#sources), and one anchor link. Guest only, no sign-in. Prints PASS/FAIL and numbers only.
//   node apps/atlas/scripts/screens-check.mjs [--base http://localhost:3001] [--legend banshee] [--shots .debug/phase-6]
// Screenshots: `<shots>/screens-atlas-<screen>-<width>.png`; numbers: `<shots>/screens-atlas.json`. Exit 1 on any FAIL.
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
const LEGEND = arg('legend', 'banshee');
const SHOTS = join(ROOT, arg('shots', '.debug/phase-6'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const R = `const R=(el)=>{if(!el)return null;const r=el.getBoundingClientRect();return {t:Math.round(r.top),b:Math.round(r.bottom),l:Math.round(r.left),r:Math.round(r.right),w:Math.round(r.width),h:Math.round(r.height)}};`;
const inView = `(el)=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.right>0&&r.left<innerWidth&&r.bottom>0&&r.top<innerHeight}`;
async function main() {
  const chrome = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => p && existsSync(p));
  if (!chrome) throw new Error('No Chrome binary found. Set CHROME_BIN.');
  const dir = mkdtempSync(join(tmpdir(), 'kw-scr-'));
  const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  const f = join(dir, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !existsSync(f); i++) await sleep(100);
  const [port, path] = readFileSync(f, 'utf8').trim().split('\n');
  const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pend = new Map();
  ws.addEventListener('message', (m) => {
    const x = JSON.parse(String(m.data));
    if (x.id && pend.has(x.id)) pend.get(x.id)(x);
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((res, rej) => {
      const i = ++id;
      pend.set(i, (x) => (x.error ? rej(new Error(`${method}: ${x.error.message}`)) : res(x.result ?? {})));
      ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  const SIZES = { 360: [360, 780, true], 390: [390, 844, true], 1280: [1280, 800, false] };
  async function page(w) {
    const { browserContextId } = await send('Target.createBrowserContext');
    const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
    const { sessionId: s } = await send('Target.attachToTarget', { targetId, flatten: true });
    for (const d of ['Page', 'Runtime']) await send(`${d}.enable`, {}, s);
    const [W, H, m] = SIZES[w];
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: m }, s);
    return {
      ev: async (e) => {
        const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }, s);
        if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
        return r.result?.value;
      },
      go: (url) => send('Page.navigate', { url }, s),
      key: async (key, code, vk) => {
        await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, windowsVirtualKeyCode: vk }, s);
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk }, s);
      },
      shot: async (name) => writeFileSync(join(SHOTS, `screens-atlas-${name}-${w}.png`), Buffer.from((await send('Page.captureScreenshot', { format: 'png' }, s)).data, 'base64')),
      close: async () => {
        await send('Target.closeTarget', { targetId });
        await send('Target.disposeBrowserContext', { browserContextId });
      },
    };
  }
  const results = [];
  let failed = 0;
  const check = (w, step, ok, note = '') => {
    results.push({ width: w, step, ok, note });
    console.log(`${ok ? 'PASS' : 'FAIL'} ${w} ${step}${note ? `  (${note})` : ''}`);
    if (!ok) failed++;
  };
  const until = async (p, expr, ms = 30000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (await p.ev(expr).catch(() => false)) return true;
      await sleep(200);
    }
    return false;
  };
  const hydrated = (sel) => `(()=>{const e=document.querySelector(${JSON.stringify(sel)});return !!e&&Object.keys(e).some((k)=>k.startsWith('__reactFiber')||k.startsWith('__reactProps'))})()`;
  mkdirSync(SHOTS, { recursive: true });
  try {
    for (const w of [360, 390, 1280]) {
      const p = await page(w);
      // ---- home
      await p.go(`${BASE}/legends`);
      const okHome = await until(p, hydrated('[role=region] button[popovertarget], button[popovertarget]'));
      await sleep(800);
      const home = JSON.parse(await p.ev(`(()=>{${R}return JSON.stringify({h1:R(document.querySelector('h1')),vh:innerHeight,hOverflow:document.documentElement.scrollWidth>innerWidth+1,cta:R(document.querySelector('h1')?.closest('section,header,div')?.querySelector('a.btn, button.btn'))})})()`));
      check(w, 'atlas home: hydrated, h1 in first screen, no sideways page scroll', okHome && !!home.h1 && home.h1.b <= home.vh && !home.hOverflow, `h1 ${home.h1?.t}-${home.h1?.b}, vh ${home.vh}`);
      await p.shot('home');
      // ---- map
      await p.ev(`document.querySelector('[role=region]')?.scrollIntoView({block:'start'});0`);
      await sleep(500);
      const pins = JSON.parse(await p.ev(`(()=>{const b=[...document.querySelectorAll('button[popovertarget]')].filter((x)=>!x.closest('.map-card'));return JSON.stringify({n:b.length,min:Math.min(...b.map((x)=>Math.min(x.getBoundingClientRect().width,x.getBoundingClientRect().height))),outlines:document.querySelectorAll('[role=region] svg').length})})()`));
      check(w, 'map: 12 pins, each at least 44 px, one outline', pins.n === 12 && pins.min >= 44 && pins.outlines >= 1, `pins ${pins.n}, smallest ${pins.min}, svg ${pins.outlines}`);
      await p.ev(`(()=>{const b=[...document.querySelectorAll('button[popovertarget]')].find((x)=>!x.closest('.map-card'));b.scrollIntoView({block:'center',inline:'center'});b.click();return 1})()`);
      await sleep(600);
      const card = await p.ev(`(()=>{const c=document.querySelector('.map-card:popover-open');if(!c)return null;const r=c.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height),inside:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,link:!!c.querySelector('a[href]')}})()`);
      check(w, 'map: pin opens its card inside the screen with a link', !!card && card.inside && card.link, card ? `${card.w}x${card.h}` : 'card did not open');
      await p.shot('map');
      await p.key('Escape', 'Escape', 27);
      await sleep(300);
      check(w, 'map: Escape closes the card', (await p.ev(`!document.querySelector('.map-card:popover-open')`)) === true);
      // ---- legend: book view then scroll view
      await p.go(`${BASE}/legends/${LEGEND}`);
      const okBook = await until(p, `!!document.querySelector('.book-viewport') && ${hydrated('.book-viewport')} && !!document.documentElement.dataset.book && !!document.querySelector('.book-indicator')?.textContent`, 60000);
      await sleep(600);
      for (const view of ['pages', 'scroll']) {
        if ((await p.ev(`document.querySelector('.book')?.dataset.view`)) !== view) {
          await p.ev(`document.querySelector('.book-controls button[aria-pressed]')?.click();0`);
          await sleep(900);
        }
        const actual = await p.ev(`document.querySelector('.book')?.dataset.view ?? 'none'`);
        const s = JSON.parse(await p.ev(`(()=>{${R}return JSON.stringify({view:document.querySelector('.book')?.dataset.view,indicator:document.querySelector('.book-indicator')?.textContent??null,hOverflow:document.documentElement.scrollWidth>innerWidth+1,sources:document.querySelectorAll('#sources li').length,srcLinks:document.querySelectorAll('#sources a[href^=http]').length,page:R(document.querySelector('.book-viewport'))})})()`));
        check(w, `legend ${LEGEND}: ${view === 'pages' ? 'Book_View' : 'Scroll_View'} reached, no sideways page scroll`, okBook && actual === view && !s.hOverflow, `view ${actual}${s.indicator ? `, indicator "${s.indicator}"` : ''}`);
        check(w, `legend ${LEGEND}: references in the DOM (${view})`, s.sources > 0 && s.srcLinks > 0, `${s.sources} sources, ${s.srcLinks} external links`);
        await p.shot(`legend-${view}`);
      }
      // references on screen: the contents link to #sources must bring the section into view in both views
      for (const view of ['pages', 'scroll']) {
        if ((await p.ev(`document.querySelector('.book')?.dataset.view`)) !== view) {
          await p.ev(`document.querySelector('.book-controls button[aria-pressed]')?.click();0`);
          await sleep(900);
        }
        await p.ev(`(()=>{const a=document.querySelector('a[href="#sources"]');if(a){a.scrollIntoView({block:'center'});a.click()};return !!a})()`);
        await sleep(1200);
        const seen = await p.ev(`(()=>{const e=document.getElementById('sources');return !!e&&(${inView})(e)})()`);
        check(w, `legend ${LEGEND}: references come into view from the contents link (${view})`, seen === true);
        if (view === 'pages') await p.shot('legend-references-pages');
        else await p.shot('legend-references-scroll');
      }
      // ---- anchor link (chapter 2) lands visible in book view and scroll view
      for (const view of ['pages', 'scroll']) {
        await p.go(`${BASE}/legends/${LEGEND}#${LEGEND}--ch-2`);
        await until(p, `!!document.querySelector('.book-viewport') && ${hydrated('.book-viewport')} && !!document.querySelector('.book-indicator')?.textContent`, 60000);
        await sleep(900);
        if ((await p.ev(`document.querySelector('.book')?.dataset.view`)) !== view) {
          await p.ev(`document.querySelector('.book-controls button[aria-pressed]')?.click();0`);
          await sleep(900);
          await p.ev(`(()=>{const e=document.getElementById(${JSON.stringify(`${LEGEND}--ch-2`)});e?.scrollIntoView();return 1})()`);
          await sleep(600);
        }
        const a = JSON.parse(await p.ev(`(()=>{${R}const e=document.getElementById(${JSON.stringify(`${LEGEND}--ch-2`)});return JSON.stringify({found:!!e,vis:!!e&&(${inView})(e),r:R(e),view:document.querySelector('.book')?.dataset.view})})()`));
        check(w, `anchor #${LEGEND}--ch-2 lands in view (${view})`, a.found && a.vis && a.view === view, `view ${a.view}, top ${a.r?.t}, left ${a.r?.l}`);
        await p.shot(`anchor-${view}`);
      }
      await p.close();
    }
  } finally {
    proc.kill();
  }
  writeFileSync(join(SHOTS, 'screens-atlas.json'), JSON.stringify(results, null, 1));
  console.log(`${results.length - failed} pass, ${failed} fail`);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
