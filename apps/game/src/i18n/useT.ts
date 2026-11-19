import { getRouteApi } from '@tanstack/react-router';
import type { MessageKey } from './en';
import { translate } from './t';

const root = getRouteApi('__root__');

/** The document language, for Intl date and number formats. */
export const useLang = () => root.useLoaderData().lang;

/** The current language's translator, from the root's shell data. */
export function useT() {
  const { lang } = root.useLoaderData();
  return (key: MessageKey, vars?: Record<string, string | number>) => translate(lang, key, vars);
}
