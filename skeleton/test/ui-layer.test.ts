import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Phase 6 shared UI layer: skeleton/src/design/ui.css (Req 10, 11, 7)
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const UI_CSS = join(ROOT, 'skeleton/src/design/ui.css');
const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');
const read = (p: string): string => readFileSync(p, 'utf8');

/** every selector (comma-split) that appears in front of a `{` */
const selectorsOf = (css: string): string[] =>
  [...stripComments(css).matchAll(/([^{};]+)\{/g)].flatMap((m) => (m[1] ?? '').split(',').map((s) => s.trim()));
const definesClass = (css: string, cls: string): boolean =>
  selectorsOf(css).some((s) => new RegExp(`(^|[\\s>+~])\\.${cls.replace(/-/g, '\\-')}(?![\\w-])`).test(s));

/** flat rules: selector list and declaration body (nested at-rules are skipped, their inner rules are still found) */
const rulesOf = (css: string): { selector: string; body: string }[] =>
  [...stripComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selector: (m[1] ?? '').trim(), body: m[2] ?? '' }));

/** rules whose selector holds :focus-visible and whose body sets outline */
const focusOutlineRules = (css: string): string[] =>
  rulesOf(css)
    .filter((r) => /:focus-visible/.test(r.selector) && /(^|[;\s])outline(-[a-z]+)?\s*:/.test(r.body))
    .map((r) => r.selector);

