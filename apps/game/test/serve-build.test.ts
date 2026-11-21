import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveStatic } from '../scripts/static-file.mjs';

const clientDir = mkdtempSync(join(tmpdir(), 'serve-build-'));
mkdirSync(join(clientDir, 'assets'));
writeFileSync(join(clientDir, 'assets', 'a.js'), 'x');

describe('resolveStatic (used by scripts/serve-build.mjs)', () => {
  it.each(['/game/%E0%A4%A', '/game/%'])('answers bad request for malformed percent path %s without throwing', (p) => {
    expect(resolveStatic(p, clientDir)).toEqual({ bad: true });
  });

  it('refuses paths that leave the client folder', () => {
    expect(resolveStatic('/game/../secret', clientDir)).toEqual({ bad: true });
    expect(resolveStatic('/game/%2e%2e/secret', clientDir)).toEqual({ bad: true });
    expect(resolveStatic('/game/a%00b', clientDir)).toEqual({ bad: true });
  });

  it('finds a real file and passes other paths to the app', () => {
    expect(resolveStatic('/game/assets/a.js', clientDir)).toEqual({ file: join(clientDir, 'assets', 'a.js') });
    expect(resolveStatic('/game/world/x', clientDir)).toBeNull();
    expect(resolveStatic('/other', clientDir)).toBeNull();
  });
});

describe('scripts/serve-build.mjs', () => {
  it('listens on localhost only, never on all interfaces (Phase 5, Requirement 23.5)', () => {
    const src = readFileSync(new URL('../scripts/serve-build.mjs', import.meta.url), 'utf8');
    const calls = [...src.matchAll(/\.listen\(([^)]*?)(?:,\s*\(\))/g)].map((m) => m[1]!.trim());
    expect(calls).toEqual(["port, 'localhost'"]);
  });
});
