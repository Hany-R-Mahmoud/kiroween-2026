import type { Locale } from '@kiroween/skeleton/client';
import { ar } from './ar';
import { en, type MessageKey } from './en';
// shortcut: same 10 lines as apps/game/src/i18n/t.ts (the game may not change this phase); move into the skeleton later.
const catalogs: Record<Locale, Partial<Record<MessageKey, string>>> = { en, ar };
/** The message for `key` in `lang`, falling back to English per key; `{name}` placeholders are filled from `vars`. */
export function translate(lang: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  const text = catalogs[lang][key] ?? en[key];
  return vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text;
}
export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;
