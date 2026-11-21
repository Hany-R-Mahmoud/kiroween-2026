// Applies a World's resolved theme (resolveTheme, same AA checks and fallbacks as the atlas) as CSS variables.
import type { ResolvedTheme } from '@kiroween/skeleton/client';
import type { CSSProperties } from 'react';

/** The only variables a theme may set: the ones resolveTheme returns. Anything else is dropped, not applied. */
const ALLOWED = new Set(['--color-bg', '--color-surface', '--color-ink', '--color-accent', '--color-glow', '--color-muted', '--font-display', '--font-body']);

/** Inline style for the World root. `null` (the Hall, the Tutorial_Room) applies nothing: the base tokens stay. */
export function themeStyle(theme: Pick<ResolvedTheme, 'vars'> | null): CSSProperties {
  if (!theme) return {};
  return Object.fromEntries(Object.entries(theme.vars).filter(([k]) => ALLOWED.has(k))) as CSSProperties;
}

/** Class for the root of a screen: hub for the Hall and Tutorial_Room, world for a World. */
export const themeClass = (theme: unknown) => (theme ? 'world-theme' : 'hub-theme');

/** `<meta name="theme-color">` for the head, or none for the hub (the base background is the page default). */
export const themeColorMeta = (theme: Pick<ResolvedTheme, 'themeColor'> | null) => (theme ? [{ name: 'theme-color', content: theme.themeColor }] : []);
