import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { KNOWN_FONTS } from '@kiroween/skeleton/client';
import { describe, expect, it } from 'vitest';

// The font map is read as text: its `?url` imports are a bundler feature, and the test checks the real package files.
const SOURCE = readFileSync(new URL('../src/fonts.ts', import.meta.url), 'utf8');
const require = createRequire(import.meta.url);
const imports = [...SOURCE.matchAll(/^import (\w+) from '(@fontsource\/[a-z0-9-]+)\/(400(?:-italic)?\.css)\?url';$/gm)].map((m) => ({ name: m[1]!, pkg: m[2]!, file: m[3]! }));
const entries = [...SOURCE.matchAll(/^ {2}'?([A-Za-z0-9 ]+?)'?: \[([^\]]+)\],$/gm)].map((m) => ({ family: m[1]!, vars: m[2]!.split(',').map((s) => s.trim()) }));

describe('self-hosted fonts', () => {
  it('maps every family the skeleton knows, and nothing else', () => {
    expect(entries.map((e) => e.family).sort()).toEqual([...KNOWN_FONTS].sort());
  });
  it('every stylesheet comes from an installed OFL Fontsource package, uses font-display: swap and unicode-range', () => {
    expect(imports.length).toBeGreaterThanOrEqual(KNOWN_FONTS.length);
    for (const { pkg, file } of imports) {
      const dir = require.resolve(`${pkg}/package.json`).replace(/package\.json$/, '');
      expect(JSON.parse(readFileSync(`${dir}package.json`, 'utf8')).license, pkg).toBe('OFL-1.1');
      const css = readFileSync(`${dir}${file}`, 'utf8');
      const faces = css.split('@font-face').length - 1;
      expect(faces, `${pkg}/${file}`).toBeGreaterThan(0);
      expect(css.split('font-display: swap').length - 1, `${pkg}/${file}`).toBe(faces);
      expect(css, `${pkg}/${file}`).toContain('unicode-range');
      expect(css, `${pkg}/${file}`).not.toMatch(/url\(\s*['"]?https?:/); // no third-party font CDN
    }
  });
  it('every entry uses only imported stylesheets, and each family has its 400 face first', () => {
    const names = new Set(imports.map((i) => i.name));
    expect(entries.length, 'no font entries parsed').toBeGreaterThan(0);
    for (const e of entries) {
      for (const v of e.vars) expect(names.has(v), `${e.family}: ${v}`).toBe(true);
      expect(imports.find((i) => i.name === e.vars[0])!.file, e.family).toBe('400.css');
    }
  });
});
