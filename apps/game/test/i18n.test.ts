import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { translate } from '../src/i18n/t';

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

describe('message catalog', () => {
  it('every t("…") key used in the app exists in English', () => {
    const used = new Set<string>();
    for (const f of files(SRC)) for (const m of readFileSync(f, 'utf8').matchAll(/\bt\(\s*'([a-zA-Z]+\.[a-zA-Z.]+)'/g)) used.add(m[1]!);
    expect(used.size).toBeGreaterThan(20);
    expect([...used].filter((k) => !(k in en))).toEqual([]);
  });

  it('every run status the store can return has a label', () => {
    for (const s of ['in_progress', 'won', 'restarted', 'abandoned']) expect(`status.${s}` in en, s).toBe(true);
  });

  it('Arabic falls back to English per key, and placeholders are filled', () => {
    expect(translate('ar', 'nav.hall')).toBe(en['nav.hall']);
    expect(translate('en', 'hall.greeting', { name: 'Ann' })).toBe('Welcome back, Ann.');
    expect(translate('en', 'door.enter', {})).toBe('Enter {title}');
  });

  it('no visible text is hardcoded in JSX: element text is only {…} expressions', () => {
    const offenders: string[] = [];
    expect(files(SRC).filter((x) => x.endsWith('.tsx')).length, 'no .tsx files scanned').toBeGreaterThan(5);
    for (const f of files(SRC).filter((x) => x.endsWith('.tsx')))
      for (const [i, line] of readFileSync(f, 'utf8').split('\n').entries())
        if (HARDCODED.some((re) => re.test(line))) offenders.push(`${f.slice(SRC.length)}:${i + 1}`);
    expect(offenders).toEqual([]);
  });

  it('the scan catches text between tags and text alone on a JSX line', () => {
    for (const bad of ['<p>Hello</p>', '  <span> Read more </span>', '            Africa', '    Read the legend'])
      expect(HARDCODED.some((re) => re.test(bad)), bad).toBe(true);
    for (const good of ["<p>{t('x.y')}</p>", '    {legend.title}', '    token.text', '    ) : (', "import { A } from 'b';", '  // A comment'])
      expect(HARDCODED.some((re) => re.test(good)), good).toBe(false);
  });
});
