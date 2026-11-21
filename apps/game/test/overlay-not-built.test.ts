// The ?layout=1 overlay is dev only (task 4.4, requirement 21.5): its marker class must not reach built client JS.
// Skipped when no build exists (dist is not committed); run `pnpm --filter @kiroween/game build`.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const assets = fileURLToPath(new URL('../dist/client/assets', import.meta.url));
const built = existsSync(assets);

describe.skipIf(!built)('built client JS', () => {
  it('has no layout overlay marker (scene-outline)', () => {
    const files = readdirSync(assets).filter((f) => f.endsWith('.js'));
    expect(files.length).toBeGreaterThan(0);
    expect(files.filter((f) => readFileSync(join(assets, f), 'utf8').includes('scene-outline'))).toEqual([]);
  });
});
