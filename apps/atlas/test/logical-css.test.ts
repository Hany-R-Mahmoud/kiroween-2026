import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// steering i18n-rtl.md: logical properties only, so right to left works when the Arabic flag is on
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const PHYSICAL = [
  /\b(?:-?m|p)[lr]-[\w[]/, // ml- mr- pl- pr- (and -ml-)
  /\b(?:left|right)-[\w[]/, // left-0, right-4
  /\btext-(?:left|right)\b/,
  /\bborder-[lr](?:-|\b)/,
  /\brounded-[lr](?:-|\b)/,
  /\bfloat-(?:left|right)\b/,
  /\b(?:margin|padding|border)-(?:left|right)\s*:/, // plain CSS
  /(?:^|[\s;{])(?:left|right)\s*:/m,
  /text-align\s*:\s*(?:left|right)/,
];

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|css)$/.test(f) && !f.endsWith('.gen.ts') ? [p] : [];
  });

describe('logical CSS only', () => {
  it('no physical-direction utility or property appears in apps/atlas/src', () => {
    const hits: string[] = [];
    for (const f of files(SRC))
      for (const [i, line] of readFileSync(f, 'utf8').split('\n').entries())
        for (const re of PHYSICAL) if (re.test(line)) hits.push(`${f.slice(SRC.length)}:${i + 1} ${re}`);
    expect(hits).toEqual([]);
  });

  it('no physical-direction utility or property appears in skeleton/src/book (15.12)', () => {
    const hits: string[] = [];
    const book = fileURLToPath(new URL('../../../skeleton/src/book/', import.meta.url));
    for (const f of files(book))
      for (const [i, line] of readFileSync(f, 'utf8').split('\n').entries())
        if (!/^\s*(?:\/\/|\/\*|\*)/.test(line)) // comment lines are prose ("right-to-left")
          for (const re of PHYSICAL) if (re.test(line)) hits.push(`${f.slice(book.length)}:${i + 1} ${re}`);
    expect(hits).toEqual([]);
  });

  it('no physical-direction property appears in skeleton/src/design/mood.css (19.12)', () => {
    const f = fileURLToPath(new URL('../../../skeleton/src/design/mood.css', import.meta.url));
    const hits: string[] = [];
    for (const [i, line] of readFileSync(f, 'utf8').split('\n').entries())
      if (!/^\s*(?:\/\/|\/\*|\*)/.test(line)) for (const re of PHYSICAL) if (re.test(line)) hits.push(`${i + 1} ${re}`);
    expect(hits).toEqual([]);
  });
  it('the scanner catches each physical form (so a clean result means something)', () => {
    for (const bad of ['ml-2', 'pr-4', '-mr-1', 'left-0', 'right-[3px]', 'text-left', 'border-l', 'rounded-r-lg', 'float-right', 'margin-left: 4px', 'right: 0', 'text-align: left'])
      expect(PHYSICAL.some((re) => re.test(` ${bad}`)), bad).toBe(true);
    for (const good of ['ms-2', 'pe-4', 'start-0', 'end-2', 'text-start', 'border-s', 'rounded-e-lg', 'inset-inline-start: 0'])
      expect(PHYSICAL.some((re) => re.test(` ${good}`)), good).toBe(false);
  });
});
