import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CONTINENTS } from '../src/geo/continents';
import { en } from '../src/i18n/en';
import { translate } from '../src/i18n/t';

// steering i18n-rtl.md: no hardcoded UI strings; Arabic falls back to English per key.
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) && !f.endsWith('.gen.ts') ? [p] : [];
  });

const HARDCODED = [
  />\s*[A-Za-z][^<>{}]*</, // text between > and < that contains a letter, outside braces
  /^\s+[A-Z][a-z]+(?: [A-Za-z]+)*\s*$/, // a capitalised word or phrase alone on a JSX line
];

describe('message catalog (atlas)', () => {
  it('every t("…") and translate(…, "…") key used in the app exists in English', () => {
    const used = new Set<string>();
    for (const f of files(SRC)) for (const m of readFileSync(f, 'utf8').matchAll(/\b(?:t|translate)\((?:\s*'(?:en|ar)',)?\s*'([a-zA-Z]+\.[a-zA-Z.]+)'/g)) used.add(m[1]!);
    expect(used.size).toBeGreaterThan(25);
    expect([...used].filter((k) => !(k in en))).toEqual([]);
  });
  it('has a label for every continent group', () => {
    for (const c of CONTINENTS) expect(`continent.${c}` in en, c).toBe(true);
  });
  it('Arabic falls back to English per key, and placeholders are filled', () => {
    expect(translate('ar', 'nav.home')).toBe(en['nav.home']);
    expect(translate('en', 'alt.plate', { n: 3, title: 'X' })).toBe('Illustration for chapter 3: X');
  });
  it('no visible text is hardcoded in JSX: element text is only {…} expressions', () => {
    const offenders: string[] = [];
    for (const f of files(SRC).filter((x) => x.endsWith('.tsx')))
      for (const [i, line] of readFileSync(f, 'utf8').split('\n').entries()) if (HARDCODED.some((re) => re.test(line))) offenders.push(`${f.slice(SRC.length)}:${i + 1}`);
    expect(offenders).toEqual([]);
  });
  it('the scan catches text between tags and text alone on a JSX line', () => {
    for (const bad of ['<p>Hello</p>', '  <span> Read more </span>', '            Africa', '    Read the legend']) expect(HARDCODED.some((re) => re.test(bad)), bad).toBe(true);
    for (const good of ['<p>{t(\'x.y\')}</p>', '    {legend.title}', '    token.text', '    ) : (', "import { A } from 'b';", '  // A comment'])
      expect(HARDCODED.some((re) => re.test(good)), good).toBe(false);
  });
});
