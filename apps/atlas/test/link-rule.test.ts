import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Phase 6 (Req 11.1): links get colour and underline from .link or .nav-item, never from a bare `a` selector
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const cssFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? cssFiles(p) : f.endsWith('.css') ? [p] : [];
  });

const BARE_A = /(^|[\s>+~])a(:[\w-]+(\([^)]*\))?)*$/;
export const bareLinkRules = (css: string): string[] =>
  [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => /(^|[;\s])(color|text-decoration(-[a-z]+)?)\s*:/.test(m[2] ?? ''))
    .flatMap((m) => (m[1] ?? '').split(',').map((s) => s.trim()))
    .filter((s) => BARE_A.test(s));

describe('no bare link rule in the atlas', () => {
  it('no bare `a` selector sets colour or underline', () => {
    const files = cssFiles(SRC);
    expect(files.length).toBeGreaterThan(0);
    expect(files.flatMap((f) => bareLinkRules(readFileSync(f, 'utf8')).map((s) => `${f.slice(SRC.length)}: ${s}`))).toEqual([]);
  });
  it('the scan catches bare forms and ignores classed ones', () => {
    for (const bad of ['a { color: red; }', 'a:hover { text-decoration: underline; }', 'main a { color: red; }', 'a:visited{color:red}'])
      expect(bareLinkRules(bad), bad).toHaveLength(1);
    for (const good of ['.link { color: red; }', 'a.link { color: red; }', 'a { display: block; }', 'nav-a { color: red; }'])
      expect(bareLinkRules(good), good).toHaveLength(0);
  });
});
