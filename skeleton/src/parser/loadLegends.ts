import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Legend } from '../model/schema.ts';
import { parseLegend, type ParseError } from './parseLegend.ts';

/** Reads every `*.md` in `dir` (read-only) and parses it. `hashes` maps legend id to the sha256 of its file. */
export function loadLegends(dir: string): { legends: Legend[]; errors: ParseError[]; hashes: Map<string, string> } {
  const legends: Legend[] = [];
  const hashes = new Map<string, string>();
  const errors: ParseError[] = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
    const path = join(dir, f);
    const text = readFileSync(path, 'utf8');
    const r = parseLegend(text, path);
    if (r.ok) {
      legends.push(r.legend);
      hashes.set(r.legend.id, createHash('sha256').update(text).digest('hex'));
    } else errors.push(...r.errors);
  }
  return { legends, errors, hashes };
}
