// Reports physical left/right CSS in a saved .tsx or .css file under apps/ or skeleton/.
// Read-only: it never writes. Exit 0 = clean, 1 = findings (printed to stderr), per the Kiro hook exit-code rule.
// PHYSICAL must stay identical to the list in apps/game/test/logical-css.test.ts (a test checks that).
// Usage: node scripts/check-physical-css.mjs <file>   or the hook JSON on stdin.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const PHYSICAL = [
  /\b(?:-?m|p)[lr]-[\w[]/, // ml- mr- pl- pr- (and -ml-)
  /\b(?:left|right)-[\w[]/, // left-0, right-4
  /\btext-(?:left|right)\b/,
  /\bborder-[lr](?:-|\b)/,
  /\brounded-[lr](?:-|\b)/,
  /\bfloat-(?:left|right)\b/,
  /\b(?:margin|padding|border)-(?:left|right)\s*:/, // plain CSS
  /(?:^|[\s;{])(?:left|right)\s*:/m,
  /text-align\s*:\s*(?:left|right)/,
];

/** Same scope as the game test: .ts/.tsx/.css, never generated route trees. */
export const isChecked = (p) => /\.(tsx?|css)$/.test(p) && !p.endsWith('.gen.ts');

export function scanText(text) {
  const hits = [];
  for (const [i, line] of text.split('\n').entries())
    for (const re of PHYSICAL) if (re.test(line)) hits.push({ line: i + 1, pattern: String(re), text: line.trim() });
  return hits;
}

const findPath = (v) => {
  if (typeof v === 'string') return isChecked(v) ? v : null;
  if (v && typeof v === 'object') for (const x of Object.values(v)) { const r = findPath(x); if (r) return r; }
  return null;
};

const main = () => {
  let file = process.argv[2];
  if (!file) {
    try { file = findPath(JSON.parse(readFileSync(0, 'utf8'))); } catch { file = null; }
  }
  if (!file || !isChecked(file)) return 0;
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { return 0; }
  const hits = scanText(text);
  for (const h of hits) process.stderr.write(`${file}:${h.line} physical CSS (${h.pattern}): ${h.text}\n`);
  if (hits.length) process.stderr.write('Use logical properties: ms-/me-/ps-/pe-/start-/end-/text-start. Nothing was edited.\n');
  return hits.length ? 1 : 0;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main());
