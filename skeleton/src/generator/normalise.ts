import type { PuzzleType } from '../model/schema.ts';

/**
 * Comparison form: case, diacritics, markdown marks, punctuation and whitespace are ignored,
 * and a trailing "s" on words over three letters is dropped.
 */
export function normalise(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[*_]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
    .join(' ');
}

const FILLER = new Set(['a', 'an', 'the', 'of', 'and', 'or', 'to', 'in', 'on', 'at', 'with', 'near', 'about']);
const LABEL = /^\s*(documented|told|proposed)\s*:\s*/i;

/**
 * Matcher only: a word over four letters ending in "-ed" is folded to its stem, so "dressed" matches "dress"
 * (banshee f12). This goes beyond the R5.10 text as the owner wrote it, which does not fold; see docs/kiro-usage.md.
 */
const fold = (w: string): string => {
  if (w.length <= 4 || !w.endsWith('ed')) return w;
  const stem = w.slice(0, -2);
  return stem.length > 3 && stem.endsWith('s') ? stem.slice(0, -1) : stem;
};

const words = (s: string): string[] => normalise(s).split(' ').filter(Boolean).map(fold);
const contentWords = (s: string): string[] => words(s).filter((w) => !FILLER.has(w));

/** The answer split into parts on commas, " and " and parentheses; each part is its list of content words. */
export function answerParts(answer: string): string[][] {
  return answer
    .replace(LABEL, '')
    .split(/,|\band\b|[()]/i)
    .map(contentWords)
    .filter((p) => p.length > 0);
}

/** A person's surname: the last word of the name, ignoring a label and anything in parentheses. */
export const surname = (answer: string): string | undefined => contentWords(answer.replace(LABEL, '').replace(/\([^)]*\)/g, '')).at(-1);

/** Paragraphs are separated by a blank line; lines inside one paragraph belong together. */
export const toParagraphs = (...texts: string[]): string[] => texts.flatMap((t) => t.split(/\n\s*\n/)).filter((p) => p.trim() !== '');

/**
 * Is the answer written in the linked text (R5.10)?
 * - who-said-it: the surname appears as a whole word anywhere in the text.
 * - otherwise: every part of the answer passes, and a part passes when all its content words appear
 *   as whole words inside one paragraph. Words split across two paragraphs do not count.
 */
export function answerInText(paragraphs: readonly string[], answer: string, type: PuzzleType): boolean {
  if (type === 'who-said-it') {
    const name = surname(answer);
    return name !== undefined && paragraphs.some((p) => words(p).includes(name));
  }
  const parts = answerParts(answer);
  if (!parts.length) return false;
  const sets = paragraphs.map((p) => new Set(words(p)));
  return parts.every((part) => sets.some((set) => part.every((w) => set.has(w))));
}
