import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { returnFocus } from '../src/lib/focus.ts';
import { en } from '../src/i18n/en.ts';
import { translate } from '../src/i18n/t.ts';
// Requirement 7 (payload secrecy): code that ships to the browser must not reach server-only modules or skeleton values
// outside the `/client` entry. `lib/play.ts` is the one file allowed to name the server functions (it only binds them).
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const CLIENT_DIRS = ['components', 'lib', 'layout', 'routes'];
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) && !f.endsWith('.gen.ts') ? [p] : [];
  });
const clientFiles = CLIENT_DIRS.flatMap((d) => files(join(SRC, d)));
const importsOf = (src: string): { spec: string; typeOnly: boolean }[] =>
  [...src.matchAll(/^import\s+(type\s+)?[^;]*?from\s+'([^']+)'/gms)].map((m) => ({ spec: m[2] as string, typeOnly: Boolean(m[1]) }));
describe('client code boundary', () => {
  it('scans real files (so a clean result means something)', () => {
    expect(clientFiles.length).toBeGreaterThan(30);
  });
  it('only play.ts and the route loaders reach server modules', () => {
    const allowed = new Set(['lib/play.ts', 'routes/index.tsx', 'routes/tutorial.tsx', 'routes/world.$target.tsx', 'routes/account.tsx', 'routes/sign-in.tsx', 'routes/sign-up.tsx', 'routes/__root.tsx', 'routes/api.auth.$.ts']);
    const hits = clientFiles.filter((f) => importsOf(readFileSync(f, 'utf8')).some((i) => /\/server\//.test(i.spec)) && !allowed.has(f.slice(SRC.length).replaceAll('\\', '/')));
    expect(hits).toEqual([]);
  });
  it('never imports a value from the skeleton root (server entry); types only', () => {
    const hits = clientFiles.filter((f) => importsOf(readFileSync(f, 'utf8')).some((i) => i.spec === '@kiroween/skeleton' && !i.typeOnly));
    expect(hits).toEqual([]);
  });
  it('the scanner sees a value import from the root', () => {
    expect(importsOf("import { x } from '@kiroween/skeleton';")).toEqual([{ spec: '@kiroween/skeleton', typeOnly: false }]);
    expect(importsOf("import type { x } from '@kiroween/skeleton';")).toEqual([{ spec: '@kiroween/skeleton', typeOnly: true }]);
  });
});
describe('focus return', () => {
  it('focuses the remembered element once and forgets it', () => {
    let n = 0;
    const holder = { current: { focus: () => void (n += 1) } as { focus(): void } | null };
    returnFocus(holder);
    returnFocus(holder);
    expect(n).toBe(1);
    expect(holder.current).toBeNull();
  });
});
describe('composed door labels come from the catalog', () => {
  it('fills the title and state into the catalog sentence', () => {
    expect(translate('en', 'hub.door.readNamed', { title: 'X' })).toBe('Read the legend: X');
    expect(en['hub.door.stateNamed']).toContain('{state}');
  });
});
