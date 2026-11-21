// Separate parser for content/keepers-note.md (requirement 3.1). It does not use the legend parser.
// Pure: text in, `{ note, details }` or a list of errors with 1-based line numbers out.

export const KEEPERS_NOTE_ID = 'keepers-note';
export const KEEPERS_NOTE_ANCHOR = 'keepers-note--ch-1';

export interface KeepersNote {
  id: string;
  title: string;
  label: string;
  readingTimeMin: number;
  oneLineHook: string;
  chapterTitle: string;
  anchor: string;
  body: string;
  hook: string;
}

export interface KeepersDetail {
  detailId: string;
  ordinal: number;
  phrase: string;
  question: string;
  answer: string;
  alsoAccept: string[];
}

export interface ParseError {
  line: number;
  message: string;
}

export type ParseResult =
  | { ok: true; note: KeepersNote; details: KeepersDetail[] }
  | { ok: false; errors: ParseError[] };

const DETAIL_IDS = ['d-year', 'd-keys', 'd-rooms'] as const;

interface Section {
  start: number; // 0-based index of the heading line
  lines: string[];
}

/** Split on `## ` headings. Returns sections keyed by the leading number ("0", "1", "2"). */
function sections(lines: string[]): Map<string, Section> {
  const out = new Map<string, Section>();
  let current: Section | null = null;
  lines.forEach((line, i) => {
    const m = /^## (\d+)\./.exec(line) ?? /^## (\d+)\b/.exec(line);
    if (m) {
      current = { start: i, lines: [] };
      out.set(m[1]!, current);
    } else if (/^## /.test(line)) {
      current = null;
    } else if (current) {
      current.lines.push(line);
    }
  });
  return out;
}

/** Cells of a markdown table row, trimmed. */
const cells = (line: string): string[] =>
  line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

const isTableRow = (line: string) => line.trim().startsWith('|');
const isSeparator = (line: string) => /^\|?\s*:?-{3,}/.test(line.trim());

