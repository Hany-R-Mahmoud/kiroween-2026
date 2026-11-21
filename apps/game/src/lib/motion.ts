// The in-app motion setting (design: "Fear events"). Stored under `kiroween.motion.v1`; no stored value means "follow the system".
import type { KeyValueStore } from '@kiroween/skeleton/client';

export const MOTION_KEY = 'kiroween.motion.v1';
export type MotionSetting = 'reduce' | 'full';

/** The stored setting, or null when none is stored or the value is not one of ours. Storage errors read as null. */
export function readMotion(storage: Pick<KeyValueStore, 'getItem'>): MotionSetting | null {
  try {
    const v = storage.getItem(MOTION_KEY);
    return v === 'reduce' || v === 'full' ? v : null;
  } catch {
    return null;
  }
}

/** Stores the explicit choice. A blocked or full store is ignored: the setting then lasts for the page only. */
export function writeMotion(storage: Pick<KeyValueStore, 'setItem'>, value: MotionSetting): void {
  try {
    storage.setItem(MOTION_KEY, value);
  } catch {
    /* private mode or quota: keep going */
  }
}

/** Reduced motion applies when the setting says so, or when there is no setting and the system asks for it. */
export function isReducedMotion(setting: MotionSetting | null, systemReduces: boolean): boolean {
  return setting === null ? systemReduces : setting === 'reduce';
}
/**
 * Mirrors the effective setting on the root element (`data-motion="reduce"` or absent) so the shared book.css can switch
 * page motion off under the in-app setting as well as the system one.
 */
export function applyMotionAttribute(root: Pick<HTMLElement, 'dataset'>, reduced: boolean): void {
  if (reduced) root.dataset.motion = 'reduce';
  else delete root.dataset.motion;
}
