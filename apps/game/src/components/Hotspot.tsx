import { stripMarks } from '@kiroween/skeleton/client';
import { MIN_TARGET_PX, type HotspotBox } from '../layout/types.ts';
import './scene.css';

interface HotspotProps {
  box: HotspotBox;
  /** Accessible name: story text from content, not the catalog. */
  label: string;
  /** True while a hint highlights this Hotspot. */
  marked: boolean;
  /** Catalog text for the hidden marker, e.g. "Hint: look here". */
  markedText: string;
  /** A drawn overlay for the Hall doors: a lock, or a sign-in ring. Decorative: the state is in the label. */
  badge?: 'lock' | 'signin';
  /** Scene pixels to screen pixels. */
  scale: number;
  onActivate: (id: string) => void;
}

/**
 * A focusable button over the tap box. Enter, Space and click all call `onActivate` (native button behaviour).
 * The marked state is a ring, an icon and hidden text, so it never relies on colour alone.
 * Position is physical x on purpose: the scene is a fixed painted image and the stage is `direction: ltr`.
 */
export function Hotspot({ box, label, marked, markedText, badge, scale, onActivate }: HotspotProps) {
  return (
    <button
      type="button"
      className="scene-hotspot mood-hotspot-glow"
      data-hotspot={box.id}
      data-marked={marked ? 'true' : undefined}
      data-badge={badge}
      style={{
        transform: `translate(${box.x * scale}px, ${box.y * scale}px)`,
        inlineSize: `${Math.max(MIN_TARGET_PX, box.w * scale)}px`,
        blockSize: `${Math.max(MIN_TARGET_PX, box.h * scale)}px`,
      }}
      onClick={() => onActivate(box.id)}
    >
      <span className="sr-only">{stripMarks(label)}</span>
      {badge ? <span className="scene-hotspot-badge" data-kind={badge} aria-hidden="true" /> : null}
      {marked ? (
        <>
          <svg className="scene-hotspot-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
            <path d="M12 2l3 7 7 .6-5.3 4.6 1.7 7L12 17.3 5.6 21.2l1.7-7L2 9.6 9 9z" fill="currentColor" />
          </svg>
          <span className="sr-only">{markedText}</span>
        </>
      ) : null}
    </button>
  );
}
