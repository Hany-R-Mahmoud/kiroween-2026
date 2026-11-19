import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// R1.2, R1.3: the atlas is public (no auth anywhere), never answers under /game, and keeps server-only data on the server.
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SRC = `${ROOT}src/`;
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|css)$/.test(f) ? [p] : [];
  });
const sources = files(SRC).map((f) => ({ f: f.slice(SRC.length), text: readFileSync(f, 'utf8') }));
const importers = (pattern: RegExp) => sources.filter((s) => pattern.test(s.text)).map((s) => s.f).sort();

describe('atlas boundaries', () => {
  it('has no auth package as a dependency', () => {
    const pkg = JSON.parse(readFileSync(`${ROOT}package.json`, 'utf8'));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(deps.filter((d) => /auth/i.test(d))).toEqual([]);
  });
  it('never imports auth code or names the game\'s variables', () => {
    const hits = sources.filter((s) => /@neon\/auth|better-auth|NEON_AUTH_|(?<!ATLAS_)DATABASE_URL/.test(s.text)).map((s) => s.f);
    expect(hits).toEqual([]);
  });
  it('reads the process environment in one server file only', () => {
    expect(importers(/process\.env/)).toEqual(['server/env.ts']);
  });
  it('keeps the country polygons on the server: only continent.ts loads them, and only server code loads it', () => {
    expect(importers(/countries\.json/)).toEqual(['geo/continent.ts']);
    expect(importers(/from '\.\.?\/(?:geo\/)?continent'/)).toEqual(['server/functions.ts']);
  });
  it('has no route under /game', () => {
    const tree = readFileSync(`${SRC}routeTree.gen.ts`, 'utf8');
    const paths = [...tree.matchAll(/(?:fullPath|path): '([^']*)'/g)].map((m) => m[1]!);
    expect(paths.length).toBeGreaterThan(2);
    expect(paths.filter((p) => /^\/?game(\/|$)/.test(p))).toEqual([]);
  });
});
