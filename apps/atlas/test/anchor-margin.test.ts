import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Requirements 29.1, 29.5: anchor targets keep a scroll margin of at least header height + 1rem (16 px).
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const tokens = readFileSync(new URL('../../../skeleton/src/design/tokens.css', import.meta.url), 'utf8');
const REM = 16;

const headerPx = Number(/--app-header-h:\s*([\d.]+)rem/.exec(tokens)?.[1] ?? NaN) * REM;

/** Margin in px of the rule whose selector list holds `selector`; null if absent or not a known shape. */
function marginPx(source: string, selector: string, header: number): number | null {
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (let m = re.exec(stripped); m; m = re.exec(stripped)) {
    const sels = (m[1] ?? '').split(',').map((s) => s.trim());
    if (!sels.includes(selector)) continue;
    const decl = /scroll-margin-block-start:\s*([^;]+);/.exec(m[2] ?? '')?.[1]?.trim();
    if (!decl) continue;
    const calc = /^calc\(\s*var\(--app-header-h\)\s*\+\s*([\d.]+)rem\s*\)$/.exec(decl);
    if (calc) return header + Number(calc[1]) * REM;
    const rem = /^([\d.]+)rem$/.exec(decl);
    if (rem) return Number(rem[1]) * REM;
    return null;
  }
  return null;
}

describe('anchor scroll margin', () => {
  it('reads the header height from the tokens', () => {
    expect(headerPx).toBe(56);
  });
  it.each(['[id]', '[data-anchor-heading]'])('%s clears the header plus 1rem', (sel) => {
    const px = marginPx(css, sel, headerPx);
    expect(px).not.toBeNull();
    expect(px ?? 0).toBeGreaterThanOrEqual(headerPx + REM);
  });
  it('fails when the margin is removed, too small or missing for the heading selector', () => {
    const none = css.replace(/scroll-margin-block-start:[^;]+;/g, '');
    expect(marginPx(none, '[id]', headerPx)).toBeNull();
    const old = css.replace(/calc\(var\(--app-header-h\) \+ 1rem\)/, '1.5rem');
    expect(marginPx(old, '[id]', headerPx) ?? 0).toBeLessThan(headerPx + REM);
    const noHeading = css.replace('[data-anchor-heading]', '[data-x]');
    expect(marginPx(noHeading, '[data-anchor-heading]', headerPx)).toBeNull();
  });
});