const PHYSICAL_DECL = [
  /(^|[;{\s])(margin|padding)-(left|right)\s*:/,
  /(^|[;{\s])border-(left|right)(-[a-z]+)?\s*:/,
  /(^|[;{\s])border-(top|bottom)-(left|right)-radius\s*:/,
  /(^|[;{\s])(left|right)\s*:/,
  /text-align\s*:\s*(left|right)/,
  /(^|[;{\s])float\s*:\s*(left|right)/,
];

const walk = (dir: string, re: RegExp): string[] =>
  readdirSync(dir).flatMap((f) => {
    if (f === 'node_modules' || f === 'dist' || f === '.output' || f === '.vercel' || f === '.git') return [];
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p, re) : re.test(f) ? [p] : [];
  });

const ui = stripComments(read(UI_CSS));

describe('ui.css defines the shared classes (10.1, 7.2)', () => {
  for (const cls of ['btn-primary', 'btn-secondary', 'btn-ghost', 'link', 'nav-item', 'panel'])
    it(`defines .${cls}`, () => {
      expect(definesClass(ui, cls), `.${cls} missing from ui.css`).toBe(true);
    });

  it('the class check fails when a class is removed', () => {
    const without = ui.replace(/\.btn-ghost/g, '.btn-gone');
    expect(definesClass(without, 'btn-ghost')).toBe(false);
    expect(definesClass(ui, 'btn')).toBe(true);
    expect(definesClass('.btn-primary-x { }', 'btn-primary')).toBe(false);
  });
});

describe('ui.css reads tokens only (10.8)', () => {
  const HEX = /#[0-9a-fA-F]{3,8}\b/;
  it('has no hex colour and no hex fallback', () => {
    expect(ui.match(new RegExp(HEX, 'g')) ?? []).toEqual([]);
    expect(ui.match(/var\([^)]*,\s*#/g) ?? []).toEqual([]);
  });
  it('the hex scan catches a colour and a hex fallback', () => {
    expect(HEX.test('color: #fff;')).toBe(true);
    expect(HEX.test('color: var(--color-glow, #f4d58d);')).toBe(true);
  });
});

describe('ui.css uses logical properties only (7.5, 10.9)', () => {
  const DIRECTIONAL = PHYSICAL_DECL;
  it('has no physical-direction property', () => {
    const hits: string[] = [];
    for (const [i, line] of ui.split('\n').entries()) for (const re of DIRECTIONAL) if (re.test(line)) hits.push(`${i + 1} ${line.trim()}`);
    expect(hits).toEqual([]);
  });
  it('the scanner catches each physical form', () => {
    for (const bad of ['margin-left: 1px', 'padding-right: 2px', 'border-left: 1px solid', 'border-top-left-radius: 2px', 'left: 0', 'right: 0', 'text-align: left', 'float: right'])
      expect(DIRECTIONAL.some((re) => re.test(` ${bad}`)), bad).toBe(true);
    for (const good of ['margin-inline-start: 1px', 'inset-inline-start: 0', 'text-align: start', 'border-start-start-radius: 2px', 'min-inline-size: 2px'])
      expect(DIRECTIONAL.some((re) => re.test(` ${good}`)), good).toBe(false);
  });
});

describe('one --motion switch (7.1, 7.6, 7.7)', () => {
  it('declares --motion once as 1, and as 0 once per reduction condition', () => {
    const decls = [...ui.matchAll(/--motion\s*:\s*([^;]+);/g)].map((m) => (m[1] ?? '').trim());
    expect(decls.sort()).toEqual(['0', '0', '1']);
    const media = ui.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?--motion:\s*0;/);
    expect(media, 'no --motion: 0 under prefers-reduced-motion').not.toBeNull();
    expect(/html\[data-motion='reduce'\]\s*\{\s*--motion:\s*0;/.test(ui), "no --motion: 0 under html[data-motion='reduce']").toBe(true);
  });
  it('both conditions switch animation off', () => {
    const noAnim = (ui.match(/animation:\s*none\s*!important/g) ?? []).length;
    expect(noAnim).toBeGreaterThanOrEqual(2);
    expect(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation:\s*none\s*!important/.test(ui)).toBe(true);
    expect(/html\[data-motion='reduce'\] \*[\s\S]*?animation:\s*none\s*!important/.test(ui)).toBe(true);
  });
  it('every duration is scaled by --motion', () => {
    const durations = [...ui.matchAll(/([^\n]*?)\b(\d+)ms\b/g)];
    expect(durations.length).toBeGreaterThan(0);
    for (const d of durations) expect(d[1], `duration ${d[2]}ms not scaled`).toMatch(/calc\(var\(--motion\) \*\s*$/);
  });
});

describe('one focus ring (10.2, 10.6)', () => {
  const CSS_FILES = [...walk(join(ROOT, 'skeleton/src'), /\.css$/), ...walk(join(ROOT, 'apps/atlas/src'), /\.css$/), ...walk(join(ROOT, 'apps/game/src'), /\.css$/)].filter(
    (f) => f !== UI_CSS,
  );
  it('scans the real stylesheets', () => {
    expect(CSS_FILES.length).toBeGreaterThanOrEqual(5);
  });
  it('no stylesheet other than ui.css declares outline inside :focus-visible', () => {
    const hits = CSS_FILES.flatMap((f) => focusOutlineRules(read(f)).map((s) => `${f.slice(ROOT.length)}: ${s}`));
    expect(hits).toEqual([]);
  });
  it('ui.css itself has the one :focus-visible outline rule', () => {
    expect(focusOutlineRules(ui)).toEqual([':focus-visible']);
  });
  it('the scan catches a second outline rule (including grouped selectors)', () => {
    expect(focusOutlineRules('.a:focus-visible { outline: 2px solid red; }')).toHaveLength(1);
    expect(focusOutlineRules('.a:hover, .b:focus-visible { outline-offset: 1px; }')).toHaveLength(1);
    expect(focusOutlineRules('.a:focus-visible { box-shadow: 0 0 1px red; }')).toHaveLength(0);
  });
  it('no focus-visible:outline-* utility string in apps/*/src', () => {
    const files = [...walk(join(ROOT, 'apps/atlas/src'), /\.(tsx?|css)$/), ...walk(join(ROOT, 'apps/game/src'), /\.(tsx?|css)$/)];
    expect(files.length).toBeGreaterThan(10);
    const hits = files.filter((f) => /focus-visible:outline-/.test(read(f))).map((f) => f.slice(ROOT.length));
    expect(hits).toEqual([]);
    expect(/focus-visible:outline-/.test('class="focus-visible:outline-2"')).toBe(true);
  });
});
describe('44 px targets and the current-item marker (10.3, 11.5)', () => {
  const rules = rulesOf(ui);
  const bodyOf = (selector: string): string => rules.find((r) => r.selector === selector)?.body ?? '';
  it('--target is 2.75rem (44 px at the 16 px root)', () => {
    const tokens = stripComments(read(join(ROOT, 'skeleton/src/design/tokens.css')));
    expect(tokens).toMatch(/--target:\s*2\.75rem\s*;/);
  });
  it('.btn has a block-size minimum of the 44 px target (10.3)', () => {
    expect(bodyOf('.btn')).toMatch(/min-block-size:\s*var\(--target\)\s*;/);
  });
  it('.nav-item[aria-current="page"] draws a 2 px bar in the accent colour (11.5)', () => {
    expect(bodyOf(".nav-item[aria-current='page']")).toMatch(/box-shadow:\s*inset 0 -2px 0 var\(--color-accent\)\s*;/);
  });
});