export function parseKeepersNote(text: string): ParseResult {
  const errors: ParseError[] = [];
  const err = (line: number, message: string) => errors.push({ line, message });
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const secs = sections(lines);

  // Section 0: meta table.
  const meta = new Map<string, { value: string; line: number }>();
  const s0 = secs.get('0');
  if (!s0) err(1, 'Missing section "## 0. Meta".');
  else {
    s0.lines.forEach((l, i) => {
      if (!isTableRow(l) || isSeparator(l)) return;
      const c = cells(l);
      if (c.length !== 2) return err(s0.start + 2 + i, 'Meta row must have two cells.');
      if (c[0] === 'Field') return;
      meta.set(c[0]!, { value: c[1]!, line: s0.start + 2 + i });
    });
  }
  const field = (name: string): string => {
    const f = meta.get(name);
    if (!f || f.value === '') {
      err(s0 ? s0.start + 1 : 1, `Missing meta field "${name}".`);
      return '';
    }
    return f.value;
  };
  const id = field('id');
  const title = field('title');
  const label = field('label');
  const oneLineHook = field('one_line_hook');
  const rtRaw = field('reading_time_min');
  const readingTimeMin = Number(rtRaw);
  if (rtRaw && (!/^\d+$/.test(rtRaw) || readingTimeMin <= 0)) err(meta.get('reading_time_min')!.line, 'reading_time_min must be a positive integer.');
  if (id && id !== KEEPERS_NOTE_ID) err(meta.get('id')!.line, `id must be "${KEEPERS_NOTE_ID}".`);

  // Section 1: chapter.
  let chapterTitle = '';
  let anchor = '';
  let hook = '';
  const bodyParas: string[] = [];
  const s1 = secs.get('1');
  if (!s1) err(1, 'Missing section "## 1. Chapter".');
  else {
    const base = s1.start + 2; // 1-based line of s1.lines[0]
    const headIdx = s1.lines.findIndex((l) => /^####\s+/.test(l));
    if (headIdx < 0) err(s1.start + 1, 'Missing chapter heading "#### ch-1 · Title".');
    else {
      const h = /^####\s+ch-1\s*·\s*(.+)$/.exec(s1.lines[headIdx]!);
      if (!h) err(base + headIdx, 'Chapter heading must be "#### ch-1 · <title>".');
      else chapterTitle = h[1]!.trim();
      let i = headIdx + 1;
      const a = /^anchor:\s*(\S+)\s*$/.exec(s1.lines[i] ?? '');
      if (!a) err(base + i, 'Expected "anchor: keepers-note--ch-1" right after the chapter heading.');
      else anchor = a[1]!;
      if (anchor && anchor !== KEEPERS_NOTE_ANCHOR) err(base + i, `anchor must be "${KEEPERS_NOTE_ANCHOR}".`);
      i++;
      let para: string[] = [];
      const flush = () => {
        if (para.length) bodyParas.push(para.join(' '));
        para = [];
      };
      for (; i < s1.lines.length; i++) {
        const l = s1.lines[i]!;
        const hk = /^Hook:\s*(.*\S)\s*$/.exec(l);
        if (hk) {
          if (hook) err(base + i, 'More than one Hook line.');
          hook = hk[1]!;
        } else if (l.trim() === '') flush();
        else {
          if (hook) err(base + i, 'Text after the Hook line.');
          para.push(l.trim());
        }
      }
      flush();
      if (!hook) err(s1.start + 1, 'Missing "Hook:" line.');
      if (!bodyParas.length) err(s1.start + 1, 'Chapter body is empty.');
    }
  }
  const body = bodyParas.join('\n\n');
  const occurrences = (needle: string, hay: string) => (needle ? hay.split(needle).length - 1 : 0);
  if (anchor && occurrences(anchor, text) !== 1) err(1, `Anchor "${anchor}" must appear exactly once in the file.`);

  // Section 2: details table.
  const details: KeepersDetail[] = [];
  const s2 = secs.get('2');
  if (!s2) err(1, 'Missing section "## 2. Drawer code details".');
  else {
    let header = false;
    s2.lines.forEach((l, i) => {
      const ln = s2.start + 2 + i;
      if (!isTableRow(l) || isSeparator(l)) return;
      const c = cells(l);
      if (!header) {
        header = true;
        if (c[0] !== 'detail_id') err(ln, 'Details table must start with a "detail_id" header.');
        return;
      }
      if (c.length !== 5 || c.some((x) => x === '')) return err(ln, 'Detail row must have five non-empty cells.');
      const [detailId, phrase, question, answer, also] = c as [string, string, string, string, string];
      const alsoAccept = also.toLowerCase() === 'none' ? [] : also.split(',').map((x) => x.trim()).filter(Boolean);
      details.push({ detailId, ordinal: details.length + 1, phrase, question, answer, alsoAccept });
      if (!(DETAIL_IDS as readonly string[]).includes(detailId)) err(ln, `Unknown detail_id "${detailId}".`);
      if (body && occurrences(phrase, body) !== 1) err(ln, `Phrase for ${detailId} must appear exactly once in the chapter.`);
    });
    if (details.length !== 3) err(s2.start + 1, `Expected exactly three detail rows, found ${details.length}.`);
    else if (new Set(details.map((d) => d.detailId)).size !== 3) err(s2.start + 1, 'Detail ids must be d-year, d-keys and d-rooms, once each.');
  }

  if (errors.length) return { ok: false, errors: errors.sort((a, b) => a.line - b.line) };
  return {
    ok: true,
    note: { id, title, label, readingTimeMin, oneLineHook, chapterTitle, anchor, body, hook },
    details,
  };
}

/** Throwing wrapper for scripts: one line per error. */
export function parseKeepersNoteOrThrow(text: string): { note: KeepersNote; details: KeepersDetail[] } {
  const r = parseKeepersNote(text);
  if (!r.ok) throw new Error(r.errors.map((e) => `keepers-note.md:${e.line}: ${e.message}`).join('\n'));
  return { note: r.note, details: r.details };
}
