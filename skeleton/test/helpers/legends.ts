import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadLegends } from '../../src/index.ts';

export const LEGENDS_DIR = fileURLToPath(new URL('../../../content/legends/', import.meta.url));
export const readLegend = (id: string): string => readFileSync(`${LEGENDS_DIR}${id}.md`, 'utf8');
export const legendFiles = (): string[] => readdirSync(LEGENDS_DIR).filter((f) => f.endsWith('.md')).sort();
export const dirHash = (): string => {
  const h = createHash('sha256');
  for (const f of legendFiles()) h.update(f).update(readFileSync(`${LEGENDS_DIR}${f}`));
  return h.digest('hex');
};

const loaded = loadLegends(LEGENDS_DIR);
export const allLegends = loaded.legends;
export const loadErrors = loaded.errors;
export const legendById = (id: string) => {
  const l = allLegends.find((x) => x.id === id);
  if (!l) throw new Error(`legend ${id} did not parse`);
  return l;
};
