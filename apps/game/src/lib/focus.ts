// Focus return for panels that open from a tap and close again (hall panels, tutorial panels). Browser only.
import { useRef } from 'react';
export interface FocusHolder {
  current: { focus(): void } | null;
}
/** Moves focus back to the remembered element once, then forgets it. Nothing remembered: nothing happens. */
export function returnFocus(holder: FocusHolder): void {
  const el = holder.current;
  holder.current = null;
  el?.focus();
}
/** `remember` before a panel opens, `restore` when it closes, so keyboard and screen reader users land where they were. */
export function usePanelOpener(): { remember: () => void; restore: () => void } {
  const opener = useRef<HTMLElement | null>(null);
  return {
    remember: () => {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    },
    restore: () => returnFocus(opener),
  };
}

/**
 * Keys for a modal dialog whose only control is one button: Escape closes it, Tab (either direction) stays on that
 * button so focus cannot leave until the dialog is closed.
 */
export function dialogKeyAction(key: string): 'close' | 'trap' | null {
  if (key === 'Escape') return 'close';
  if (key === 'Tab') return 'trap';
  return null;
}
