import { useSyncExternalStore } from 'react';

/**
 * Reduced-motion source for the holo card.
 *
 * True when the system asks for reduced motion
 * (`prefers-reduced-motion: reduce`) or when `<html data-motion="reduce">` is
 * set. Both sources are watched, so a change applies without a reload.
 *
 * The server snapshot is `false`. The hook only drives JavaScript behaviour
 * (tilt, sway, embers, sweep, the render loop). The visual choice between the
 * 3D flip and the crossfade is made by CSS from the same two sources, so
 * server markup never mismatches.
 */

const QUERY = '(prefers-reduced-motion: reduce)';
const ATTRIBUTE = 'data-motion';

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onChange);

  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [ATTRIBUTE],
  });

  return () => {
    mql.removeEventListener('change', onChange);
    observer.disconnect();
  };
}

function getSnapshot(): boolean {
  return (
    window.matchMedia(QUERY).matches ||
    document.documentElement.getAttribute(ATTRIBUTE) === 'reduce'
  );
}

function getServerSnapshot(): boolean {
  return false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
