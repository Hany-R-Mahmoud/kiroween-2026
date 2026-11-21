// Pacing and text for Fear_Events (design: "Fear events"). Pure, so the rules are testable without a browser.
import type { FearEventEntry } from '../layout/fearEvents.ts';
import type { MessageKey } from '../i18n/en.ts';

/** At most one event every 4 seconds overall. */
export const MIN_EVENT_GAP_MS = 4000;
/** How long an event's caption and effect stay on screen. Shorter than the gap, so events never overlap. */
export const EVENT_SHOW_MS = 3000;
/** Longest fade in the reduced-motion path. */
export const REDUCED_FADE_MS = 400;

export interface FearGate {
  /** True and records the time when an event may play now; false when one played less than the gap ago. */
  tryPlay(nowMs: number, instanceKey: string): boolean;
}

/** One gate per screen. An instance key plays at most once (an event per trigger instance). */
export function createFearGate(gapMs: number = MIN_EVENT_GAP_MS): FearGate {
  let last = Number.NEGATIVE_INFINITY;
  const seen = new Set<string>();
  return {
    tryPlay(nowMs, instanceKey) {
      if (seen.has(instanceKey) || nowMs - last < gapMs) return false;
      seen.add(instanceKey);
      last = nowMs;
      return true;
    },
  };
}

export const captionKey = (entry: Pick<FearEventEntry, 'caption'>): MessageKey =>
  entry.caption === 'sound' ? 'fear.caption.sound' : 'fear.caption.sight';

/**
 * The caption text. In the reduced-motion path the event's own reduced-motion line wins where content has one
 * (flying-dutchman only); every other case uses the catalog caption.
 */
export function captionFor(entry: Pick<FearEventEntry, 'caption'>, reducedMotionLine: string | null, reduced: boolean, t: (key: MessageKey) => string): string {
  const line = reducedMotionLine?.trim();
  return reduced && line ? line : t(captionKey(entry));
}
