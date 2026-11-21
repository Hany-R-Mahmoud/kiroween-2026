import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PHYSICAL, scanText } from '../../../scripts/check-physical-css.mjs';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const SCRIPT = join(ROOT, 'scripts/check-physical-css.mjs');
const run = (args: string[], input?: string) => spawnSync('node', [SCRIPT, ...args], { cwd: ROOT, input, encoding: 'utf8' });

const BAD = '<div className="ml-2 text-left">x</div>\n.a { margin-left: 4px; }\n';
const CLEAN = '<div className="ms-2 text-start">x</div>\n.a { margin-inline-start: 4px; }\n';

describe('physical CSS hook', () => {
  it('the hook JSON has the expected trigger, matcher and a read-only command', () => {
    const cfg = JSON.parse(readFileSync(join(ROOT, '.kiro/hooks/physical-css-check.json'), 'utf8'));
    expect(cfg.version).toBe('v1');
    const h = cfg.hooks[0];
    expect(h.trigger).toBe('PostFileSave');
    expect(h.action.type).toBe('command');
    expect(h.timeout).toBeGreaterThan(0);
    const re = new RegExp(h.matcher);
    for (const ok of ['apps/game/src/a.tsx', '/x/skeleton/src/b.css', '/x/apps/atlas/src/styles.css']) expect(re.test(ok), ok).toBe(true);
    for (const no of ['apps/game/src/a.ts', 'docs/a.css', 'content/x.tsx']) expect(re.test(no), no).toBe(false);
    expect(h.action.command).toContain('check-physical-css.mjs');
  });

  it('uses the same pattern list as the game logical-css test', () => {
    const src = readFileSync(join(ROOT, 'apps/game/test/logical-css.test.ts'), 'utf8');
    for (const re of PHYSICAL) expect(src.includes(re.source), String(re)).toBe(true);
  });

  it('flags a failing sample and passes a clean one', () => {
    expect([...new Set(scanText(BAD).map((h) => h.line))]).toEqual([1, 2]);
    expect(scanText(CLEAN)).toEqual([]);
    const dir = mkdtempSync(join(tmpdir(), 'pcss-'));
    const bad = join(dir, 'bad.tsx');
    const clean = join(dir, 'clean.css');
    writeFileSync(bad, BAD);
    writeFileSync(clean, CLEAN);
    const r = run([bad]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('bad.tsx:1');
    expect(run([clean]).status).toBe(0);
    // hook form: JSON on stdin; file is not modified
    expect(run([], JSON.stringify({ tool: { path: bad } })).status).toBe(1);
    expect(readFileSync(bad, 'utf8')).toBe(BAD);
  });
});
