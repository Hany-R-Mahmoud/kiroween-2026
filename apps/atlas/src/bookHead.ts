import { BOOK_PREF_KEY } from '@kiroween/skeleton/book';

/**
 * Runs in <head> before first paint (the CSP allows inline scripts): sets html[data-book] from the stored Book choice, so the
 * first paint is already pages or one page. Anything but the stored 'scroll', and any storage error, gives pages.
 */
export const BOOK_HEAD_SCRIPT = `try{document.documentElement.dataset.book=localStorage.getItem(${JSON.stringify(BOOK_PREF_KEY)})==='scroll'?'off':'on'}catch(e){document.documentElement.dataset.book='on'}`;
