import { useEffect, useRef, useState } from 'react';
import { Marked } from './Marked.tsx';
import type { FearEventEntry } from '../layout/fearEvents.ts';
import { useT } from '../i18n/useT';
import { captionFor, createFearGate, EVENT_SHOW_MS, type FearGate } from '../lib/fearPlayer.ts';
import './fear.css';

/** A request to play one Fear_Event. `key` identifies the trigger instance, so repeating it plays nothing. */
export interface FearRequest {
  key: string;
  entry: FearEventEntry;
  /** The event's own reduced-motion line from content (flying-dutchman only), else null. */
  reducedMotionLine: string | null;
}

/**
 * The non-interactive Fear_Event layer (`pointer-events: none`, so it never blocks a button). It plays at most one event
 * per 4 s, shows a caption in a polite live region, and in the reduced-motion path uses no flash, only a fade.
 */
export function FearOverlay({ request, reduced }: { request: FearRequest | null; reduced: boolean }) {
  const t = useT();
  const gate = useRef<FearGate | null>(null);
  const [shown, setShown] = useState<{ id: string; text: string } | null>(null);
  useEffect(() => {
    if (!request) return;
    gate.current ??= createFearGate();
    if (!gate.current.tryPlay(Date.now(), request.key)) return;
    setShown({ id: request.key, text: captionFor(request.entry, request.reducedMotionLine, reduced, t) });
    const timer = setTimeout(() => setShown(null), EVENT_SHOW_MS);
    return () => clearTimeout(timer);
    // `t` changes identity every render; only a new request should play.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.key]);
  return (
    <div className="fear-overlay" data-motion={reduced ? 'reduced' : 'full'} aria-live="polite">
      {shown ? (
        <div key={shown.id}>
          <div className="fear-overlay-flash" aria-hidden="true" />
          <p className="fear-overlay-caption">
            <Marked text={shown.text} />
          </p>
        </div>
      ) : null}
    </div>
  );
}
