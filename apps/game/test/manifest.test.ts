import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { translate } from '../src/i18n/t';
import { buildManifest, Route } from '../src/routes/manifest[.]webmanifest';

// Requirement 20 / 26.9. Same file in both apps; only APP and the expected prefix differ.
const APP = 'game';
const PREFIX = '/game';
const here = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(here, '..');
const root = resolve(appDir, '../..');
const needs = readFileSync(join(root, 'docs/phase-5-notes/content-and-assets-needed.md'), 'utf8');
const needRows = needs.split('\n').filter((l) => l.includes(`apps/${APP}/public/icons/`));
const manifest = buildManifest();
const rootSrc = readFileSync(join(appDir, 'src/routes/__root.tsx'), 'utf8');
const SIZES: Record<string, number> = { 'icon-192': 192, 'icon-512': 512, 'icon-maskable-512': 512, 'apple-touch-180': 180 };

const idOf = (src: string) => /\/icons\/([^/]+)\.png$/.exec(src)?.[1] ?? '';

describe(`${APP} manifest`, () => {
  it('names come from the catalog', () => {
    const title = translate('en', 'app.title');
    expect(manifest.name).toBe(title);
    expect(manifest.short_name).toBe(title);
  });

  it('scope, start_url, display and colours', () => {
    expect(manifest.scope).toBe(`${PREFIX}/`);
    expect(manifest.start_url).toBe(`${PREFIX}/`);
    expect(manifest.start_url.startsWith(manifest.scope)).toBe(true);
    expect(['fullscreen', 'standalone', 'minimal-ui', 'window-controls-overlay']).toContain(manifest.display);
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    expect('prefer_related_applications' in manifest).toBe(false);
  });

  it('icons: 192, 512 and maskable 512, PNG under the app icons path', () => {
    const has = (size: string, purpose?: string) => manifest.icons.some((i) => i.sizes === size && i.type === 'image/png' && (i as { purpose?: string }).purpose === purpose);
    expect(has('192x192')).toBe(true);
    expect(has('512x512')).toBe(true);
    expect(has('512x512', 'maskable')).toBe(true);
    for (const i of manifest.icons) {
      expect(i.src.startsWith(`${PREFIX}/icons/`)).toBe(true);
      expect(i.src.endsWith('.png')).toBe(true);
      expect(i.type).toBe('image/png');
    }
  });

  it('route answers with application/manifest+json and the builder output', async () => {
    const handlers = (Route as unknown as { options: { server: { handlers: { GET: () => Response } } } }).options.server.handlers;
    const res = handlers.GET();
    expect(res.headers.get('content-type')).toMatch(/^application\/manifest\+json/);
    expect(await res.json()).toEqual(JSON.parse(JSON.stringify(manifest)));
  });

  it('every manifest icon id and the apple-touch id has a Needs_File row', () => {
    const ids = [...manifest.icons.map((i) => idOf(i.src)), 'apple-touch-180'];
    for (const id of ids) {
      expect(id).not.toBe('');
      expect(needRows.some((l) => l.includes(`apps/${APP}/public/icons/${id}.png`) && l.includes(`| ${id} |`)), `Needs_File row for ${id}`).toBe(true);
    }
  });

  it('root route links the manifest and apple-touch-icon and sets theme-color', () => {
    expect(rootSrc).toContain(`rel: 'manifest', href: '${PREFIX}/manifest.webmanifest'`);
    expect(rootSrc).toContain(`rel: 'apple-touch-icon', href: '${PREFIX}/icons/apple-touch-180.png'`);
    expect(rootSrc).toMatch(/name: 'theme-color'/);
  });

  it('icon files are not created by Kiro; if the Owner added them they are PNGs of the right size', () => {
    const dir = join(appDir, 'public/icons');
    for (const id of Object.keys(SIZES)) {
      const file = join(dir, `${id}.png`);
      if (!existsSync(file)) {
        expect(needRows.some((l) => l.includes(`| ${id} |`)), `Needs_File row for missing ${id}`).toBe(true);
        continue;
      }
      const b = readFileSync(file);
      expect(b.subarray(1, 4).toString('latin1')).toBe('PNG');
      expect([b.readUInt32BE(16), b.readUInt32BE(20)]).toEqual([SIZES[id], SIZES[id]]);
    }
  });

  it('no service worker file exists', () => {
    const names = [appDir, join(appDir, 'public'), join(appDir, 'src')].flatMap((d) => (existsSync(d) ? readdirSync(d) : []));
    expect(names.filter((n) => /^(sw|service-?worker)[^/]*\.(js|ts|mjs)$/i.test(n))).toEqual([]);
  });

  const built = join(appDir, 'dist/server');
  it.skipIf(!existsSync(built))('built output contains the manifest route', () => {
    const files = readdirSync(join(built, 'assets')).filter((f) => f.endsWith('.js'));
    expect(files.some((f) => readFileSync(join(built, 'assets', f), 'utf8').includes('application/manifest+json'))).toBe(true);
  });
});
