import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// plain JS module at the repo root; typed loosely on purpose
// @ts-expect-error no type declarations for the .mjs script
import { isPrivateEnvFile, scanDir, scanText } from '../../scripts/scan-secrets.mjs';

// Fixtures are built from parts at run time, so no secret-shaped literal is stored in the repo.
const scheme = ['post', 'gres', 'ql'].join('');
const fakePass = ['NotA', 'Real', 'Pass', '123'].join('');
const neonHost = ['ep-fake-host', 'neon.tech'].join('.');
const dbUrl = `${scheme}://someone:${fakePass}@${neonHost}/db?sslmode=require`;
const longB64 = 'Ab12'.repeat(10);
const longHex = 'af09'.repeat(10);
const secretVar = ['COOKIE', 'SECRET'].join('_');

type Finding = { file?: string; line: number; pattern: string };

describe('scanText', () => {
  it('flags a postgres URL with credentials, and a Neon host with credentials', () => {
    const found = (scanText(`ok\nurl = "${dbUrl}"\n`) as Finding[]).map((f) => `${f.line}:${f.pattern}`);
    expect(found).toContain('2:postgres-url-with-credentials');
    expect(found).toContain('2:neon-host-with-credentials');
  });

  it('flags long base64 and hex values next to SECRET, KEY, TOKEN or PASSWORD', () => {
    for (const name of [secretVar, 'API_KEY', 'AUTH_TOKEN', 'DB_PASSWORD'])
      for (const value of [longB64, longHex]) expect((scanText(`${name}=${value}`) as Finding[]).map((f) => f.pattern), `${name}`).toEqual(['secret-like-assignment']);
  });

  it('does not flag safe look-alikes', () => {
    const safe = [
      `${scheme}://localhost/db`,
      'https://mcp.neon.tech/mcp',
      `${secretVar}=`,
      'KEY_COUNT = 3',
      'const tokenizer = createTokenizer()',
      `PASSWORD=short`,
    ];
    for (const line of safe) expect(scanText(line), line).toEqual([]);
  });

  it('never returns the matched text', () => {
    const out = JSON.stringify(scanText(`${secretVar}=${longB64}\n${dbUrl}`));
    expect(out).not.toContain(longB64);
    expect(out).not.toContain(fakePass);
    expect(out).not.toContain(neonHost);
  });
});

describe('scanDir', () => {
  it('reports file and line, skips .env and .env.local but reads .env.example, and skips node_modules', () => {
    const root = mkdtempSync(join(tmpdir(), 'scan-'));
    writeFileSync(join(root, '.env'), `DATABASE_URL=${dbUrl}\n`);
    writeFileSync(join(root, '.env.local'), `${secretVar}=${longB64}\n`);
    writeFileSync(join(root, '.env.example'), `${secretVar}=\nDATABASE_URL=\n`);
    mkdirSync(join(root, 'node_modules'));
    writeFileSync(join(root, 'node_modules', 'leak.js'), dbUrl);
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'src', 'config.ts'), `// fine\nexport const url = '${dbUrl}';\n`);
    const raw = scanDir(root) as Finding[];
    const found = raw.map((f) => `${f.file}:${f.line}:${f.pattern}`).sort();
    expect(found).toEqual([`${join('src', 'config.ts')}:2:neon-host-with-credentials`, `${join('src', 'config.ts')}:2:postgres-url-with-credentials`]);
    // each finding carries only file, line and pattern name: never the matched text
    for (const f of raw) expect(Object.keys(f).sort()).toEqual(['file', 'line', 'pattern']);
    expect(JSON.stringify(raw)).not.toContain(fakePass);
  });

  it('treats .env and .env.<name> as private, but not .env.example or similar names', () => {
    expect(['.env', '.env.local', '.env.production'].every(isPrivateEnvFile)).toBe(true);
    expect(['.env.example', 'env.ts', '.envrc.md', 'my.env'].some(isPrivateEnvFile)).toBe(false);
  });
});
