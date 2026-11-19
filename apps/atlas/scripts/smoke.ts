// Smoke check of a running atlas against dev-skeleton-core (R11.4). Prints step results only, never a value from .env.
// Expected anchors and version order come from the parsed content files (read only).
// Usage (from the repo root): pnpm --dir skeleton exec tsx ../apps/atlas/scripts/smoke.ts [base] [--og <public origin>]
//   Without --og the server must run with PUBLIC_ORIGIN unset; with it, the server must run with that PUBLIC_ORIGIN.
import { fileURLToPath } from 'node:url';
import { loadLegends } from '../../../skeleton/src/parser/loadLegends.ts';
import { BASE_PALETTE } from '../../../skeleton/src/theme/contrast.ts';
import { parsePalette } from '../../../skeleton/src/theme/palette.ts';

const args = process.argv.slice(2);
const ogAt = args.indexOf('--og');
const og = ogAt >= 0 ? args[ogAt + 1]! : '';
const BASE = args.find((a, i) => !a.startsWith('--') && (ogAt < 0 || i !== ogAt + 1)) ?? 'http://localhost:3001';
const { legends } = loadLegends(fileURLToPath(new URL('../../../content/legends/', import.meta.url)));
const byId = new Map(legends.map((l) => [l.id, l]));
let failed = 0;
const check = (step: string, ok: boolean, note = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${step}${note ? `  (${note})` : ''}`);
};
const get = (path: string) => fetch(BASE + path, { redirect: 'manual' });
const ids = (html: string) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]!);
const bodyStyle = (html: string) => /<body[^>]*style="([^"]*)"/.exec(html)?.[1] ?? '';
const meta = (html: string, property: string) => new RegExp(`<meta[^>]*property="${property}"[^>]*content="([^"]*)"`).exec(html)?.[1];

let res = await get('/');
let html = await res.text();
const markers = new Set([...html.matchAll(/popovertarget="card-([a-z-]+)"/gi)].map((m) => m[1]));
const listed = new Set([...html.matchAll(/href="\/legends\/([a-z-]+)"/g)].map((m) => m[1]));
const groups = [...html.matchAll(/id="continent-([^"]+)"/g)].map((m) => m[1]);
check('home: 200, 12 marker buttons, 12 legends linked, grouped by continent', res.status === 200 && markers.size === 12 && listed.size === 12 && groups.length === 4, `markers ${markers.size}, linked ${listed.size}, groups ${groups.join(', ')}`);
check('home: the atlas hero loads first, with high priority', /<img[^>]*shared-atlas-hero-01\.webp[^>]*fetchPriority="high"/i.test(html) || /<img[^>]*fetchPriority="high"[^>]*shared-atlas-hero-01\.webp/i.test(html));

for (const id of ['banshee', 'naddaha', 'baba-yaga']) {
  const l = byId.get(id)!;
  res = await get(`/legends/${id}`);
  html = await res.text();
  const all = ids(html);
  const once = l.anchors.every((a) => all.filter((x) => x === a).length === 1);
  const versions = all.filter((x) => l.versions.some((v) => v.anchor === x));
  check(`/legends/${id}: 200, every anchor once, versions in file order`, res.status === 200 && once && versions.join() === l.versions.map((v) => v.anchor).join(), `${l.anchors.length} anchors`);
  const style = bodyStyle(html);
  const pack = parsePalette(l.theme.palette);
  const accent = id === 'baba-yaga' ? BASE_PALETTE.accent : pack.accent;
  check(`/legends/${id}: its own theme on <body>${id === 'baba-yaga' ? ' (links fall back to the base accent)' : ''}`, style.includes(`--color-bg:${pack.background}`) && style.includes(`--color-accent:${accent}`));
  const image = meta(html, 'og:image');
  const url = meta(html, 'og:url');
  if (og) check(`/legends/${id}: og:image and og:url built from PUBLIC_ORIGIN`, image === `${og}/media/${id}/atlas/${id}-atlas-hero-01.webp` && url === `${og}/legends/${id}`, `${image ?? 'none'}`);
  else check(`/legends/${id}: no og:image and no og:url without PUBLIC_ORIGIN`, image === undefined && url === undefined);
}

res = await get('/anchor/banshee--ch-3');
check('/anchor/banshee--ch-3 redirects to its place on the legend page', res.status === 307 && res.headers.get('location') === '/legends/banshee#banshee--ch-3', `${res.status} ${res.headers.get('location')}`);
res = await get('/anchor/flying-dutchman--versions--v-log');
check('/anchor/<version anchor> redirects too', res.status === 307 && res.headers.get('location') === '/legends/flying-dutchman#flying-dutchman--versions--v-log', `${res.status}`);
for (const [path, why] of [['/anchor/banshee--ch-99', 'unknown anchor'], ['/anchor/BAD..x', 'malformed anchor'], ['/legends/no-such-legend', 'unknown legend'], ['/legends/Bad..Id', 'malformed legend id'], ['/game', 'the game path'], ['/game/', 'the game path with a slash'], ['/game/legends/banshee', 'a page under /game']] as const) {
  res = await get(path);
  const text = await res.text();
  check(`${path}: 404, ${why}`, res.status === 404 && text.includes('This page is not in the atlas') && !res.headers.get('location'), `${res.status}`);
}
res = await get('/media/banshee/atlas/banshee-atlas-hero-01.webp');
check('/media: a canonical image is served as image/webp', res.status === 200 && res.headers.get('content-type') === 'image/webp');
for (const path of ['/media/../.env', '/media/%2e%2e/.env', '/media/banshee/atlas/x.png', '/media/banshee/game/banshee-atlas-hero-01.webp']) {
  res = await get(path);
  check(`${path}: refused`, res.status === 404, `${res.status}`);
}
console.log(failed ? `${failed} step(s) failed` : 'all smoke steps passed');
process.exit(failed ? 1 : 0);
