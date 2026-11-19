export interface ParseError {
  file: string;
  section: string;
  line: number;
  message: string;
}

export interface Line {
  n: number; // 1-based line number in the file
  t: string;
}

export interface Table {
  headers: string[];
  rows: { cells: string[]; n: number }[];
}

/** Splits the file into `## <n>.` sections. */
export function splitSections(text: string): Map<number, Line[]> {
  const out = new Map<number, Line[]>();
  let cur: Line[] | null = null;
  text.split('\n').forEach((t, i) => {
    const m = /^## (\d+)\./.exec(t);
    if (m) {
      cur = [];
      out.set(Number(m[1]), cur);
    } else if (/^# /.test(t)) {
      cur = null;
    } else if (cur) {
      cur.push({ n: i + 1, t });
    }
  });
  return out;
}

const splitRow = (l: string): string[] =>
  l
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());

/** First markdown table in `lines`. Rows keep their line number. */
export function readTable(lines: Line[]): Table | null {
  const start = lines.findIndex((l) => l.t.trim().startsWith('|'));
  if (start < 0) return null;
  const headers = splitRow(lines[start]!.t).map((h) => h.toLowerCase());
  const rows: Table['rows'] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i]!;
    if (!l.t.trim().startsWith('|')) break;
    if (/^\|\s*:?-{3,}/.test(l.t.trim())) continue;
    rows.push({ cells: splitRow(l.t), n: l.n });
  }
  return { headers, rows };
}

/** Index of the first header matching `re`, or -1. */
export const colIndex = (t: Table, re: RegExp): number => t.headers.findIndex((h) => re.test(h));

export const stripTicks = (s: string): string => s.replace(/`/g, '').trim();

export const nonEmpty = (lines: Line[]): Line[] => lines.filter((l) => l.t.trim() !== '');

export const joinText = (lines: Line[]): string =>
  lines
    .map((l) => l.t.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
