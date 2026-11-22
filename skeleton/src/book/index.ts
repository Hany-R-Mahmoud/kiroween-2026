// Browser-safe entry for the Book view (`@kiroween/skeleton/book`).
export { keyToDelta, pageAfterReflow, pageCount, pageOfOffset } from './pagination.ts';
export { BOOK_PREF_KEY, DEFAULT_BOOK_PREF, readBookPref, writeBookPref, type BookPref } from './bookPref.ts';
export { BOOK_ACCENT, BOOK_INK, PAPER_BASE, PAPER_FLOOR, bookColors } from './bookColors.ts';
export { Book, toggleState, type BookLabels, type BookProps } from './Book.tsx';
