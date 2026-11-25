// Source codes such as "(S1, S8)" and chapter references such as "(see ch-2)" in legend text.
// Pure helpers: they never throw, whatever the input string is.

export type CodeSegment =
  | { kind: 'text'; text: string }
  | { kind: 'source'; code: string; id: string }
  | { kind: 'chapter'; code: string; anchor: string };

export interface CodeIndex {
  /** Lower-cased source id ("s1") to its display title. */
  sources: ReadonlyMap<string, string>;
  chapterAnchors: ReadonlySet<string>;
  legendId: string;
}

const CODE = /\bS(\d+)\b|\bch-(\d+)\b/g;

/** A code counts when it sits inside "( ... )" or is followed by a closing bracket with no opening one between (", S8)"). */
function inGroup(text: string, start: number, end: number): boolean {
  const open = text.lastIndexOf('(', start);
  const close = text.lastIndexOf(')', start);
  if (open > close) return true;
  const nextClose = text.indexOf(')', end);
  const nextOpen = text.indexOf('(', end);
  return nextClose !== -1 && (nextOpen === -1 || nextClose < nextOpen);
}

export function splitCodes(text: string, index: CodeIndex | null): CodeSegment[] {
  if (!index || !text) return [{ kind: 'text', text: text ?? '' }];
  const out: CodeSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(CODE)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    if (!inGroup(text, start, end)) continue;
    let seg: CodeSegment | null = null;
    if (m[1] !== undefined) {
      const key = `s${m[1]}`;
      if (index.sources.has(key)) seg = { kind: 'source', code: m[0], id: `source-${key}` };
    } else {
      const anchor = `${index.legendId}--ch-${m[2]}`;
      if (index.chapterAnchors.has(anchor)) seg = { kind: 'chapter', code: m[0], anchor };
    }
    if (!seg) continue;
    if (start > last) out.push({ kind: 'text', text: text.slice(last, start) });
    out.push(seg);
    last = end;
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out.length ? out : [{ kind: 'text', text }];
}

const ONLY_CODES = /^[\s,;]*(?:(?:see|and|also)\s+)?(?:(?:S\d+|ch-\d+)[\s,;]*(?:(?:and)\s+)?)*$/i;

export function stripCodes(text: string): string {
  if (!text) return text ?? '';
  let s = text.replace(/\s*\(([^()]*)\)/g, (whole, inner: string) => {
    if (!/\b(?:S\d+|ch-\d+)\b/.test(inner)) return whole;
    if (ONLY_CODES.test(inner)) return '';
    const cleaned = inner
      .replace(/\b(?:S\d+|ch-\d+)\b/g, '')
      .replace(/\s*[,;]\s*(?=[,;]|$)/g, '')
      .replace(/^\s*[,;]\s*/, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return cleaned ? ` (${cleaned})` : '';
  });
  // Closing-only groups: "..., S8)" keeps the bracket, drops the code.
  s = s.replace(/\s*[,;]?\s*\b(?:S\d+|ch-\d+)\b(?=[^(]*\))/g, '');
  return s.replace(/\s{2,}/g, ' ').replace(/\s+([;,.])/g, '$1').trim();
}
