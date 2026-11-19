#!/usr/bin/env node
// Scans the repository for secret-shaped text and prints file:line and the pattern name only, never the match.
// It never opens .env or .env.* files (only .env.example), node_modules, .git or build output.
// Usage: node scripts/scan-secrets.mjs [dir]   Exit code 1 when anything is found.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.output', '.tanstack', '.vercel', 'coverage']);
const MAX_BYTES = 2_000_000;

export const PATTERNS = [
  // scheme://user:password@host  (a URL with credentials in it)
  { name: 'postgres-url-with-credentials', re: /\bpostgres(?:ql)?:\/\/[^\s:/@'"`]+:[^\s@'"`]+@[^\s/'"`]+/i },
  // a user and password, then "@", then a host ending in neon.tech  (credentials in front of a Neon host, any scheme)
  { name: 'neon-host-with-credentials', re: /[^\s:/@'"`]+:[^\s@'"`]+@[a-z0-9.-]*neon\.tech\b/i },
  // SECRET / KEY / TOKEN / PASSWORD = <long base64 or hex>
  { name: 'secret-like-assignment', re: /\b[A-Z0-9_]*(?:SECRET|KEY|TOKEN|PASSWORD)[A-Z0-9_]*\s*[:=]\s*['"`]?(?:[A-Za-z0-9+/]{32,}={0,2}|[A-Fa-f0-9]{32,})/i },
];

/** True for .env and .env.<anything> except .env.example: these files are never read. */
export const isPrivateEnvFile = (name) => /^\.env(\..+)?$/.test(name) && name !== '.env.example';

/** Findings for one file's text. Each finding is { line, pattern }; the matched text is never kept. */
export function scanText(text) {
  const findings = [];
  text.split('\n').forEach((line, i) => {
    for (const p of PATTERNS) if (p.re.test(line)) findings.push({ line: i + 1, pattern: p.name });
  });
  return findings;
}

/** Walks `root` and returns findings as { file, line, pattern }, with paths relative to `root`. */
export function scanDir(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(join(dir, entry.name));
        continue;
      }
      if (!entry.isFile() || isPrivateEnvFile(entry.name)) continue;
      const path = join(dir, entry.name);
      if (statSync(path).size > MAX_BYTES) continue;
      const text = readFileSync(path, 'utf8');
      if (text.includes('\u0000')) continue; // binary
      for (const f of scanText(text)) out.push({ file: relative(root, path), ...f });
    }
  };
  walk(root);
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ?? fileURLToPath(new URL('..', import.meta.url));
  const findings = scanDir(root);
  for (const f of findings) console.log(`${f.file}:${f.line}  ${f.pattern}`);
  console.log(findings.length ? `${findings.length} finding(s)` : 'no secret patterns found');
  process.exit(findings.length ? 1 : 0);
}
