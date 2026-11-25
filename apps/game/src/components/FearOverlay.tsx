import { useEffect, useRef, useState } from 'react';
import { MoodFog } from '@kiroween/skeleton/mood';
import { Marked } from './Marked.tsx';
import type { FearEventEntry, FearLook } from '../layout/fearEvents.ts';
import { useT } from '../i18n/useT';
import { captionFor, createFearGate, EVENT_SHOW_MS, type FearGate } from '../lib/fearPlayer.ts';
import './fear.css';

/** A request to play one Fear_Event. `key` identifies the trigger instance, so repeating it plays nothing. */
export interface FearRequest {
  key: string;
  entry: FearEventEntry;
  /** Which Fear_Look layer plays with this event; from `fearLookOf`. */
  look: FearLook;
  /** The event's own reduced-motion line from content (flying-dutchman only), else null. */
  reducedMotionLine: string | null;
}

function lookLayer(look: FearLook) {
  if (look === 'cold') return <span className="mood-vignette-inset fear-look-layer" />;
  if (look === 'fog')
    return (
      <span className="fear-look-layer fear-look-fogband">
        <MoodFog />
      </span>
    );
  return <span className="fear-look-layer" />;
}

/**
 * The non-interactive Fear_Event layer (`pointer-events: none`, so it never blocks a button). It plays at most one event
 * per 4 s, shows a caption in a polite live region, and in the reduced-motion path uses no flash, only a fade.
 */
export function FearOverlay({ request, reduced }: { request: FearRequest | null; reduced: boolean }) {
  const t = useT();
  const gate = useRef<FearGate | null>(null);
  const [shown, setShown] = useState<{ id: string; text: string; look: FearLook } | null>(null);
  useEffect(() => {
    if (!request) return;
    gate.current ??= createFearGate();
    if (!gate.current.tryPlay(Date.now(), request.key)) return;
    setShown({ id: request.key, text: captionFor(request.entry, request.reducedMotionLine, reduced, t), look: request.look });
    const timer = setTimeout(() => setShown(null), EVENT_SHOW_MS);
    return () => clearTimeout(timer);
    // `t` changes identity every render; only a new request should play.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.key]);
  return (
    <div className="fear-overlay" data-motion={reduced ? 'reduced' : 'full'} aria-live="polite">
      {shown ? (
        <div key={shown.id}>
          {reduced ? null : (
            <div className={`fear-look fear-look-${shown.look}`} aria-hidden="true">
              {lookLayer(shown.look)}
            </div>
          )}
          <p className="fear-overlay-caption">
            <Marked text={shown.text} />
          </p>
        </div>
      ) : null}
    </div>
  );
}
