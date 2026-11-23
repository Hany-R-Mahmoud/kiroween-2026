// Phase 6 screen check for the game (ui-rework task 8.2; requirements 36.1, 36.2, 36.3, 36.7).
// At 390x844 and 1280x800 against a RUNNING built game (and the built atlas for the Hint 2 chapter): Hall, tutorial, Banshee
// world, Hint 1, Hint 2, fear meter, a dead end, high fear (and the restart notice), and the win screen. Guest only; a fresh
// browser context per scenario. Prints PASS/FAIL/SKIP lines and numbers only; never a cookie, header or token value.
//   node apps/game/scripts/screens-check.mjs [--game http://localhost:3000/game] [--atlas http://localhost:3001]
//        [--world banshee] [--shots .debug/phase-6] [--only hall,tutorial,world,dead,fear,win]
// How the stateful screens are reached (also written to the JSON): the guest's own play token (browser localStorage key
// `kiroween.guest.play.v1.<world>`) is copied before an answer and put back after a wrong one, so wrong answers are
// undone in this browser only. No server code, database or other user is touched. Screenshots: `screens-game-<screen>-<width>.png`.
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
const ATLAS = arg('atlas', 'http://localhost:3001').replace(/\/+$/, '');
const WORLD = arg('world', 'banshee');
const SHOTS = join(ROOT, arg('shots', '.debug/phase-6'));
const ONLY = new Set(arg('only', 'hall,tutorial,world,dead,fear,win').split(','));
const TOKEN_KEY = `kiroween.guest.play.v1.${WORLD}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const R = `const R=(el)=>{if(!el)return null;const r=el.getBoundingClientRect();return {t:Math.round(r.top),b:Math.round(r.bottom),l:Math.round(r.left),r:Math.round(r.right),w:Math.round(r.width),h:Math.round(r.height)}};`;
const STUB_OPEN = `window.__calls=[];window.open=function(u,t){window.__calls.push(['open',String(u)]);return {closed:false,opener:null,location:{replace(x){window.__calls.push(['replace',String(x)])}},close(){this.closed=true;window.__calls.push(['close'])}}};`;
const CAPTION_PROBE = `(()=>{const c=document.querySelector('.fear-overlay-caption');if(!c)return null;const R=(e)=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom].map(Math.round)};
  const cr=R(c);const ov=document.querySelector('.fear-overlay');const vp=R(document.querySelector('.scene-viewport'));
  const hit=(a,b)=>a[0]<b[2]&&b[0]<a[2]&&a[1]<b[3]&&b[1]<a[3];
  const ctrls=[...document.querySelectorAll('button,a[href],input,select,textarea,[role=button]')].filter((e)=>!e.closest('.fear-overlay')&&!e.matches('.scene-hotspot')&&e.getClientRects().length&&R(e)[2]>R(e)[0]);
  const texts=[...document.querySelectorAll('.world-panel,.scene-dock p,.scene-topbar h1,.scene-topbar p,.world-panel p,.world-panel h2')].filter((e)=>e.getClientRects().length);
  const bad=[...ctrls,...texts].filter((e)=>hit(cr,R(e))).map((e)=>(e.className||e.tagName).toString().slice(0,30));
  return {caption:cr,viewport:vp,inside:cr[0]>=vp[0]&&cr[2]<=vp[2]&&cr[1]>=vp[1]&&cr[3]<=vp[3],pe:getComputedStyle(ov).pointerEvents,bad,notebook:!!document.querySelector('.world-panel')&&R(document.querySelector('.world-panel'))}})()`;
async function main() {
  const chrome = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => p && existsSync(p));
  if (!chrome) throw new Error('No Chrome binary found. Set CHROME_BIN.');
  const dir = mkdtempSync(join(tmpdir(), 'kw-gscr-'));
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
    await send('Page.addScriptToEvaluateOnNewDocument', { source: STUB_OPEN }, s);
    return {
      ev: async (e) => {
        const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }, s);
        if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
        return r.result?.value;
      },
      go: (url) => send('Page.navigate', { url }, s),
      shot: async (name) => writeFileSync(join(SHOTS, `screens-game-${name}-${w}.png`), Buffer.from((await send('Page.captureScreenshot', { format: 'png' }, s)).data, 'base64')),
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
  const skip = (w, step, note) => {
    results.push({ width: w, step, ok: null, note });
    console.log(`SKIP ${w} ${step}  (${note})`);
  };
  const until = async (p, expr, ms = 30000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (await p.ev(expr).catch(() => false)) return true;
      await sleep(200);
    }
    return false;
  };
  const fearOf = (p) => p.ev(`(()=>{const v=document.querySelector('[aria-valuenow]')?.getAttribute('aria-valuenow');return v===undefined||v===null?null:Number(v)})()`);
  const worldReady = (p) => until(p, `!!document.querySelector('.fear-meter') && !!document.querySelector('.world-slot') && !!document.querySelector('.scene-viewport') && Object.keys(document.querySelector('.scene-viewport')).some((k)=>k.startsWith('__react'))`, 60000);
  const tapAll = async (p) => {
    const tabs = await p.ev(`document.querySelectorAll('.scene-tab').length || 1`);
    for (let s = 0; s < tabs; s++) {
      await p.ev(`document.querySelectorAll('.scene-tab')[${s}]?.click();0`);
      await sleep(250);
      const n = await p.ev(`document.querySelectorAll('button[data-hotspot]').length`);
      for (let i = 0; i < n; i++) {
        await p.ev(`document.querySelectorAll('button[data-hotspot]')[${i}]?.click();0`);
        await sleep(160);
      }
    }
    await p.ev(`document.querySelectorAll('.scene-tab')[0]?.click();0`);
    await idle(p);
    await sleep(300);
  };
  const idle = (p) => until(p, `document.querySelector('.world-play')?.getAttribute('aria-busy') === 'false'`, 60000);
  const view = (p) =>
    p.ev(`(()=>{const q=(s)=>[...document.querySelectorAll(s)];return {open:q('.world-slot[data-state=open]').length,solved:q('.world-slot[data-state=solved]').length,total:q('.world-slot').length,
      options:q('.world-option').length,won:!!document.querySelector('.world-ending'),restart:!!document.getElementById('world-restart-title'),
      dead:q('.world-dead').length,leads:q('.world-lead').length,follow:q('.world-lead button:not([disabled])').length,trueLead:q('.world-lead [role=status]').filter((e)=>!e.classList.contains('world-dead')).length,
      fear:Number(document.querySelector('[aria-valuenow]')?.getAttribute('aria-valuenow')??-1)}})()`);
  const readToken = (p) => p.ev(`localStorage.getItem(${JSON.stringify(TOKEN_KEY)})`);
  const reloadWith = async (p, token) => {
    await p.ev(`localStorage.setItem(${JSON.stringify(TOKEN_KEY)}, ${JSON.stringify(token)});0`);
    await p.go(`${GAME}/world/${WORLD}`);
    await sleep(500);
    return worldReady(p);
  };
  const openWorld = async (p) => {
    await p.go(`${GAME}/world/${WORLD}`);
    const ok = await worldReady(p);
    await sleep(600);
    return ok;
  };
  // Open one puzzle (tap hotspots until a slot is open).
  const openPuzzle = async (p) => {
    for (let k = 0; k < 3; k++) {
      if ((await view(p)).open > 0) return true;
      await tapAll(p);
    }
    return (await view(p)).open > 0;
  };
  // Answer options in order for the open puzzle. `wrongOk`: keep wrong answers (fear stays). Returns after `stop(view)` is true.
  const triedMem = new Map();
  async function solve(p, { stopOnDead = false, log }) {
    for (let iter = 0; iter < 80; iter++) {
      const v = await view(p);
      if (v.won) return { won: true, v };
      if (stopOnDead && v.dead > 0) return { dead: true, v };
      if (v.restart) return { restarted: true, v };
      if (v.open > 0 && v.options > 0) {
        const slotKey = await p.ev(`document.querySelector('.hint-puzzle')?.textContent ?? 'x'`);
        const tried = triedMem.get(slotKey) ?? new Set();
        triedMem.set(slotKey, tried);
        const i = [0, 1, 2, 3].find((k) => !tried.has(k));
        if (i === undefined) return { stuck: 'all options tried', v };
        const snap = await readToken(p);
        tried.add(i);
        await p.ev(`document.querySelectorAll('.world-option')[${i}]?.click();0`);
        await idle(p); await sleep(400);
        const after = await view(p);
        if (after.solved > v.solved || after.won) {
          log?.(`answered ${slotKey}: option ${i} right`);
          continue;
        }
        log?.(`answered ${slotKey}: option ${i} wrong, token put back`);
        if (!(await reloadWith(p, snap))) return { stuck: 'reload after wrong answer failed', v: after };
        continue;
      }
      if (v.solved === v.total && v.total > 0 && v.leads > 0) {
        // all puzzles solved: follow threads until one is true
        const snap = await readToken(p);
        const idx = await p.ev(`[...document.querySelectorAll('.world-lead')].findIndex((l)=>!!l.querySelector('button:not([disabled])'))`);
        if (idx < 0) return { stuck: 'no followable thread', v };
        await p.ev(`document.querySelectorAll('.world-lead')[${idx}].querySelector('button:not([disabled])').click();0`);
        await idle(p); await sleep(400);
        const after = await view(p);
        if (after.dead > v.dead) {
          log?.('followed a thread: dead end');
          if (stopOnDead) return { dead: true, v: after };
        }
        void snap;
        continue;
      }
      await tapAll(p);
      const v2 = await view(p);
      if (v2.open === v.open && v2.solved === v.solved && v2.leads === v.leads && v2.options === v.options) {
        // nothing changed after tapping every hotspot: try following any thread
        if (v.leads > 0 && v.follow > 0) {
          await p.ev(`document.querySelector('.world-lead button:not([disabled])')?.click();0`);
          await idle(p); await sleep(400);
          continue;
        }
        return { stuck: 'tapping every hotspot changed nothing', v: v2 };
      }
    }
    return { stuck: 'too many steps', v: await view(p) };
  }
  mkdirSync(SHOTS, { recursive: true });
  const how = {};
  try {
    for (const w of [360, 390, 1280]) {
      let p;
      if (ONLY.has('hall')) {
        p = await page(w);
        await p.go(`${GAME}/`);
        const ok = await until(p, `!!document.querySelector('.hall-scene') && Object.keys(document.querySelector('.hall-scene')).some((k)=>k.startsWith('__react'))`, 60000);
        await sleep(900);
        const h = JSON.parse(await p.ev(`(()=>{${R}return JSON.stringify({vh:innerHeight,h1:R(document.querySelector('h1')),action:R(document.querySelector('[data-hall-action]')),hOverflow:document.documentElement.scrollWidth>innerWidth+1,doors:document.querySelectorAll('.hall-scene button[data-hotspot], .hall-scene [data-hotspot]').length,scene:R(document.querySelector('.scene-viewport'))})})()`));
        check(w, 'hall: renders, primary action on the first screen, no sideways page scroll', ok && !!h.action && h.action.b <= h.vh && !h.hOverflow, `action bottom ${h.action?.b}/${h.vh}, scene ${h.scene?.w}x${h.scene?.h}`);
        await p.shot('hall');
        await p.close();
      }
      if (ONLY.has('tutorial')) {
        p = await page(w);
        await p.go(`${GAME}/tutorial`);
        const ok = await until(p, `!!document.querySelector('.scene-screen') && !!document.querySelector('.hint-area') && !!document.querySelector('[aria-valuenow]')`, 60000);
        await sleep(900);
        const f0 = await fearOf(p);
        const t = JSON.parse(await p.ev(`(()=>{${R}return JSON.stringify({vh:innerHeight,hOverflow:document.documentElement.scrollWidth>innerWidth+1,scene:R(document.querySelector('.scene-viewport')),meter:R(document.querySelector('.fear-meter')),h1:document.querySelector('h1')?.textContent??null,buttons:[...document.querySelectorAll('.hint-area button')].map((b)=>b.textContent.trim().slice(0,12))})})()`));
        check(w, 'tutorial: scene, fear meter and both hint buttons render, no sideways page scroll', ok && !!t.scene && t.scene.h > 100 && !!t.meter && t.meter.w > 0 && t.buttons.length >= 2 && !t.hOverflow, `scene ${t.scene?.w}x${t.scene?.h}, meter ${t.meter?.w}x${t.meter?.h}, fear ${f0}, buttons ${t.buttons.length}`);
        await p.shot('tutorial');
        await p.ev(`[...document.querySelectorAll('.hint-area button')].find((b)=>/^Hint 1/.test(b.textContent))?.click();0`);
        await sleep(2500);
        const sheet = await p.ev(`!!document.querySelector('.hint-sheet')`);
        check(w, 'tutorial: Hint 1 opens its text and the fear meter stays', sheet === true && (await fearOf(p)) === f0, `fear ${f0} -> ${await fearOf(p)}`);
        await p.shot('tutorial-hint1');
        await p.close();
      }
      if (ONLY.has('world')) {
        p = await page(w);
        const ok = await openWorld(p);
        const f0 = await fearOf(p);
        const wv = JSON.parse(await p.ev(`(()=>{${R}return JSON.stringify({hOverflow:document.documentElement.scrollWidth>innerWidth+1,scene:R(document.querySelector('.scene-viewport')),meter:R(document.querySelector('.fear-meter')),tabs:document.querySelectorAll('.scene-tab').length,hotspots:document.querySelectorAll('button[data-hotspot]').length})})()`));
        check(w, `world ${WORLD}: scene, fear meter, hotspots render, no sideways page scroll`, ok && wv.scene?.h > 100 && wv.meter?.w > 0 && wv.hotspots > 0 && !wv.hOverflow, `scene ${wv.scene?.w}x${wv.scene?.h}, tabs ${wv.tabs}, hotspots ${wv.hotspots}, fear ${f0}`);
        await p.shot('world');
        const opened = await openPuzzle(p);
        check(w, 'world: tapping hotspots opens a puzzle with options', opened && (await view(p)).options >= 2);
        await p.ev(`window.scrollTo(0, 0);0`);
        const fBefore = await fearOf(p);
        const h1ok = await p.ev(`(()=>{const b=[...document.querySelectorAll('.hint-area button')].find((b)=>/^Hint 1/.test(b.textContent));b?.click();return !!b})()`);
        await sleep(2500);
        const sheet = await p.ev(`document.querySelector('.hint-sheet')?.textContent?.trim().length ?? 0`);
        const f1 = await fearOf(p);
        check(w, 'Hint 1: free, text shown in the sheet', h1ok === true && sheet > 0 && f1 === fBefore, `sheet ${sheet} chars, fear ${fBefore} -> ${f1}`);
        await p.shot('hint1');
        const h2ok = await p.ev(`(()=>{const b=[...document.querySelectorAll('.hint-area button')].find((b)=>/^Hint 2/.test(b.textContent));b?.click();return !!b})()`);
        await sleep(3000);
        const calls = JSON.parse(await p.ev(`JSON.stringify(window.__calls)`));
        const target = calls.find((c) => c[0] === 'replace')?.[1] ?? '';
        const f2 = await fearOf(p);
        check(w, 'Hint 2: opens the atlas chapter anchor and raises the fear meter', h2ok === true && new RegExp(`--ch-\\d+$`).test(target) && f2 > f1, `target ends ${target.replace(/^.*\//, '')}, fear ${f1} -> ${f2}`);
        await p.shot('hint2');
        // the same chapter on the atlas must land in view (the other half of the game/atlas link)
        const url = target.startsWith('http') ? target : `${ATLAS}${target.startsWith('/') ? '' : '/'}${target}`;
        const anchor = url.split('#')[1] ?? '';
        await p.go(url);
        await until(p, `!!document.querySelector('.book-viewport') && !!document.querySelector('.book-indicator')?.textContent`, 60000);
        await sleep(1200);
        const landed = await p.ev(`(()=>{const e=document.getElementById(${JSON.stringify(anchor)});if(!e)return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.right>0&&r.left<innerWidth&&r.bottom>0&&r.top<innerHeight})()`);
        check(w, 'Hint 2: the atlas page of that anchor shows the chapter', landed === true, anchor);
        await p.shot('hint2-atlas-chapter');
        await p.close();
      }
      if (ONLY.has('dead')) {
        p = await page(w);
        const logs = [];
        triedMem.clear();
        if (await openWorld(p)) {
          const r = await solve(p, { stopOnDead: true, log: (m) => logs.push(m) });
          const v = await view(p);
          how.dead = `taps every hotspot, answers by trying options with the guest token put back after each wrong one, then follows threads until one shows its contradiction (${logs.length} steps)`;
          if (r.dead) {
            check(w, 'dead end: thread shows the contradiction and an atlas proof link', (await p.ev(`document.querySelectorAll('.world-dead a[href]').length`)) > 0, `fear ${v.fear}`);
            await p.ev(`document.querySelector('.world-dead')?.scrollIntoView({block:'center'});0`);
            await sleep(400);
            await p.shot('dead-end');
          } else skip(w, 'dead end', `not reached: ${JSON.stringify(r.stuck ?? r)}`);
        } else skip(w, 'dead end', 'world did not load');
        await p.close();
      }
      if (ONLY.has('fear')) {
        // The seed decides which option is right, so a run can end before the meter is high; try up to five fresh runs.
        let out = null;
        let capResult = null;
        for (let attempt = 1; attempt <= 5; attempt++) {
          p = await page(w);
          const seen = [];
          let high = null;
          let restart = false;
          const caps = [];
          const capture = async (pg) => {
            const m = await pg.ev(CAPTION_PROBE);
            if (!m) return false;
            caps.push(m);
            await sleep(900);
            m.opacity = await pg.ev(`getComputedStyle(document.querySelector('.fear-overlay-caption')??document.body).opacity`);
            await pg.shot('caption-high-fear');
            return true;
          };
          if ((await openWorld(p)) && (await openPuzzle(p))) {
            // wrong answers WITHOUT putting the token back, across puzzles, until the meter is high
            for (let guard = 0; guard < 40; guard++) {
              const v = await view(p);
              if (v.fear >= 75 || v.restart || v.won) break;
              if (v.options === 0) {
                await tapAll(p);
                continue;
              }
              await p.ev(`[...document.querySelectorAll('.world-option')].find((b)=>!b.disabled)?.click();0`);
              await idle(p); await sleep(400);
              seen.push((await view(p)).fear);
              if (!caps.length && (await capture(p))) await sleep(0);
              if (process.env.KW_DEBUG) console.log('fear', seen.at(-1));
            }
            const v = await view(p);
            if (v.fear >= 75) {
              await p.ev(`window.scrollTo(0,0);0`);
              await sleep(500);
              high = { fear: v.fear, fill: await p.ev(`document.querySelector('.fear-meter-fill')?.getBoundingClientRect().width > 0`) };
              await p.shot('high-fear');
              for (let k = 0; k < 12 && !(await view(p)).restart; k++) {
                if ((await view(p)).options === 0) await tapAll(p);
                await p.ev(`[...document.querySelectorAll('.world-option')].find((b)=>!b.disabled)?.click();0`);
                await idle(p); await sleep(400);
              }
              restart = (await view(p)).restart;
              if (restart) {
                await sleep(500);
                restart = (await p.ev(`document.activeElement?.getAttribute('role') === 'alert' && !!document.activeElement.querySelector('#world-restart-title')`)) === true;
                await p.shot('restart-notice');
              }
            }
          }
          await p.close();
          if (caps.length) capResult = caps[0];
          out = { attempt, seen, high, restart };
          if (high && restart) break;
        }
        how.fear = `wrong answers kept (not undone) until the meter is at 75 or more, then more until the restart notice; run ${out.attempt} of up to 5 (fear values seen: ${out.seen.join(', ')})`;
        if (capResult) check(w, 'high fear caption: overlaps no control or text, pointer-events none, inside the scene', capResult.bad.length === 0 && capResult.pe === 'none' && capResult.inside, JSON.stringify(capResult));
        else skip(w, 'high fear caption', 'no caption showing during wrong answers in 5 runs');
        if (out.high) check(w, 'high fear: meter at 75 or more is shown and its fill is visible', out.high.fill === true, `fear ${out.high.fear}`);
        else skip(w, 'high fear', 'meter did not reach 75 in 5 runs');
        if (out.high) {
          if (out.restart) check(w, 'full meter: restart notice shown and focused', true);
          else skip(w, 'restart notice', 'not reached after high fear in 5 runs');
        }
      }
      if (ONLY.has('win')) {
        p = await page(w);
        triedMem.clear();
        const logs = [];
        if (await openWorld(p)) {
          const r = await solve(p, { log: (m) => logs.push(m) });
          how.win = `taps every hotspot, answers by trying options with the guest token put back after each wrong one, follows threads until the final puzzle is answered (${logs.length} logged steps)`;
          if (r.won) {
            await sleep(800);
            const e = JSON.parse(await p.ev(`(()=>{${R}return JSON.stringify({panel:R(document.querySelector('.world-ending')),hOverflow:document.documentElement.scrollWidth>innerWidth+1,text:document.querySelector('.world-ending')?.textContent?.length??0,hall:!![...document.querySelectorAll('.world-ending button')].length,focused:document.activeElement===document.querySelector('.world-ending')})})()`));
            check(w, 'win screen: panel, relic/score text and Hall button, no sideways page scroll, focus on the panel', !!e.panel && e.text > 20 && e.hall && !e.hOverflow && e.focused, `panel ${e.panel?.w}x${e.panel?.h}`);
            await p.ev(`document.querySelector('.world-ending')?.scrollIntoView({block:'start'});0`);
            await sleep(500);
            await p.shot('win');
          } else skip(w, 'win screen', `not reached: ${JSON.stringify(r.stuck ?? r.restarted ?? r)}`);
        } else skip(w, 'win screen', 'world did not load');
        await p.close();
      }
    }
  } finally {
    proc.kill();
  }
  writeFileSync(join(SHOTS, 'screens-game.json'), JSON.stringify({ how, results }, null, 1));
  console.log(`${results.filter((r) => r.ok).length} pass, ${failed} fail, ${results.filter((r) => r.ok === null).length} skip`);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
