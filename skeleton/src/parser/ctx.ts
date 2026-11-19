import { colIndex, type ParseError, type Table } from './markdown.ts';
import { factRefs } from './refs.ts';

/** Shared state while reading one legend file. Sections read earlier fill the sets later sections check against. */
export class Ctx {
  errors: ParseError[] = [];
  versionRaw = new Set<string>();
  anchorSet = new Set<string>();
  factByKey = new Map<string, string>(); // normalised key (f7) -> namespaced id
  hotspotRaw = new Set<string>();

  constructor(
    readonly file: string,
    readonly id: string,
  ) {}

  err(section: string, line: number, message: string): void {
    this.errors.push({ file: this.file, section, line, message });
  }

  ns = (raw: string): string => `${this.id}:${raw}`;

  checkAnchor(a: string, section: string, line: number, what: string): void {
    if (!this.anchorSet.has(a)) this.err(section, line, `${what}: "${a}" is not a deep-link target (chapter, versions or per-version anchor)`);
  }

  /** Namespaced fact ids for the fact tokens in `text`; unknown tokens are errors. */
  resolveFacts(text: string, section: string, line: number, what: string): string[] {
    const out: string[] = [];
    for (const key of factRefs(text)) {
      const f = this.factByKey.get(key);
      if (f) out.push(f);
      else this.err(section, line, `${what}: unknown fact "${key}"`);
    }
    return out;
  }

  /** Column indexes for the wanted headers, or null (with an error per missing one). */
  columns<K extends string>(section: string, t: Table | null, wanted: Record<K, RegExp>, line: number): Record<K, number> | null {
    if (!t) {
      this.err(section, line, 'no table found');
      return null;
    }
    const out = {} as Record<K, number>;
    let ok = true;
    for (const k of Object.keys(wanted) as K[]) {
      out[k] = colIndex(t, wanted[k]);
      if (out[k] === -1) {
        this.err(section, line, `table has no "${k}" column`);
        ok = false;
      }
    }
    return ok ? out : null;
  }
}

export const cell = (row: string[], i: number): string => row[i] ?? '';
