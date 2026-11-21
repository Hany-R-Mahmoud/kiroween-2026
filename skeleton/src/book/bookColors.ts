// Ink and accent for text on the Book's paper. Paper colours here are the contract with book.css: PAPER_FLOOR is the
// darkest colour any text can sit on (edge shading and foxing included), so text that reaches 4.5:1 on it reaches it everywhere.
import { AA_TEXT, contrastRatio, type ResolvedTheme } from '../theme/contrast.ts';

export const PAPER_BASE = '#e9e1d3';
export const PAPER_FLOOR = '#a89368';
export const BOOK_INK = '#2b1d12';
export const BOOK_ACCENT = '#4a1c12';

const HEX = /^#[0-9a-fA-F]{6}$/;
const reaches = (colour: unknown): colour is string => typeof colour === 'string' && HEX.test(colour) && contrastRatio(colour, PAPER_FLOOR) >= AA_TEXT;

/** The pack's ink and accent when each reaches 4.5:1 on the paper floor, else the book's own dark ink and accent. */
export function bookColors(theme: ResolvedTheme | { readonly ink: string; readonly accent: string }): { ink: string; accent: string } {
  const ink = 'vars' in theme ? theme.vars['--color-ink'] : theme.ink;
  const accent = 'vars' in theme ? theme.vars['--color-accent'] : theme.accent;
  return { ink: reaches(ink) ? ink : BOOK_INK, accent: reaches(accent) ? accent : BOOK_ACCENT };
}
