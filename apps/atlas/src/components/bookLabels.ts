import type { BookLabels } from '@kiroween/skeleton/book';
import type { Translate } from '../i18n/t';

/** The Book's labels, all from the catalog. */
export const bookLabels = (t: Translate): BookLabels => ({
  region: t('book.region'),
  previous: t('book.previous'),
  next: t('book.next'),
  toggle: t('book.readAsOnePage'),
  toggleBook: t('book.readAsBook'),
  indicator: (n, m) => t('book.pageOf', { n, m }),
});
