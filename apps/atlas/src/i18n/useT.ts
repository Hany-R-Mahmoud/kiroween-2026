import { getRouteApi } from '@tanstack/react-router';
import { translate, type Translate } from './t';
const root = getRouteApi('__root__');
/** The current language's translator, from the root's shell data. */
export function useT(): Translate {
  const { lang } = root.useLoaderData();
  return (key, vars) => translate(lang, key, vars);
}
