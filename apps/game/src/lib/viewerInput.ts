import { clampPan } from './pan.ts';

/** Pointer travel (CSS px) after which a press becomes a drag and the click is cancelled. */
export const DRAG_THRESHOLD = 8;
/** Pan per arrow key press, screen px. */
export const KEY_STEP = 120;

/** True once the travel is over the threshold: the press is a drag and must not activate a Hotspot. */
export function isDrag(dx: number): boolean {
  return Math.abs(dx) > DRAG_THRESHOLD;
}

/**
 * The pan a key asks for while the viewport itself has focus, or null when the key is not a pan key.
 * Physical x on purpose (fixed painted image, steering i18n-rtl.md exception): ArrowLeft moves the scene right.
 */
export function keyPan(key: string, pan: number, minPan: number): number | null {
  switch (key) {
    case 'ArrowLeft':
      return Math.min(0, Math.max(minPan, pan + KEY_STEP));
    case 'ArrowRight':
      return Math.min(0, Math.max(minPan, pan - KEY_STEP));
    case 'Home':
      return 0;
    case 'End':
      return minPan;
    default:
      return null;
  }
}

/** Pan after a button press: `direction` -1 moves the scene left (Pan right), +1 moves it right (Pan left). */
export function buttonPan(pan: number, direction: -1 | 1, viewportWidth: number, sceneWidth: number): number {
  const step = Math.max(KEY_STEP, viewportWidth / 2);
  return clampPan(pan + direction * step, viewportWidth, sceneWidth);
}
/**
 * True when a `lostpointercapture` event ends the drag. The event bubbles: on a touch screen the browser releases its own
 * implicit capture on the pressed child (the image or a Hotspot) as soon as the viewport takes capture, and that child
 * event must not end the drag, or a finger pans only a few pixels. Only the viewport losing its own capture ends it.
 */
export const lostCaptureEndsDrag = (target: EventTarget, viewport: EventTarget): boolean => target === viewport;
