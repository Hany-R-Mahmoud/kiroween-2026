import type { ResolvedTheme } from '@kiroween/skeleton/client';
import type { ReactNode } from 'react';
import { themeClass, themeStyle } from '../lib/theme';

/** Wraps a screen in its theme: a World's resolved pack, or the hub tokens when `theme` is null. */
export function ThemeRoot({ theme, className = '', children }: { theme: Pick<ResolvedTheme, 'vars'> | null; className?: string; children: ReactNode }) {
  return (
    <div className={`${themeClass(theme)} ${className}`.trim()} style={themeStyle(theme)}>
      {children}
    </div>
  );
}
