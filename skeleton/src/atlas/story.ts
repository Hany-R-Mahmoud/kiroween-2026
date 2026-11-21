// Story text as stored: paragraphs split by blank lines, Markdown italics, and `[Dramatization]` marks (R4.2, R4.3).
// The content uses nothing else; a divider line (`---`) left at the end of some sections by the source files is
// dropped. The result is plain data for React to render, never HTML.
export type StoryToken = { kind: 'text' | 'em'; text: string } | { kind: 'dramatization' };
export type StoryBlock = StoryToken[];

const DRAMATIZATION = '[Dramatization]';
const DIVIDER = /^\s*-{3,}\s*$/;
// `*words*` with no `*` or line break inside and no space just inside either mark; anything else stays as text.
const ITALIC = /\*([^*\s](?:[^*\n]*[^*\s])?)\*/g;

function inline(text: string): StoryToken[] {
  const tokens: StoryToken[] = [];
  let last = 0;
  for (const m of text.matchAll(ITALIC)) {
    if (m.index > last) tokens.push({ kind: 'text', text: text.slice(last, m.index) });
    tokens.push({ kind: 'em', text: m[1]! });
    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push({ kind: 'text', text: text.slice(last) });
  return tokens;
}

/** A short field (question, option, tap text) as text and `em` tokens. Whitespace is kept; stray `*` stay literal. */
export function inlineMarks(text: string): StoryToken[] {
  return inline(text);
}

/** The same text without the italic marks: for accessible names, alt text and other plain strings. */
export function stripMarks(text: string): string {
  return inline(text)
    .map((t) => (t.kind === 'dramatization' ? '' : t.text))
    .join('');
}

function paragraph(text: string): StoryBlock {
  const tokens: StoryToken[] = [];
  text.split(DRAMATIZATION).forEach((part, i) => {
    if (i > 0) tokens.push({ kind: 'dramatization' });
    tokens.push(...inline(i > 0 ? part.replace(/^\s+/, ' ') : part));
  });
  return tokens;
}

export function storyBlocks(text: string): StoryBlock[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.split('\n').filter((line) => !DIVIDER.test(line)).join(' ').trim())
    .filter((p) => p.length > 0)
    .map(paragraph);
}
