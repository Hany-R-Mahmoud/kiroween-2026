import { useEffect, useState } from 'react';

const DESKTOP = '(min-width: 64rem)';

/** True from 64rem up. Starts false on the server (the phone layout) and corrects on mount. */
export function useDesktop(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);
    setDesktop(mq.matches);
    const on = (e: MediaQueryListEvent) => setDesktop(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return desktop;
}
