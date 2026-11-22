import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Phase 6 (Req 10.1, 10.2): the shared UI layer is imported once, after the layer order line
const css = readFileSync(fileURLToPath(new URL('../src/styles.css', import.meta.url)), 'utf8');
const ORDER = '@layer theme, base, components, ui, utilities;';
const UI = "@import '@kiroween/skeleton/design/ui.css';";

const check = (src: string): string[] => {
  const problems: string[] = [];
  const lines = src.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines[0] !== ORDER) problems.push('layer order line is not first');
  const count = src.split(UI).length - 1;
  if (count !== 1) problems.push(`ui.css imported ${count} times`);
  const firstImport = lines.findIndex((l) => l.startsWith('@import'));
  if (lines.indexOf(ORDER) > firstImport) problems.push('layer order line comes after an import');
  return problems;
};

describe('ui.css import', () => {
  it('is imported once and the @layer order line is first', () => {
    expect(check(css)).toEqual([]);
  });
  it('the check fails on a missing, doubled or misplaced import', () => {
    expect(check(css.replace(UI, ''))).toContain('ui.css imported 0 times');
    expect(check(css.replace(UI, `${UI}\n${UI}`))).toContain('ui.css imported 2 times');
    expect(check(`@import 'x';\n${css}`)).toContain('layer order line is not first');
    expect(check(css.replace(ORDER, '@layer base, ui;'))).toContain('layer order line is not first');
  });
});
