import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const FORBIDDEN = [/^pg$/, /^drizzle-orm/, /^dotenv/, /^node:/, /\/db\//, /\/parser\//];

/** Every module reachable from `file` through static imports and re-exports (type-only ones included, to be strict). */
function reachable(file: string, seen = new Set<string>(), external = new Set<string>()): { files: Set<string>; external: Set<string> } {
  if (seen.has(file)) return { files: seen, external };
  seen.add(file);
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]/g)) {
    const spec = m[1]!;
    if (spec.startsWith('.')) reachable(resolve(dirname(file), spec), seen, external);
    else external.add(spec);
  }
  return { files: seen, external };
}

describe('browser-safe entry (skeleton/src/client.ts)', () => {
  it('reaches no database, parser, Node or driver code', () => {
    const { files, external } = reachable(resolve(SRC, 'client.ts'));
    const bad = [...files].map((f) => f.slice(SRC.length)).filter((f) => FORBIDDEN.some((re) => re.test(`/${f}`)));
    const badExternal = [...external].filter((x) => FORBIDDEN.some((re) => re.test(x)));
    expect(bad).toEqual([]);
    expect(badExternal.filter((x) => x !== 'zod')).toEqual([]);
  });
});
