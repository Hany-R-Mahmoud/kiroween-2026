import { useEffect } from 'react';

const LANDED_MS = 2000;

/**
 * After the browser or the router has scrolled to the URL's hash (scrolling stays theirs; smooth only by CSS when
 * motion is allowed), move keyboard focus to that section's heading and mark it as landed for a moment.
 */
export function AnchorFocus() {
  useEffect(() => {
    let timer: number | undefined;
    const land = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      const heading = target?.querySelector<HTMLElement>('[data-anchor-heading]');
      if (!target || !heading) return;
      heading.focus({ preventScroll: true });
      target.setAttribute('data-landed', '');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => target.removeAttribute('data-landed'), LANDED_MS);
    };
    land();
    window.addEventListener('hashchange', land);
    return () => {
      window.removeEventListener('hashchange', land);
      window.clearTimeout(timer);
    };
  }, []);
  return null;
}
