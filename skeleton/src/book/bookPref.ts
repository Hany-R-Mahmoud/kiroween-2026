// The reader's choice between the paged Book view and one scrolling page, kept on this device only.
import type { KeyValueStore } from '../guest/progress.ts';

export type BookPref = 'pages' | 'scroll';
export const BOOK_PREF_KEY = 'kiroween.book.v1';
export const DEFAULT_BOOK_PREF: BookPref = 'pages';

/** The stored choice; anything else, a missing value or a storage that throws gives `pages`. */
export function readBookPref(s: Pick<KeyValueStore, 'getItem'>): BookPref {
  try {
    const v = s.getItem(BOOK_PREF_KEY);
    return v === 'pages' || v === 'scroll' ? v : DEFAULT_BOOK_PREF;
  } catch {
    return DEFAULT_BOOK_PREF;
  }
}

/** Store the choice. A blocked or full storage is ignored: the choice then lasts for the page only. */
export function writeBookPref(s: Pick<KeyValueStore, 'setItem'>, v: BookPref): void {
  try {
    s.setItem(BOOK_PREF_KEY, v);
  } catch {
    /* storage blocked: nothing to do */
  }
}
